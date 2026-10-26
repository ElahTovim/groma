import type { Role, StatutChantier, StatutLot, StatutSignalement, TypeFil } from "@/lib/db/schema";

// Les règles métier de docs/cycle-de-vie.md, sans base de données : chaque
// fonction reçoit ce qu'il faut savoir et rend un verdict. Testées dans regles.test.ts.

export type Verdict = { ok: true } | { ok: false; raisons: string[] };

// ——— Le chantier ———

const SUIVANTE: Partial<Record<StatutChantier, StatutChantier>> = {
  devis: "signe",
  signe: "planifie",
  planifie: "en_cours",
  en_cours: "reception",
  reception: "clos",
};

export function etapeSuivante(statut: StatutChantier): StatutChantier | null {
  return SUIVANTE[statut] ?? null;
}

export const LIBELLE_ACTION: Partial<Record<StatutChantier, string>> = {
  signe: "Marquer le devis signé",
  planifie: "Passer en planifié",
  en_cours: "Démarrer le chantier",
  reception: "Déclarer la réception",
  clos: "Clore le chantier",
};

// Les étapes qui alertent le gérant.
export const ETAPES_ALERTE: StatutChantier[] = ["signe", "reception", "annule"];

export type ContexteChantier = {
  debutPrevu: string | null;
  aujourdhui: string; // AAAA-MM-JJ
  nbDocuments: number;
  lots: { nom: string; statut: StatutLot }[];
  signalementsAQualifier: number;
  reservesOuvertes: number;
  // Le PV de réception est signé par le maître d'ouvrage (lib/reception-regles.ts).
  pvSigne: boolean;
  // Les pièces attendues qui manquent et bloquent une étape (lib/pieces-regles.ts), une phrase chacune.
  piecesDemarrage: string[];
  piecesCloture: string[];
};

export function verifierPassage(de: StatutChantier, vers: StatutChantier, c: ContexteChantier): Verdict {
  if (etapeSuivante(de) !== vers) return { ok: false, raisons: ["Cette étape ne suit pas l'étape actuelle du chantier."] };
  const raisons: string[] = [];
  if (vers === "signe" && c.nbDocuments === 0) {
    raisons.push("Joignez le devis au fil avant de le marquer signé.");
  }
  if (vers === "planifie") {
    if (!c.debutPrevu) raisons.push("Indiquez la date de début prévue.");
    if (c.lots.length === 0) raisons.push("Ajoutez au moins un lot.");
  }
  if (vers === "en_cours" && c.debutPrevu && c.debutPrevu > c.aujourdhui) {
    raisons.push("La date de début prévue n'est pas encore atteinte.");
  }
  if (vers === "en_cours") raisons.push(...c.piecesDemarrage.map((p) => `Pièce manquante : ${p}`));
  if (vers === "reception") {
    const nonFinis = c.lots.filter((l) => l.statut !== "fini").map((l) => l.nom);
    if (nonFinis.length > 0) {
      raisons.push(`${nonFinis.length} lot${nonFinis.length > 1 ? "s ne sont pas finis" : " n'est pas fini"} : ${nonFinis.join(", ")}.`);
    }
  }
  if (vers === "clos") {
    if (!c.pvSigne) raisons.push("Faites signer le PV de réception par le maître d'ouvrage.");
    raisons.push(...c.piecesCloture.map((p) => `Pièce manquante : ${p}`));
    // La règle phare : pas de clôture avec un signalement en attente ou une réserve ouverte.
    if (c.signalementsAQualifier > 0) {
      raisons.push(`${c.signalementsAQualifier} signalement${c.signalementsAQualifier > 1 ? "s" : ""} à qualifier.`);
    }
    if (c.reservesOuvertes > 0) {
      raisons.push(`${c.reservesOuvertes} réserve${c.reservesOuvertes > 1 ? "s" : ""} ouverte${c.reservesOuvertes > 1 ? "s" : ""}.`);
    }
  }
  return raisons.length ? { ok: false, raisons } : { ok: true };
}

export function peutAnnuler(statut: StatutChantier): boolean {
  return statut === "devis" || statut === "signe" || statut === "planifie";
}

// ——— Le lot ———

const LOT_SUIVANT: Partial<Record<StatutLot, StatutLot>> = {
  a_commander: "commande",
  commande: "livre",
  livre: "pose",
  pose: "fini",
};

export function etapeSuivanteLot(statut: StatutLot): StatutLot | null {
  return LOT_SUIVANT[statut] ?? null;
}

