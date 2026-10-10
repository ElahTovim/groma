"use server";

import { AuthError } from "next-auth";
import { signIn, TropDeTentatives } from "@/auth";

export type EtatConnexion = { erreur?: string };

export async function seConnecter(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      motDePasse: formData.get("motDePasse"),
      redirectTo: "/",
    });
    return {};
  } catch (e) {
    if (e instanceof TropDeTentatives || (e instanceof AuthError && (e as { code?: string }).code === "trop_de_tentatives")) {
      return { erreur: "Trop de tentatives. Réessayez dans 15 minutes, ou utilisez « Mot de passe oublié ? »." };
    }
    if (e instanceof AuthError) {
      return { erreur: "Adresse ou mot de passe incorrect." };
    }
    throw e; // la redirection après succès passe par ici
  }
}
