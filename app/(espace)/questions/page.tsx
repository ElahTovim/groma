import Link from "next/link";
import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { journal } from "@/lib/journal";
import { nombreDeDocuments } from "@/lib/recherche";
import { appelantObligatoire } from "@/lib/session";
import { BoutonIndexer } from "./bouton-indexer";
import { Questions } from "./questions";

export const dynamic = "force-dynamic";
// Le bouton d'indexation lance la lecture des 20 documents depuis cette page.
export const maxDuration = 60;

// Poser une question sur les documents du flux, et lire la réponse qui cite ses pages.
export default async function PageQuestions({ searchParams }: PageProps<"/questions">) {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) {
    journal("question_refusee", { compte: qui.id, role: qui.role, page: "/questions" });
    notFound();
  }
  const n = await nombreDeDocuments();
  // Une question venue de la recherche de l'accueil (?q=…) arrive déjà posée.
  const { q } = await searchParams;
  const questionInitiale = typeof q === "string" ? q.slice(0, 2000) : undefined;
  const gerant = qui.role === "gerant";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Questions sur les documents</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Posez une question sur les procédures, contrats et comptes rendus. La réponse ne s&apos;appuie que sur les documents, cite le document et la page, et dit ce qui reste à vérifier.
        </p>
        {n > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/questions/documents" className="underline underline-offset-4">
              {n} document{n > 1 ? "s" : ""} indexé{n > 1 ? "s" : ""}
            </Link>
            {gerant && <BoutonIndexer libelle="Mettre à jour l'index" variant="outline" />}
          </div>
        )}
      </div>

      {n === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Aucun document n&apos;est encore indexé.</p>
          {gerant ? (
            <>
              <p className="max-w-md text-sm text-muted-foreground">
                groma lit les documents du flux, les découpe page par page et les range pour la recherche. Un document déjà indexé et inchangé ne sera pas recalculé.
              </p>
              <BoutonIndexer />
            </>
          ) : (
            <p className="max-w-md text-sm text-muted-foreground">Le gérant doit d&apos;abord indexer les documents du flux.</p>
          )}
        </div>
      ) : (
        <Questions questionInitiale={questionInitiale} />
      )}
    </div>
  );
}
