"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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
    if (e instanceof AuthError) {
      return { erreur: "Adresse ou mot de passe incorrect." };
    }
    throw e; // la redirection après succès passe par ici
  }
}
