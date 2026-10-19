// Ce que coûte la nuit. Sur les offres gratuites (Vercel Hobby, Neon Free, Resend
// gratuit), le coût réel est de zéro euro tant qu'on reste sous leurs plafonds.
// Les tarifs ci-dessous sont des PARAMÈTRES indicatifs, pour estimer « au-delà » :
// à vérifier sur les pages de prix de chaque service avant de s'en servir pour décider.
export const TARIFS_INDICATIFS = {
  // Temps d'exécution d'une fonction Vercel, par heure (mémoire par défaut).
  fonctionEuroParHeure: 0.2,
  // Un courriel Resend au-delà de l'offre gratuite.
  courrielEuro: 0.0009,
  // Le flux de nuit et l'API Adresse sont gratuits.
  appelFluxEuro: 0,
  geocodageEuro: 0,
};

export type Consommation = { dureeMs: number; appelsFlux: number; geocodages: number; courriels: number };

export function estimer(c: Consommation, t = TARIFS_INDICATIFS) {
  const fonction = (c.dureeMs / 3_600_000) * t.fonctionEuroParHeure;
  const courriels = c.courriels * t.courrielEuro;
  const appels = c.appelsFlux * t.appelFluxEuro + c.geocodages * t.geocodageEuro;
  return { fonction, courriels, appels, total: fonction + courriels + appels };
}

// ——— Le coût de l'IA ———
// Les coûts viennent de la table appels_ia (lib/ia.ts), calculés aux tarifs indicatifs
// de lib/ia-regles.ts (TARIFS_USD_PAR_MILLION, DOLLAR_EN_EURO), eux aussi à vérifier.

export type LigneAppelsIa = { fonction: string; appels: number; echecs: number; cout: number | string };

// Le nom d'une fonction IA, en français. Un code inconnu s'affiche tel quel.
const NOMS_FONCTIONS: [RegExp, string][] = [
  [/^courriers?_lecture_nuit$/, "Lecture de courrier (nuit)"],
  [/^(courriers?_)?lecture(_courriers?)?$/, "Lecture de courrier"],
  [/^question/, "Question sur les documents"],
  [/^indexation_nuit$/, "Indexation des documents (nuit)"],
  [/^indexation/, "Indexation des documents"],
  [/^analyse_nuit$/, "Analyse de la nuit"],
  [/^test$/, "Test des réglages"],
];
export function nomFonctionIa(code: string): string {
  return NOMS_FONCTIONS.find(([m]) => m.test(code))?.[1] ?? code;
}

function joursDuMois(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function bilanIa(lignes: LigneAppelsIa[], p: { budgetEuros: number; maintenant?: Date }) {
  const maintenant = p.maintenant ?? new Date();
  const fonctions = lignes
    .map((l) => {
      const cout = Number(l.cout) || 0;
      return { fonction: l.fonction, nom: nomFonctionIa(l.fonction), appels: l.appels, echecs: l.echecs, cout, coutMoyen: l.appels ? cout / l.appels : 0 };
    })
    .sort((a, b) => b.cout - a.cout || b.appels - a.appels);
  const total = fonctions.reduce((s, f) => s + f.cout, 0);
  const appels = fonctions.reduce((s, f) => s + f.appels, 0);
  const echecs = fonctions.reduce((s, f) => s + f.echecs, 0);
  // L'estimation au mois plein : la dépense au rythme des jours écoulés (le jour en cours compte en entier).
  const jours = joursDuMois(maintenant);
  const ecoules = Math.min(jours, maintenant.getUTCDate());
  return {
    fonctions,
    appels,
    echecs,
    total,
    coutMoyen: appels ? total / appels : 0,
    budget: p.budgetEuros,
    reste: Math.max(0, p.budgetEuros - total),
    depasse: total >= p.budgetEuros,
    estimationMoisPlein: (total / ecoules) * jours,
  };
}
