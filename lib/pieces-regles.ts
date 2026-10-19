// Les pièces attendues d'un chantier, sans base de données. Testé dans pieces-regles.test.ts.
//
// Une pièce fournie (une décennale, un Kbis…) appartient à l'intervenant : elle sert sur tous
// ses chantiers. L'exigence, elle, se pose chantier par chantier, et peut bloquer une étape.
// Les types, leurs durées de validité et les suggestions par qualité sont des paramètres.

export type Niveau = "intervenant" | "chantier";

export type TypePiece = {
  libelle: string;
  // Durée de validité à compter de la date de délivrance ; null : la pièce ne périme pas.
  validiteMois: number | null;
  // Une pièce d'intervenant sert sur tous ses chantiers ; une pièce de chantier est propre au chantier.
  niveau: Niveau;
  // Les fichiers acceptés : un justificatif officiel en PDF, ou PDF et photos.
  fichiers: "pdf" | "pdf_ou_image";
};

export const TYPES_PIECES = {
  vigilance: { libelle: "Attestation de vigilance URSSAF", validiteMois: 6, niveau: "intervenant", fichiers: "pdf" },
  decennale: { libelle: "Attestation d'assurance décennale", validiteMois: 12, niveau: "intervenant", fichiers: "pdf" },
  rc_pro: { libelle: "Attestation de responsabilité civile professionnelle", validiteMois: 12, niveau: "intervenant", fichiers: "pdf" },
  kbis: { libelle: "Extrait Kbis", validiteMois: 3, niveau: "intervenant", fichiers: "pdf" },
  plans: { libelle: "Plans", validiteMois: null, niveau: "chantier", fichiers: "pdf_ou_image" },
  cctp: { libelle: "CCTP (cahier des clauses techniques)", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  notes_calcul: { libelle: "Notes de calcul", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  plans_execution: { libelle: "Plans d'exécution", validiteMois: null, niveau: "chantier", fichiers: "pdf_ou_image" },
  autorisation_urbanisme: { libelle: "Autorisation d'urbanisme (déclaration préalable ou permis)", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  dommages_ouvrage: { libelle: "Assurance dommages-ouvrage", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  ag_travaux: { libelle: "Autorisation des travaux votée en assemblée générale", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  reglement_copro: { libelle: "Règlement de copropriété", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
  doe: { libelle: "DOE (dossier des ouvrages exécutés)", validiteMois: null, niveau: "chantier", fichiers: "pdf" },
} as const satisfies Record<string, TypePiece>;

export type ClePiece = keyof typeof TYPES_PIECES;
export const CLES_PIECES = Object.keys(TYPES_PIECES) as ClePiece[];

export function estClePiece(v: unknown): v is ClePiece {
  return typeof v === "string" && v in TYPES_PIECES;
}

// Les suggestions faites à l'invitation, selon la qualité saisie. Ce n'est qu'une proposition :
// l'équipe coche, décoche, ajoute. La qualité reste un libellé, jamais une condition de droit.
export const SUGGESTIONS_PAR_QUALITE: { motsCles: string[]; pieces: ClePiece[] }[] = [
  { motsCles: ["client", "maitre d'ouvrage", "proprietaire"], pieces: ["autorisation_urbanisme", "dommages_ouvrage"] },
  { motsCles: ["syndic", "copropriete"], pieces: ["ag_travaux", "reglement_copro"] },
  { motsCles: ["architecte", "maitre d'oeuvre", "moe"], pieces: ["plans", "cctp", "rc_pro"] },
  { motsCles: ["ingenieur", "bureau d'etudes", "bet", "structure"], pieces: ["notes_calcul", "plans_execution", "rc_pro"] },
  { motsCles: ["sous-traitant", "sous traitant", "artisan", "plombier", "electricien", "macon", "menuisier", "peintre", "carreleur", "couvreur", "charpentier", "platrier"], pieces: ["decennale", "vigilance", "kbis"] },
  { motsCles: ["fournisseur", "negoce"], pieces: ["kbis"] },
];

const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();

export function suggestions(qualite: string): ClePiece[] {
  const q = normaliser(qualite);
  const trouvees = SUGGESTIONS_PAR_QUALITE.filter((s) => s.motsCles.some((m) => q.includes(normaliser(m)))).flatMap((s) => s.pieces);
  return [...new Set(trouvees)];
}

// ——— L'état d'une pièce ———

export const PREVENIR_JOURS = 15;

export function expiration(delivreeLe: string, mois: number): string {
  const [a, m, j] = delivreeLe.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + mois, j));
  // Délivrée un 31 août pour 6 mois : jusqu'à fin février, pas jusqu'au 3 mars.
  if (d.getUTCDate() !== j) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function jours(de: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
}

export type StatutPiece = "deposee" | "validee" | "refusee";

export type EtatPiece =
  | { etat: "manquante" }
  | { etat: "a_valider" }
  | { etat: "refusee"; motif: string | null }
  | { etat: "valide"; expireLe: string | null }
  | { etat: "bientot"; expireLe: string; joursRestants: number }
  | { etat: "expiree"; expireLe: string };

// La pièce la plus récente fait foi. Une pièce déposée par l'intervenant attend la validation
// de l'équipe ; une pièce déposée par l'équipe est validée d'office.
export function etatPiece(piece: { statut: StatutPiece; expireLe: string | null; motif: string | null } | null, aujourdhui: string): EtatPiece {
  if (!piece) return { etat: "manquante" };
  if (piece.statut === "refusee") return { etat: "refusee", motif: piece.motif };
  if (piece.expireLe && piece.expireLe < aujourdhui) return { etat: "expiree", expireLe: piece.expireLe };
  if (piece.statut === "deposee") return { etat: "a_valider" };
  if (piece.expireLe) {
    const reste = jours(aujourdhui, piece.expireLe);
    if (reste <= PREVENIR_JOURS) return { etat: "bientot", expireLe: piece.expireLe, joursRestants: reste };
  }
  return { etat: "valide", expireLe: piece.expireLe };
}

// Une pièce compte comme fournie si elle est validée et pas expirée (même si elle expire bientôt).
export function estFournie(e: EtatPiece): boolean {
  return e.etat === "valide" || e.etat === "bientot";
}

export function libelleEtat(e: EtatPiece): string {
  switch (e.etat) {
    case "manquante":
      return "Manquante";
    case "a_valider":
      return "À valider";
    case "refusee":
      return "Refusée";
    case "valide":
      return "Fournie";
    case "bientot":
      return `Expire dans ${e.joursRestants} jour${e.joursRestants > 1 ? "s" : ""}`;
    case "expiree":
      return "Expirée";
  }
}

// ——— Le dépôt ———

export type Verdict = { ok: true; expireLe: string | null } | { ok: false; raison: string };

export function verifierDepot(p: { type: ClePiece; delivreeLe: string; aujourdhui: string; mime: string }): Verdict {
  const t: TypePiece = TYPES_PIECES[p.type];
  const pdf = p.mime === "application/pdf";
  const image = ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(p.mime);
  if (t.fichiers === "pdf" && !pdf) return { ok: false, raison: `${t.libelle} : le justificatif se dépose en PDF.` };
  if (t.fichiers === "pdf_ou_image" && !pdf && !image) return { ok: false, raison: "Fichier refusé : PDF ou photo." };
  if (t.validiteMois === null) return { ok: true, expireLe: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.delivreeLe) || Number.isNaN(Date.parse(`${p.delivreeLe}T00:00:00Z`))) return { ok: false, raison: "Indiquez la date de délivrance du justificatif." };
  if (p.delivreeLe > p.aujourdhui) return { ok: false, raison: "La date de délivrance ne peut pas être dans le futur." };
  const expireLe = expiration(p.delivreeLe, t.validiteMois);
  if (expireLe < p.aujourdhui) return { ok: false, raison: `Ce justificatif a plus de ${t.validiteMois} mois : il n'est plus valable, demandez-en un récent.` };
  return { ok: true, expireLe };
}

// ——— Les blocages ———

export type Etape = "demarrage" | "cloture";
export const LIBELLE_ETAPE: Record<Etape, string> = { demarrage: "le démarrage du chantier", cloture: "la clôture" };

// Les pièces qui manquent pour franchir une étape : une phrase par pièce, avec qui la doit.
export function piecesBloquantes(exigences: { libelle: string; qui: string | null; bloque: Etape | null; etat: EtatPiece }[], etape: Etape): string[] {
  return exigences.filter((x) => x.bloque === etape && !estFournie(x.etat)).map((x) => `${x.libelle}${x.qui ? ` de ${x.qui}` : ""} : ${libelleEtat(x.etat).toLowerCase()}.`);
}

// ——— Les relances de nuit ———

export function palierDeRelance(e: EtatPiece): { palier: "manquante" | "bientot" | "expiree" | "refusee"; echeance: string } | null {
  switch (e.etat) {
    case "manquante":
      return { palier: "manquante", echeance: "aucune" };
    case "refusee":
      return { palier: "refusee", echeance: "aucune" };
    case "bientot":
      return { palier: "bientot", echeance: e.expireLe };
    case "expiree":
      return { palier: "expiree", echeance: e.expireLe };
    default:
      return null;
  }
}
