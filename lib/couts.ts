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