// Le cycle est linéaire : « pas de pose sans livraison » en découle, mais on le dit.
export function verifierPassageLot(de: StatutLot, vers: StatutLot): Verdict {
  if (vers === "pose" && de !== "livre") return { ok: false, raisons: ["Pas de pose sans livraison : le lot doit d'abord être livré."] };
  if (etapeSuivanteLot(de) !== vers) return { ok: false, raisons: ["Cette étape ne suit pas l'étape actuelle du lot."] };
  return { ok: true };
}

type DatesLot = { statut: StatutLot; livraisonPrevue: string | null; finPrevue: string | null };

function joursEntre(de: string, a: string): number {
  return Math.round((Date.parse(a) - Date.parse(de)) / 86_400_000);
}

// De combien de jours chaque date prévue est dépassée sans que l'étape ait eu lieu
// (null : pas de retard sur cette date). L'écran dit « livraison en retard de 3 jours ».
export function retardsLot(l: DatesLot, aujourdhui: string): { livraison: number | null; fin: number | null } {
  const pasLivre = l.statut === "a_commander" || l.statut === "commande";
  const livraison = pasLivre && l.livraisonPrevue && l.livraisonPrevue < aujourdhui ? joursEntre(l.livraisonPrevue, aujourdhui) : null;
  const fin = l.statut !== "fini" && l.finPrevue && l.finPrevue < aujourdhui ? joursEntre(l.finPrevue, aujourdhui) : null;
  return { livraison, fin };
}

// Un lot est en retard quand une date prévue est dépassée sans que l'étape ait eu lieu.
export function lotEnRetard(l: DatesLot, aujourdhui: string): boolean {
  const r = retardsLot(l, aujourdhui);
  return r.livraison !== null || r.fin !== null;
}

// ——— Le fil ———

const INTERNE: Role[] = ["gerant", "equipe"];

// Qui voit un élément du fil : l'interne voit tout ; un externe voit ce qu'il a
// écrit et ce qui a été coché pour lui. Aucune condition sur la qualité.
export function voitElement(qui: { id: string; role: Role }, e: { auteurId: string | null; visiblePar: string[] }): boolean {
  if (INTERNE.includes(qui.role)) return true;
  return e.auteurId === qui.id || e.visiblePar.includes(qui.id);
}

export const TYPES_EXTERNE: TypeFil[] = ["message", "reponse", "disponibilite", "document", "signalement"];

export function peutEcrire(role: Role, type: TypeFil): boolean {
  if (INTERNE.includes(role)) return true;
  return TYPES_EXTERNE.includes(type);
}

// Réglage par défaut du partage à la création : une demande adressée à un
// externe arrive déjà cochée pour lui.
export function partageInitial(type: TypeFil, destinataire: { id: string; role: Role } | null): string[] {
  if (type === "demande" && destinataire && destinataire.role === "externe") return [destinataire.id];
  return [];
}

export function verifierQualification(de: StatutSignalement, vers: StatutSignalement, motif: string): Verdict {
  const permis: Record<StatutSignalement, StatutSignalement[]> = {
    a_qualifier: ["reserve_ouverte", "ecarte"],
    reserve_ouverte: ["levee"],
    levee: [],
    ecarte: [],
  };
  if (!permis[de].includes(vers)) return { ok: false, raisons: ["Ce signalement ne peut pas passer à cet état."] };
  if (vers === "ecarte" && !motif.trim()) return { ok: false, raisons: ["Indiquez pourquoi le signalement est écarté."] };
  return { ok: true };
}

export function aujourdhuiParis(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(maintenant);
}

// ——— Ce qui demande de l'attention (liste des chantiers) ———

export type ATraiter = { lotsEnRetard: number; aQualifier: number; reservesOuvertes: number };

// Un signalement à qualifier pèse le plus : tant qu'il attend, le chantier est bloqué
// et quelqu'un attend une réponse. Puis les réserves ouvertes, puis les retards.
export function poidsATraiter(a: ATraiter | null): number {
  return a ? a.aQualifier * 3 + a.reservesOuvertes * 2 + a.lotsEnRetard : 0;
}

// Une liste de chantiers a un plafond. Ceux qui attendent un geste passent d'abord,
// d'où qu'ils viennent dans la base ; les plus récents complètent la place restante.
// Sans cela, un chantier ancien en retard sortait de la liste dès que 200 plus récents
// existaient (constaté au test à volume, docs/volume.md).
export function reunirListe<T extends { id: string }>(urgents: T[], recents: T[], plafond: number): T[] {
  const vus = new Set<string>();
  const liste: T[] = [];
  for (const c of [...urgents, ...recents]) {
    if (liste.length >= plafond) break;
    if (vus.has(c.id)) continue;
    vus.add(c.id);
    liste.push(c);
  }
  return liste;
}
