"use server";

import { enregistrerAutorisation, modifierPolitique } from "@/lib/operations/donnees";
import { appelant } from "@/lib/session";

export async function autoriser(destinataire: string, accepte: boolean) {
  return enregistrerAutorisation(await appelant(), destinataire, accepte);
}

export async function enregistrerPolitique(texte: string) {
  return modifierPolitique(await appelant(), texte);
}
