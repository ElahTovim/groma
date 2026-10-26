import Link from "next/link";
import { notFound } from "next/navigation";
import { TexteReponse } from "@/components/texte-reponse";
import { Badge } from "@/components/ui/badge";
import { lireExecution } from "@/lib/assistant";
import { decrireEntrees, dureeLisible, libelleOutil, OUTILS_GENRE, raisonsARegarder } from "@/lib/assistant-regles";
import { appelantObligatoire } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BadgeStatutAgent, ChantierDeLEtape, eurosFins, heureCourte, SUSPECT } from "../../bilan";

export const dynamic = "force-dynamic";

const seconde = (d: Date) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Paris" }).format(d);

// Le détail d'une exécution : chaque étape dans l'ordre, puis la réponse finale.
// Le gérant ouvre toutes les exécutions ; chacun ouvre les siennes ; sinon introuvable.
export default async function DetailExecution({ params }: PageProps<"/assistant/journal/[id]">) {
  const qui = await appelantObligatoire();
  const { id } = await params;
  const x = await lireExecution(qui, id);
  if (!x) notFound();
  const raisons = raisonsARegarder(x);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href={qui.role === "gerant" ? "/assistant/journal" : "/assistant"} className="text-sm text-muted-foreground underline underline-offset-2">
          {qui.role === "gerant" ? "Journal de l'assistant" : "Assistant"}
        </Link>
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">« {x.demande} »</h1>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Statut</dt>
            <dd>
              <BadgeStatutAgent x={x} />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Par</dt>
            <dd>{x.qui}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Lancée</dt>
            <dd className="tabular-nums">{heureCourte(x.debut)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Durée</dt>
            <dd className="tabular-nums">{dureeLisible(x.debut, x.fin)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Coût</dt>
            <dd className="tabular-nums">{eurosFins(x.coutEur)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Outils</dt>
            <dd className="tabular-nums">{x.outils}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Tours</dt>
            <dd className="tabular-nums">{x.tours}</dd>
          </div>
        </dl>
        {raisons.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            À regarder :
            {raisons.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </p>
        )}
      </div>

      <section aria-labelledby="titre-etapes" className="flex flex-col gap-3 rounded-3xl bg-card p-5 md:p-6">
        <h2 id="titre-etapes" className="font-display text-lg font-bold">
          Les étapes, dans l&apos;ordre
        </h2>
        {x.etapes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun outil appelé : l&apos;assistant a répondu sans rien lire, ou s&apos;est arrêté avant.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {x.etapes.map((e, i) => (
              <li key={e.id} className={cn("flex flex-col gap-1.5 rounded-2xl p-3 text-sm", !e.ok || e.suspect ? "border border-foreground bg-background" : "bg-background")}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {i + 1}. {seconde(e.creeLe)}
                  </span>
                  <span className="font-semibold">{libelleOutil(e.outil)}</span>
                  <span className="text-xs text-muted-foreground">{OUTILS_GENRE[e.outil] ?? e.outil}</span>
                  <Badge variant={e.ok ? "outline" : "default"}>{e.ok ? "ok" : "refus"}</Badge>
                  <ChantierDeLEtape e={e} />
                </span>
                <span className="text-xs break-words">
                  <span className="text-muted-foreground">Entrées : </span>
                  {decrireEntrees(e.entrees) || "aucune"}
                </span>
                {e.resultat && (
                  <span className="break-words">
                    <span className="text-muted-foreground">Résultat : </span>
                    {e.resultat}
                  </span>
                )}
                {e.suspect && (
                  <span className="flex flex-col gap-0.5 font-medium">
                    {SUSPECT}
                    <span className="text-xs font-normal break-words text-muted-foreground">Tournure repérée : « {e.suspect} »</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="titre-reponse" className="flex flex-col gap-3 rounded-3xl bg-card p-5 md:p-6">
        <h2 id="titre-reponse" className="font-display text-lg font-bold">
          La réponse finale
        </h2>
        {x.statut === "en_cours" ? (
          <p className="text-sm">L&apos;assistant n&apos;a pas encore fini. Rechargez la page dans un moment.</p>
        ) : x.reponse ? (
          <TexteReponse texte={x.reponse} />
        ) : (
          <p className="text-sm text-muted-foreground">Pas de réponse écrite.</p>
        )}
        {x.erreur && qui.role === "gerant" && (
          <p className="rounded-2xl bg-background p-3 font-mono text-xs break-words">
            <span className="font-sans font-medium">Erreur technique : </span>
            {x.erreur}
          </p>
        )}
      </section>
    </div>
  );
}
