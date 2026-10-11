import { asc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { chantiers, comptes, entreprises } from "@/lib/db/schema";
import { aReverifier, lireReponse, REVERIFIER_APRES_JOURS, type FicheEntreprise } from "@/lib/entreprises-regles";
import { journal } from "@/lib/journal";

// L'API Recherche d'entreprises (data.gouv) : le registre Sirene, ouvert, sans clé.
// Appelée seulement depuis le serveur. Une panne ne bloque rien : la recherche dit
// « service indisponible » et la fiche garde la dernière vérification.
const API = "https://recherche-entreprises.api.gouv.fr/search";

export type ReponseRegistre = { ok: true; fiches: FicheEntreprise[] } | { ok: false; erreur: string };

async function interroger(q: string, parPage: number): Promise<ReponseRegistre> {
  try {
    const r = await fetch(`${API}?q=${encodeURIComponent(q)}&per_page=${parPage}`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!r.ok) {
      journal("registre_echec", { statut: r.status });
      return { ok: false, erreur: r.status === 429 ? "Le registre est saturé, réessayez dans une minute." : "Le registre des entreprises ne répond pas pour l'instant." };
    }
    return { ok: true, fiches: lireReponse(await r.json()) };
  } catch (e) {
    journal("registre_echec", { erreur: String(e) });
    return { ok: false, erreur: "Le registre des entreprises ne répond pas pour l'instant." };
  }
}

export function chercherDansLeRegistre(q: string): Promise<ReponseRegistre> {
  return interroger(q, 6);
}

// Relit une entreprise par son SIREN. On ne garde jamais ce que le navigateur envoie :
// le serveur redemande la fiche au registre.
export async function lireDuRegistre(siren: string): Promise<FicheEntreprise | null | "panne"> {
  const r = await interroger(siren, 1);
  if (!r.ok) return "panne";
  return r.fiches.find((f) => f.siren === siren) ?? null;
}

export async function enregistrer(f: FicheEntreprise): Promise<void> {
  const valeurs = { siret: f.siret, nom: f.nom, adresse: f.adresse, activite: f.activite, ferme: f.ferme, fermeeLe: f.fermeeLe, creeeLe: f.creeeLe, verifieeLe: new Date() };
  await db
    .insert(entreprises)
    .values({ siren: f.siren, ...valeurs })
    .onConflictDoUpdate({ target: entreprises.siren, set: valeurs });
}

export type EntrepriseVue = typeof entreprises.$inferSelect;

export async function lireEntreprises(sirens: (string | null)[]): Promise<Map<string, EntrepriseVue>> {
  const liste = [...new Set(sirens.filter((s): s is string => Boolean(s)))];
  if (liste.length === 0) return new Map();
  const lignes = await db.select().from(entreprises).where(inArray(entreprises.siren, liste));
  return new Map(lignes.map((e) => [e.siren, e]));
}

export type BilanRegistre = { verifiees: number; nouvellementFermees: { nom: string; siren: string }[]; panne: boolean };

// La machine de nuit revérifie les entreprises les plus anciennement vérifiées,
// quelques-unes par nuit (le registre limite le nombre d'appels).
export async function reverifierEntreprises(max = 20, maintenant = new Date()): Promise<BilanRegistre> {
  const seuil = new Date(maintenant.getTime() - REVERIFIER_APRES_JOURS * 24 * 3600 * 1000);
  const aRevoir = await db.select().from(entreprises).where(lt(entreprises.verifieeLe, seuil)).orderBy(asc(entreprises.verifieeLe)).limit(max);
  const bilan: BilanRegistre = { verifiees: 0, nouvellementFermees: [], panne: false };
  for (const e of aRevoir) {
    if (!aReverifier(e.verifieeLe, maintenant)) continue;
    const f = await lireDuRegistre(e.siren);
    if (f === "panne") {
      bilan.panne = true;
      break;
    }
    if (f === null) {
      // Disparue du registre public (diffusion restreinte) : on garde la dernière fiche, datée.
      await db.update(entreprises).set({ verifieeLe: maintenant }).where(eq(entreprises.siren, e.siren));
    } else {
      await enregistrer(f);
      if (f.ferme && !e.ferme) bilan.nouvellementFermees.push({ nom: f.nom, siren: f.siren });
    }
    bilan.verifiees++;
    // Le registre accepte quelques appels par seconde : on reste en dessous.
    await new Promise((r) => setTimeout(r, 200));
  }
  journal("registre_reverification", { verifiees: bilan.verifiees, fermees: bilan.nouvellementFermees.length, panne: bilan.panne });
  return bilan;
}

// Où une entreprise fermée est citée : pour que l'alerte dise quels chantiers regarder.
export async function ouEstCitee(siren: string): Promise<{ chantiers: { reference: string; nom: string }[]; comptes: string[] }> {
  const [cs, ps] = await Promise.all([
    db.select({ reference: chantiers.reference, nom: chantiers.nom }).from(chantiers).where(eq(chantiers.clientSiren, siren)),
    db.select({ nom: comptes.nom }).from(comptes).where(eq(comptes.siren, siren)),
  ]);
  return { chantiers: cs, comptes: ps.map((p) => p.nom) };
}
