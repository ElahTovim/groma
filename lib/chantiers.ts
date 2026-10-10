import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { equipeVoitTout, peutVoirChantier, voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { chantiers, comptes, fil, lots, participants, type StatutChantier } from "@/lib/db/schema";
import { aujourdhuiParis, lotEnRetard, poidsATraiter, type ATraiter } from "@/lib/regles";
import { STATUTS } from "@/lib/chantier-forme";
import type { Appelant } from "@/lib/session";

// Le chantier tel qu'un écran a le droit de le voir : le montant n'existe pas
// pour un externe, il n'est même pas envoyé.
export type ChantierVu = {
  id: string;
  reference: string;
  nom: string;
  client: string;
  adresse: string;
  codePostal: string;
  ville: string;
  statut: StatutChantier;
  debutPrevu: string | null;
  finPrevue: string | null;
  montantHt: string | null | undefined;
  latitude: number | null;
  longitude: number | null;
  aPhoto: boolean;
};

export type ChantierListe = ChantierVu & { aTraiter: ATraiter | null };

function filtrerPour(qui: Appelant, c: typeof chantiers.$inferSelect): ChantierVu {
  return {
    id: c.id,
    reference: c.reference,
    nom: c.nom,
    client: c.client,
    adresse: c.adresse,
    codePostal: c.codePostal,
    ville: c.ville,
    statut: c.statut,
    debutPrevu: c.debutPrevu,
    finPrevue: c.finPrevue,
    montantHt: voitLInterne(qui.role) ? c.montantHt : undefined,
    latitude: c.latitude,
    longitude: c.longitude,
    aPhoto: Boolean(c.photoUrl),
  };
}

// La condition d'accès traduite pour la base : mêmes règles que peutVoirChantier.
function conditionAcces(qui: Appelant) {
  if (qui.role === "gerant" || (qui.role === "equipe" && equipeVoitTout())) return undefined;
  return sql`exists (select 1 from ${participants} where ${participants.chantierId} = ${chantiers.id} and ${participants.compteId} = ${qui.id})`;
}

export const ONGLET_A_TRAITER = "a_traiter";

export async function listerChantiers(qui: Appelant, filtres: { statut?: string; q?: string }): Promise<ChantierListe[]> {
  const conditions = [conditionAcces(qui)];
  if (filtres.statut && (STATUTS as string[]).includes(filtres.statut)) {
    conditions.push(eq(chantiers.statut, filtres.statut as StatutChantier));
  }
  if (filtres.q) {
    const motif = `%${filtres.q}%`;
    conditions.push(or(ilike(chantiers.nom, motif), ilike(chantiers.client, motif), ilike(chantiers.ville, motif), ilike(chantiers.reference, motif)));
  }
  const lignes = await db
    .select()
    .from(chantiers)
    .where(and(...conditions))
    .orderBy(desc(chantiers.creeLe))
    .limit(200);
  const vus = lignes.map((c) => filtrerPour(qui, c));
  const aTraiter = voitLInterne(qui.role) ? await compterATraiter(vus.map((c) => c.id)) : new Map<string, ATraiter>();
  const liste = vus.map((c) => ({ ...c, aTraiter: aTraiter.get(c.id) ?? (voitLInterne(qui.role) ? { lotsEnRetard: 0, aQualifier: 0, reservesOuvertes: 0 } : null) }));
  const filtree = filtres.statut === ONGLET_A_TRAITER ? liste.filter((c) => poidsATraiter(c.aTraiter) > 0) : liste;
  // Ce qui demande de l'attention remonte en tête ; à égalité, le plus récent d'abord.
  return filtree.sort((a, b) => poidsATraiter(b.aTraiter) - poidsATraiter(a.aTraiter));
}

export async function compterATraiter(ids: string[]): Promise<Map<string, ATraiter>> {
  const resultat = new Map<string, ATraiter>();
  if (ids.length === 0) return resultat;
  const [lesLots, signalements] = await Promise.all([
    db.select({ chantierId: lots.chantierId, statut: lots.statut, livraisonPrevue: lots.livraisonPrevue, finPrevue: lots.finPrevue }).from(lots).where(inArray(lots.chantierId, ids)),
    db.select({ chantierId: fil.chantierId, statut: fil.statutSignalement }).from(fil).where(and(inArray(fil.chantierId, ids), eq(fil.type, "signalement"))),
  ]);
  const jour = aujourdhuiParis();
  const de = (id: string) => resultat.get(id) ?? (resultat.set(id, { lotsEnRetard: 0, aQualifier: 0, reservesOuvertes: 0 }), resultat.get(id)!);
  for (const l of lesLots) if (lotEnRetard(l, jour)) de(l.chantierId).lotsEnRetard++;
  for (const s of signalements) {
    if (s.statut === "a_qualifier") de(s.chantierId).aQualifier++;
    if (s.statut === "reserve_ouverte") de(s.chantierId).reservesOuvertes++;
  }
  return resultat;
}

// Le nombre de chantiers visibles par statut, pour les onglets.
export async function compterParStatut(qui: Appelant): Promise<Partial<Record<StatutChantier, number>>> {
  const lignes = await db.select({ statut: chantiers.statut, n: count() }).from(chantiers).where(conditionAcces(qui)).groupBy(chantiers.statut);
  return Object.fromEntries(lignes.map((l) => [l.statut, l.n]));
}

// null si le chantier n'existe pas OU si l'appelant n'y a pas accès : l'écran dit
// « introuvable » dans les deux cas, pour ne rien révéler.
export async function lireChantier(qui: Appelant, id: string): Promise<ChantierVu | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [c] = await db.select().from(chantiers).where(eq(chantiers.id, id)).limit(1);
  if (!c) return null;
  const [p] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.chantierId, id), eq(participants.compteId, qui.id)))
    .limit(1);
  if (!peutVoirChantier({ role: qui.role, estParticipant: Boolean(p), equipeVoitTout: equipeVoitTout() })) return null;
  return filtrerPour(qui, c);
}

export async function listerParticipants(chantierId: string) {
  return db
    .select({ id: participants.id, nom: comptes.nom, role: comptes.role, qualite: participants.qualite })
    .from(participants)
    .innerJoin(comptes, eq(participants.compteId, comptes.id))
    .where(eq(participants.chantierId, chantierId))
    .orderBy(comptes.nom);
}

// Références lisibles : CH-2026-0042.
export async function prochaineReference(annee = new Date().getFullYear()): Promise<string> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chantiers)
    .where(ilike(chantiers.reference, `CH-${annee}-%`));
  return `CH-${annee}-${String(n + 1).padStart(4, "0")}`;
}
