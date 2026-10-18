// La santé de la machine de nuit, sans base de données : testable seule.
// En panne si la dernière tentative a échoué, ou si aucune nuit n'a réussi depuis 26 heures.
export const DELAI_MAX_MS = 26 * 3600 * 1000;

export function etatNuit(derniere: { statut: string } | null, derniereReussite: Date | null, maintenant = new Date()): { ok: boolean; raison: string } {
  if (!derniere) return { ok: false, raison: "Aucune exécution encore." };
  if (derniere.statut === "echec") return { ok: false, raison: "La dernière tentative a échoué." };
  if (!derniereReussite || maintenant.getTime() - derniereReussite.getTime() > DELAI_MAX_MS) return { ok: false, raison: "Aucune nuit importée depuis plus de 26 heures." };
  return { ok: true, raison: "La dernière nuit est importée." };
}

// Vercel planifie en heure universelle ; la France change d'heure deux fois par an.
// Le récapitulatif a deux passages (5 h et 6 h UTC) : il ne part qu'à partir de 7 h à Paris,
// donc à 7 h l'été comme l'hiver. Il ne part jamais deux fois (lib/recap.ts).
export const HEURE_DU_RECAP_PARIS = 7;

export function heureDuRecap(maintenant = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(maintenant);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  return h >= HEURE_DU_RECAP_PARIS;
}
