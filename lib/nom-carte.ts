import type { DonneesCote } from "@/lib/cote";

// Ce qu'un lecteur d'écran dit d'une carte de chantier : le nom d'abord, puis l'essentiel.
// Partagé par le navigateur (cartes, pile) et le serveur (bento de l'accueil).
export function nomCarte(c: { nom: string; ville: string; etape: string; aViser: string | null; cote: DonneesCote }) {
  return `${c.nom}, ${c.ville}, ${c.etape}${c.aViser ? `, à viser : ${c.aViser}` : ""}${c.cote.total ? `, lots finis ${c.cote.finis} sur ${c.cote.total}` : ""}`;
}
