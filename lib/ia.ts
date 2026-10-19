import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/lib/db";
import { appelsIa } from "@/lib/db/schema";
import { CONSIGNE_COMMUNE, coutEuros, MODELE_VECTEURS, MODELES, verifierPlafonds, type Gamme, type Usage } from "@/lib/ia-regles";
import { journal } from "@/lib/journal";

// Le seul endroit qui parle au modèle et au service de vecteurs, depuis le serveur.
// Clés : MY_claude (Anthropic) et VOYAGE_AI (Voyage), dans Vercel ; jamais dans le navigateur.
// Chaque appel passe les plafonds, puis est compté (jetons, coût, durée), réussi ou non.
// Une IA en panne ne bloque rien : l'appelant reçoit { ok: false } et l'écran le dit.

let client: Anthropic | null = null;
function anthropic(): Anthropic | null {
  if (!process.env.MY_claude) return null;
  client ??= new Anthropic({ apiKey: process.env.MY_claude, maxRetries: 2, timeout: 60_000 });
  return client;
}

// Le plus de place qu'on accorde à une réponse au format fixé, après un premier essai coupé.
const JETONS_MAX = 8000;

export type Demandeur = { compteId: string | null; fonction: string };
export type Echec = { ok: false; erreur: string };

function debutDuJour() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function debutDuMois() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function depenseDuMois(): Promise<number> {
  const [r] = await db.select({ total: sql<string>`coalesce(sum(${appelsIa.coutEur}), 0)` }).from(appelsIa).where(gte(appelsIa.creeLe, debutDuMois()));
  return Number(r.total);
}

async function plafonds(d: Demandeur, caracteres: number, pdfOctets = 0) {
  const [[jour], mois] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(appelsIa)
      .where(and(d.compteId ? eq(appelsIa.compteId, d.compteId) : isNull(appelsIa.compteId), gte(appelsIa.creeLe, debutDuJour()))),
    depenseDuMois(),
  ]);
  return verifierPlafonds({ appelsDuJour: jour.n, depenseDuMois: mois, caracteres, machine: d.compteId === null, pdfOctets });
}

async function compter(d: Demandeur, modele: string, u: Usage, debut: number, erreur?: string) {
  const cout = coutEuros(modele, u);
  await db.insert(appelsIa).values({
    compteId: d.compteId,
    fonction: d.fonction,
    modele,
    jetonsEntree: u.entree,
    jetonsSortie: u.sortie,
    jetonsCache: u.cache,
    coutEur: String(cout),
    dureeMs: Date.now() - debut,
    ok: !erreur,
    erreur: erreur?.slice(0, 500) ?? null,
  });
  // En cas d'échec, la vraie erreur du service va au journal (jamais à l'écran) : sans elle,
  // « l'IA ne répond pas » ne dit pas pourquoi.
  journal("appel_ia", { fonction: d.fonction, compte: d.compteId, modele, cout_eur: cout, ok: !erreur, ...(erreur ? { erreur: erreur.slice(0, 400) } : {}) });
  return cout;
}

function usageDe(u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null } | undefined): Usage {
  return { entree: u?.input_tokens ?? 0, sortie: u?.output_tokens ?? 0, cache: u?.cache_read_input_tokens ?? 0 };
}

function messageDErreur(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "L'IA est saturée, réessayez dans une minute.";
  if (e instanceof Anthropic.APIError && e.status === 401) return "La clé de l'IA est refusée.";
  return "L'IA ne répond pas pour l'instant.";
}

// Une réponse dans un format fixé : le modèle répond, Zod valide, et ce qui n'entre pas
// dans le format est refusé (jamais « à peu près juste »).
export async function demanderStructure<S extends z.ZodType>(
  d: Demandeur,
  // `pdf` : un PDF déposé (en base64), lu par le modèle avec le texte de `contenu`.
  p: { gamme: Gamme; consigne: string; contenu: string; schema: S; maxJetons?: number; pdf?: string },
): Promise<{ ok: true; donnees: z.infer<S>; coutEur: number } | Echec> {
  const ia = anthropic();
  if (!ia) return { ok: false, erreur: "L'IA n'est pas configurée (clé MY_claude absente)." };
  // Le texte est plafonné en caractères ; un PDF, par son poids (le base64 fait 4/3 du fichier).
  const verdict = await plafonds(d, p.contenu.length, Math.round(((p.pdf?.length ?? 0) * 3) / 4));
  if (!verdict.ok) return { ok: false, erreur: verdict.raison };
  const modele = MODELES[p.gamme];
  const debut = Date.now();
  try {
    const contenu: Anthropic.ContentBlockParam[] | string = p.pdf
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.pdf } },
          { type: "text", text: p.contenu },
        ]
      : p.contenu;
    // On lit la réponse nous-mêmes plutôt que par messages.parse : une réponse coupée ou hors
    // format coûte quand même, et son coût doit être compté. Coupée faute de place (max_tokens),
    // on redemande une fois avec deux fois plus de place.
    let maxJetons = p.maxJetons ?? 2000;
    for (let essai = 1; essai <= 2; essai++) {
      const r = await ia.messages.create({
        model: modele,
        max_tokens: maxJetons,
        system: [{ type: "text", text: `${CONSIGNE_COMMUNE}\n\n${p.consigne}`, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: contenu }],
        output_config: { format: zodOutputFormat(p.schema) },
      });
      const usage = usageDe(r.usage);
      if (r.stop_reason === "max_tokens") {
        await compter(d, modele, usage, debut, `réponse coupée à ${maxJetons} jetons`);
        if (essai === 1 && maxJetons < JETONS_MAX) {
          maxJetons = Math.min(maxJetons * 2, JETONS_MAX);
          continue;
        }
        return { ok: false, erreur: "La réponse de l'IA était trop longue et a été coupée : rien n'a été enregistré." };
      }
      const texte = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      let brut: unknown;
      try {
        brut = JSON.parse(texte);
      } catch {
        brut = undefined;
      }
      const lu = p.schema.safeParse(brut);
      if (!lu.success) {
        await compter(d, modele, usage, debut, "réponse hors format");
        return { ok: false, erreur: "La réponse de l'IA n'était pas dans le format attendu : rien n'a été enregistré." };
      }
      const coutEur = await compter(d, modele, usage, debut);
      return { ok: true, donnees: lu.data as z.infer<S>, coutEur };
    }
    return { ok: false, erreur: "La réponse de l'IA était trop longue et a été coupée : rien n'a été enregistré." };
  } catch (e) {
    await compter(d, modele, { entree: 0, sortie: 0, cache: 0 }, debut, e instanceof Anthropic.APIError ? `HTTP ${e.status} ${e.message}` : String(e));
    return { ok: false, erreur: messageDErreur(e) };
  }
}

