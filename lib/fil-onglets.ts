import type { StatutSignalement, TypeFil } from "@/lib/db/schema";

// Les onglets du fil d'un chantier : des filtres sur le même fil, rien n'est copié.
// « Qui voit ça ? » s'applique avant : un externe ne reçoit que ce qu'on lui a partagé.

export const ONGLETS_FIL = ["fil", "documents", "demandes", "signalements"] as const;
export type OngletFil = (typeof ONGLETS_FIL)[number];

export const TITRE_ONGLET: Record<OngletFil, string> = {
  fil: "Fil",
  documents: "Documents",
  demandes: "Demandes et dispos",
  signalements: "Signalements",
};

// Les types d'éléments de chaque onglet, et le geste proposé par défaut pour en ajouter un.
const TYPES: Record<OngletFil, TypeFil[] | null> = {
  fil: null, // tout
  documents: ["document"],
  demandes: ["demande", "reponse", "disponibilite"],
  signalements: ["signalement"],
};

export const GESTE_PAR_DEFAUT: Record<OngletFil, TypeFil> = {
  fil: "message",
  documents: "document",
  demandes: "demande",
  signalements: "signalement",
};

export function ongletDepuis(valeur: unknown): OngletFil {
  return typeof valeur === "string" && (ONGLETS_FIL as readonly string[]).includes(valeur) ? (valeur as OngletFil) : "fil";
}

export function dansOnglet(onglet: OngletFil, type: TypeFil): boolean {
  const t = TYPES[onglet];
  return t === null || t.includes(type);
}

// Les gestes qu'on peut faire depuis un onglet : tous dans le fil, ceux de l'onglet sinon.
export function gestesDe(onglet: OngletFil, gestes: TypeFil[]): TypeFil[] {
  const t = TYPES[onglet];
  return t === null ? gestes : gestes.filter((g) => t.includes(g));
}

type ElementCompte = { type: TypeFil; statutSignalement: StatutSignalement | null; dateCible: string | null };

export type Compteur = { nombre: number; aTraiter: number };

// Le chiffre de chaque onglet, et ce qui y demande une action : il s'affiche en noir.
// Demandes : celles dont l'échéance est passée. Signalements : à qualifier ou réserve ouverte.
export function compteurs(elements: ElementCompte[], aujourdhui: string, extras: { documents?: number; documentsATraiter?: number } = {}): Record<OngletFil, Compteur> {
  const de = (o: OngletFil) => elements.filter((e) => dansOnglet(o, e.type));
  const signalements = de("signalements");
  const demandes = de("demandes");
  return {
    fil: { nombre: elements.length, aTraiter: 0 },
    documents: { nombre: de("documents").length + (extras.documents ?? 0), aTraiter: extras.documentsATraiter ?? 0 },
    demandes: { nombre: demandes.length, aTraiter: demandes.filter((e) => e.type === "demande" && e.dateCible !== null && e.dateCible < aujourdhui).length },
    signalements: {
      nombre: signalements.length,
      aTraiter: signalements.filter((e) => e.statutSignalement === "a_qualifier" || e.statutSignalement === "reserve_ouverte").length,
    },
  };
}

// La bande des disponibilités : les jours qui viennent, et qui est là chaque jour.
export function bandeDesJours(dispos: { dateCible: string | null; auteur: string }[], aujourdhui: string, nbJours = 7): { jour: string; presents: string[] }[] {
  const [a, m, j] = aujourdhui.split("-").map(Number);
  return Array.from({ length: nbJours }, (_, i) => {
    const jour = new Date(Date.UTC(a, m - 1, j + i)).toISOString().slice(0, 10);
    const presents = [...new Set(dispos.filter((d) => d.dateCible === jour).map((d) => d.auteur))];
    return { jour, presents };
  });
}
