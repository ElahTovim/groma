"use server";

// Les actions de l'écran des courriers : elles identifient l'appelant par sa session,
// puis passent par la porte unique (lib/operations/courriers.ts), qui vérifie tout.

import * as op from "@/lib/operations/courriers";
import { appelant } from "@/lib/session";

export type { Resultat } from "@/lib/operations/courriers";

export async function importerCourriers() {
  return op.importer(await appelant());
}

export async function relireCourrier(id: string) {
  return op.relire(await appelant(), id);
}

export async function validerCourrier(id: string, donnees: Record<string, string>) {
  return op.valider(await appelant(), id, donnees);
}

export async function rejeterCourrier(id: string, motif: string) {
  return op.rejeter(await appelant(), id, motif);
}
