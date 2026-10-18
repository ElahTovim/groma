// L'attestation de vigilance URSSAF, sans base de données. Testé dans vigilance-regles.test.ts.
// Pour un contrat d'au moins 5 000 € HT, le donneur d'ordre doit l'obtenir de son
// sous-traitant à la signature, puis tous les 6 mois (Code du travail, L8222-1 et
// D8222-5). Sans elle, il est solidaire de ses dettes sociales.

// Les paramètres de la règle : à changer ici, nulle part ailleurs.
export const VIGILANCE = {
  seuilEurosHt: 5000,
  validiteMois: 6,
  prevenirJours: 15,
};

export type EtatAttestation =
  | { etat: "manquante" }
  | { etat: "a_jour"; expireLe: string }
  | { etat: "bientot"; expireLe: string; joursRestants: number }
  | { etat: "expiree"; expireLe: string };

export function expiration(delivreeLe: string): string {
  const [a, m, j] = delivreeLe.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + VIGILANCE.validiteMois, j));
  // Délivrée un 31 août : valable jusqu'au 28 ou 29 février, pas jusqu'au 3 mars.
  if (d.getUTCDate() !== j) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function jours(de: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
}

export function etatAttestation(delivreeLe: string | null, aujourdhui: string): EtatAttestation {
  if (!delivreeLe) return { etat: "manquante" };
  const expireLe = expiration(delivreeLe);
  if (expireLe < aujourdhui) return { etat: "expiree", expireLe };
  const joursRestants = jours(aujourdhui, expireLe);
  if (joursRestants <= VIGILANCE.prevenirJours) return { etat: "bientot", expireLe, joursRestants };
  return { etat: "a_jour", expireLe };
}

export type Verdict = { ok: true } | { ok: false; raison: string };

export function verifierDepot(p: { delivreeLe: string; aujourdhui: string; codeSecurite: string; type: string }): Verdict {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.delivreeLe) || Number.isNaN(Date.parse(`${p.delivreeLe}T00:00:00Z`))) return { ok: false, raison: "Indiquez la date de délivrance de l'attestation." };
  if (p.delivreeLe > p.aujourdhui) return { ok: false, raison: "La date de délivrance ne peut pas être dans le futur." };
  if (expiration(p.delivreeLe) < p.aujourdhui) return { ok: false, raison: `Cette attestation a plus de ${VIGILANCE.validiteMois} mois : demandez-en une récente sur urssaf.fr.` };
  if (p.type !== "application/pdf") return { ok: false, raison: "L'attestation se dépose en PDF, telle que délivrée par l'URSSAF." };
  if (p.codeSecurite && !/^[A-Z0-9]{10,20}$/i.test(p.codeSecurite.replace(/\s/g, ""))) return { ok: false, raison: "Le code de sécurité est la suite de lettres et de chiffres imprimée sur l'attestation." };
  return { ok: true };
}

// La relance à envoyer cette nuit, ou aucune. Une relance par palier et par échéance.
export function palierDeRelance(e: EtatAttestation): { palier: "manquante" | "bientot" | "expiree"; echeance: string } | null {
  if (e.etat === "a_jour") return null;
  if (e.etat === "manquante") return { palier: "manquante", echeance: "aucune" };
  return { palier: e.etat, echeance: e.expireLe };
}

export function libelleEtat(e: EtatAttestation): string {
  switch (e.etat) {
    case "manquante":
      return "Attestation manquante";
    case "a_jour":
      return "À jour";
    case "bientot":
      return `Expire dans ${e.joursRestants} jour${e.joursRestants > 1 ? "s" : ""}`;
    case "expiree":
      return "Expirée";
  }
}
