"use server";

// Les actions de la fiche chantier, appelées par l'écran : elles identifient
// l'appelant par sa session, puis passent par la porte unique (lib/operations/chantier.ts).

import * as op from "@/lib/operations/chantier";
import { appelant } from "@/lib/session";

export type { Resultat, ResultatInvitation, ResultatRecherche } from "@/lib/operations/chantier";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SansAppelant<F> = F extends (qui: any, ...a: infer A) => infer R ? [A, R] : never;

export async function avancerChantier(...a: SansAppelant<typeof op.avancerChantier>[0]): SansAppelant<typeof op.avancerChantier>[1] {
  return op.avancerChantier(await appelant(), ...a);
}

export async function annulerChantier(...a: SansAppelant<typeof op.annulerChantier>[0]): SansAppelant<typeof op.annulerChantier>[1] {
  return op.annulerChantier(await appelant(), ...a);
}

export async function fixerDebut(...a: SansAppelant<typeof op.fixerDebut>[0]): SansAppelant<typeof op.fixerDebut>[1] {
  return op.fixerDebut(await appelant(), ...a);
}

export async function ajouterLot(...a: SansAppelant<typeof op.ajouterLot>[0]): SansAppelant<typeof op.ajouterLot>[1] {
  return op.ajouterLot(await appelant(), ...a);
}

export async function avancerLot(...a: SansAppelant<typeof op.avancerLot>[0]): SansAppelant<typeof op.avancerLot>[1] {
  return op.avancerLot(await appelant(), ...a);
}

export async function ecrireDansLeFil(...a: SansAppelant<typeof op.ecrireDansLeFil>[0]): SansAppelant<typeof op.ecrireDansLeFil>[1] {
  return op.ecrireDansLeFil(await appelant(), ...a);
}

export async function partagerElement(...a: SansAppelant<typeof op.partagerElement>[0]): SansAppelant<typeof op.partagerElement>[1] {
  return op.partagerElement(await appelant(), ...a);
}

export async function qualifierSignalement(...a: SansAppelant<typeof op.qualifierSignalement>[0]): SansAppelant<typeof op.qualifierSignalement>[1] {
  return op.qualifierSignalement(await appelant(), ...a);
}

export async function changerPhoto(...a: SansAppelant<typeof op.changerPhoto>[0]): SansAppelant<typeof op.changerPhoto>[1] {
  return op.changerPhoto(await appelant(), ...a);
}

export async function inviter(...a: SansAppelant<typeof op.inviter>[0]): SansAppelant<typeof op.inviter>[1] {
  return op.inviter(await appelant(), ...a);
}

export async function chercherEntreprise(...a: SansAppelant<typeof op.chercherEntreprise>[0]): SansAppelant<typeof op.chercherEntreprise>[1] {
  return op.chercherEntreprise(await appelant(), ...a);
}

export async function lierEntreprise(...a: SansAppelant<typeof op.lierEntreprise>[0]): SansAppelant<typeof op.lierEntreprise>[1] {
  return op.lierEntreprise(await appelant(), ...a);
}

export async function delierEntreprise(...a: SansAppelant<typeof op.delierEntreprise>[0]): SansAppelant<typeof op.delierEntreprise>[1] {
  return op.delierEntreprise(await appelant(), ...a);
}

export async function preparerPv(...a: SansAppelant<typeof op.preparerPv>[0]): SansAppelant<typeof op.preparerPv>[1] {
  return op.preparerPv(await appelant(), ...a);
}

export async function signerPv(...a: SansAppelant<typeof op.signerPv>[0]): SansAppelant<typeof op.signerPv>[1] {
  return op.signerPv(await appelant(), ...a);
}

export async function exigerVigilance(...a: SansAppelant<typeof op.exigerVigilance>[0]): SansAppelant<typeof op.exigerVigilance>[1] {
  return op.exigerVigilance(await appelant(), ...a);
}

export async function deposerAttestation(...a: SansAppelant<typeof op.deposerAttestation>[0]): SansAppelant<typeof op.deposerAttestation>[1] {
  return op.deposerAttestation(await appelant(), ...a);
}
