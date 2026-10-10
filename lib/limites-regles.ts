// Les plafonds, en un seul endroit : ce sont des paramètres, pas des règles en dur.
export const LIMITES = {
  // Connexion : au-delà, on attend la fin de la fenêtre.
  connexionParAdresse: { max: 5, fenetreMs: 15 * 60 * 1000 },
  connexionParReseau: { max: 30, fenetreMs: 15 * 60 * 1000 },
  // Mot de passe oublié : évite d'inonder une boîte de courriels.
  oubliParAdresse: { max: 3, fenetreMs: 60 * 60 * 1000 },
  // Par compte et par jour.
  invitationsParJour: { max: 30, fenetreMs: 24 * 3600 * 1000 },
  fichiersParJour: { max: 60, fenetreMs: 24 * 3600 * 1000 },
} as const;

export type Sujet = keyof typeof LIMITES;

export function depasse(nombreDansLaFenetre: number, sujet: Sujet): boolean {
  return nombreDansLaFenetre >= LIMITES[sujet].max;
}

// Une session n'est valable que si elle porte le numéro de session actuel du compte.
export function sessionValable(versionDuJeton: unknown, versionDuCompte: number): boolean {
  return (typeof versionDuJeton === "number" ? versionDuJeton : 0) === versionDuCompte;
}

// L'adresse réseau de l'appelant, telle que Vercel la transmet.
export function adresseReseau(entetes: Headers): string {
  return entetes.get("x-forwarded-for")?.split(",")[0]?.trim() || entetes.get("x-real-ip") || "inconnue";
}
