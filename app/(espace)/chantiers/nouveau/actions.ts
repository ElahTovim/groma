"use server";

import { redirect } from "next/navigation";
import { peutCreerChantier } from "@/lib/acces";
import { formulaireChantier } from "@/lib/chantier-forme";
import { prochaineReference } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers, participants } from "@/lib/db/schema";
import { adresseDuSite, alerterGerants } from "@/lib/courriel";
import { journal } from "@/lib/journal";
import { geolocaliser } from "@/lib/meteo";
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

  // L'enrichissement : l'adresse devient des coordonnées, pour la météo de la fiche.
  // Si l'API Adresse ne répond pas, le chantier est créé quand même.
  const coordonnees = await geolocaliser(lu.data.adresse, lu.data.codePostal, lu.data.ville);
  const reference = await prochaineReference();
  const [cree] = await db
    .insert(chantiers)
    .values({ ...lu.data, ...coordonnees, reference, creePar: qui.id })
    .returning({ id: chantiers.id });
  // Le créateur devient participant : sans cela, il ne retrouverait pas son
  // chantier le jour où l'équipe ne voit plus tout.
  await db.insert(participants).values({ chantierId: cree.id, compteId: qui.id, qualite: "créateur" });

  journal("chantier_cree", { compte: qui.id, chantier: cree.id, reference, geolocalise: Boolean(coordonnees) });
  // Le gérant est alerté à la création d'un devis (docs/cycle-de-vie.md).
  if (qui.role !== "gerant") {
    await alerterGerants(`${reference} : nouveau devis`, `${qui.nom} a créé le chantier « ${lu.data.nom} » (${lu.data.ville}).\n\n${await adresseDuSite()}/chantiers/${cree.id}`);
  }
  redirect(`/chantiers/${cree.id}?cree=1`);
}
