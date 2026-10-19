import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { lots } from "@/lib/db/schema";
import { DELAI_FOURNISSEUR_MAX_JOURS } from "@/lib/distances-regles";
import { journal } from "@/lib/journal";
import type { Appelant } from "@/lib/session";

// Les opérations sur les livraisons : la porte unique de AGENTS.md.
// qui appelle → a-t-il accès au chantier → a-t-il le droit → forme → règle → écrire → journaliser.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

// Le délai annoncé par le fournisseur d'un lot, en jours ouvrés (vide : on l'efface).
// Gérant et équipe, sur un chantier qui leur est accessible.
export async function fixerDelaiFournisseur(qui: Appelant | null, chantierId: string, lotId: string, valeur: string): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  const chantier = typeof chantierId === "string" && chantierId.length <= 120 ? await lireChantier(qui, chantierId) : null;
  if (!chantier) {
    journal("acces_refuse", { compte: qui.id, role: qui.role, chantier: String(chantierId).slice(0, 120) });
    return { ok: false, erreur: "Chantier introuvable." };
  }
  if (!voitLInterne(qui.role)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, chantier: chantierId, action: "delai_fournisseur" });
    return { ok: false, erreur: "Votre rôle ne permet pas cette action." };
  }

  const texte = typeof valeur === "string" ? valeur.trim() : "";
  let delai: number | null = null;
  if (texte !== "") {
    if (!/^\d{1,3}$/.test(texte) || Number(texte) > DELAI_FOURNISSEUR_MAX_JOURS) {
      return { ok: false, erreur: `Le délai est un nombre de jours ouvrés, de 0 à ${DELAI_FOURNISSEUR_MAX_JOURS}.` };
    }
    delai = Number(texte);
  }

  if (typeof lotId !== "string" || !lotId || lotId.length > 120) return { ok: false, erreur: "Lot introuvable." };
  // Le lot doit appartenir à ce chantier : un identifiant d'un autre chantier est refusé.
  const [lot] = await db.select({ id: lots.id, nom: lots.nom, avant: lots.delaiFournisseurJours }).from(lots).where(and(eq(lots.id, lotId), eq(lots.chantierId, chantierId))).limit(1);
  if (!lot) return { ok: false, erreur: "Lot introuvable." };

  await db.update(lots).set({ delaiFournisseurJours: delai }).where(eq(lots.id, lot.id));
  journal("delai_fournisseur", { compte: qui.id, chantier: chantierId, lot: lot.id, avant: lot.avant, apres: delai });
  revalidatePath(`/chantiers/${chantierId}`);
  return {
    ok: true,
    message: delai === null ? `${lot.nom} : délai du fournisseur effacé.` : `${lot.nom} : délai du fournisseur fixé à ${delai} jour${delai > 1 ? "s" : ""} ouvré${delai > 1 ? "s" : ""}.`,
  };
}