// Une réponse en texte, envoyée morceau par morceau au navigateur (streaming).
// Le flux se termine par l'enregistrement de l'appel.
export async function demanderEnDirect(
  d: Demandeur,
  p: { gamme: Gamme; consigne: string; contenu: string; maxJetons?: number },
): Promise<{ ok: true; flux: ReadableStream<Uint8Array> } | Echec> {
  const ia = anthropic();
  if (!ia) return { ok: false, erreur: "L'IA n'est pas configurée (clé MY_claude absente)." };
  const verdict = await plafonds(d, p.contenu.length);
  if (!verdict.ok) return { ok: false, erreur: verdict.raison };
  const modele = MODELES[p.gamme];
  const debut = Date.now();
  const encodeur = new TextEncoder();
  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      try {
        const s = ia.messages.stream({
          model: modele,
          max_tokens: p.maxJetons ?? 1500,
          system: [{ type: "text", text: `${CONSIGNE_COMMUNE}\n\n${p.consigne}`, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: p.contenu }],
        });
        s.on("text", (t) => controleur.enqueue(encodeur.encode(t)));
        const fin = await s.finalMessage();
        await compter(d, modele, usageDe(fin.usage), debut);
      } catch (e) {
        await compter(d, modele, { entree: 0, sortie: 0, cache: 0 }, debut, String(e));
        controleur.enqueue(encodeur.encode(`\n\n[${messageDErreur(e)}]`));
      } finally {
        controleur.close();
      }
    },
  });
  return { ok: true, flux };
}

// Des textes en vecteurs (Voyage). « document » pour indexer, « query » pour une question.
export async function vectoriser(d: Demandeur, textes: string[], type: "document" | "query"): Promise<{ ok: true; vecteurs: number[][] } | Echec> {
  if (!process.env.VOYAGE_AI) return { ok: false, erreur: "Le service de vecteurs n'est pas configuré (clé VOYAGE_AI absente)." };
  if (textes.length === 0) return { ok: true, vecteurs: [] };
  const verdict = await plafonds(d, type === "query" ? textes.join("").length : 0);
  if (!verdict.ok) return { ok: false, erreur: verdict.raison };
  const debut = Date.now();
  try {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VOYAGE_AI}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: textes, model: MODELE_VECTEURS, input_type: type }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      await compter(d, MODELE_VECTEURS, { entree: 0, sortie: 0, cache: 0 }, debut, `HTTP ${r.status}`);
      return { ok: false, erreur: r.status === 429 ? "Le service de vecteurs est saturé, réessayez dans une minute." : "Le service de vecteurs ne répond pas." };
    }
    const corps = (await r.json()) as { data: { embedding: number[]; index: number }[]; usage?: { total_tokens: number } };
    await compter(d, MODELE_VECTEURS, { entree: corps.usage?.total_tokens ?? 0, sortie: 0, cache: 0 }, debut);
    return { ok: true, vecteurs: corps.data.sort((a, b) => a.index - b.index).map((x) => x.embedding) };
  } catch (e) {
    await compter(d, MODELE_VECTEURS, { entree: 0, sortie: 0, cache: 0 }, debut, String(e));
    return { ok: false, erreur: "Le service de vecteurs ne répond pas." };
  }
}

// Pour la page des coûts : ce que l'IA a coûté ce mois-ci, par fonction.
export async function coutsIaDuMois() {
  return db
    .select({
      fonction: appelsIa.fonction,
      appels: sql<number>`count(*)::int`,
      echecs: sql<number>`count(*) filter (where not ${appelsIa.ok})::int`,
      cout: sql<string>`coalesce(sum(${appelsIa.coutEur}), 0)`,
    })
    .from(appelsIa)
    .where(gte(appelsIa.creeLe, debutDuMois()))
    .groupBy(appelsIa.fonction);
}
