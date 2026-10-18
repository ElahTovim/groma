import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { courriers, fil } from "@/lib/db/schema";
import { champsCorriges, elementDuFil, formulaireValidation, motifRejetValide, type ChampsCourrier } from "@/lib/courriers-regles";
import { importerCourriers, lireParLIa, rangerLecture, type ChampsRanges } from "@/lib/courriers";
import { journal } from "@/lib/journal";
import type { Appelant } from "@/lib/session";

// Les opérations sur les courriers : la porte unique de AGENTS.md.
// qui appelle → a-t-il le droit → forme → règle → écrire → journaliser.
// Un courrier est une donnée, jamais un ordre : valider ne déclenche rien d'autre
// qu'un élément interne dans le fil du chantier rattaché. Le brouillon n'est jamais envoyé.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

const FONCTION_IA = "courriers_lecture";

function interne(qui: Appelant | null, action: string): Resultat | null {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!voitLInterne(qui.role)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, action });
    // Un externe ne doit même pas apprendre que les courriers existent.
    return { ok: false, erreur: "Courrier introuvable." };
  }
  return null;
}

async function courrierARelire(id: string) {
  if (typeof id !== "string" || !id || id.length > 120) return null;
  const [c] = await db.select().from(courriers).where(eq(courriers.id, id)).limit(1);
  return c ?? null;
}

function rafraichir(id?: string) {
  revalidatePath("/courriers");
  if (id) revalidatePath(`/courriers/${encodeURIComponent(id)}`);
}

// ——— Importer les courriers du flux (le gérant) ———

export async function importer(qui: Appelant | null): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (qui.role !== "gerant") {
    journal("action_refusee", { compte: qui.id, role: qui.role, action: "courriers_importer" });
    return { ok: false, erreur: "Seul le gérant peut importer les courriers du flux." };
  }
  journal("courriers_import_lance", { compte: qui.id });
  const b = await importerCourriers({ compteId: qui.id, fonction: FONCTION_IA });
  rafraichir();
  if (!b.ok) return { ok: false, erreur: `Import impossible : ${b.erreur}` };
  const parts = [`${b.recus} reçu${b.recus > 1 ? "s" : ""}`, `${b.nouveaux} nouveau${b.nouveaux > 1 ? "x" : ""}`];
  if (b.doublons) parts.push(`${b.doublons} doublon${b.doublons > 1 ? "s" : ""} ignoré${b.doublons > 1 ? "s" : ""}`);
  if (b.misDeCote) parts.push(`${b.misDeCote} illisible${b.misDeCote > 1 ? "s" : ""} mis de côté`);
  parts.push(`${b.lus} lu${b.lus > 1 ? "s" : ""} par l'IA`);
  if (b.echecsLecture) parts.push(`${b.echecsLecture} non lu${b.echecsLecture > 1 ? "s" : ""} (${b.premiereErreurIa})`);
  const texte = `Courriers : ${parts.join(", ")}.`;
  // Un courrier non lu reste « à relire » sans champs : l'import a marché, mais il faut le dire.
  return b.echecsLecture === 0 ? { ok: true, message: texte } : { ok: false, erreur: texte };
}

// ——— Relancer la lecture d'un courrier ———

export async function relire(qui: Appelant | null, id: string): Promise<Resultat> {
  const refus = interne(qui, "courrier_relire");
  if (refus) return refus;
  const c = await courrierARelire(id);
  if (!c) return { ok: false, erreur: "Courrier introuvable." };
  if (c.statut !== "a_relire") return { ok: false, erreur: "Ce courrier est déjà traité : il ne se relit plus." };
  const r = await lireParLIa({ compteId: qui!.id, fonction: FONCTION_IA }, c.texte);
  const range = await rangerLecture(c.id, r);
  journal("courrier_relu", { compte: qui!.id, courrier: c.id, ok: r.ok });
  rafraichir(c.id);
  if (!range) return { ok: false, erreur: "Ce courrier a changé entre-temps. La page va se recharger." };
  return r.ok ? { ok: true, message: "Courrier relu par l'IA. Vérifiez les champs proposés." } : { ok: false, erreur: `Lecture impossible : ${r.erreur}` };
}

// ——— Valider : les champs corrigés par la personne, et le rattachement ———

