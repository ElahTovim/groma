// Les citations d'une réponse, sans base ni réseau : les trouver dans le texte, les
// confronter aux sources réellement fournies au modèle, isoler la section « À vérifier ».
// Utilisable côté serveur comme dans le navigateur. Testé dans recherche-citations.test.ts.

export type SourceCitable = { documentId: string; titre: string; page: number };

export type Citation = { brut: string; titre: string; page: number };

export type StatutCitation =
  | { statut: "valide"; documentId: string }
  | { statut: "page_non_fournie" } // le document est bien une source, mais pas cette page
  | { statut: "document_inconnu" }; // aucun document fourni ne porte ce titre

export type CitationControlee = Citation & StatutCitation;

// [titre du document, p. N] ; le titre peut contenir des virgules : on coupe à la dernière « , p. ».
const MOTIF = /\[([^[\]\n]+?),\s*(?:p\.|page)\s*(\d+)\s*\]/gi;

export function extraireCitations(texte: string): Citation[] {
  const vues = new Set<string>();
  const citations: Citation[] = [];
  for (const m of texte.matchAll(MOTIF)) {
    if (vues.has(m[0])) continue;
    vues.add(m[0]);
    citations.push({ brut: m[0], titre: m[1].trim(), page: Number(m[2]) });
  }
  return citations;
}

// Deux titres sont les mêmes à la casse, aux accents, aux guillemets et aux espaces près.
export function titreNormalise(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[«»"“”'’*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function controlerCitation(c: Citation, sources: SourceCitable[]): CitationControlee {
  const memeTitre = sources.filter((s) => titreNormalise(s.titre) === titreNormalise(c.titre));
  if (memeTitre.length === 0) return { ...c, statut: "document_inconnu" };
  const exacte = memeTitre.find((s) => s.page === c.page);
  if (!exacte) return { ...c, statut: "page_non_fournie" };
  return { ...c, statut: "valide", documentId: exacte.documentId };
}

export function controlerCitations(texte: string, sources: SourceCitable[]): CitationControlee[] {
  return extraireCitations(texte).map((c) => controlerCitation(c, sources));
}

// Découpe le texte en morceaux simples et en citations, pour l'affichage.
export function decouperEnCitations(texte: string): ({ type: "texte"; texte: string } | { type: "citation"; brut: string })[] {
  const parts: ({ type: "texte"; texte: string } | { type: "citation"; brut: string })[] = [];
  let i = 0;
  for (const m of texte.matchAll(MOTIF)) {
    if (m.index > i) parts.push({ type: "texte", texte: texte.slice(i, m.index) });
    parts.push({ type: "citation", brut: m[0] });
    i = m.index + m[0].length;
  }
  if (i < texte.length) parts.push({ type: "texte", texte: texte.slice(i) });
  return parts;
}

// La section finale « À vérifier » (titre seul sur sa ligne, avec ou sans #, ** ou deux-points).
const TITRE_A_VERIFIER = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*[aà][ \t]+v[ée]rifier[ \t]*:?[ \t]*(?:\*\*)?[ \t]*:?[ \t]*$/im;

export function separerAVerifier(texte: string): { reponse: string; aVerifier: string | null } {
  const m = TITRE_A_VERIFIER.exec(texte);
  if (!m) return { reponse: texte, aVerifier: null };
  return { reponse: texte.slice(0, m.index).trimEnd(), aVerifier: texte.slice(m.index + m[0].length).trim() };
}
