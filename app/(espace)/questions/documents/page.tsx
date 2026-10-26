import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { documentsIndexes } from "@/lib/recherche";
import { appelantObligatoire } from "@/lib/session";
import { BoutonIndexer } from "../bouton-indexer";

export const metadata: Metadata = { title: "Documents indexés" };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function date(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d);
}

// La liste des documents indexés : ce sur quoi les réponses peuvent s'appuyer.
export default async function DocumentsIndexes() {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  const docs = await documentsIndexes();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/questions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Questions
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents indexés</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Les documents de référence fournis par le flux : procédures, contrats types, comptes rendus, notes de service. Ils ne sont rattachés à aucun chantier ; ils servent de base aux réponses. Cliquez sur un titre pour le lire.</p>
        </div>
        {qui.role === "gerant" && <BoutonIndexer libelle={docs.length ? "Mettre à jour l'index" : "Indexer les documents du flux"} variant={docs.length ? "outline" : "default"} />}
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Aucun document n&apos;est encore indexé.</p>
          <p className="text-sm text-muted-foreground">{qui.role === "gerant" ? "Lancez l'indexation avec le bouton ci-dessus." : "Le gérant doit d'abord indexer les documents du flux."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des documents indexés, défilable">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">Documents indexés</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 font-medium">Titre</th>
                <th scope="col" className="py-2 font-medium">Type</th>
                <th scope="col" className="py-2 text-right font-medium">Pages</th>
                <th scope="col" className="py-2 text-right font-medium">Passages</th>
                <th scope="col" className="py-2 pl-4 font-medium">Indexé le</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2 pr-3">
                    <Link href={`/questions/documents/${d.id}`} className="font-medium underline-offset-2 hover:underline">
                      {d.titre}
                    </Link>
                    <span className="block font-mono text-xs text-muted-foreground">{d.id}</span>
                  </td>
                  <td className="py-2 pr-3">{d.type ?? "non précisé"}</td>
                  <td className="py-2 text-right tabular-nums">{d.nbPages}</td>
                  <td className="py-2 text-right tabular-nums">{d.morceaux}</td>
                  <td className="py-2 pl-4 whitespace-nowrap">{date(d.indexeLe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
