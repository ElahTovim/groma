"use server";

import { revalidatePath } from "next/cache";
import { accepter, refuser, type Resultat } from "@/lib/operations/propositions";
import { appelant } from "@/lib/session";

// Les enveloppes de l'écran « À valider » : elles passent la session, l'opération vérifie tout.
export async function validerProposition(id: string, modifications: { sujet?: string; texte?: string }): Promise<Resultat> {
  const r = await accepter(await appelant(), id, modifications);
  revalidatePath("/", "layout");
  return r;
}

export async function refuserProposition(id: string, motif: string): Promise<Resultat> {
  const r = await refuser(await appelant(), id, motif);
  revalidatePath("/", "layout");
  return r;
}
