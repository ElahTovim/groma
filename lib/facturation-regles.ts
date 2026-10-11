import { garanties } from "@/lib/reception-regles";
import type { StatutChantier } from "@/lib/db/schema";

// Ce que groma sait et qu'un outil de facturation attend : les jalons d'un chantier.
// groma ne facture pas : il dit QUAND facturer, et à QUI. Voir docs/branchement-facturation.md.

export type Jalon = { cle: "acompte" | "situation" | "solde" | "retenue"; libelle: string; date: string | null };

export function prochainJalon(c: { statut: StatutChantier; pvSigneLe: string | null; reservesOuvertes: number }, aujourdhui: string): Jalon | null {
  switch (c.statut) {
    case "devis":
    case "annule":
      return null;
    case "signe":
    case "planifie":
      return { cle: "acompte", libelle: "Facture d'acompte à la signature", date: null };
    case "en_cours":
      return { cle: "situation", libelle: "Situation de travaux selon l'avancement", date: null };
    case "reception":
      return c.pvSigneLe
        ? { cle: "solde", libelle: "Facture de solde : PV de réception signé", date: c.pvSigneLe }
        : { cle: "solde", libelle: "Facture de solde après signature du PV", date: null };
    case "clos": {
      if (!c.pvSigneLe) return null;
      const liberable = garanties(c.pvSigneLe).retenueLiberable;
      if (liberable > aujourdhui) return { cle: "retenue", libelle: "Libération de la retenue de garantie", date: liberable };
      return c.reservesOuvertes > 0 ? { cle: "retenue", libelle: "Retenue de garantie : réserves encore ouvertes", date: liberable } : null;
    }
  }
}

// Un fichier CSV que les tableurs français et les outils de facturation lisent :
// point-virgule, guillemets doublés, et la marque UTF-8 pour les accents dans Excel.
export function versCsv(entetes: string[], lignes: (string | number | null)[][]): string {
  const cellule = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Une cellule qui commence par = + - @ serait lue comme une formule : on la neutralise.
    if (/^[=+\-@]/.test(s) && typeof v !== "number") s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n") + "\r\n";
}
