"use server";

import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers, comptes, fil, lots, participants, type StatutChantier, type StatutLot, type StatutSignalement, type TypeFil } from "@/lib/db/schema";
import { adresseDuSite, alerterGerants, envoyerCourriel } from "@/lib/courriel";
import { contexteChantier, estParticipant } from "@/lib/fiche";
import { nomPropre, verifierFichier } from "@/lib/fichiers";
import { formulaireInvitation } from "@/lib/invitation";
import { creerJeton } from "@/lib/jetons";
import { journal } from "@/lib/journal";
import {
  ETAPES_ALERTE,
  partageInitial,
  peutAnnuler,
  peutEcrire,
  verifierPassage,
  verifierPassageLot,
  verifierQualification,
} from "@/lib/regles";
import { appelant, type Appelant } from "@/lib/session";

// Toutes ces actions suivent la porte unique de AGENTS.md :
// qui appelle → a-t-il accès au chantier → a-t-il le droit → forme → règle → écrire → journaliser.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string; raisons?: string[] };

async function porte(chantierId: string, interneSeulement: boolean): Promise<{ qui: Appelant; chantier: NonNullable<Awaited<ReturnType<typeof lireChantier>>> } | Resultat> {
  const qui = await appelant();
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  const chantier = await lireChantier(qui, chantierId);
  if (!chantier) {
    journal("acces_refuse", { compte: qui.id, role: qui.role, chantier: chantierId });
    return { ok: false, erreur: "Chantier introuvable." };
  }
  if (interneSeulement && !voitLInterne(qui.role)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, chantier: chantierId });
    return { ok: false, erreur: "Votre rôle ne permet pas cette action." };
  }
  return { qui, chantier };
}

function rafraichir(chantierId: string) {
  revalidatePath(`/chantiers/${chantierId}`);
  revalidatePath("/chantiers");
}

// ——— Étapes du chantier ———

export async function avancerChantier(chantierId: string, vers: StatutChantier): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const { qui, chantier } = p;

  const verdict = verifierPassage(chantier.statut, vers, await contexteChantier(chantierId, chantier.debutPrevu));
  if (!verdict.ok) {
    journal("etape_refusee", { compte: qui.id, chantier: chantierId, de: chantier.statut, vers, raisons: verdict.raisons });
    return { ok: false, erreur: "Étape impossible pour l'instant.", raisons: verdict.raisons };
  }

  // Le « where statut = de » ferme la course entre deux clics simultanés.
  const fait = await db
    .update(chantiers)
    .set({ statut: vers })
    .where(and(eq(chantiers.id, chantierId), eq(chantiers.statut, chantier.statut)))
    .returning({ id: chantiers.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce chantier a changé entre-temps. La page va se recharger." };

  journal("etape", { compte: qui.id, chantier: chantierId, de: chantier.statut, vers, alerte_gerant: ETAPES_ALERTE.includes(vers) });
  if (ETAPES_ALERTE.includes(vers)) {
    await alerterGerants(
      `${chantier.reference} : ${libelle(vers)}`,
      `${qui.nom} a passé le chantier « ${chantier.nom} » (${chantier.ville}) en ${libelle(vers)}.\n\n${await adresseDuSite()}/chantiers/${chantierId}`,
    );
  }
  rafraichir(chantierId);
  return { ok: true, message: `Chantier passé en ${libelle(vers)}.` };
}

export async function annulerChantier(chantierId: string, motif: string): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const { qui, chantier } = p;
  if (!peutAnnuler(chantier.statut)) return { ok: false, erreur: "Un chantier démarré ne s'annule plus." };
  if (!motif.trim()) return { ok: false, erreur: "Indiquez le motif de l'annulation." };

  const fait = await db
    .update(chantiers)
    .set({ statut: "annule", motifAnnulation: motif.trim() })
    .where(and(eq(chantiers.id, chantierId), eq(chantiers.statut, chantier.statut)))
    .returning({ id: chantiers.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce chantier a changé entre-temps. La page va se recharger." };

  journal("etape", { compte: qui.id, chantier: chantierId, de: chantier.statut, vers: "annule", alerte_gerant: true });
  await alerterGerants(
    `${chantier.reference} : annulé`,
    `${qui.nom} a annulé le chantier « ${chantier.nom} » (${chantier.ville}).\nMotif : ${motif.trim()}\n\n${await adresseDuSite()}/chantiers/${chantierId}`,
  );
  rafraichir(chantierId);
  return { ok: true, message: "Chantier annulé." };
}

const dateOuVide = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide.");

export async function fixerDebut(chantierId: string, debut: string): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const lu = dateOuVide.safeParse(debut);
  if (!lu.success) return { ok: false, erreur: "Date invalide." };
  await db.update(chantiers).set({ debutPrevu: lu.data }).where(eq(chantiers.id, chantierId));
  journal("debut_fixe", { compte: p.qui.id, chantier: chantierId, debut: lu.data });
  rafraichir(chantierId);
  return { ok: true, message: lu.data ? "Date de début enregistrée." : "Date de début effacée." };
}

// ——— Lots ———

const formulaireLot = z.object({
  nom: z.string().trim().min(1, "Donnez un nom au lot (par exemple : Carrelage)."),
  livraisonPrevue: dateOuVide,
  finPrevue: dateOuVide,
  fournisseurId: z.string().trim(),
});

export async function ajouterLot(chantierId: string, donnees: Record<string, string>): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const lu = formulaireLot.safeParse(donnees);
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const { fournisseurId, ...lot } = lu.data;
  if (fournisseurId && !(await estParticipant(chantierId, fournisseurId))) {
    return { ok: false, erreur: "Le fournisseur doit être un participant du chantier." };
  }
  await db.insert(lots).values({ ...lot, chantierId, fournisseurId: fournisseurId || null });
  journal("lot_ajoute", { compte: p.qui.id, chantier: chantierId, lot: lot.nom });
  rafraichir(chantierId);
  return { ok: true, message: `Lot « ${lot.nom} » ajouté.` };
}

