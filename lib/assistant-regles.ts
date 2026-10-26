import { OUTILS_AGENT } from "@/lib/agent-regles";

// Les règles de l'écran de l'assistant, sans base : ce qu'on met en évidence dans le journal,
// le tri des étapes d'une exécution, le découpage du texte de la réponse.
// Testé dans assistant-regles.test.ts.

// Au-delà, une exécution encore « en cours » ne finira plus : la fonction a été coupée.
// L'exécution elle-même dure 90 secondes au plus, la page 300.
export const DELAI_INTERRUPTION_MS = 6 * 60 * 1000;

export type StatutAffiche = "en_cours" | "fini" | "budget" | "erreur" | "interrompue";

export const LIBELLE_STATUT_AGENT: Record<StatutAffiche, string> = {
  en_cours: "En cours",
  fini: "Fini",
  budget: "Arrêté au budget",
  erreur: "Erreur",
  interrompue: "Interrompue",
};

export function statutAffiche(statut: string, debut: Date, maintenant: Date): StatutAffiche {
  if (statut === "fini" || statut === "budget" || statut === "erreur") return statut;
  if (statut === "en_cours") return maintenant.getTime() - debut.getTime() > DELAI_INTERRUPTION_MS ? "interrompue" : "en_cours";
  return "erreur";
}

// Une exécution « à regarder » : une erreur, un arrêt au budget, un outil refusé, une consigne suspecte.
export type ResumeExecution = { statut: StatutAffiche; refus: number; suspects: number };

export function raisonsARegarder(x: ResumeExecution): string[] {
  const r: string[] = [];
  if (x.statut === "erreur" || x.statut === "interrompue") r.push(LIBELLE_STATUT_AGENT[x.statut]);
  if (x.statut === "budget") r.push("Arrêt au budget");
  if (x.refus > 0) r.push(x.refus > 1 ? `${x.refus} refus` : "1 refus");
  if (x.suspects > 0) r.push(x.suspects > 1 ? `${x.suspects} consignes suspectes` : "Consigne suspecte");
  return r;
}

export function aRegarder(x: ResumeExecution): boolean {
  return raisonsARegarder(x).length > 0;
}

// Ce qu'une exécution a fait et ce qu'elle propose, tiré de son journal.
export type EtapeVue = { id: string; outil: string; entrees: Record<string, unknown>; resultat: string | null; ok: boolean; suspect: string | null };

export function trierEtapes<T extends EtapeVue>(etapes: T[]): { faits: T[]; propositions: T[]; refus: T[]; suspects: T[] } {
  const genre = (e: T) => OUTILS_AGENT[e.outil]?.genre;
  return {
    faits: etapes.filter((e) => e.ok && genre(e) === "direct"),
    propositions: etapes.filter((e) => e.ok && genre(e) === "proposition"),
    refus: etapes.filter((e) => !e.ok),
    suspects: etapes.filter((e) => Boolean(e.suspect)),
  };
}

// Le nom d'un outil, pour un humain.
export const LIBELLE_OUTIL: Record<string, string> = {
  lister_chantiers: "Lister les chantiers",
  lire_chantier: "Lire un chantier",
  lister_pieces_a_obtenir: "Lister les pièces à obtenir",
  lister_demandes_en_retard: "Lister les demandes en retard",
  chercher_dans_les_documents: "Chercher dans les documents",
  ecrire_note_interne: "Note interne",
  creer_demande_interne: "Demande interne",
  demander_pieces: "Pièces demandées",
  proposer_courriel: "Courriel proposé",
  proposer_demande_externe: "Demande à un externe proposée",
  proposer_partage: "Partage proposé",
};

export const libelleOutil = (outil: string) => LIBELLE_OUTIL[outil] ?? outil;

// Le genre d'un outil, dit pour un humain : il lit, il agit (interne), il propose.
const LIBELLE_GENRE = { lecture: "lecture", direct: "action interne", proposition: "proposition, à valider" } as const;
export const OUTILS_GENRE: Record<string, string> = Object.fromEntries(Object.entries(OUTILS_AGENT).map(([nom, o]) => [nom, LIBELLE_GENRE[o.genre]]));

export const LIBELLE_PROPOSITION: Record<string, string> = { courriel: "Courriel", demande_externe: "Demande à un externe", partage: "Partage" };

