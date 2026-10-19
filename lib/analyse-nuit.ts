import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { analysesNuit, chantiers, courriers, evenementsFlux, executions } from "@/lib/db/schema";
import { demanderStructure, type Demandeur } from "@/lib/ia";
import { journal } from "@/lib/journal";
import { CONSIGNE_ANALYSE, decider, preparerContenu, REGLES_ANALYSE, schemaAnalyse, TEXTE_NUIT_VIDE, verifierAnalyse, type CourrierNuit, type EvenementNuit } from "@/lib/analyse-nuit-regles";

// L'analyse de la nuit par le modèle : une lecture, rangée une fois par nuit dans
// analyses_nuit. Elle ne déclenche aucune action ; elle est lue dans le récapitulatif
// du matin et sur la page Machine de nuit. Les règles sont dans analyse-nuit-regles.ts.

export const DEMANDEUR_ANALYSE: Demandeur = { compteId: null, fonction: "analyse_nuit" };

export type BilanAnalyse =
  | { ok: true; statut: "analysee"; points: number; retirees: number; consignes: number; coutEur: number }
  | { ok: true; statut: "deja_faite" | "nuit_vide" | "nuit_non_importee" }
  | { ok: false; erreur: string };

export async function analyseDeLaNuit(nuit: string) {
  const [a] = await db.select().from(analysesNuit).where(eq(analysesNuit.nuit, nuit)).limit(1);
  return a ?? null;
}

export async function derniereAnalyse() {
  const [a] = await db.select().from(analysesNuit).orderBy(desc(analysesNuit.nuit)).limit(1);
  return a ?? null;
}

// Les courriers reçus dans les 24 heures qui précèdent : ceux de la nuit.
async function courriersDeLaNuit(): Promise<CourrierNuit[]> {
  const depuis = new Date(Date.now() - 24 * 3600 * 1000);
  return db
    .select({ id: courriers.id, texte: courriers.texte, categorie: courriers.categorie })
    .from(courriers)
    .where(gte(courriers.recuLe, depuis))
    .orderBy(courriers.recuLe)
    .limit(REGLES_ANALYSE.courriersMax);
}

export async function analyserNuit(nuit: string, demandeur: Demandeur = DEMANDEUR_ANALYSE): Promise<BilanAnalyse> {
  const [existe, importee] = await Promise.all([
    analyseDeLaNuit(nuit),
    db.select({ id: executions.id }).from(executions).where(and(eq(executions.nuit, nuit), inArray(executions.statut, ["ok", "partiel"]))).limit(1),
  ]);
  const evenements: EvenementNuit[] = existe
    ? []
    : await db
        .select({ id: evenementsFlux.id, type: evenementsFlux.type, reference: evenementsFlux.reference, resultat: evenementsFlux.resultat, raison: evenementsFlux.raison, donnees: evenementsFlux.donnees })
        .from(evenementsFlux)
        .where(eq(evenementsFlux.nuit, nuit))
        .orderBy(evenementsFlux.recuLe);
  const recus = existe ? [] : await courriersDeLaNuit();

  const d = decider({ analyseExiste: !!existe, nuitImportee: importee.length > 0, evenements: evenements.length, courriers: recus.length });
  if (!d.analyser) {
    if (d.raison === "nuit_vide") {
      // Rangée quand même : le récapitulatif le dit, et le passage suivant ne recommence pas.
      await db.insert(analysesNuit).values({ nuit, texte: TEXTE_NUIT_VIDE, points: [] }).onConflictDoNothing();
    }
    journal("analyse_nuit", { nuit, statut: d.raison });
    return { ok: true, statut: d.raison };
  }

  const { contenu, evenementsDonnes, courriersDonnes } = preparerContenu(nuit, evenements, recus);
  const r = await demanderStructure(demandeur, { gamme: "fin", consigne: CONSIGNE_ANALYSE, contenu, schema: schemaAnalyse, maxJetons: REGLES_ANALYSE.jetonsReponse });
  if (!r.ok) {
    journal("analyse_nuit", { nuit, statut: "echec", erreur: r.erreur });
    return { ok: false, erreur: r.erreur };
  }

  const references = (await db.select({ r: chantiers.reference }).from(chantiers)).map((c) => c.r);
  const v = verifierAnalyse(r.donnees, { referencesConnues: references, evenements, courriers: recus });
  // La clé unique sur la nuit : deux passages simultanés ne rangent qu'une analyse.
  await db.insert(analysesNuit).values({ nuit, texte: v.texte, points: v.points }).onConflictDoNothing();
  journal("analyse_nuit", { nuit, statut: "analysee", evenements: evenementsDonnes, courriers: courriersDonnes, points: v.points.length, references_retirees: v.retirees, consignes: v.consignes.map((c) => c.id), cout_eur: r.coutEur });
  return { ok: true, statut: "analysee", points: v.points.length, retirees: v.retirees.length, consignes: v.consignes.length, coutEur: r.coutEur };
}
