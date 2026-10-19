"use server";

// Les actions de la carte « Livraisons et trajets » : elles identifient l'appelant
// par sa session, puis passent par la porte unique (lib/operations/livraisons.ts).

import * as op from "@/lib/operations/livraisons";
import { appelant } from "@/lib/session";

export async function fixerDelaiFournisseur(chantierId: string, lotId: string, valeur: string) {
  return op.fixerDelaiFournisseur(await appelant(), chantierId, lotId, valeur);
}
