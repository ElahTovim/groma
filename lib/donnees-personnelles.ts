import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentExecutions, chantiers, comptes, consentements, courriers, fil, jetonsMcp, participants, pieces, pvReception } from "@/lib/db/schema";
import { lireProfil } from "@/lib/profil";
import type { Appelant } from "@/lib/session";

// Les données personnelles d'une personne (RGPD, droit d'accès et de portabilité) :
// tout ce que groma garde sur elle, réuni en un fichier. Jamais son mot de passe (seule son
// empreinte est gardée, et elle n'est pas exportée), jamais les données des autres.
// Le registre des traitements : docs/registre-donnees.md.

export const DESTINATAIRES = {
  groma: "groma, l'éditeur du logiciel",
  entreprise: "l'entreprise qui utilise groma",
} as const;
export type Destinataire = keyof typeof DESTINATAIRES;

export async function consentementsActuels(compteId: string): Promise<Record<Destinataire, { accepte: boolean; le: string; version: string | null } | null>> {
  const lignes = await db.select().from(consentements).where(eq(consentements.compteId, compteId)).orderBy(desc(consentements.creeLe));
  const dernier = (d: Destinataire) => {
    const l = lignes.find((x) => x.destinataire === d);
    return l ? { accepte: l.accepte, le: l.creeLe.toISOString(), version: l.versionPolitique } : null;
  };
  return { groma: dernier("groma"), entreprise: dernier("entreprise") };
}

export async function exporterMesDonnees(qui: Appelant) {
  const id = qui.id;
  const [[compte], mesParticipations, mesElements, demandesRecues, mesPieces, mesCourriers, mesPv, mesExecutions, mesConsentements, mesJetons, profil] = await Promise.all([
    db.select({ id: comptes.id, nom: comptes.nom, email: comptes.email, role: comptes.role, siren: comptes.siren, creeLe: comptes.creeLe }).from(comptes).where(eq(comptes.id, id)).limit(1),
    db.select({ chantier: chantiers.reference, nom: chantiers.nom, qualite: participants.qualite, inviteLe: participants.inviteLe }).from(participants).innerJoin(chantiers, eq(participants.chantierId, chantiers.id)).where(eq(participants.compteId, id)),
    db.select({ chantier: chantiers.reference, type: fil.type, texte: fil.texte, fichier: fil.fichierNom, date: fil.creeLe }).from(fil).innerJoin(chantiers, eq(fil.chantierId, chantiers.id)).where(eq(fil.auteurId, id)),
    db.select({ chantier: chantiers.reference, texte: fil.texte, echeance: fil.dateCible, date: fil.creeLe }).from(fil).innerJoin(chantiers, eq(fil.chantierId, chantiers.id)).where(and(eq(fil.destinataireId, id), eq(fil.type, "demande"))),
    db.select({ type: pieces.type, fichier: pieces.fichierNom, delivreeLe: pieces.delivreeLe, expireLe: pieces.expireLe, statut: pieces.statut, deposeeLe: pieces.creeLe }).from(pieces).where(eq(pieces.compteId, id)),
    db.select({ id: courriers.id, recuLe: courriers.recuLe, texte: courriers.texte }).from(courriers).where(eq(courriers.deposePar, id)),
    db.select({ chantier: chantiers.reference, dateReception: pvReception.dateReception, signeLe: pvReception.signeLe, signeNom: pvReception.signeNom }).from(pvReception).innerJoin(chantiers, eq(pvReception.chantierId, chantiers.id)).where(eq(pvReception.signataireId, id)),
    db.select({ demande: agentExecutions.demande, statut: agentExecutions.statut, date: agentExecutions.debut }).from(agentExecutions).where(eq(agentExecutions.compteId, id)),
    db.select({ destinataire: consentements.destinataire, accepte: consentements.accepte, version: consentements.versionPolitique, le: consentements.creeLe }).from(consentements).where(eq(consentements.compteId, id)).orderBy(consentements.creeLe),
    db.select({ nom: jetonsMcp.nom, creeLe: jetonsMcp.creeLe, derniereUtilisation: jetonsMcp.derniereUtilisation, revoqueLe: jetonsMcp.revoqueLe }).from(jetonsMcp).where(eq(jetonsMcp.compteId, id)),
    lireProfil(),
  ]);
  return {
    export: { le: new Date().toISOString(), par: "groma", responsable: profil.nom, note: "Vos données personnelles telles que groma les garde. Le mot de passe n'y figure pas : groma n'en garde qu'une empreinte, illisible." },
    compte,
    chantiersOuVousEtesInvite: mesParticipations,
    ceQueVousAvezEcrit: mesElements,
    demandesQuiVousSontAdressees: demandesRecues,
    piecesDeposees: mesPieces,
    courriersDeposes: mesCourriers,
    pvSignes: mesPv,
    demandesALAssistant: mesExecutions,
    autorisations: mesConsentements,
    jetonsClaude: mesJetons,
  };
}

// À la création d'un compte : la décision de la personne sur ses deux autorisations, cochée ou non.
export async function noterAutorisationsInitiales(compteId: string, choix: { groma: boolean; entreprise: boolean }) {
  const profil = await lireProfil();
  await db.insert(consentements).values([
    { compteId, destinataire: "groma", accepte: choix.groma, versionPolitique: "groma-2026-10" },
    { compteId, destinataire: "entreprise", accepte: choix.entreprise, versionPolitique: profil.politiqueModifieeLe },
  ]);
}
