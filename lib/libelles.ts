import type { StatutLot, StatutSignalement, TypeFil } from "@/lib/db/schema";

export const LIBELLE_LOT: Record<StatutLot, string> = {
  a_commander: "À commander",
  commande: "Commandé",
  livre: "Livré",
  pose: "Posé",
  fini: "Fini",
};

export const ACTION_LOT: Partial<Record<StatutLot, string>> = {
  commande: "Commandé",
  livre: "Livré",
  pose: "Posé",
  fini: "Fini",
};

export const LIBELLE_TYPE: Record<TypeFil, string> = {
  message: "Message",
  demande: "Demande",
  reponse: "Réponse",
  disponibilite: "Disponibilité",
  document: "Document",
  signalement: "Signalement",
};

export const LIBELLE_SIGNALEMENT: Record<StatutSignalement, string> = {
  a_qualifier: "À qualifier",
  reserve_ouverte: "Réserve ouverte",
  levee: "Levée",
  ecarte: "Écarté",
};
