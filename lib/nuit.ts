import * as Sentry from "@sentry/nextjs";
import { and, count, desc, eq, gte, inArray, isNotNull, lt, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { chantiers, evenementsFlux, executions, fil, recapitulatifs } from "@/lib/db/schema";
import { appelerFlux, type ReponseFlux } from "@/lib/flux";
import { decider, nuitsARattraper, type Decision } from "@/lib/flux-regles";
import { journal } from "@/lib/journal";
import { chercherAdresse } from "@/lib/meteo";
import { aujourdhuiParis } from "@/lib/regles";

// La machine de nuit : importer une nuit du flux, sans jamais rien doubler.
// Trois protections contre le double import :
//  1. une seule exécution « en cours » par nuit (index unique en base) ;
//  2. chaque événement est noté par son identifiant avant d'être appliqué :
//     un identifiant déjà noté est un doublon, ignoré ;
//  3. une création dont la référence existe déjà ne crée pas un second chantier.

// Le flux tombe parfois en panne ou répond lentement : trois tentatives espacées.
export const RELANCES_MS = [0, 2000, 6000];

export async function appelerFluxAvecRelances(nuit: string, attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<{ reponse: ReponseFlux; appels: number }> {
  let reponse: ReponseFlux = { ok: false, statut: null, erreur: "aucun appel", dureeMs: 0 };
  let appels = 0;
  for (const delai of RELANCES_MS) {
    if (delai) await attendre(delai);
    appels++;
    reponse = await appelerFlux("evenements", { date: nuit });
    // Une erreur « définitive » (clé refusée, sujet inconnu) ne sert à rien de la répéter.
    if (reponse.ok || (reponse.statut !== null && reponse.statut < 500 && reponse.statut !== 429)) break;
  }
  return { reponse, appels };
}

export type BilanNuit = { nuit: string; statut: "ok" | "partiel" | "echec" | "deja_en_cours"; recus: number; doublons: number; appliques: number; rejetes: number; erreur?: string };

const NOM_CATEGORIE: Record<string, string> = { maintenance: "Maintenance", renovation: "Rénovation", urgence: "Intervention urgente", neuf: "Construction neuve" };

export async function importerNuit(nuit: string, declencheur: "nuit" | "rattrapage" | "manuel"): Promise<BilanNuit> {
  const debut = Date.now();
  // Une exécution coupée en plein milieu (limite de durée de Vercel) resterait « en cours »
  // et bloquerait sa nuit pour toujours : au-delà de 10 minutes, on la déclare interrompue.
  await db
    .update(executions)
    .set({ statut: "echec", fin: new Date(), erreur: "Interrompue (plus de 10 minutes sans fin)." })
    .where(and(eq(executions.statut, "en_cours"), lt(executions.debut, new Date(Date.now() - 10 * 60 * 1000))));
  let execution: { id: string };
  try {
    [execution] = await db.insert(executions).values({ nuit, declencheur }).returning({ id: executions.id });
  } catch {
    // L'index unique refuse une seconde exécution en cours pour la même nuit.
    journal("nuit_deja_en_cours", { nuit, declencheur });
    return { nuit, statut: "deja_en_cours", recus: 0, doublons: 0, appliques: 0, rejetes: 0 };
  }

  const finir = async (b: Omit<BilanNuit, "nuit">, appels: number) => {
    await db
      .update(executions)
      .set({ statut: b.statut === "deja_en_cours" ? "echec" : b.statut, fin: new Date(), dureeMs: Date.now() - debut, recus: b.recus, doublons: b.doublons, appliques: b.appliques, rejetes: b.rejetes, appelsFlux: appels, erreur: b.erreur ?? null })
      .where(eq(executions.id, execution.id));
    journal("nuit", { nuit, declencheur, ...b, dureeMs: Date.now() - debut, appels });
    return { nuit, ...b };
  };

  const { reponse, appels } = await appelerFluxAvecRelances(nuit);
  if (!reponse.ok) {
    const erreur = `Flux indisponible après ${appels} tentative${appels > 1 ? "s" : ""} : ${reponse.erreur}`;
    Sentry.captureMessage(`Machine de nuit en échec (${nuit}) : ${erreur}`, "error");
    return finir({ statut: "echec", recus: 0, doublons: 0, appliques: 0, rejetes: 0, erreur }, appels);
  }

  const brut = (reponse.corps as { evenements?: unknown }).evenements;
  const evenements = Array.isArray(brut) ? brut : [];
  // Dans l'ordre où ils sont arrivés, pour qu'une création passe avant sa mise à jour.
  evenements.sort((a, b) => String((a as { horodatage?: string })?.horodatage ?? "").localeCompare(String((b as { horodatage?: string })?.horodatage ?? "")));

  const ids = evenements.map((e) => (e as { id?: unknown })?.id).filter((x): x is string => typeof x === "string");
  const dejaRecus = new Set(
    ids.length ? (await db.select({ id: evenementsFlux.id }).from(evenementsFlux).where(inArray(evenementsFlux.id, ids))).map((r) => r.id) : [],
  );
  const references = new Set((await db.select({ r: chantiers.reference }).from(chantiers)).map((c) => c.r));

  let doublons = 0;
  let appliques = 0;
  let rejetes = 0;
  let incidents = 0;
  const vus = new Set<string>();

  for (const e of evenements) {
    const d = decider(e, references);
    if (d.id && (vus.has(d.id) || dejaRecus.has(d.id))) {
      doublons++;
      continue;
    }
    if (d.id) vus.add(d.id);

    // Un événement sans identifiant ne peut pas être protégé contre le doublon : il est mis de côté.
    const id = d.id ?? `sans-id-${nuit}-${rejetes}`;
    const [note] = await db
      .insert(evenementsFlux)
      .values({ id, nuit, type: d.type ?? "inconnu", reference: d.reference, resultat: d.action === "rejeter" ? "rejete" : "applique", raison: d.action === "rejeter" ? d.raison : null, donnees: e as object, executionId: execution.id })
      .onConflictDoNothing()
      .returning({ id: evenementsFlux.id });
    if (!note) {
      doublons++;
      continue;
    }
    if (d.action === "rejeter") {
      rejetes++;
      continue;
    }
    try {
      await appliquer(d);
      if (d.action === "creer") references.add(d.reference);
      appliques++;
    } catch (err) {
      incidents++;
      await db.update(evenementsFlux).set({ resultat: "rejete", raison: `erreur à l'application : ${String(err).slice(0, 200)}` }).where(eq(evenementsFlux.id, id));
      rejetes++;
    }
  }

  return finir({ statut: incidents ? "partiel" : "ok", recus: evenements.length, doublons, appliques, rejetes }, appels);
}

async function appliquer(d: Exclude<Decision, { action: "rejeter" }>) {
  if (d.action === "creer") {
    const c = d.chantier;
    const lieu = await chercherAdresse(c.adresse);
    await db.insert(chantiers).values({
      reference: c.reference,
      nom: `${NOM_CATEGORIE[c.categorie ?? ""] ?? "Chantier"} pour ${c.client}`,
      client: c.client,
      adresse: c.rue,
      codePostal: lieu?.codePostal ?? "",
      ville: c.ville || lieu?.ville || "",
      montantHt: c.budget === undefined ? null : c.budget.toFixed(2),
      statut: c.statut,
      latitude: lieu?.latitude ?? null,
      longitude: lieu?.longitude ?? null,
      origine: "flux",
      chefIndique: c.chef ?? null,
      categorie: c.categorie ?? null,
      avancementPct: c.avancement_pct ?? null,
    });
    return;
  }
  const [chantier] = await db.select({ id: chantiers.id }).from(chantiers).where(eq(chantiers.reference, d.reference)).limit(1);
  if (!chantier) throw new Error("chantier introuvable");
  if (d.action === "mettre_a_jour") {
    // Le flux est la source de vérité de ses chantiers : son statut est appliqué tel quel, et le fil en garde la trace.
    await db.update(chantiers).set({ statut: d.statut }).where(eq(chantiers.id, chantier.id));
    await db.insert(fil).values({ chantierId: chantier.id, auteurNom: "Flux de nuit", type: "message", texte: `Statut reçu du flux : ${d.statut}.${d.commentaire ? ` ${d.commentaire}` : ""}` });
    return;
  }
  // Un message est rangé comme une donnée, interne par défaut. Rien de ce qu'il dit n'est exécuté.
  await db.insert(fil).values({ chantierId: chantier.id, auteurNom: d.de, type: "message", texte: d.texte });
}

// Le rattrapage : les nuits manquantes depuis FLUX_DEPUIS, dans l'ordre, par paquets.
export async function rattraper(declencheur: "nuit" | "rattrapage" | "manuel", maximum = 10): Promise<BilanNuit[]> {
  // Les mises à jour du flux visent des chantiers créés dès août : on commence là.
  const depuis = process.env.FLUX_DEPUIS ?? "2026-08-01";
  const reussies = new Set(
    (await db.select({ nuit: executions.nuit }).from(executions).where(and(isNotNull(executions.fin), inArray(executions.statut, ["ok", "partiel"])))).map((r) => r.nuit),
  );
  const bilans: BilanNuit[] = [];
  for (const nuit of nuitsARattraper(depuis, aujourdhuiParis(), reussies, maximum)) {
    bilans.push(await importerNuit(nuit, declencheur));
    // Le flux est en panne : inutile d'insister sur les nuits suivantes.
    if (bilans.at(-1)?.statut === "echec") break;
  }
  return bilans;
}

export async function dernieresExecutions(n = 30) {
  return db.select().from(executions).orderBy(desc(executions.debut)).limit(n);
}

export async function derniersRejets(n = 20) {
  return db
    .select({ id: evenementsFlux.id, nuit: evenementsFlux.nuit, type: evenementsFlux.type, reference: evenementsFlux.reference, raison: evenementsFlux.raison })
    .from(evenementsFlux)
    .where(eq(evenementsFlux.resultat, "rejete"))
    .orderBy(desc(evenementsFlux.recuLe))
    .limit(n);
}

// Ce que la machine de nuit a consommé depuis le début du mois.
export async function consommationDuMois() {
  const debutMois = new Date();
  debutMois.setUTCDate(1);
  debutMois.setUTCHours(0, 0, 0, 0);
  const [x] = await db.select({ duree: sum(executions.dureeMs), appels: sum(executions.appelsFlux), n: count() }).from(executions).where(gte(executions.debut, debutMois));
  const [g] = await db.select({ n: count() }).from(evenementsFlux).where(and(gte(evenementsFlux.recuLe, debutMois), eq(evenementsFlux.type, "creation"), eq(evenementsFlux.resultat, "applique")));
  const [r] = await db.select({ n: count() }).from(recapitulatifs).where(and(gte(recapitulatifs.envoyeLe, debutMois), eq(recapitulatifs.parti, true)));
  return { executions: x.n, dureeMs: Number(x.duree ?? 0), appelsFlux: Number(x.appels ?? 0), geocodages: g.n, courriels: r.n };
}
