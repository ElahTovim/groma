import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { envoyerCourriel } from "@/lib/courriel";
import { db } from "@/lib/db";
import { attestations, chantiers, comptes, entreprises, participants, relancesVigilance } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { aujourdhuiParis } from "@/lib/regles";
import { etatAttestation, libelleEtat, palierDeRelance, VIGILANCE, type EtatAttestation } from "@/lib/vigilance-regles";

export type DerniereAttestation = { id: string; delivreeLe: string; codeSecurite: string | null; fichierNom: string };

// La plus récente attestation de chaque entreprise : c'est elle qui fait foi.
export async function dernieresAttestations(sirens: (string | null)[]): Promise<Map<string, DerniereAttestation>> {
  const liste = [...new Set(sirens.filter((s): s is string => Boolean(s)))];
  if (liste.length === 0) return new Map();
  const lignes = await db
    .select({ id: attestations.id, siren: attestations.siren, delivreeLe: attestations.delivreeLe, codeSecurite: attestations.codeSecurite, fichierNom: attestations.fichierNom })
    .from(attestations)
    .where(inArray(attestations.siren, liste))
    .orderBy(desc(attestations.delivreeLe), desc(attestations.creeLe));
  const m = new Map<string, DerniereAttestation>();
  for (const l of lignes) if (!m.has(l.siren)) m.set(l.siren, l);
  return m;
}

type Exigence = { compteId: string; nom: string; email: string; fictif: boolean; siren: string | null; entreprise: string | null; chantierId: string; reference: string; chantier: string };

// Toutes les attestations exigées sur les chantiers en cours.
async function exigences(chantierIds?: string[]): Promise<(Exigence & { etat: EtatAttestation })[]> {
  const conditions = [eq(participants.vigilance, true), ne(chantiers.statut, "clos"), ne(chantiers.statut, "annule")];
  if (chantierIds) {
    if (chantierIds.length === 0) return [];
    conditions.push(inArray(chantiers.id, chantierIds));
  }
  const lignes: Exigence[] = await db
    .select({
      compteId: comptes.id,
      nom: comptes.nom,
      email: comptes.email,
      fictif: comptes.fictif,
      siren: comptes.siren,
      entreprise: entreprises.nom,
      chantierId: chantiers.id,
      reference: chantiers.reference,
      chantier: chantiers.nom,
    })
    .from(participants)
    .innerJoin(comptes, eq(participants.compteId, comptes.id))
    .innerJoin(chantiers, eq(participants.chantierId, chantiers.id))
    .leftJoin(entreprises, eq(comptes.siren, entreprises.siren))
    .where(and(...conditions));
  const dernieres = await dernieresAttestations(lignes.map((l) => l.siren));
  const jour = aujourdhuiParis();
  return lignes.map((l) => ({ ...l, etat: etatAttestation(l.siren ? (dernieres.get(l.siren)?.delivreeLe ?? null) : null, jour) }));
}

// Pour le récapitulatif du matin : ce qui manque ou expire, chantier par chantier.
export async function attestationsARenouveler(chantierIds: string[]) {
  return (await exigences(chantierIds)).filter((e) => e.etat.etat !== "a_jour");
}

export type BilanVigilance = { exigees: number; relancees: number; dejaRelancees: number };

// La nuit : chaque sous-traitant dont l'attestation manque, expire bientôt ou a expiré
// reçoit un courriel, une seule fois par palier et par échéance.
export async function relancerVigilance(site: string): Promise<BilanVigilance> {
  const toutes = await exigences();
  const bilan: BilanVigilance = { exigees: toutes.length, relancees: 0, dejaRelancees: 0 };
  // Une personne présente sur plusieurs chantiers ne reçoit qu'un courriel.
  const parCompte = new Map<string, (Exigence & { etat: EtatAttestation })[]>();
  for (const e of toutes) parCompte.set(e.compteId, [...(parCompte.get(e.compteId) ?? []), e]);

  for (const [compteId, lignes] of parCompte) {
    const e = lignes[0];
    const relance = palierDeRelance(e.etat);
    if (!relance || e.fictif) continue;
    const [pose] = await db.insert(relancesVigilance).values({ compteId, palier: relance.palier, echeance: relance.echeance }).onConflictDoNothing().returning({ id: relancesVigilance.id });
    if (!pose) {
      bilan.dejaRelancees++;
      continue;
    }
    const chantiersCites = lignes.map((l) => `- ${l.reference} · ${l.chantier} : ${site}/chantiers/${l.chantierId}`).join("\n");
    const envoi = await envoyerCourriel({
      a: e.email,
      sujet: `Attestation de vigilance URSSAF : ${libelleEtat(e.etat).toLowerCase()}`,
      texte: `Bonjour ${e.nom.split(" ")[0]},\n\nPour les travaux que vous réalisez en sous-traitance, la loi nous demande votre attestation de vigilance URSSAF tous les ${VIGILANCE.validiteMois} mois${e.entreprise ? ` (entreprise ${e.entreprise})` : ""}.\n\nÉtat actuel : ${libelleEtat(e.etat)}${"expireLe" in e.etat ? `, échéance le ${e.etat.expireLe}` : ""}.\n\nVous pouvez la télécharger sur urssaf.fr (espace en ligne, rubrique Attestations), puis la déposer en PDF depuis la fiche du chantier :\n${chantiersCites}\n\nMerci.`,
    });
    if (envoi.ok) bilan.relancees++;
    else await db.delete(relancesVigilance).where(eq(relancesVigilance.id, pose.id));
  }
  journal("vigilance_relances", { ...bilan });
  return bilan;
}
