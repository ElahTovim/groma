import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { envoyerCourriel } from "@/lib/courriel";
import { db } from "@/lib/db";
import { chantiers, comptes, exigencesPieces, participants, pieces, relancesPieces } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { estClePiece, etatPiece, libelleEtat, palierDeRelance, piecesBloquantes, TYPES_PIECES, type ClePiece, type Etape, type EtatPiece, type StatutPiece } from "@/lib/pieces-regles";
import { aujourdhuiParis } from "@/lib/regles";

// Les pièces attendues : lire ce qu'on attend sur un chantier, et l'état de chaque pièce.
// Les écritures passent par la porte unique (lib/operations/pieces.ts).

export type PieceVue = {
  id: string;
  fichierNom: string;
  delivreeLe: string | null;
  expireLe: string | null;
  statut: StatutPiece;
  motif: string | null;
  codeSecurite: string | null;
  deposeLe: string;
};

export type ExigenceVue = {
  id: string;
  type: ClePiece;
  libelle: string;
  compteId: string | null; // vide : une pièce du chantier
  qui: string | null; // le nom de l'intervenant
  bloque: Etape | null;
  piece: PieceVue | null;
  etat: EtatPiece;
};

type LignePiece = typeof pieces.$inferSelect;

function vue(p: LignePiece): PieceVue {
  return { id: p.id, fichierNom: p.fichierNom, delivreeLe: p.delivreeLe, expireLe: p.expireLe, statut: p.statut, motif: p.motif, codeSecurite: p.codeSecurite, deposeLe: p.creeLe.toISOString() };
}

// La pièce la plus récente de chaque intervenant (pour un type), ou du chantier.
async function dernieresPieces(chantierId: string, compteIds: string[]) {
  const lignes = await db
    .select()
    .from(pieces)
    .where(or(eq(pieces.chantierId, chantierId), compteIds.length ? inArray(pieces.compteId, compteIds) : undefined))
    .orderBy(desc(pieces.creeLe));
  const parCle = new Map<string, LignePiece>();
  for (const p of lignes) {
    // Une pièce d'intervenant sert partout ; une pièce de chantier, ici seulement.
    const cle = TYPES_PIECES[p.type as ClePiece]?.niveau === "chantier" ? `chantier:${p.chantierId}:${p.compteId ?? ""}:${p.type}` : `compte:${p.compteId}:${p.type}`;
    if (!parCle.has(cle)) parCle.set(cle, p);
  }
  return parCle;
}

export async function lireExigences(chantierId: string, aujourdhui = aujourdhuiParis()): Promise<ExigenceVue[]> {
  const lignes = await db
    .select({ x: exigencesPieces, nom: comptes.nom })
    .from(exigencesPieces)
    .leftJoin(comptes, eq(exigencesPieces.compteId, comptes.id))
    .where(eq(exigencesPieces.chantierId, chantierId))
    .orderBy(exigencesPieces.creeLe);
  const valides = lignes.filter((l) => estClePiece(l.x.type));
  const dernieres = await dernieresPieces(chantierId, [...new Set(valides.map((l) => l.x.compteId).filter((c): c is string => Boolean(c)))]);
  return valides.map(({ x, nom }) => {
    const type = x.type as ClePiece;
    const t = TYPES_PIECES[type];
    const cle = t.niveau === "chantier" ? `chantier:${chantierId}:${x.compteId ?? ""}:${type}` : `compte:${x.compteId}:${type}`;
    const p = dernieres.get(cle) ?? null;
    return {
      id: x.id,
      type,
      libelle: t.libelle,
      compteId: x.compteId,
      qui: nom,
      bloque: x.bloque === "demarrage" || x.bloque === "cloture" ? x.bloque : null,
      piece: p && vue(p),
      etat: etatPiece(p && { statut: p.statut, expireLe: p.expireLe, motif: p.motif }, aujourdhui),
    };
  });
}

// Pour la règle d'étapes (lib/regles.ts) : ce qui manque pour démarrer, et pour clore.
export async function blocagesDuChantier(chantierId: string): Promise<{ demarrage: string[]; cloture: string[] }> {
  const x = await lireExigences(chantierId);
  return { demarrage: piecesBloquantes(x, "demarrage"), cloture: piecesBloquantes(x, "cloture") };
}

// Pour le récapitulatif du matin : les pièces qui manquent, sur les chantiers en jeu.
export async function piecesAObtenir(chantierIds: string[]): Promise<{ chantierId: string; qui: string | null; libelle: string; etat: string }[]> {
  const resultat: { chantierId: string; qui: string | null; libelle: string; etat: string }[] = [];
  for (const id of chantierIds) {
    for (const x of await lireExigences(id)) {
      if (x.etat.etat !== "valide" && x.etat.etat !== "a_valider") resultat.push({ chantierId: id, qui: x.qui, libelle: x.libelle, etat: libelleEtat(x.etat) });
    }
  }
  return resultat;
}

