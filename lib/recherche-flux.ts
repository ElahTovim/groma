import type { CitationControlee } from "@/lib/recherche-citations";

// La longueur d'une question, partagée par l'écran et la route.
export const QUESTION_MIN = 3;
export const QUESTION_MAX = 1000;

// Ce que la route /api/questions envoie au navigateur, une ligne JSON par événement,
// dans cet ordre : étape « recherche », sources, étape « redaction », texte (plusieurs fois),
// contrôle des citations, fin. Une erreur peut arriver à tout moment et termine le flux.

export type SourceEnvoyee = { documentId: string; titre: string; page: number; extrait: string };

export type EvenementQuestion =
  | { type: "etape"; etape: "recherche" | "redaction" }
  | { type: "sources"; sources: SourceEnvoyee[] }
  | { type: "introuvable"; message: string }
  | { type: "texte"; texte: string }
  | { type: "controle"; citations: CitationControlee[] }
  | { type: "erreur"; erreur: string }
  | { type: "fin" };

export function lignes(tampon: string): { evenements: EvenementQuestion[]; reste: string } {
  const morceaux = tampon.split("\n");
  const reste = morceaux.pop() ?? "";
  const evenements: EvenementQuestion[] = [];
  for (const l of morceaux) {
    if (!l.trim()) continue;
    try {
      evenements.push(JSON.parse(l) as EvenementQuestion);
    } catch {
      // Une ligne illisible est ignorée : le contrôle final dira si la réponse est complète.
    }
  }
  return { evenements, reste };
}
