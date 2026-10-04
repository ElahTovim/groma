"use server";

import { redirect } from "next/navigation";
import { peutCreerChantier } from "@/lib/acces";
import { formulaireChantier } from "@/lib/chantier-forme";
import { prochaineReference } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers, participants } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

export type EtatNouveauChantier = { erreur?: string; champs?: Record<string, string> };

// La porte unique, dans l'ordre de AGENTS.md : qui appelle, a-t-il le droit,
// la forme est-elle valide, écrire, journaliser.
export async function creerChantier(_: EtatNouveauChantier, formData: FormData): Promise<EtatNouveauChantier> {
  const champs = Object.fromEntries(formData) as Record<string, string>;

  const qui = await appelant();
  if (!qui) redirect("/connexion");
  if (!peutCreerChantier(qui.role)) {
    journal("creation_refusee", { compte: qui.id, role: qui.role });
    return { erreur: "Votre rôle ne permet pas de créer un chantier.", champs };
  }

  const lu = formulaireChantier.safeParse(champs);
  if (!lu.success) return { erreur: lu.error.issues[0].message, champs };

  const reference = await prochaineReference();
  const [cree] = await db
    .insert(chantiers)
    .values({ ...lu.data, reference, creePar: qui.id })
    .returning({ id: chantiers.id });
  // Le créateur devient participant : sans cela, il ne retrouverait pas son
  // chantier le jour où l'équipe ne voit plus tout.
  await db.insert(participants).values({ chantierId: cree.id, compteId: qui.id, qualite: "créateur" });

  journal("chantier_cree", { compte: qui.id, chantier: cree.id, reference });
  redirect(`/chantiers/${cree.id}?cree=1`);
}
