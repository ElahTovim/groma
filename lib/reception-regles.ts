import type { StatutChantier } from "@/lib/db/schema";

// Le procès-verbal de réception, sans base de données. Testé dans reception-regles.test.ts.
// La réception est l'acte par lequel le maître d'ouvrage accepte les travaux, avec ou
// sans réserves (Code civil, art. 1792-6) : elle fait partir les garanties.

export type Verdict = { ok: true } | { ok: false; raison: string };

// Les durées des garanties, comptées depuis la réception. Ce sont des paramètres.
export const GARANTIES = {
  parfaitAchevementAns: 1, // art. 1792-6 : tous les désordres signalés
  biennaleAns: 2, // art. 1792-3 : équipements dissociables
  decennaleAns: 10, // art. 1792 : solidité, destination de l'ouvrage
  // La retenue de garantie (5 % au plus, loi du 16 juillet 1971) se libère au bout
  // d'un an, sauf opposition motivée du maître d'ouvrage.
  retenueLibereeAns: 1,
};

function plusAns(iso: string, ans: number): string {
  const [a, m, j] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a + ans, m - 1, j));
  // Un 29 février tombe au 28 les années non bissextiles.
  if (d.getUTCMonth() !== m - 1) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function garanties(dateReception: string) {
  return {
    parfaitAchevement: plusAns(dateReception, GARANTIES.parfaitAchevementAns),
    biennale: plusAns(dateReception, GARANTIES.biennaleAns),
    decennale: plusAns(dateReception, GARANTIES.decennaleAns),
    retenueLiberable: plusAns(dateReception, GARANTIES.retenueLibereeAns),
  };
}

export function estDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function verifierPreparation(p: {
  statut: StatutChantier;
  dejaSigne: boolean;
  dateReception: string;
  aujourdhui: string;
  signataireEstExterne: boolean;
  signalementsAQualifier: number;
}): Verdict {
  if (p.statut !== "reception") return { ok: false, raison: "Le PV se prépare une fois la réception déclarée." };
  if (p.dejaSigne) return { ok: false, raison: "Le PV est déjà signé : il ne peut plus être modifié." };
  if (!estDate(p.dateReception)) return { ok: false, raison: "Date de réception invalide." };
  if (p.dateReception > p.aujourdhui) return { ok: false, raison: "La réception ne peut pas être datée dans le futur." };
  if (!p.signataireEstExterne) return { ok: false, raison: "Le signataire doit être un externe invité sur ce chantier (le maître d'ouvrage)." };
  // Un signalement pas encore qualifié n'a pas sa place : réserve ou écarté, il faut trancher.
  if (p.signalementsAQualifier > 0)
    return { ok: false, raison: `${p.signalementsAQualifier} signalement${p.signalementsAQualifier > 1 ? "s" : ""} à qualifier : décidez s'il s'agit de réserves avant de préparer le PV.` };
  return { ok: true };
}

export function verifierSignature(p: { estSignataire: boolean; dejaSigne: boolean; nomSaisi: string; accepte: boolean }): Verdict {
  if (!p.estSignataire) return { ok: false, raison: "Seul le signataire désigné peut signer ce PV." };
  if (p.dejaSigne) return { ok: false, raison: "Ce PV est déjà signé." };
  if (p.nomSaisi.trim().length < 3) return { ok: false, raison: "Tapez votre nom complet pour signer." };
  if (!p.accepte) return { ok: false, raison: "Cochez la case pour confirmer la réception." };
  return { ok: true };
}

export type ContenuPv = {
  reference: string;
  chantier: string;
  adresse: string;
  client: string;
  entreprise: string;
  dateReception: string;
  reserves: { texte: string }[];
  observations: string | null;
  signataire: string;
};

// Le texte exact du PV, dans un ordre fixe : c'est ce qui est signé, et son empreinte
// (SHA-256, lib/empreinte.ts) permet de prouver plus tard qu'il n'a pas changé.
export function texteCanonique(c: ContenuPv): string {
  return [
    `PV de réception ${c.reference}`,
    `Chantier : ${c.chantier}, ${c.adresse}`,
    `Maître d'ouvrage : ${c.client}`,
    `Entreprise : ${c.entreprise}`,
    `Date de réception : ${c.dateReception}`,
    c.reserves.length === 0 ? "Réception sans réserve." : `Réception avec ${c.reserves.length} réserve(s) :`,
    ...c.reserves.map((r, i) => `${i + 1}. ${r.texte}`),
    `Observations : ${c.observations?.trim() || "aucune"}`,
    `Signataire : ${c.signataire}`,
  ].join("\n");
}
