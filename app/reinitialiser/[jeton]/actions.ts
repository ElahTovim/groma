"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { formulaireNouveauMotDePasse } from "@/lib/invitation";
import { consommerJeton } from "@/lib/jetons";
import { journal } from "@/lib/journal";

export type EtatReinitialisation = { erreur?: string };

export async function reinitialiser(jeton: string, _: EtatReinitialisation, formData: FormData): Promise<EtatReinitialisation> {
  const lu = formulaireNouveauMotDePasse.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };

  const j = await consommerJeton(jeton, "reinitialisation");
  if (!j) return { erreur: "Ce lien n'est plus valable. Refaites une demande." };

  const [compte] = await db
    .update(comptes)
    .set({ motDePasseHash: await bcrypt.hash(lu.data.motDePasse, 12), versionSession: sql`${comptes.versionSession} + 1` })
    .where(eq(comptes.email, j.email))
    .returning({ id: comptes.id });
  // Les sessions ouvertes ailleurs avec l'ancien mot de passe sont révoquées (versionSession).
  journal("mot_de_passe_change", { compte: compte?.id });
  redirect("/connexion?reinitialise=1");
}
