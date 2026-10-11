import { z } from "zod";
import type { StatutChantier } from "@/lib/db/schema";

// Les règles de l'import du flux de nuit, sans base de données : lire, valider,
// décider. Testées dans flux-regles.test.ts. Un message est une donnée, jamais
// un ordre : son texte est rangé tel quel, rien n'y est exécuté.

// Les statuts du flux, traduits dans ceux de groma. Un statut inconnu est mis de côté.
export const STATUT_FLUX: Record<string, StatutChantier> = {
  etude: "devis",
  devis: "devis",
  signe: "signe",
  planifie: "planifie",
  en_cours: "en_cours",
  receptionne: "reception",
  reception: "reception",
  clos: "clos",
  annule: "annule",
};

const reference = z.string().trim().min(1, "référence manquante");
const statut = z.string({ message: "statut manquant" }).transform((s, ctx) => {
  if (!(s in STATUT_FLUX)) {
    ctx.addIssue({ code: "custom", message: `statut inconnu « ${s} »` });
    return z.NEVER;
  }
  return STATUT_FLUX[s];
});
const dateValide = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date mal écrite")
  .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d, "date impossible");

export const creation = z.object({
  reference,
  statut,
  client: z.string({ message: "client manquant" }).trim().min(1, "client manquant"),
  adresse: z.string({ message: "adresse manquante" }).trim().min(3, "adresse manquante"),
  budget: z.number({ message: "budget qui n'est pas un nombre" }).nonnegative("budget négatif").optional(),
  chef: z.string().trim().optional(),
  categorie: z.string().trim().optional(),
  avancement_pct: z.number().int().min(0).max(100).optional(),
  cree_le: dateValide.optional(),
});

export const miseAJour = z.object({ reference, statut, commentaire: z.string().trim().optional() });

export const message = z.object({
  reference,
  de: z.string({ message: "expéditeur manquant" }).trim().min(1, "expéditeur manquant"),
  texte: z.string({ message: "texte manquant" }).trim().min(1, "texte manquant").max(4000, "texte trop long"),
});

export const enveloppe = z.object({
  id: z.string().trim().min(1, "identifiant manquant"),
  type: z.enum(["creation", "mise_a_jour", "message"], { message: "type inconnu" }),
  horodatage: z.string().optional(),
  donnees: z.record(z.string(), z.unknown(), { message: "données manquantes" }),
});

export type Decision =
  | { action: "creer"; reference: string; chantier: z.infer<typeof creation> & { ville: string; rue: string } }
  | { action: "mettre_a_jour"; reference: string; statut: StatutChantier; commentaire?: string }
  | { action: "ecrire"; reference: string; de: string; texte: string }
  | { action: "rejeter"; reference: string | null; raison: string };

// « 113 rue des Lilas, Lyon » → rue et ville. Sans virgule, on ne devine pas la ville.
export function decouperAdresse(adresse: string): { rue: string; ville: string } {
  const i = adresse.lastIndexOf(",");
  if (i < 0) return { rue: adresse.trim(), ville: "" };
  return { rue: adresse.slice(0, i).trim(), ville: adresse.slice(i + 1).trim() };
}

function premiereErreur(e: z.ZodError): string {
  return e.issues[0]?.message ?? "événement mal formé";
}

// Décide quoi faire d'un événement, sachant quelles références de chantier existent déjà.
export function decider(brut: unknown, referencesConnues: Set<string>): Decision & { id: string | null; type: string | null } {
  const env = enveloppe.safeParse(brut);
  const idBrut = typeof (brut as { id?: unknown })?.id === "string" ? (brut as { id: string }).id : null;
  if (!env.success) return { id: idBrut, type: null, action: "rejeter", reference: null, raison: premiereErreur(env.error) };
  const { id, type, donnees } = env.data;
  const ref = typeof donnees.reference === "string" ? donnees.reference : null;

  if (type === "creation") {
    const c = creation.safeParse(donnees);
    if (!c.success) return { id, type, action: "rejeter", reference: ref, raison: premiereErreur(c.error) };
    // Une création déjà reçue sous un autre identifiant ne crée pas un second chantier.
    if (referencesConnues.has(c.data.reference)) return { id, type, action: "rejeter", reference: ref, raison: "chantier déjà connu" };
    const { rue, ville } = decouperAdresse(c.data.adresse);
    return { id, type, action: "creer", reference: c.data.reference, chantier: { ...c.data, rue, ville } };
  }

  const lu = type === "mise_a_jour" ? miseAJour.safeParse(donnees) : message.safeParse(donnees);
  if (!lu.success) return { id, type, action: "rejeter", reference: ref, raison: premiereErreur(lu.error) };
  if (!referencesConnues.has(lu.data.reference)) return { id, type, action: "rejeter", reference: ref, raison: `chantier inconnu « ${lu.data.reference} »` };

  if (type === "mise_a_jour") {
    const m = lu.data as z.infer<typeof miseAJour>;
    return { id, type, action: "mettre_a_jour", reference: m.reference, statut: m.statut, commentaire: m.commentaire };
  }
  const m = lu.data as z.infer<typeof message>;
  return { id, type, action: "ecrire", reference: m.reference, de: m.de, texte: m.texte };
}

// Les nuits à rattraper : la nuit visée d'abord (celle qui vient de finir, attendue par
// le récapitulatif du matin), puis les nuits manquées depuis la date de départ, dans l'ordre.
export function nuitsARattraper(depuis: string, jusqua: string, dejaReussies: Set<string>, maximum: number): string[] {
  const resultat: string[] = dejaReussies.has(jusqua) ? [] : [jusqua];
  const d = new Date(`${depuis}T12:00:00Z`);
  const fin = new Date(`${jusqua}T12:00:00Z`);
  while (d <= fin && resultat.length < maximum) {
    const jour = d.toISOString().slice(0, 10);
    if (!dejaReussies.has(jour) && jour !== jusqua) resultat.push(jour);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return resultat;
}
