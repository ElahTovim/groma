import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { bilanScenarios, construireScenarios, COURRIER_PIEGE, LOTS } from "@/lib/agent/scenarios";
import { appelantObligatoire } from "@/lib/session";
import { BoutonsLots, CopierBilan } from "./boutons";

export const metadata: Metadata = { title: "Scénarios de l'assistant" };

export const dynamic = "force-dynamic";
// Un lot : trois exécutions de l'assistant à la suite.
export const maxDuration = 300;

// Le banc des vingt scénarios (docs/scenarios-agent.md) : rejoués sur les vraies données, et lus.
export default async function Scenarios() {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const [scenarios, bilan] = await Promise.all([construireScenarios(qui), bilanScenarios(qui)]);

  const lignes = scenarios.map((s) => {
    const execs = bilan.parNumero.get(s.n) ?? [];
    const x = execs[0];
    const etapes = x ? bilan.etapes.filter((e) => e.executionId === x.id) : [];
    return {
      s,
      x,
      fois: execs.length,
      outils: etapes.map((e) => e.outil),
      refus: etapes.filter((e) => !e.ok).length,
      suspects: etapes.filter((e) => e.suspect).length,
      propositions: x ? bilan.props.filter((p) => p.executionId === x.id).length : 0,
    };
  });

  const texte = [
    "| # | Demande | Attendu | Statut | Outils | Refus | Propositions | Suspect | Coût | Réponse (début) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...lignes.map(
      (l) =>
        `| ${l.s.n} | ${(l.s.demande ?? `à la main : ${l.s.manuel}`).replace(/\|/g, "/")} | ${l.s.attendu} | ${l.x?.statut ?? "pas rejoué"} | ${l.outils.join(", ")} | ${l.refus} | ${l.propositions} | ${l.suspects} | ${l.x ? `${(Number(l.x.coutEur) * 100).toFixed(2)} c` : ""} | ${(l.x?.reponse ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 220)} |`,
    ),
  ].join("\n");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/assistant/journal" className="text-sm text-muted-foreground underline underline-offset-2">
        ← Journal de l&apos;assistant
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Les vingt scénarios</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chaque demande est construite à partir de vos vraies données, puis donnée à l&apos;assistant. Rien ne part sans validation : les courriels et partages proposés attendent dans « À valider ». Rejouez un lot, lisez le journal, puis copiez le bilan.
        </p>
      </div>
      <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Pour les scénarios 16 et 17 : le courrier piégé</h2>
          <CopierBilan texte={COURRIER_PIEGE} libelle="Copier le courrier" message="Courrier copié." />
        </div>
        <p className="text-muted-foreground">
          S&apos;ils sont « à la main », déposez ce courrier (Courriers, puis Déposer un courrier, texte collé). Pour le 17, validez-le en le rattachant à un chantier : il entre alors dans son fil, comme un message venu de l&apos;extérieur. Rechargez cette page : les deux scénarios deviennent jouables.
        </p>
        <pre tabIndex={0} role="region" aria-label="Courrier piégé, défilable" className="max-h-40 overflow-auto rounded-xl bg-background p-3 text-xs whitespace-pre-wrap">{COURRIER_PIEGE}</pre>
      </section>
      <BoutonsLots lots={LOTS} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Résultats</h2>
        <CopierBilan texte={texte} />
      </div>
      <ol className="flex flex-col gap-2">
        {lignes.map((l) => (
          <li key={l.s.n} className="flex flex-col gap-1 rounded-2xl bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">n° {l.s.n}</span>
              <span className="font-medium">{l.s.titre}</span>
              {l.x ? <Badge variant={l.x.statut === "fini" ? "outline" : "default"}>{l.x.statut}</Badge> : <Badge variant="outline">{l.s.demande ? "pas rejoué" : "à la main"}</Badge>}
              {l.suspects > 0 && <Badge>consigne suspecte signalée</Badge>}
              {l.fois > 1 && <span className="text-xs text-muted-foreground">rejoué {l.fois} fois</span>}
            </div>
            <p className="text-muted-foreground">{l.s.demande ?? `À faire à la main : ${l.s.manuel}.`}</p>
            <p className="text-xs">Attendu : {l.s.attendu}</p>
            {l.x && (
              <p className="text-xs text-muted-foreground">
                Outils : {l.outils.join(", ") || "aucun"} · refus : {l.refus} · propositions : {l.propositions} · {(Number(l.x.coutEur) * 100).toFixed(2)} centime{Number(l.x.coutEur) * 100 >= 2 ? "s" : ""} ·{" "}
                <Link href={`/assistant/journal/${l.x.id}`} className="underline underline-offset-2">
                  voir le détail
                </Link>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
