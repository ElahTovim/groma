import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { equipeVoitTout, peutVoirChantier, voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { chantiers, comptes, fil, lots, participants, type StatutChantier } from "@/lib/db/schema";
import { aujourdhuiParis, lotEnRetard, poidsATraiter, reunirListe, type ATraiter } from "@/lib/regles";
import { STATUTS } from "@/lib/chantier-forme";
import { photoAffichee } from "@/lib/jeu-de-donnees";
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
  // Interne : un externe reçoit null.
  clientSiren: string | null;
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
    aPhoto: Boolean(photoAffichee(c.photoUrl, c.reference)),
    clientSiren: voitLInterne(qui.role) ? c.clientSiren : null,
  };
}

// La condition d'accès traduite pour la base : mêmes règles que peutVoirChantier.
function conditionAcces(qui: Appelant) {
  if (qui.role === "gerant" || (qui.role === "equipe" && equipeVoitTout())) return undefined;
  return sql`exists (select 1 from ${participants} where ${participants.chantierId} = ${chantiers.id} and ${participants.compteId} = ${qui.id})`;
}

export const ONGLET_A_TRAITER = "a_traiter";

// Le plafond d'une liste de chantiers à l'écran.
const PLAFOND_LISTE = 200;

// « Ce chantier attend un geste », traduit pour la base : un lot en retard (mêmes règles
// que retardsLot), un signalement à qualifier ou une réserve ouverte. Sert à trouver
// ces chantiers dans toute la base ; le décompte exact reste celui de compterATraiter.
function attendUnGeste(jour: string) {
  return sql`(exists (select 1 from ${lots} where ${lots.chantierId} = ${chantiers.id} and (
      (${lots.statut} in ('a_commander', 'commande') and ${lots.livraisonPrevue} < ${jour})
      or (${lots.statut} <> 'fini' and ${lots.finPrevue} < ${jour})))
    or exists (select 1 from ${fil} where ${fil.chantierId} = ${chantiers.id} and ${fil.type} = 'signalement'
      and ${fil.statutSignalement} in ('a_qualifier', 'reserve_ouverte')))`;
}

function conditionsListe(qui: Appelant, filtres: { statut?: string; q?: string }) {
  const conditions = [conditionAcces(qui)];
  if (filtres.statut && (STATUTS as string[]).includes(filtres.statut)) {
    conditions.push(eq(chantiers.statut, filtres.statut as StatutChantier));
  }
  if (filtres.q) {
    const motif = `%${filtres.q}%`;
    conditions.push(or(ilike(chantiers.nom, motif), ilike(chantiers.client, motif), ilike(chantiers.ville, motif), ilike(chantiers.reference, motif)));
  }
  return conditions;
}

// Combien de chantiers visibles attendent un geste, dans toute la base (le chiffre
// de l'onglet « À traiter » et de « À viser »). Rien pour un externe.
export async function compterAttendantUnGeste(qui: Appelant): Promise<number | null> {
  if (!voitLInterne(qui.role)) return null;
  const [{ n }] = await db
    .select({ n: count() })
    .from(chantiers)
    .where(and(conditionAcces(qui), attendUnGeste(aujourdhuiParis())));
  return n;
}

export async function listerChantiers(qui: Appelant, filtres: { statut?: string; q?: string }): Promise<ChantierListe[]> {
  const conditions = conditionsListe(qui, filtres);
  const interne = voitLInterne(qui.role);
  const lire = (urgents: boolean) =>
    db
      .select()
      .from(chantiers)
      .where(and(...conditions, urgents ? attendUnGeste(aujourdhuiParis()) : undefined))
      .orderBy(desc(chantiers.creeLe))
      .limit(PLAFOND_LISTE);
  // Pour l'équipe, ceux qui attendent un geste passent d'abord, même anciens.
  // L'onglet « À traiter » n'a besoin que d'eux.
  const [urgents, recents] = await Promise.all([
    interne ? lire(true) : Promise.resolve([]),
    filtres.statut === ONGLET_A_TRAITER && interne ? Promise.resolve([]) : lire(false),
  ]);
  const lignes = reunirListe(urgents, recents, PLAFOND_LISTE);
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

// L'avancement de chaque chantier : lots finis sur lots prévus. Les lots sont
// internes : on ne le calcule que pour l'équipe.
export async function avancementDes(qui: Appelant, ids: string[]): Promise<Map<string, { finis: number; total: number }>> {
  const avancement = new Map<string, { finis: number; total: number }>();
  if (!voitLInterne(qui.role) || ids.length === 0) return avancement;
  const lignes = await db.select({ chantierId: lots.chantierId, statut: lots.statut }).from(lots).where(inArray(lots.chantierId, ids));
  for (const l of lignes) {
    const a = avancement.get(l.chantierId) ?? { finis: 0, total: 0 };
    a.total++;
    if (l.statut === "fini") a.finis++;
    avancement.set(l.chantierId, a);
  }
  return avancement;
}
