"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { appelant } from "@/lib/session";
import { db } from "@/lib/db";
import { comptes, participants } from "@/lib/db/schema";
import { formulaireCompte } from "@/lib/invitation";
import { consommerJeton } from "@/lib/jetons";
import { journal } from "@/lib/journal";

export type EtatInvitation = { erreur?: string };

export async function accepterInvitation(jeton: string, _: EtatInvitation, formData: FormData): Promise<EtatInvitation> {
  if (await appelant()) return { erreur: "Déconnectez-vous d'abord : ce lien sert à créer le compte d'une autre personne." };
  const lu = formulaireCompte.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };

  // Une seule fois : le lien est consommé avant toute écriture.
  const j = await consommerJeton(jeton, "invitation");
  if (!j || !j.chantierId || !j.role || !j.qualite) {
    journal("invitation_refusee", { raison: "lien invalide, expiré ou déjà utilisé" });
    return { erreur: "Ce lien d'invitation n'est plus valable. Demandez-en un nouveau." };
  }

  const [existant] = await db.select({ id: comptes.id }).from(comptes).where(eq(comptes.email, j.email)).limit(1);
  const compteId =
    existant?.id ??
    (
      await db
        .insert(comptes)
        .values({ email: j.email, nom: lu.data.nom, role: j.role, motDePasseHash: await bcrypt.hash(lu.data.motDePasse, 12) })
        .returning({ id: comptes.id })
    )[0].id;
  await db.insert(participants).values({ chantierId: j.chantierId, compteId, qualite: j.qualite }).onConflictDoNothing();

  journal("invitation_acceptee", { compte: compteId, chantier: j.chantierId, role: j.role, qualite: j.qualite });
  redirect("/connexion?invite=1");
}
