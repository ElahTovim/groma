import { z } from "zod";
import type { StatutChantier } from "@/lib/db/schema";

// Ce qui ne dépend pas de la base : libellés et forme du formulaire, testables seuls.
export const LIBELLE_STATUT: Record<StatutChantier, string> = {
  devis: "Devis",
  signe: "Signé",
  planifie: "Planifié",
  en_cours: "En cours",
  reception: "Réception",
  clos: "Clos",
  annule: "Annulé",
};

export const STATUTS = Object.keys(LIBELLE_STATUT) as StatutChantier[];

// Le formulaire « Nouveau chantier ». Client et adresse sont obligatoires.
export const formulaireChantier = z.object({
  nom: z.string().trim().min(1, "Donnez un nom au chantier."),
  client: z.string().trim().min(1, "Indiquez le client."),
  adresse: z.string().trim().min(1, "Indiquez l'adresse du chantier."),
  codePostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Le code postal doit faire 5 chiffres."),
  ville: z.string().trim().min(1, "Indiquez la ville."),
  montantHt: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").replace(",", "."))
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0), "Montant invalide : un nombre, par exemple 18 500 ou 18500,50.")
    .transform((v) => (v === "" ? null : v)),
  debutPrevu: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date de début invalide."),
});