export async function valider(qui: Appelant | null, id: string, donnees: Record<string, string>): Promise<Resultat> {
  const refus = interne(qui, "courrier_valider");
  if (refus) return refus;
  const c = await courrierARelire(id);
  if (!c) return { ok: false, erreur: "Courrier introuvable." };
  if (c.statut !== "a_relire") return { ok: false, erreur: "Ce courrier est déjà traité." };

  const champ = (k: string) => (typeof donnees?.[k] === "string" ? donnees[k] : "");
  const lu = formulaireValidation.safeParse({
    expediteur: champ("expediteur"),
    societe: champ("societe"),
    reference: champ("reference"),
    date: champ("date"),
    categorie: champ("categorie"),
    montant: champ("montant"),
    resume: champ("resume"),
    brouillon: champ("brouillon"),
    chantierId: champ("chantierId"),
  });
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const v = lu.data;

  // Le rattachement : un chantier que cette personne a le droit de voir.
  let chantier: Awaited<ReturnType<typeof lireChantier>> = null;
  if (v.chantierId) {
    chantier = await lireChantier(qui!, v.chantierId);
    if (!chantier) return { ok: false, erreur: "Chantier introuvable." };
  }

  const valeurs: ChampsCourrier = { expediteur: v.expediteur, societe: v.societe, reference: v.reference?.toUpperCase() ?? null, date: v.date, categorie: v.categorie, montant: v.montant };
  const avant = (c.champs ?? null) as ChampsRanges | null;
  const propose = avant ? { expediteur: avant.expediteur ?? null, societe: avant.societe ?? null, reference: avant.reference ?? null, date: avant.date ?? null, categorie: avant.categorie ?? null, montant: avant.montant ?? null } : null;
  const corriges = champsCorriges(propose, valeurs);

  // Le « where statut = a_relire » ferme la course entre deux validations simultanées.
  const fait = await db
    .update(courriers)
    .set({
      champs: { ...valeurs, ia: propose, corriges, chantierPropose: avant?.chantierPropose ?? null } satisfies ChampsRanges,
      categorie: v.categorie,
      resume: v.resume,
      brouillon: v.brouillon || null,
      chantierId: chantier?.id ?? null,
      statut: "valide",
      validePar: qui!.id,
      valideLe: new Date(),
    })
    .where(and(eq(courriers.id, c.id), eq(courriers.statut, "a_relire")))
    .returning({ id: courriers.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce courrier a changé entre-temps. La page va se recharger." };

  // Seule conséquence d'une validation : un élément interne dans le fil du chantier.
  if (chantier) {
    const e = elementDuFil({ resume: v.resume, expediteur: v.expediteur, societe: v.societe });
    await db.insert(fil).values({ chantierId: chantier.id, auteurId: null, auteurNom: e.auteurNom, type: e.type, texte: e.texte, visiblePar: [] });
    revalidatePath(`/chantiers/${chantier.id}`);
  }
  journal("courrier_valide", { compte: qui!.id, courrier: c.id, chantier: chantier?.id ?? null, corriges, avait_propose: Boolean(propose) });
  rafraichir(c.id);
  return { ok: true, message: chantier ? `Courrier validé et ajouté au fil du chantier ${chantier.reference}.` : "Courrier validé, sans rattachement à un chantier." };
}

// ——— Rejeter, avec un motif ———

export async function rejeter(qui: Appelant | null, id: string, motif: string): Promise<Resultat> {
  const refus = interne(qui, "courrier_rejeter");
  if (refus) return refus;
  const c = await courrierARelire(id);
  if (!c) return { ok: false, erreur: "Courrier introuvable." };
  if (c.statut !== "a_relire") return { ok: false, erreur: "Ce courrier est déjà traité." };
  const m = motifRejetValide(String(motif ?? ""));
  if (!m) return { ok: false, erreur: "Indiquez le motif du rejet." };
  const fait = await db
    .update(courriers)
    .set({ champs: { ...((c.champs ?? {}) as ChampsRanges), motifRejet: m }, statut: "rejete", validePar: qui!.id, valideLe: new Date() })
    .where(and(eq(courriers.id, c.id), eq(courriers.statut, "a_relire")))
    .returning({ id: courriers.id });
  if (fait.length === 0) return { ok: false, erreur: "Ce courrier a changé entre-temps. La page va se recharger." };
  journal("courrier_rejete", { compte: qui!.id, courrier: c.id, motif: m });
  rafraichir(c.id);
  return { ok: true, message: "Courrier rejeté." };
}
