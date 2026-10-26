import { ViewTransition } from "react";

// Les transitions entre pages (React <ViewTransition>, sans bibliothèque).
// Aller plus loin (une carte vers sa fiche) glisse vers la gauche ; revenir glisse
// vers la droite. Les navigations sans type (bouton retour du navigateur) ne glissent pas.
export const VERS_FICHE = ["nav-forward"];
export const RETOUR = ["nav-back"];

const SENS = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export function PageGlissante({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={SENS} exit={SENS} default="none">
      {children}
    </ViewTransition>
  );
}

// La photo d'un chantier garde son identité d'une page à l'autre : sur la carte,
// dans l'écran de chargement et dans le bandeau de la fiche. Elle se déplace et
// s'agrandit au lieu de disparaître puis réapparaître.
export function PhotoPartagee({ chantierId, children }: { chantierId: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={`photo-${chantierId}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