export type BilanRelances = { exigees: number; relancees: number; dejaRelancees: number };

// La nuit : chaque intervenant dont une pièce manque, a été refusée, expire bientôt ou a expiré
// reçoit un courriel, une seule fois par pièce, palier et échéance, pour tous ses chantiers en cours.
export async function relancerPieces(site: string): Promise<BilanRelances> {
  const actifs = await db
    .select({ id: chantiers.id, reference: chantiers.reference, nom: chantiers.nom })
    .from(chantiers)
    .where(and(ne(chantiers.statut, "clos"), ne(chantiers.statut, "annule")));
  const bilan: BilanRelances = { exigees: 0, relancees: 0, dejaRelancees: 0 };
  // compte → type → { état, chantiers }
  const aRelancer = new Map<string, Map<ClePiece, { etat: EtatPiece; libelle: string; chantiers: string[] }>>();
  for (const c of actifs) {
    for (const x of await lireExigences(c.id)) {
      if (!x.compteId) continue; // une pièce du chantier attend l'équipe : elle est au récapitulatif
      bilan.exigees++;
      if (!palierDeRelance(x.etat)) continue;
      const parType = aRelancer.get(x.compteId) ?? new Map();
      const e = parType.get(x.type) ?? { etat: x.etat, libelle: x.libelle, chantiers: [] };
      e.chantiers.push(`- ${c.reference} · ${c.nom} : ${site}/chantiers/${c.id}?onglet=documents`);
      parType.set(x.type, e);
      aRelancer.set(x.compteId, parType);
    }
  }
  if (aRelancer.size === 0) return bilan;
  const destinataires = await db
    .select({ id: comptes.id, nom: comptes.nom, email: comptes.email, fictif: comptes.fictif })
    .from(comptes)
    .where(inArray(comptes.id, [...aRelancer.keys()]));
  for (const d of destinataires) {
    if (d.fictif) continue;
    for (const [type, e] of aRelancer.get(d.id)!) {
      const r = palierDeRelance(e.etat)!;
      const [pose] = await db.insert(relancesPieces).values({ compteId: d.id, type, palier: r.palier, echeance: r.echeance }).onConflictDoNothing().returning({ id: relancesPieces.id });
      if (!pose) {
        bilan.dejaRelancees++;
        continue;
      }
      const envoi = await envoyerCourriel({
        a: d.email,
        sujet: `Pièce à fournir : ${e.libelle} (${libelleEtat(e.etat).toLowerCase()})`,
        texte: `Bonjour ${d.nom.split(" ")[0]},\n\nPour les chantiers ci-dessous, l'entreprise a besoin de : ${e.libelle}.\nÉtat actuel : ${libelleEtat(e.etat)}${"expireLe" in e.etat && e.etat.expireLe ? `, échéance le ${e.etat.expireLe}` : ""}${e.etat.etat === "refusee" && e.etat.motif ? ` (motif : ${e.etat.motif})` : ""}.\n\nDéposez-la depuis l'onglet Documents de la fiche du chantier :\n${e.chantiers.join("\n")}\n\nMerci.`,
      });
      if (envoi.ok) bilan.relancees++;
      else await db.delete(relancesPieces).where(eq(relancesPieces.id, pose.id));
    }
  }
  journal("pieces_relances", { ...bilan });
  return bilan;
}

// L'intervenant participe-t-il bien à ce chantier ? (pour exiger ou déposer une pièce)
export async function participe(chantierId: string, compteId: string): Promise<{ role: string } | null> {
  const [p] = await db
    .select({ role: comptes.role })
    .from(participants)
    .innerJoin(comptes, eq(participants.compteId, comptes.id))
    .where(and(eq(participants.chantierId, chantierId), eq(participants.compteId, compteId)))
    .limit(1);
  return p ?? null;
}

export async function exigence(chantierId: string, id: string) {
  const [x] = await db.select().from(exigencesPieces).where(and(eq(exigencesPieces.id, id), eq(exigencesPieces.chantierId, chantierId))).limit(1);
  return x ?? null;
}

export async function pieceDuChantier(chantierId: string, pieceId: string, compteIds: string[]) {
  const [p] = await db
    .select()
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), or(eq(pieces.chantierId, chantierId), compteIds.length ? and(inArray(pieces.compteId, compteIds), isNull(pieces.chantierId)) : undefined)))
    .limit(1);
  return p ?? null;
}
