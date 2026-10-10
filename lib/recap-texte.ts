// Le texte du récapitulatif du matin, sans base de données : testable seul.

export type LigneRecap = { reference: string; nom: string; ville: string; lien: string; detail: string };

export type ContenuRecap = {
  prenom: string;
  jour: string; // AAAA-MM-JJ
  portee: "tous" | "les siens";
  nuit: { reussie: boolean; nouveaux: number; misesAJour: number; messages: number; misDeCote: number; erreur?: string } | null;
  aTraiter: LigneRecap[];
  demandesEnRetard: LigneRecap[];
  lienNuit: string | null;
};

function jourLong(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function liste(titre: string, lignes: LigneRecap[], vide: string): string {
  if (lignes.length === 0) return `${titre}\n${vide}\n`;
  const max = 10;
  const corps = lignes.slice(0, max).map((l) => `- ${l.reference} · ${l.nom} (${l.ville}) : ${l.detail}\n  ${l.lien}`);
  if (lignes.length > max) corps.push(`… et ${lignes.length - max} autre${lignes.length - max > 1 ? "s" : ""}.`);
  return `${titre}\n${corps.join("\n")}\n`;
}

export function composerRecap(c: ContenuRecap): { sujet: string; texte: string } {
  const aFaire = c.aTraiter.length + c.demandesEnRetard.length;
  const sujet = c.nuit && !c.nuit.reussie ? `groma · ${jourLong(c.jour)} : la nuit n'a pas pu être importée` : aFaire ? `groma · ${jourLong(c.jour)} : ${aFaire} point${aFaire > 1 ? "s" : ""} à traiter` : `groma · ${jourLong(c.jour)} : rien à signaler`;

  let nuit: string;
  if (!c.nuit) nuit = "La nuit n'a pas encore été importée.";
  else if (!c.nuit.reussie) nuit = `La nuit n'a pas pu être importée : ${c.nuit.erreur ?? "le flux ne répond pas"}. Elle sera rattrapée automatiquement.`;
  else
    nuit = `Cette nuit : ${c.nuit.nouveaux} nouveau${c.nuit.nouveaux > 1 ? "x" : ""} chantier${c.nuit.nouveaux > 1 ? "s" : ""}, ${c.nuit.misesAJour} mise${c.nuit.misesAJour > 1 ? "s" : ""} à jour, ${c.nuit.messages} message${c.nuit.messages > 1 ? "s" : ""}${c.nuit.misDeCote ? `, ${c.nuit.misDeCote} événement${c.nuit.misDeCote > 1 ? "s" : ""} mis de côté` : ""}.`;

  const texte = [
    `Bonjour ${c.prenom},`,
    "",
    `Voici le point du ${jourLong(c.jour)}${c.portee === "les siens" ? ", pour vos chantiers" : ""}.`,
    "",
    nuit,
    c.lienNuit ? `Détail : ${c.lienNuit}` : "",
    "",
    liste("À TRAITER", c.aTraiter, "Rien : aucun signalement en attente, aucune réserve ouverte, aucun lot en retard."),
    liste("DEMANDES DONT L'ÉCHÉANCE EST PASSÉE", c.demandesEnRetard, "Aucune."),
    "Ce récapitulatif part une fois par jour.",
  ]
    .filter((l, i, t) => !(l === "" && t[i - 1] === ""))
    .join("\n");
  return { sujet, texte };
}