export async function avancerLot(chantierId: string, lotId: string, vers: StatutLot): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const [lot] = await db.select().from(lots).where(and(eq(lots.id, lotId), eq(lots.chantierId, chantierId))).limit(1);
  if (!lot) return { ok: false, erreur: "Lot introuvable." };
  const verdict = verifierPassageLot(lot.statut, vers);
  if (!verdict.ok) return { ok: false, erreur: verdict.raisons[0] };
  const fait = await db
    .update(lots)
    .set({ statut: vers })
    .where(and(eq(lots.id, lotId), eq(lots.statut, lot.statut)))
    .returning({ id: lots.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce lot a changé entre-temps. La page va se recharger." };
  journal("lot_etape", { compte: p.qui.id, chantier: chantierId, lot: lotId, de: lot.statut, vers });
  rafraichir(chantierId);
  return { ok: true, message: `${lot.nom} : ${LIBELLE_LOT[vers]}.` };
}

// ——— Le fil ———

const formulaireFil = z.object({
  type: z.enum(["message", "demande", "reponse", "disponibilite", "document", "signalement"]),
  texte: z.string().trim().min(1, "Écrivez quelque chose.").max(4000, "Texte trop long (4 000 caractères au plus)."),
  destinataireId: z.string().trim(),
  dateCible: dateOuVide,
  lotId: z.string().trim(),
});

export async function ecrireDansLeFil(chantierId: string, formData: FormData): Promise<Resultat> {
  const p = await porte(chantierId, false);
  if ("ok" in p) return p;
  const { qui } = p;
  const champ = (k: string) => (typeof formData.get(k) === "string" ? String(formData.get(k)) : "");
  const lu = formulaireFil.safeParse({
    type: champ("type"),
    texte: champ("texte"),
    destinataireId: champ("destinataireId"),
    dateCible: champ("dateCible"),
    lotId: champ("lotId"),
  });
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const e = lu.data;
  if (!peutEcrire(qui.role, e.type)) return { ok: false, erreur: "Votre rôle ne permet pas ce type d'élément." };

  let destinataire: { id: string; role: Appelant["role"] } | null = null;
  if (e.type === "demande") {
    if (!e.destinataireId) return { ok: false, erreur: "Choisissez à qui s'adresse la demande." };
    if (!(await estParticipant(chantierId, e.destinataireId))) return { ok: false, erreur: "Le destinataire doit être un participant du chantier." };
    const [c] = await db.select({ id: comptes.id, role: comptes.role }).from(comptes).where(eq(comptes.id, e.destinataireId)).limit(1);
    destinataire = c ?? null;
  }
  if (e.type === "disponibilite" && !e.dateCible) return { ok: false, erreur: "Indiquez le jour de la disponibilité." };
  // Un externe ne connaît pas les lots : on ignore toute référence à un lot venant de lui.
  const lotId = voitLInterne(qui.role) && e.lotId ? e.lotId : null;
  if (lotId) {
    const [l] = await db.select({ id: lots.id }).from(lots).where(and(eq(lots.id, lotId), eq(lots.chantierId, chantierId))).limit(1);
    if (!l) return { ok: false, erreur: "Lot introuvable." };
  }

  // Un document arrive avec son fichier : rangé sur Vercel Blob en accès privé,
  // il ne sera servi que par /api/fichiers/[id], après vérification des droits.
  let fichier: { fichierUrl: string; fichierNom: string; fichierType: string; fichierTaille: number } | null = null;
  if (e.type === "document") {
    const f = formData.get("fichier");
    if (!(f instanceof File) || f.size === 0) return { ok: false, erreur: "Joignez le fichier du document." };
    const v = verifierFichier(f);
    if (!v.ok) return { ok: false, erreur: v.raison };
    try {
      const b = await put(`chantiers/${chantierId}/${nomPropre(f.name)}`, f, { access: "private", addRandomSuffix: true, contentType: f.type });
      fichier = { fichierUrl: b.url, fichierNom: f.name.slice(0, 200), fichierType: f.type, fichierTaille: f.size };
    } catch (err) {
      journal("fichier_echec", { compte: qui.id, chantier: chantierId, erreur: String(err) });
      return { ok: false, erreur: "Le fichier n'a pas pu être enregistré. Réessayez." };
    }
  }

  await db.insert(fil).values({
    ...fichier,
    chantierId,
    lotId,
    auteurId: qui.id,
    type: e.type as TypeFil,
    texte: e.texte,
    destinataireId: destinataire?.id ?? null,
    dateCible: e.type === "demande" || e.type === "disponibilite" ? e.dateCible : null,
    statutSignalement: e.type === "signalement" ? "a_qualifier" : null,
    visiblePar: partageInitial(e.type as TypeFil, destinataire),
  });
  journal("fil_ecrit", { compte: qui.id, role: qui.role, chantier: chantierId, type: e.type });
  rafraichir(chantierId);
  return { ok: true, message: e.type === "signalement" ? "Signalement envoyé. L'équipe va le qualifier." : "Ajouté au fil." };
}

// « Qui voit ça ? » : on ne peut cocher que des participants du chantier.
export async function partagerElement(chantierId: string, elementId: string, comptesCoches: string[]): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const [element] = await db.select({ id: fil.id }).from(fil).where(and(eq(fil.id, elementId), eq(fil.chantierId, chantierId))).limit(1);
  if (!element) return { ok: false, erreur: "Élément introuvable." };
  const autorises = [];
  for (const id of new Set(comptesCoches)) {
    if (await estParticipant(chantierId, id)) autorises.push(id);
  }
  await db.update(fil).set({ visiblePar: autorises }).where(eq(fil.id, elementId));
  journal("partage", { compte: p.qui.id, chantier: chantierId, element: elementId, visible_par: autorises.length });
  rafraichir(chantierId);
  return {
    ok: true,
    message: autorises.length ? `Partagé avec ${autorises.length} personne${autorises.length > 1 ? "s" : ""}.` : "Élément redevenu interne.",
  };
}

