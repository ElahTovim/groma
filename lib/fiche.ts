import { and, asc, eq, inArray } from "drizzle-orm";
import { voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { comptes, fil, lots, participants, type StatutSignalement, type TypeFil } from "@/lib/db/schema";
import { aujourdhuiParis, lotEnRetard, voitElement, type ContexteChantier } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

export type LotVu = {
  id: string;
  nom: string;
  statut: (typeof lots.$inferSelect)["statut"];
  livraisonPrevue: string | null;
  finPrevue: string | null;
  fournisseur: string | null;
  enRetard: boolean;
};

export type ElementVu = {
  id: string;
  type: TypeFil;
  texte: string;
  auteur: string;
  auteurId: string | null;
  destinataire: string | null;
  dateCible: string | null;
  lot: string | null;
  statutSignalement: StatutSignalement | null;
  motif: string | null;
  visiblePar: string[];
  fichier: { nom: string; type: string; taille: number } | null;
  creeLe: string;
};

export type ParticipantVu = { compteId: string; nom: string; role: Appelant["role"]; qualite: string };

export async function lireParticipants(chantierId: string): Promise<ParticipantVu[]> {
  return db
    .select({ compteId: comptes.id, nom: comptes.nom, role: comptes.role, qualite: participants.qualite })
    .from(participants)
    .innerJoin(comptes, eq(participants.compteId, comptes.id))
    .where(eq(participants.chantierId, chantierId))
    .orderBy(asc(comptes.nom));
}

// Les lots : interne seulement. Un externe reçoit une liste vide, pas une liste cachée.
export async function lireLots(qui: Appelant, chantierId: string): Promise<LotVu[]> {
  if (!voitLInterne(qui.role)) return [];
  const lignes = await db
    .select({ lot: lots, fournisseur: comptes.nom })
    .from(lots)
    .leftJoin(comptes, eq(lots.fournisseurId, comptes.id))
    .where(eq(lots.chantierId, chantierId))
    .orderBy(asc(lots.creeLe));
  const jour = aujourdhuiParis();
  return lignes.map(({ lot, fournisseur }) => ({
    id: lot.id,
    nom: lot.nom,
    statut: lot.statut,
    livraisonPrevue: lot.livraisonPrevue,
    finPrevue: lot.finPrevue,
    fournisseur,
    enRetard: lotEnRetard(lot, jour),
  }));
}

// Le fil, dans l'ordre chronologique, filtré sur le serveur : un externe ne reçoit
// que ce qu'il a le droit de voir.
export async function lireFil(qui: Appelant, chantierId: string): Promise<ElementVu[]> {
  const lignes = await db.select().from(fil).where(eq(fil.chantierId, chantierId)).orderBy(asc(fil.creeLe));
  const visibles = lignes.filter((e) => voitElement(qui, e));
  const ids = [...new Set(visibles.flatMap((e) => [e.auteurId, e.destinataireId].filter(Boolean) as string[]))];
  const noms = ids.length ? await db.select({ id: comptes.id, nom: comptes.nom }).from(comptes).where(inArray(comptes.id, ids)) : [];
  const nomDe = new Map(noms.map((n) => [n.id, n.nom]));
  const lotsDuChantier = voitLInterne(qui.role)
    ? await db.select({ id: lots.id, nom: lots.nom }).from(lots).where(eq(lots.chantierId, chantierId))
    : [];
  const nomLot = new Map(lotsDuChantier.map((l) => [l.id, l.nom]));
  return visibles.map((e) => ({
    id: e.id,
    type: e.type,
    texte: e.texte,
    // Un élément venu du flux de nuit n'a pas de compte, seulement un nom.
    auteur: e.auteurId ? (nomDe.get(e.auteurId) ?? "Compte supprimé") : `${e.auteurNom ?? "Inconnu"} (flux de nuit)`,
    auteurId: e.auteurId,
    destinataire: e.destinataireId ? (nomDe.get(e.destinataireId) ?? null) : null,
    dateCible: e.dateCible,
    lot: e.lotId ? (nomLot.get(e.lotId) ?? null) : null,
    statutSignalement: e.statutSignalement,
    motif: e.motif,
    // Un externe n'a pas à savoir qui d'autre voit l'élément.
    visiblePar: voitLInterne(qui.role) ? e.visiblePar : [],
    // L'adresse du fichier ne part jamais vers le navigateur : seulement son nom.
    fichier: e.fichierUrl ? { nom: e.fichierNom ?? "fichier", type: e.fichierType ?? "", taille: e.fichierTaille ?? 0 } : null,
    creeLe: e.creeLe.toISOString(),
  }));
}

// Ce que les règles d'étapes ont besoin de savoir, lu en base.
export async function contexteChantier(chantierId: string, debutPrevu: string | null): Promise<ContexteChantier> {
  const [lesLots, elements] = await Promise.all([
    db.select({ nom: lots.nom, statut: lots.statut }).from(lots).where(eq(lots.chantierId, chantierId)),
    db.select({ type: fil.type, statutSignalement: fil.statutSignalement }).from(fil).where(eq(fil.chantierId, chantierId)),
  ]);
  return {
    debutPrevu,
    aujourdhui: aujourdhuiParis(),
    nbDocuments: elements.filter((e) => e.type === "document").length,
    lots: lesLots,
    signalementsAQualifier: elements.filter((e) => e.statutSignalement === "a_qualifier").length,
    reservesOuvertes: elements.filter((e) => e.statutSignalement === "reserve_ouverte").length,
  };
}

export async function estParticipant(chantierId: string, compteId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.chantierId, chantierId), eq(participants.compteId, compteId)))
    .limit(1);
  return Boolean(p);
}
