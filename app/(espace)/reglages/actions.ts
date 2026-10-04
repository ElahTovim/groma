"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { journal } from "@/lib/journal";
import { rejouerJeuDeDonnees } from "@/lib/semer";
import { appelant } from "@/lib/session";

export type EtatJeu = { message?: string; erreur?: string };

const MOT_DE_PASSE_JEU_MIN = 8;

// Le gérant choisit le mot de passe des comptes fictifs au moment du rejeu :
// il le connaît, et il ne vit nulle part ailleurs que dans les comptes (haché).
export async function rejouerJeu(_: EtatJeu, formData: FormData): Promise<EtatJeu> {
  const qui = await appelant();
  if (!qui) redirect("/connexion");
  if (qui.role !== "gerant") {
    journal("jeu_refuse", { compte: qui.id, role: qui.role });
    return { erreur: "Seul le gérant peut rejouer le jeu de données." };
  }
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (motDePasse.length < MOT_DE_PASSE_JEU_MIN) {
    return { erreur: `Le mot de passe des comptes fictifs doit faire au moins ${MOT_DE_PASSE_JEU_MIN} caractères.` };
  }

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

// Pour vérifier en vrai que Sentry reçoit les erreurs : une alerte jamais testée n'existe pas.
export async function erreurDeTest(): Promise<EtatJeu> {
  const qui = await appelant();
  if (!qui || qui.role !== "gerant") return { erreur: "Seul le gérant peut envoyer une erreur de test." };
  const Sentry = await import("@sentry/nextjs");
  const { dsnSentry } = await import("@/lib/sentry-dsn");
  if (!dsnSentry()) return { erreur: "Sentry n'est pas branché : la variable ne contient pas un DSN valable." };
  Sentry.captureException(new Error(`Erreur de test envoyée depuis les réglages par ${qui.id}`));
  await Sentry.flush(3000);
  journal("sentry_test", { compte: qui.id });
  return { message: "Erreur de test envoyée à Sentry. Elle doit apparaître dans Issues d'ici une minute." };
}
