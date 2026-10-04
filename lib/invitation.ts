import { z } from "zod";
import { MOT_DE_PASSE_MIN } from "@/lib/installation";

// Ce qui ne dépend pas de la base, testable seul.

export const QUALITES_SUGGEREES = ["chef d'équipe", "client", "architecte", "ingénieur", "syndic", "fournisseur"];

export const formulaireInvitation = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse courriel invalide.")),
  role: z.enum(["equipe", "externe"], { message: "Choisissez le rôle : équipe ou externe." }),
  // Un libellé libre : un nouveau métier s'ajoute sans toucher au code.
  qualite: z.string().trim().min(1, "Indiquez à quel titre la personne est invitée.").max(60, "Qualité trop longue."),
});

export const formulaireCompte = z
  .object({
    nom: z.string().trim().min(1, "Indiquez votre nom."),
    motDePasse: z.string().min(MOT_DE_PASSE_MIN, `Le mot de passe doit faire au moins ${MOT_DE_PASSE_MIN} caractères.`),
    confirmation: z.string(),
  })
  .refine((d) => d.motDePasse === d.confirmation, { message: "Les deux mots de passe ne sont pas identiques.", path: ["confirmation"] });

export const formulaireNouveauMotDePasse = z
  .object({
    motDePasse: z.string().min(MOT_DE_PASSE_MIN, `Le mot de passe doit faire au moins ${MOT_DE_PASSE_MIN} caractères.`),
    confirmation: z.string(),
  })
  .refine((d) => d.motDePasse === d.confirmation, { message: "Les deux mots de passe ne sont pas identiques.", path: ["confirmation"] });
