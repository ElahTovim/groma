import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { appelsClaudeCode, executionsDuJournal } from "@/lib/assistant";
import { aRegarder, decrireEntrees, dureeLisible, libelleOutil, raisonsARegarder } from "@/lib/assistant-regles";
import { appelantObligatoire } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BadgeStatutAgent, eurosFins, heureCourte, SUSPECT } from "../bilan";

export const dynamic = "force-dynamic";

const FILTRES = [
  { cle: "tout", libelle: "Tout" },
  { cle: "a-regarder", libelle: "À regarder" },
] as const;

// Le journal de l'assistant : le support des vingt scénarios. Une ligne par exécution, ce qui
// doit être regardé en noir ; puis les appels venus de Claude Code. Gérant seulement.
export default async function JournalAssistant({ searchParams }: PageProps<"/assistant/journal">) {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const params = await searchParams;
  const filtre = params.filtre === "a-regarder" ? "a-regarder" : "tout";
  const [executions, appels] = await Promise.allSettled([executionsDuJournal(qui), appelsClaudeCode(qui)]);
  const toutes = executions.status === "fulfilled" ? executions.value : [];
  const nbARegarder = toutes.filter(aRegarder).length;
  const liste = filtre === "a-regarder" ? toutes.filter(aRegarder) : toutes;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/assistant" className="text-sm text-muted-foreground underline underline-offset-2">
          Assistant
        </Link>
        <h1 className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">
          Journal de l&apos;assistant
          <span className="block text-muted-foreground/70">{nbARegarder} à regarder</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chaque demande faite à l&apos;assistant, des plus récentes aux plus anciennes. Sont à regarder : les erreurs, les arrêts au budget, les outils refusés et les consignes suspectes repérées dans les données lues. Ouvrez une ligne pour lire chaque étape.
        </p>
      </div>

      <nav aria-label="Filtre du journal">
        <ul className="flex flex-wrap gap-2">
          {FILTRES.map((f) => {
            const actif = f.cle === filtre;
            return (
              <li key={f.cle}>
                <Link
                  href={f.cle === "tout" ? "/assistant/journal" : "/assistant/journal?filtre=a-regarder"}
                  aria-current={actif ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap", actif ? "bg-foreground text-background" : "bg-card hover:bg-card/70")}
                >
                  {f.libelle}
                  <span className={cn("text-xs tabular-nums", actif ? "text-background/70" : "text-muted-foreground")}>{f.cle === "tout" ? toutes.length : nbARegarder}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-label="Exécutions" className="rounded-3xl bg-card p-2 md:p-4">
        {executions.status === "rejected" ? (
          <p className="p-6 text-center text-sm">Le journal n&apos;a pas pu être lu. Rechargez la page dans un moment.</p>
        ) : liste.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {toutes.length === 0 ? "Aucune demande pour l'instant. Elles apparaîtront ici dès la première." : "Rien à regarder : toutes les exécutions sont allées au bout sans refus ni consigne suspecte."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2 font-medium">Lancée</th>
                  <th className="p-2 font-medium">Qui</th>
                  <th className="p-2 font-medium">Demande</th>
                  <th className="p-2 font-medium">Statut</th>
                  <th className="p-2 text-right font-medium">Outils</th>
                  <th className="p-2 text-right font-medium">Coût</th>
                  <th className="p-2 text-right font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((x) => {
                  const raisons = raisonsARegarder(x);
                  return (
                    <tr key={x.id} className={cn("border-b align-top last:border-0", raisons.length > 0 && "bg-muted/60")}>
                      <td className="p-2 whitespace-nowrap tabular-nums">
                        <Link href={`/assistant/journal/${x.id}`} className="underline underline-offset-2">
                          {heureCourte(x.debut)}
                        </Link>
                      </td>
                      <td className="p-2">{x.qui}</td>
                      <td className="max-w-md p-2">
                        <Link href={`/assistant/journal/${x.id}`} className="line-clamp-2 hover:underline">
                          {x.demande}
                        </Link>
                      </td>
                      <td className="p-2">
                        <span className="flex flex-col items-start gap-1">
                          <BadgeStatutAgent x={x} />
                          {raisons
                            .filter((r) => r !== "Arrêt au budget" && r !== "Erreur" && r !== "Interrompue")
                            .map((r) => (
                              <Badge key={r} variant="default">
                                {r}
                              </Badge>
                            ))}
                        </span>
                      </td>
                      <td className="p-2 text-right tabular-nums">{x.outils}</td>
                      <td className="p-2 text-right tabular-nums">{eurosFins(x.coutEur)}</td>
                      <td className="p-2 text-right whitespace-nowrap tabular-nums">{dureeLisible(x.debut, x.fin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="titre-mcp" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="titre-mcp" className="font-display text-xl font-bold tracking-tight">
            Appels venus de Claude Code
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">Les outils appelés par le serveur MCP avec un jeton personnel, hors de l&apos;assistant. Les plus récents d&apos;abord.</p>
        </div>
        <div className="rounded-3xl bg-card p-2 md:p-4">
          {appels.status === "rejected" ? (
            <p className="p-6 text-center text-sm">Ces appels n&apos;ont pas pu être lus. Rechargez la page dans un moment.</p>
          ) : appels.value.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucun appel depuis Claude Code. Le branchement se fait dans Réglages.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {appels.value.map((a) => (
                <li key={a.id} className={cn("flex flex-col gap-1 p-2", (!a.ok || a.suspect) && "bg-muted/60")}>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-muted-foreground tabular-nums">{heureCourte(a.creeLe)}</span>
                    <span className="font-medium">{libelleOutil(a.outil)}</span>
                    <span className="text-muted-foreground">{a.qui}</span>
                    <Badge variant={a.ok ? "outline" : "default"}>{a.ok ? "ok" : "refus"}</Badge>
                    {a.suspect && <Badge variant="default">Consigne suspecte</Badge>}
                  </span>
                  {decrireEntrees(a.entrees) && <span className="text-xs break-words text-muted-foreground">{decrireEntrees(a.entrees)}</span>}
                  {a.resultat && <span className="break-words text-muted-foreground">{a.resultat}</span>}
                  {a.suspect && <span className="text-xs font-medium">{SUSPECT}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
