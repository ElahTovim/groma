"use server";

import bcrypt from "bcryptjs";
import { count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { formulaireInstallation, peutInstaller } from "@/lib/installation";
import { journal } from "@/lib/journal";

export type EtatInstallation = { erreur?: string };

export async function installer(_: EtatInstallation, formData: FormData): Promise<EtatInstallation> {
  const lu = formulaireInstallation.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const { nom, email, motDePasse } = lu.data;

  const [{ n }] = await db.select({ n: count() }).from(comptes);
  const verdict = peutInstaller({ email, emailPrevu: process.env.ADMIN_EMAIL, nombreDeComptes: n });
  if (!verdict.ok) {
    journal("installation_refusee", { email, raison: verdict.raison });
    return { erreur: verdict.raison };
  }

  // Le « where not exists » ferme la course entre deux envois simultanés :
  // une seule insertion peut réussir tant que la table est vide.
  const hash = await bcrypt.hash(motDePasse, 12);
  const resultat = await db.execute(sql`
    insert into comptes (email, nom, mot_de_passe_hash, role)
    select ${email}, ${nom}, ${hash}, 'gerant'
    where not exists (select 1 from comptes)
    returning id`);
  if (resultat.rows.length === 0) {
    journal("installation_refusee", { email, raison: "course" });
    return { erreur: "L'installation est déjà faite. Connectez-vous." };
  }

  journal("installation", { compte: resultat.rows[0].id });
  redirect("/connexion?installe=1");
}
