import { z } from "zod";

export const MOT_DE_PASSE_MIN = 12;

export const formulaireInstallation = z
  .object({
    nom: z.string().trim().min(1, "Indiquez votre nom."),
    email: z.string().trim().toLowerCase().pipe(z.email("Adresse courriel invalide.")),
    motDePasse: z
      .string()
      .min(MOT_DE_PASSE_MIN, `Le mot de passe doit faire au moins ${MOT_DE_PASSE_MIN} caractères.`),
    confirmation: z.string(),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    message: "Les deux mots de passe ne sont pas identiques.",
    path: ["confirmation"],
  });

export type Verdict = { ok: true } | { ok: false; raison: string };

// La règle de la première installation : le compte gérant ne se crée qu'une
// fois, tant qu'aucun compte n'existe, et seulement avec l'adresse prévue
// dans les réglages (ADMIN_EMAIL).
export function peutInstaller(params: {
  email: string;
  emailPrevu: string | undefined;
  nombreDeComptes: number;
}): Verdict {
  if (params.nombreDeComptes > 0) {
    return { ok: false, raison: "L'installation est déjà faite. Connectez-vous." };
  }
  if (!params.emailPrevu) {
    return { ok: false, raison: "L'adresse du gérant n'est pas réglée (ADMIN_EMAIL)." };
  }
  if (params.email.trim().toLowerCase() !== params.emailPrevu.trim().toLowerCase()) {
    return { ok: false, raison: "Cette adresse n'est pas celle prévue pour le gérant." };
  }
  return { ok: true };
}
