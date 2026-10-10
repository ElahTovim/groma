// La santé de la machine de nuit, sans base de données : testable seule.
// En panne si la dernière tentative a échoué, ou si aucune nuit n'a réussi depuis 26 heures.
export const DELAI_MAX_MS = 26 * 3600 * 1000;

export function etatNuit(derniere: { statut: string } | null, derniereReussite: Date | null, maintenant = new Date()): { ok: boolean; raison: string } {
  if (!derniere) return { ok: false, raison: "Aucune exécution encore." };
  if (derniere.statut === "echec") return { ok: false, raison: "La dernière tentative a échoué." };
  if (!derniereReussite || maintenant.getTime() - derniereReussite.getTime() > DELAI_MAX_MS) return { ok: false, raison: "Aucune nuit importée depuis plus de 26 heures." };
  return { ok: true, raison: "La dernière nuit est importée." };
}
