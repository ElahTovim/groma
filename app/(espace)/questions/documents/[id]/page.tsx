import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { journal } from "@/lib/journal";
import { lireUnDocument, referencesCitees } from "@/lib/recherche";
import { appelantObligatoire } from "@/lib/session";

export const metadata: Metadata = { title: "Document indexé" };

export const dynamic = "force-dynamic";

// Un document du flux, en entier, page par page. Chaque page a son ancre (#page-3) :
// une citation [titre, p. 3] mène droit à elle. Le texte est relu dans le flux à
// chaque ouverture : groma ne garde que les passages découpés pour la recherche.
export default async function DocumentDuFlux({ params }: PageProps<"/questions/documents/[id]">) {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) notFound();

  const r = await lireUnDocument(id);
  if (!r.ok) {
    journal("document_illisible", { compte: qui.id, document: id, raison: r.raison });
    return (
      <div className="flex flex-col gap-4">
        <Link href="/questions/documents" className="text-sm text-muted-foreground hover:text-foreground">
          ← Documents indexés
        </Link>
        <p className="font-medium">Ce document n&apos;a pas pu être lu dans le flux pour l&apos;instant.</p>
        <p className="text-sm text-muted-foreground">Les réponses qui le citent restent valables : ses passages sont indexés. Réessayez dans un moment.</p>
      </div>
    );
  }
  const d = r.doc;
  const references = await referencesCitees(d.pages);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/questions/documents" className="text-sm text-muted-foreground hover:text-foreground">
        ← Documents indexés
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{d.titre}</h1>
        <p className="text-sm text-muted-foreground">
          {d.type ?? "Document"} · {d.pages.length} page{d.pages.length > 1 ? "s" : ""} · <span className="font-mono text-xs">{d.id}</span>
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Un document de référence fourni par le flux du séminaire (procédures, contrats types, comptes rendus, notes de service). Il n&apos;est rattaché à aucun chantier : c&apos;est la base sur laquelle s&apos;appuient les réponses de la page Questions.
        </p>
      </header>

      {references.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">Chantiers cités dans ce document</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {references.map((c) => (
              <li key={c.reference}>
                {c.chantierId ? (
                  <Link href={`/chantiers/${c.chantierId}`} className="font-mono underline underline-offset-2">
                    {c.reference}
                  </Link>
                ) : (
                  <span className="font-mono text-muted-foreground">{c.reference} (absent de groma)</span>
                )}
              </li>
            ))}
          </ul>
          {references.some((c) => !c.chantierId) && <p className="text-xs text-muted-foreground">« Absent de groma » : une référence du monde fictif du flux, qui ne correspond à aucun de vos chantiers.</p>}
        </section>
      )}

      <nav aria-label="Pages" className="flex flex-wrap gap-2 text-sm">
        {d.pages.map((_, i) => (
          <a key={i} href={`#page-${i + 1}`} className="rounded-md border px-2 py-1 tabular-nums hover:bg-muted">
            p. {i + 1}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-6">
        {d.pages.map((texte, i) => (
          <section key={i} id={`page-${i + 1}`} className="scroll-mt-24 flex flex-col gap-2 rounded-xl border p-5 target:border-2 target:border-foreground">
            <h2 className="text-sm font-semibold text-muted-foreground">Page {i + 1}</h2>
            <div className="max-w-3xl text-sm leading-relaxed whitespace-pre-wrap">{texte.trim() || "Page vide."}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
