import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { voitLInterne } from "@/lib/acces";
import { dernieresDemandes, lireExecution } from "@/lib/assistant";
import { raisonsARegarder } from "@/lib/assistant-regles";
import { appelantObligatoire } from "@/lib/session";
import { BadgeStatutAgent, BilanExecution, eurosFins, heureCourte } from "./bilan";
import { FormulaireAssistant } from "./formulaire";

export const metadata: Metadata = { title: "Assistant" };

export const dynamic = "force-dynamic";
// L'assistant tourne depuis l'action serveur de cette page : de 15 à 90 secondes, plus la mise en route.
export const maxDuration = 300;

// L'assistant de chantier : une demande en langage libre, la réponse, et ce qu'il a fait ou propose.
// Gérant et équipe ; un externe ne trouve rien ici.
export default async function Assistant({ searchParams }: PageProps<"/assistant">) {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  const params = await searchParams;
  const e = typeof params.e === "string" ? params.e : null;
  // Depuis la barre de l'accueil : la phrase est pré-remplie, jamais lancée sans un clic.
  const q = typeof params.q === "string" ? params.q.slice(0, 2000) : "";
  // L'historique et le résultat se lisent à part : si l'un échoue, le champ reste utilisable.
  const [historique, resultat] = await Promise.allSettled([dernieresDemandes(qui, 10), e ? lireExecution(qui, e) : Promise.resolve(null)]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">Assistant</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            L&apos;assistant lit vos chantiers avec vos droits. Il écrit des notes et des demandes internes, ajoute des pièces attendues, et propose tout ce qui part vers quelqu&apos;un : courriels, demandes aux externes, partages. Il ne change pas l&apos;étape d&apos;un chantier, ne supprime rien et ne signe rien.
          </p>
        </div>
        {qui.role === "gerant" && (
          <Link href="/assistant/journal" className="text-sm font-medium underline underline-offset-2">
            Journal de l&apos;assistant
          </Link>
        )}
      </div>

      <FormulaireAssistant demandeInitiale={q} />

      {e &&
        (resultat.status === "rejected" ? (
          <p role="alert" className="rounded-3xl bg-card p-5 text-sm">
            Le résultat n&apos;a pas pu être relu. Rechargez la page dans un moment.
          </p>
        ) : resultat.value ? (
          <BilanExecution x={resultat.value} />
        ) : (
          <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">Demande introuvable.</p>
        ))}

      <section aria-labelledby="titre-historique" className="flex flex-col gap-3">
        <h2 id="titre-historique" className="font-display text-xl font-bold tracking-tight">
          Vos dernières demandes
        </h2>
        {historique.status === "rejected" ? (
          <p className="rounded-3xl bg-card p-5 text-sm">L&apos;historique n&apos;a pas pu être lu. Rechargez la page dans un moment.</p>
        ) : historique.value.length === 0 ? (
          <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">Aucune demande pour l&apos;instant. Essayez un des exemples ci-dessus.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historique.value.map((x) => {
              const raisons = raisonsARegarder(x);
              return (
                <li key={x.id}>
                  <Link href={`/assistant/journal/${x.id}`} className="flex flex-col gap-1 rounded-3xl bg-card p-4 transition-shadow hover:shadow-lg">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="line-clamp-2 font-medium">{x.demande}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                        <BadgeStatutAgent x={x} />
                        {heureCourte(x.debut)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {x.outils} outil{x.outils > 1 ? "s" : ""} · {eurosFins(x.coutEur)}
                      </span>
                      {raisons.map((r) => (
                        <Badge key={r} variant="outline">
                          {r}
                        </Badge>
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
