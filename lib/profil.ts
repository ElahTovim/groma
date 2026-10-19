import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profilEntreprise } from "@/lib/db/schema";

// Le profil de l'entreprise qui utilise groma : son nom (imprimé sur les PV) et son dépôt
// (départ des trajets et des zones de déplacement). Le gérant le règle dans Réglages.
// Tant qu'il ne l'a pas fait, les anciennes variables ENTREPRISE_NOM et DEPOT_ADRESSE servent
// de valeur de départ, pour la transition.

export type Profil = {
  nom: string;
  depot: { adresse: string; codePostal: string; ville: string; latitude: number | null; longitude: number | null } | null;
  regle: boolean; // false : rien n'a encore été saisi dans Réglages
};

export const NOM_PAR_DEFAUT = "L'entreprise";

export async function lireProfil(): Promise<Profil> {
  const [p] = await db.select().from(profilEntreprise).where(eq(profilEntreprise.id, 1)).limit(1);
  if (p)
    return {
      nom: p.nom,
      depot: p.depotAdresse ? { adresse: p.depotAdresse, codePostal: p.depotCodePostal ?? "", ville: p.depotVille ?? "", latitude: p.depotLatitude, longitude: p.depotLongitude } : null,
      regle: true,
    };
  const ancien = process.env.DEPOT_ADRESSE?.trim();
  return { nom: process.env.ENTREPRISE_NOM?.trim() || NOM_PAR_DEFAUT, depot: ancien ? { adresse: ancien, codePostal: "", ville: "", latitude: null, longitude: null } : null, regle: false };
}
