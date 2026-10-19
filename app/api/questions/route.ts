import { z } from "zod";
import { voitLInterne } from "@/lib/acces";
import { demanderEnDirect } from "@/lib/ia";
import { journal } from "@/lib/journal";
import { chercherPassages } from "@/lib/recherche";
import { controlerCitations } from "@/lib/recherche-citations";
import type { EvenementQuestion } from "@/lib/recherche-flux";
import { CONSIGNE_REPONSE, contenuDeLaQuestion, REGLAGES_RECHERCHE, REPONSE_INTROUVABLE } from "@/lib/recherche-regles";
import { appelant } from "@/lib/session";

// La réponse peut prendre une minute : recherche, puis rédaction en direct.
export const maxDuration = 60;

const corpsAttendu = z.object({
  question: z
    .string({ message: "Question manquante." })
    .trim()
    .min(REGLAGES_RECHERCHE.questionMin, "Question trop courte.")
    .max(REGLAGES_RECHERCHE.questionMax, `Question trop longue : ${REGLAGES_RECHERCHE.questionMax} caractères au plus.`),
});

// Une question sur les documents du flux. Session obligatoire, gérant et équipe seulement.
// La réponse arrive en direct, une ligne JSON par événement (lib/recherche-flux.ts).
export async function POST(requete: Request) {
  const qui = await appelant();
  if (!qui) return Response.json({ erreur: "Connectez-vous pour poser une question." }, { status: 401 });
  if (!voitLInterne(qui.role)) {
    // Un externe ne sait même pas que la page existe.
    journal("question_refusee", { compte: qui.id, role: qui.role });
    return Response.json({ erreur: "Introuvable." }, { status: 404 });
  }
  let brut: unknown;
  try {
    brut = await requete.json();
  } catch {
    return Response.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const lu = corpsAttendu.safeParse(brut);
  if (!lu.success) return Response.json({ erreur: lu.error.issues[0].message }, { status: 400 });
  const question = lu.data.question;
  const demandeur = { compteId: qui.id, fonction: "question" };

  const encodeur = new TextEncoder();
  const flux = new ReadableStream<Uint8Array>({
    async start(c) {
      const envoyer = (e: EvenementQuestion) => c.enqueue(encodeur.encode(`${JSON.stringify(e)}\n`));
      try {
        envoyer({ type: "etape", etape: "recherche" });
        const r = await chercherPassages(demandeur, question);
        if (!r.ok) {
          envoyer({ type: "erreur", erreur: r.erreur });
          return;
        }
        envoyer({ type: "sources", sources: r.sources.map((s) => ({ documentId: s.documentId, titre: s.titre, page: s.page, extrait: s.texte })) });
        // Rien d'assez proche : on le dit, sans appeler le modèle de réponse.
        if (r.sources.length === 0) {
          journal("question", { compte: qui.id, caracteres: question.length, sources: 0, plus_proche: r.plusProche });
          envoyer({ type: "introuvable", message: REPONSE_INTROUVABLE });
          return;
        }

        envoyer({ type: "etape", etape: "redaction" });
        const reponse = await demanderEnDirect(demandeur, { gamme: "fin", consigne: CONSIGNE_REPONSE, contenu: contenuDeLaQuestion(question, r.sources), maxJetons: 1500 });
        if (!reponse.ok) {
          envoyer({ type: "erreur", erreur: reponse.erreur });
          return;
        }
        const lecteur = reponse.flux.getReader();
        const decodeur = new TextDecoder();
        let texte = "";
        for (;;) {
          const { value, done } = await lecteur.read();
          if (done) break;
          const t = decodeur.decode(value, { stream: true });
          texte += t;
          envoyer({ type: "texte", texte: t });
        }
        const fin = decodeur.decode();
        if (fin) {
          texte += fin;
          envoyer({ type: "texte", texte: fin });
        }

        // Chaque citation est confrontée aux sources réellement fournies.
        const citations = controlerCitations(texte, r.sources);
        const invalides = citations.filter((x) => x.statut !== "valide");
        journal("question", { compte: qui.id, caracteres: question.length, sources: r.sources.length, citations: citations.length, citations_invalides: invalides.length });
        if (invalides.length) journal("citation_inventee", { compte: qui.id, citations: invalides.map((x) => x.brut) });
        envoyer({ type: "controle", citations });
      } catch (e) {
        journal("question_echec", { compte: qui.id, erreur: String(e) });
        envoyer({ type: "erreur", erreur: "La recherche a échoué. Réessayez dans un instant." });
      } finally {
        envoyer({ type: "fin" });
        c.close();
      }
    },
  });

  return new Response(flux, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff" },
  });
}
