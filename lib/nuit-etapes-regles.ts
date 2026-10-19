// La répartition du travail du matin dans le temps d'une fonction Vercel, sans base :
// testée dans nuit-etapes-regles.test.ts.
//
// Une fonction de la tâche planifiée a au plus `maxDuration` secondes (60, app/api/nuit/route.ts).
// Chaque étape a une durée estimée ; elle ne démarre que s'il reste de quoi la finir,
// en gardant la place du récapitulatif quand il doit partir à ce passage. Une étape
// qui ne démarre pas, ou qui dépasse son temps, est reprise au passage suivant :
// toutes sont idempotentes, rien n'est doublé.

export type Etape = "courriers" | "documents" | "analyse" | "recapitulatif";

// Des paramètres, en millisecondes : le temps qu'il faut au moins pour qu'une étape
// vaille la peine d'être lancée (durée habituelle), à ajuster sur les journaux (« nuit_etape »).
// Une étape qui dure plus longtemps (le premier jour : tous les courriers à lire, tous les
// documents à vectoriser) est coupée par delaiAccorde, puis reprise au passage suivant.
export const DUREES_ETAPES: Record<Etape, number> = {
  courriers: 8_000, // un appel au flux ; les seuls nouveaux courriers sont lus par le modèle rapide, 4 à la fois
  documents: 5_000, // 20 documents relus au flux ; seuls les nouveaux ou modifiés sont vectorisés
  analyse: 25_000, // un appel au modèle « fin »
  recapitulatif: 6_000, // un courriel par membre de l'équipe
};

// Le temps qu'on s'accorde dans une fonction de 60 s : 52 s, la marge couvre le démarrage et la réponse.
export const BUDGET_PASSAGE_MS = 52_000;

export function tempsRestant(debut: number, maintenant: number, budget = BUDGET_PASSAGE_MS): number {
  return Math.max(0, budget - (maintenant - debut));
}

// Peut-on lancer cette étape ? Le récapitulatif, s'il doit partir à ce passage, garde sa place.
export function peutLancer(etape: Etape, restantMs: number, recapAPrevoir: boolean, durees = DUREES_ETAPES): boolean {
  const reserve = recapAPrevoir && etape !== "recapitulatif" ? durees.recapitulatif : 0;
  return restantMs - reserve >= durees[etape];
}

// Le temps qu'on laisse à une étape lancée : ce qui reste, moins la place du récapitulatif.
export function delaiAccorde(etape: Etape, restantMs: number, recapAPrevoir: boolean, durees = DUREES_ETAPES): number {
  const reserve = recapAPrevoir && etape !== "recapitulatif" ? durees.recapitulatif : 0;
  return Math.max(0, restantMs - reserve);
}

// « reportee » : pas le temps à ce passage ; « trop_longue » : coupée, reprise au suivant ;
// « sans_objet » : rien à faire pour l'instant (par exemple, la nuit n'est pas importée).
export type ResultatEtape = { etape: Etape; statut: "faite" | "deja_faite" | "reportee" | "en_panne" | "trop_longue" | "sans_objet"; detail?: string; dureeMs?: number };

// Le récapitulatif attend l'analyse quand elle n'a pas eu le temps de se faire,
// sauf au dernier passage du matin : il part alors sans elle, et le dit.
// Une analyse en panne (IA indisponible, budget atteint) ne le retient pas.
export function recapAttendLAnalyse(analyse: ResultatEtape | undefined, dernierPassage: boolean): boolean {
  if (dernierPassage || !analyse) return false;
  return analyse.statut === "reportee" || analyse.statut === "trop_longue";
}