export async function qualifierSignalement(chantierId: string, elementId: string, vers: StatutSignalement, motif: string): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const [element] = await db.select().from(fil).where(and(eq(fil.id, elementId), eq(fil.chantierId, chantierId))).limit(1);
  if (!element || element.type !== "signalement" || !element.statutSignalement) return { ok: false, erreur: "Signalement introuvable." };
  const verdict = verifierQualification(element.statutSignalement, vers, motif);
  if (!verdict.ok) return { ok: false, erreur: verdict.raisons[0] };
  const fait = await db
    .update(fil)
    .set({ statutSignalement: vers, motif: vers === "ecarte" ? motif.trim() : element.motif })
    .where(and(eq(fil.id, elementId), eq(fil.statutSignalement, element.statutSignalement)))
    .returning({ id: fil.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce signalement a changé entre-temps. La page va se recharger." };
  journal("signalement", { compte: p.qui.id, chantier: chantierId, element: elementId, de: element.statutSignalement, vers });
  rafraichir(chantierId);
  const messages: Record<StatutSignalement, string> = {
    reserve_ouverte: "Retenu comme réserve.",
    ecarte: "Signalement écarté.",
    levee: "Réserve levée.",
    a_qualifier: "",
  };
  return { ok: true, message: messages[vers] };
}

// ——— La photo du chantier ———

export async function changerPhoto(chantierId: string, formData: FormData): Promise<Resultat> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const f = formData.get("photo");
  if (!(f instanceof File) || f.size === 0) return { ok: false, erreur: "Choisissez une photo." };
  const v = verifierFichier(f);
  if (!v.ok) return { ok: false, erreur: v.raison };
  if (!f.type.startsWith("image/")) return { ok: false, erreur: "La photo doit être une image (JPEG, PNG, WebP ou HEIC)." };
  const [avant] = await db.select({ photoUrl: chantiers.photoUrl }).from(chantiers).where(eq(chantiers.id, chantierId)).limit(1);
  try {
    const b = await put(`chantiers/${chantierId}/photo-${nomPropre(f.name)}`, f, { access: "private", addRandomSuffix: true, contentType: f.type });
    await db.update(chantiers).set({ photoUrl: b.url }).where(eq(chantiers.id, chantierId));
    if (avant?.photoUrl) await del(avant.photoUrl).catch(() => undefined);
  } catch (err) {
    journal("photo_echec", { compte: p.qui.id, chantier: chantierId, erreur: String(err) });
    return { ok: false, erreur: "La photo n'a pas pu être enregistrée. Réessayez." };
  }
  journal("photo", { compte: p.qui.id, chantier: chantierId });
  rafraichir(chantierId);
  return { ok: true, message: "Photo du chantier enregistrée." };
}

