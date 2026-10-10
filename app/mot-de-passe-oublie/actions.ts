"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { adresseDuSite, envoyerCourriel } from "@/lib/courriel";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { creerJeton } from "@/lib/jetons";
import { journal } from "@/lib/journal";
import { atteinte, noter } from "@/lib/limites";

export type EtatOubli = { envoye?: boolean; erreur?: string };

export async function demanderReinitialisation(_: EtatOubli, formData: FormData): Promise<EtatOubli> {
  const lu = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  if (!lu.success) return { erreur: "Adresse courriel invalide." };
  const email = lu.data;

  // Au-delà du plafond, on ne renvoie plus de courriel, mais la réponse reste la même.
  if (await atteinte("oubliParAdresse", email)) {
    journal("reinitialisation_bloquee", { email });
    return { envoye: true };
  }
  await noter("oubliParAdresse", email);

  const [compte] = await db.select({ id: comptes.id, fictif: comptes.fictif }).from(comptes).where(eq(comptes.email, email)).limit(1);
  if (compte && !compte.fictif) {
    const jeton = await creerJeton({ type: "reinitialisation", email });
    await envoyerCourriel({
      a: email,
      sujet: "Nouveau mot de passe groma",
      texte: `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure, une seule fois) :\n${await adresseDuSite()}/reinitialiser/${jeton}\n\nSi vous n'avez rien demandé, ignorez ce courriel.`,
    });
    journal("reinitialisation_demandee", { compte: compte.id });
  } else {
    journal("reinitialisation_inconnue", { email });
  }
  // Même réponse que l'adresse existe ou non : on ne révèle pas qui a un compte.
  return { envoye: true };
}
