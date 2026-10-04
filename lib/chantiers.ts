import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { equipeVoitTout, peutVoirChantier, voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { chantiers, comptes, participants, type StatutChantier } from "@/lib/db/schema";
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
};

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
  };
}

// La condition d'accès traduite pour la base : mêmes règles que peutVoirChantier.
function conditionAcces(qui: Appelant) {
  if (qui.role === "gerant" || (qui.role === "equipe" && equipeVoitTout())) return undefined;
  return sql`exists (select 1 from ${participants} where ${participants.chantierId} = ${chantiers.id} and ${participants.compteId} = ${qui.id})`;
}

export async function listerChantiers(qui: Appelant, filtres: { statut?: string; q?: string }): Promise<ChantierVu[]> {
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
  return lignes.map((c) => filtrerPour(qui, c));
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
