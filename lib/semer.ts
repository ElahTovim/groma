import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chantiers, comptes, fil, lots, participants, propositions } from "@/lib/db/schema";
import { genererChantiers, PERSONNES, propositionsFictives } from "@/lib/jeu-de-donnees";
import { aujourdhuiParis } from "@/lib/regles";

// Rejoue le jeu de données : efface tout ce qui est marqué fictif, puis le recrée
// à l'identique. Les vrais comptes et les vrais chantiers ne sont jamais touchés.
// Le tout part en un seul lot : soit tout passe, soit rien.
export async function rejouerJeuDeDonnees(motDePasse: string) {
  const hash = await bcrypt.hash(motDePasse, 10);
  const idsComptes = PERSONNES.map(() => randomUUID());
  const lignesChantiers = genererChantiers().map((c) => ({ ...c, id: randomUUID(), idsFil: c.fil.map(() => randomUUID()) }));
  const aPropose = PERSONNES.findIndex((p) => p.role === "equipe");

  await db.batch([
    // Les participants partent avec leurs chantiers et leurs comptes (suppression en cascade).
    db.delete(chantiers).where(eq(chantiers.fictif, true)),
    db.delete(comptes).where(eq(comptes.fictif, true)),
    db.insert(comptes).values(
      PERSONNES.map((p, i) => ({ id: idsComptes[i], email: p.email, nom: p.nom, role: p.role, motDePasseHash: hash, fictif: true })),
    ),
    db.insert(chantiers).values(
      lignesChantiers.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { participants: _, lots: _l, fil: _f, idsFil: _i, ...chantier } = c;
        return { ...chantier, fictif: true };
      }),
    ),
    db.insert(lots).values(
      lignesChantiers.flatMap((c) =>
        c.lots.map((l) => ({ chantierId: c.id, nom: l.nom, statut: l.statut, livraisonPrevue: l.livraisonPrevue, finPrevue: l.finPrevue, fournisseurId: l.fournisseur === null ? null : idsComptes[l.fournisseur] })),
      ),
    ),
    db.insert(fil).values(
      lignesChantiers.flatMap((c) =>
        c.fil.map((e, k) => ({
          id: c.idsFil[k],
          chantierId: c.id,
          auteurId: idsComptes[e.auteur],
          type: e.type,
          texte: e.texte,
          destinataireId: e.destinataire === undefined ? null : idsComptes[e.destinataire],
          dateCible: e.dateCible ?? null,
          statutSignalement: e.statutSignalement ?? null,
          visiblePar: e.visiblePar.map((i) => idsComptes[i]),
          // Des heures décalées, pour que le fil se lise dans l'ordre.
          creeLe: new Date(Date.UTC(2026, 9, 1, 8 + k, 0)),
        })),
      ),
    ),
    db.insert(participants).values(
      lignesChantiers.flatMap((c) =>
        c.participants.map((i) => ({ chantierId: c.id, compteId: idsComptes[i], qualite: PERSONNES[i].qualite })),
      ),
    ),
    // Trois propositions de l'assistant en attente, pour que « À valider » ne soit pas vide en
    // démonstration. Elles partent avec leurs chantiers fictifs au prochain rejeu (cascade).
    db.insert(propositions).values(
      propositionsFictives(lignesChantiers).map((p) => {
        const c = lignesChantiers[p.chantier];
        const destinataire = PERSONNES[p.externe].nom;
        const contenu =
          p.type === "courriel"
            ? { destinataireId: idsComptes[p.externe], destinataire, sujet: p.sujet, texte: p.texte }
            : p.type === "demande_externe"
              ? { destinataireId: idsComptes[p.externe], destinataire, texte: p.texte, echeance: dansJours(p.dansJours) }
              : { elementId: c.idsFil[p.element], compteId: idsComptes[p.externe], destinataire, extrait: c.fil[p.element].texte.slice(0, 160) };
        return { proposePar: idsComptes[aPropose], chantierId: c.id, type: p.type, contenu };
      }),
    ),
  ]);

  return { comptes: PERSONNES.length, chantiers: lignesChantiers.length, propositions: propositionsFictives(lignesChantiers).length };
}

function dansJours(n: number): string {
  const [a, m, j] = aujourdhuiParis().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
}
