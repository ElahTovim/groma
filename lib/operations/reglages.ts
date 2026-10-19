import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { profilEntreprise } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { geolocaliser } from "@/lib/meteo";
import type { Appelant } from "@/lib/session";

// Les réglages de l'entreprise : la porte unique de AGENTS.md. Gérant seulement.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

const formulaireProfil = z.object({
  nom: z.string().trim().min(2, "Indiquez le nom de l'entreprise.").max(120, "Nom trop long."),
  adresse: z.string().trim().max(200),
  codePostal: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}$/.test(v), "Code postal à 5 chiffres."),
  ville: z.string().trim().max(100),
});

export async function modifierProfil(qui: Appelant | null, champs: Record<string, string>): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (qui.role !== "gerant") {
    journal("action_refusee", { compte: qui.id, role: qui.role, action: "profil_entreprise" });
    return { ok: false, erreur: "Seul le gérant règle le profil de l'entreprise." };
  }
  const lu = formulaireProfil.safeParse(champs);
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const { nom, adresse, codePostal, ville } = lu.data;
  const avecDepot = adresse !== "";
  if (avecDepot && (!codePostal || !ville)) return { ok: false, erreur: "Complétez le code postal et la ville du dépôt." };

  // Le dépôt est géolocalisé une fois, ici : les trajets partent de ces coordonnées.
  const coords = avecDepot ? await geolocaliser(adresse, codePostal, ville) : null;
  const valeurs = {
    nom,
    depotAdresse: avecDepot ? adresse : null,
    depotCodePostal: avecDepot ? codePostal : null,
    depotVille: avecDepot ? ville : null,
    depotLatitude: coords?.latitude ?? null,
    depotLongitude: coords?.longitude ?? null,
    modifiePar: qui.id,
    modifieLe: new Date(),
  };
  await db.insert(profilEntreprise).values({ id: 1, ...valeurs }).onConflictDoUpdate({ target: profilEntreprise.id, set: valeurs });
  journal("profil_entreprise", { compte: qui.id, depot: avecDepot, geolocalise: Boolean(coords) });
  revalidatePath("/", "layout");
  if (avecDepot && !coords) return { ok: true, message: "Enregistré. L'adresse du dépôt n'a pas été trouvée sur la carte : vérifiez-la, les trajets ne pourront pas être calculés." };
  return { ok: true, message: "Profil de l'entreprise enregistré." };
}
