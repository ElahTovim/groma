import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { consentements, profilEntreprise } from "@/lib/db/schema";
import { DESTINATAIRES } from "@/lib/donnees-personnelles";
import { journal } from "@/lib/journal";
import { lireProfil, NOM_PAR_DEFAUT } from "@/lib/profil";
import type { Appelant } from "@/lib/session";

// Les autorisations de chacun et la politique de l'entreprise : la porte unique de AGENTS.md.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

export async function enregistrerAutorisation(qui: Appelant | null, destinataire: string, accepte: boolean): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!(destinataire in DESTINATAIRES)) return { ok: false, erreur: "Demande invalide." };
  const profil = await lireProfil();
  const [p] = await db.select({ le: profilEntreprise.politiqueModifieeLe }).from(profilEntreprise).limit(1);
  // On garde chaque décision, avec la version de la politique en vigueur : rien n'est écrasé.
  await db.insert(consentements).values({ compteId: qui.id, destinataire, accepte: accepte === true, versionPolitique: destinataire === "entreprise" ? (p?.le?.toISOString() ?? null) : "groma-2026-10" });
  journal("autorisation_donnees", { compte: qui.id, destinataire, accepte: accepte === true });
  revalidatePath("/mes-donnees");
  const qui_ = destinataire === "groma" ? "groma" : profil.nom === NOM_PAR_DEFAUT ? "l'entreprise" : profil.nom;
  return { ok: true, message: accepte ? `Autorisation donnée à ${qui_}.` : `Autorisation retirée à ${qui_}.` };
}

export async function modifierPolitique(qui: Appelant | null, texte: string): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (qui.role !== "gerant") return { ok: false, erreur: "Seul le gérant rédige la politique de l'entreprise." };
  const t = String(texte ?? "").trim();
  if (t.length > 20000) return { ok: false, erreur: "Texte trop long : 20 000 caractères au plus." };
  const profil = await lireProfil();
  const valeurs = { politiqueDonnees: t || null, politiqueModifieeLe: new Date(), modifiePar: qui.id, modifieLe: new Date() };
  await db
    .insert(profilEntreprise)
    .values({ id: 1, nom: profil.nom, ...valeurs })
    .onConflictDoUpdate({ target: profilEntreprise.id, set: valeurs });
  journal("politique_donnees", { compte: qui.id, longueur: t.length });
  revalidatePath("/mes-donnees");
  revalidatePath("/reglages");
  return { ok: true, message: "Politique enregistrée. Chacun la retrouve dans « Mes données »." };
}
