"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { journal } from "@/lib/journal";
import { rejouerJeuDeDonnees } from "@/lib/semer";
import { appelant } from "@/lib/session";

export type EtatJeu = { message?: string; erreur?: string };

export async function rejouerJeu(): Promise<EtatJeu> {
  const qui = await appelant();
  if (!qui) redirect("/connexion");
  if (qui.role !== "gerant") {
    journal("jeu_refuse", { compte: qui.id, role: qui.role });
    return { erreur: "Seul le gérant peut rejouer le jeu de données." };
  }
  const motDePasse = process.env.JEU_MOT_DE_PASSE;
  if (!motDePasse) return { erreur: "Le mot de passe des comptes fictifs n'est pas réglé (JEU_MOT_DE_PASSE)." };

  try {
    const n = await rejouerJeuDeDonnees(motDePasse);
    journal("jeu_rejoue", { compte: qui.id, ...n });
    revalidatePath("/chantiers");
    return { message: `Jeu de données rejoué : ${n.chantiers} chantiers, ${n.comptes} personnes fictives.` };
  } catch (e) {
    journal("jeu_echec", { compte: qui.id, erreur: String(e) });
    return { erreur: "Le jeu de données n'a pas pu être rejoué. Rien n'a été modifié." };
  }
}