// Une ligne lisible pour une étape : ce qui compte dans ses entrées, sans le JSON.
export function decrireEntrees(entrees: Record<string, unknown>): string {
  const morceaux: string[] = [];
  for (const [cle, v] of Object.entries(entrees ?? {})) {
    if (v === null || v === undefined || v === "") continue;
    const valeur = Array.isArray(v) ? v.map(String).join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    morceaux.push(`${cle} : ${valeur.length > 160 ? `${valeur.slice(0, 159)}…` : valeur}`);
  }
  return morceaux.join(" · ");
}

export function dureeLisible(debut: Date, fin: Date | null): string {
  if (!fin) return "pas finie";
  const s = Math.max(0, Math.round((fin.getTime() - debut.getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

// Le texte de la réponse : du Markdown simple (titres, listes, paragraphes, gras, code).
export type Bloc =
  | { type: "titre"; niveau: number; texte: string }
  | { type: "liste"; ordonnee: boolean; elements: string[] }
  | { type: "paragraphe"; texte: string };

export function decouperReponse(texte: string): Bloc[] {
  const blocs: Bloc[] = [];
  let paragraphe: string[] = [];
  let liste: { ordonnee: boolean; elements: string[] } | null = null;
  const fermer = () => {
    if (paragraphe.length) blocs.push({ type: "paragraphe", texte: paragraphe.join(" ") });
    if (liste) blocs.push({ type: "liste", ...liste });
    paragraphe = [];
    liste = null;
  };
  for (const brute of String(texte ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const ligne = brute.trim();
    if (!ligne || /^(-{3,}|\*{3,}|_{3,})$/.test(ligne)) {
      fermer();
      continue;
    }
    const titre = ligne.match(/^(#{1,6})\s+(.*)$/);
    if (titre) {
      fermer();
      blocs.push({ type: "titre", niveau: titre[1].length, texte: titre[2].replace(/#+$/, "").trim() });
      continue;
    }
    const puce = ligne.match(/^[-*•]\s+(.*)$/);
    const numero = ligne.match(/^\d+[.)]\s+(.*)$/);
    if (puce || numero) {
      const ordonnee = Boolean(numero);
      if (paragraphe.length) {
        blocs.push({ type: "paragraphe", texte: paragraphe.join(" ") });
        paragraphe = [];
      }
      if (liste && liste.ordonnee !== ordonnee) {
        blocs.push({ type: "liste", ...liste });
        liste = null;
      }
      liste ??= { ordonnee, elements: [] };
      liste.elements.push((puce ?? numero)![1]);
      continue;
    }
    // Une ligne qui suit une liste sans ligne vide la continue (élément sur deux lignes).
    if (liste && /^\s{2,}/.test(brute)) {
      liste.elements[liste.elements.length - 1] += ` ${ligne}`;
      continue;
    }
    if (liste) {
      blocs.push({ type: "liste", ...liste });
      liste = null;
    }
    paragraphe.push(ligne);
  }
  fermer();
  return blocs;
}

// Le gras et le code à l'intérieur d'une ligne. Le reste reste du texte brut.
export type Morceau = { texte: string; gras?: true; code?: true };

export function morceauxEnLigne(texte: string): Morceau[] {
  const morceaux: Morceau[] = [];
  const motif = /\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`/g;
  let dernier = 0;
  for (const m of texte.matchAll(motif)) {
    if (m.index > dernier) morceaux.push({ texte: texte.slice(dernier, m.index) });
    if (m[3] !== undefined) morceaux.push({ texte: m[3], code: true });
    else morceaux.push({ texte: m[1] ?? m[2], gras: true });
    dernier = m.index + m[0].length;
  }
  if (dernier < texte.length) morceaux.push({ texte: texte.slice(dernier) });
  return morceaux;
}

// Les exemples proposés sous le champ, tirés de la mission (docs/mission-agent.md).
export const EXEMPLES_DEMANDES = [
  "Qu'est-ce qui bloque le chantier CH-2026-0007 ?",
  "Quelles pièces manquent à Plomberie Ferrand ?",
  "Relance les sous-traitants dont la vigilance expire.",
  "Demande à Karim de vérifier le carrelage avant vendredi.",
];

// Ce qu'on dit pendant l'exécution : d'abord le bac à sable qui s'installe, puis le travail.
export const DUREE_PREPARATION_S = 20;

export function phaseExecution(secondes: number): string {
  return secondes < DUREE_PREPARATION_S ? "Préparation de l'assistant…" : "L'assistant travaille…";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const estIdentifiant = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

// La marche à suivre pour Claude Code. Le jeton reste dans une variable du poste.
export function commandeClaudeCode(site: string): string {
  return `claude mcp add --transport http groma ${site.replace(/\/+$/, "")}/api/mcp --header 'Authorization: Bearer \${GROMA_MCP}'`;
}