// ——— Inviter ———

export type ResultatInvitation = Resultat & { lien?: string };

// Inviter quelqu'un sur ce chantier. Un compte existant y est ajouté tout de suite ;
// sinon, un lien d'invitation est créé, envoyé par courriel quand c'est possible,
// et toujours affiché pour pouvoir le transmettre à la main.
export async function inviter(chantierId: string, donnees: Record<string, string>): Promise<ResultatInvitation> {
  const p = await porte(chantierId, true);
  if ("ok" in p) return p;
  const { qui, chantier } = p;
  const lu = formulaireInvitation.safeParse(donnees);
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const { email, role, qualite } = lu.data;

  const [existant] = await db.select({ id: comptes.id, nom: comptes.nom }).from(comptes).where(eq(comptes.email, email)).limit(1);
  if (existant) {
    if (await estParticipant(chantierId, existant.id)) return { ok: false, erreur: `${existant.nom} est déjà invité sur ce chantier.` };
    await db.insert(participants).values({ chantierId, compteId: existant.id, qualite });
    journal("participant_ajoute", { compte: qui.id, chantier: chantierId, invite: existant.id, qualite });
    await envoyerCourriel({
      a: email,
      sujet: `Vous êtes invité sur le chantier ${chantier.nom}`,
      texte: `${qui.nom} vous a ajouté au chantier « ${chantier.nom} » (${chantier.ville}).\n\n${await adresseDuSite()}/chantiers/${chantierId}`,
    });
    rafraichir(chantierId);
    return { ok: true, message: `${existant.nom} a été ajouté au chantier.` };
  }

  const jeton = await creerJeton({ type: "invitation", email, chantierId, role, qualite, creePar: qui.id });
  const lien = `${await adresseDuSite()}/invitation/${jeton}`;
  const envoi = await envoyerCourriel({
    a: email,
    sujet: `Invitation sur le chantier ${chantier.nom}`,
    texte: `${qui.nom} vous invite sur le chantier « ${chantier.nom} » (${chantier.ville}), en tant que ${qualite}.\n\nCréez votre compte ici (lien valable 7 jours, une seule fois) :\n${lien}`,
  });
  journal("invitation", { compte: qui.id, chantier: chantierId, role, qualite, courriel_parti: envoi.ok });
  return {
    ok: true,
    message: envoi.ok ? "Invitation envoyée par courriel." : "Invitation créée. Le courriel n'est pas parti : transmettez le lien à la main.",
    lien,
  };
}

const LIBELLE_LOT: Record<StatutLot, string> = {
  a_commander: "à commander",
  commande: "commandé",
  livre: "livré",
  pose: "posé",
  fini: "fini",
};

function libelle(s: StatutChantier): string {
  return { devis: "devis", signe: "signé", planifie: "planifié", en_cours: "cours", reception: "réception", clos: "clos", annule: "annulé" }[s];
}
