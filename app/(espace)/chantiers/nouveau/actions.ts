"use server";

import { redirect } from "next/navigation";
import * as op from "@/lib/operations/chantier";
import { appelant } from "@/lib/session";

export type EtatNouveauChantier = { erreur?: string; champs?: Record<string, string> };

// Le formulaire de création : la session identifie l'appelant, la porte unique fait le reste.
export async function creerChantier(_: EtatNouveauChantier, formData: FormData): Promise<EtatNouveauChantier> {
  const champs = Object.fromEntries(formData) as Record<string, string>;
  const qui = await appelant();
  if (!qui) redirect("/connexion");
  const r = await op.creerChantier(qui, champs);
  if (!r.ok) return { erreur: r.erreur, champs };
  redirect(`/chantiers/${r.id}?cree=1`);
}
