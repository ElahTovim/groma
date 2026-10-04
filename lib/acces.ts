import type { Role } from "@/lib/db/schema";

// Le réglage « l'équipe voit tous les chantiers » (docs/cycle-de-vie.md).
// Un paramètre, pas une règle en dur : vrai par défaut pour une petite entreprise,
// EQUIPE_VOIT_TOUT=false pour une grande.
export function equipeVoitTout(): boolean {
  return process.env.EQUIPE_VOIT_TOUT !== "false";
}

// La seule question d'accès du produit : cette personne voit-elle ce chantier ?
export function peutVoirChantier(params: { role: Role; estParticipant: boolean; equipeVoitTout: boolean }): boolean {
  if (params.role === "gerant") return true;
  if (params.role === "equipe" && params.equipeVoitTout) return true;
  return params.estParticipant;
}

// Les droits d'action, par rôle. Un externe ne change jamais rien au chantier lui-même.
export function peutCreerChantier(role: Role): boolean {
  return role === "gerant" || role === "equipe";
}

// Ce qui est interne (montant, lots, retards) ne part jamais vers un externe.
export function voitLInterne(role: Role): boolean {
  return role === "gerant" || role === "equipe";
}
