"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decouperEnCitations, separerAVerifier, type CitationControlee } from "@/lib/recherche-citations";
import { lignes, QUESTION_MAX, QUESTION_MIN, type SourceEnvoyee } from "@/lib/recherche-flux";
import { cn } from "@/lib/utils";

type Etape = "repos" | "recherche" | "redaction" | "fini" | "erreur";

const LIBELLE_ETAPE: Record<"recherche" | "redaction", string> = {
  recherche: "Recherche des passages…",
  redaction: "Rédaction de la réponse…",
};

const RAISON: Record<Exclude<CitationControlee["statut"], "valide">, string> = {
  page_non_fournie: "cette page ne fait pas partie des passages retenus",
  document_inconnu: "aucun document retenu ne porte ce titre",
};

// Le texte de la réponse, avec chaque citation marquée : valide, ou « source introuvable ».
// Tant que le contrôle n'est pas arrivé, les citations restent neutres.
function TexteCite({ texte, controle }: { texte: string; controle: Map<string, CitationControlee> | null }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {decouperEnCitations(texte).map((p, i) => {
        if (p.type === "texte") return <span key={i}>{p.texte}</span>;
        const c = controle?.get(p.brut);
        if (!c) return <span key={i} className="text-muted-foreground">{p.brut}</span>;
        if (c.statut === "valide")
          return (
            <span key={i} className="rounded bg-muted px-1 text-xs font-medium whitespace-nowrap">
              {c.titre}, p. {c.page}
            </span>
          );
        return (
          <span key={i} className="rounded border border-destructive px-1 text-xs font-medium text-destructive" title={RAISON[c.statut]}>
            {p.brut} source introuvable : à vérifier
          </span>
        );
      })}
    </p>
  );
}

export function Questions() {
  const [question, setQuestion] = useState("");
  const [posee, setPosee] = useState("");
  const [etape, setEtape] = useState<Etape>("repos");
  const [texte, setTexte] = useState("");
  const [sources, setSources] = useState<SourceEnvoyee[]>([]);
  const [controle, setControle] = useState<CitationControlee[] | null>(null);
  const [introuvable, setIntrouvable] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const annulation = useRef<AbortController | null>(null);

  const enCours = etape === "recherche" || etape === "redaction";
  const trop = question.trim().length > QUESTION_MAX;

  async function poser(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < QUESTION_MIN || trop || enCours) return;
    annulation.current?.abort();
    const ac = new AbortController();
    annulation.current = ac;
    setPosee(q);
    setEtape("recherche");
    setTexte("");
    setSources([]);
    setControle(null);
    setIntrouvable(null);
    setErreur(null);
    let echec: string | null = null;
    try {
      const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }), signal: ac.signal });
      if (!r.ok || !r.body) {
        const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
        throw new Error(corps?.erreur ?? "La question n'a pas pu être envoyée.");
      }
      const lecteur = r.body.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      let fini = false;
      for (;;) {
        const { value, done } = await lecteur.read();
        tampon += done ? decodeur.decode() : decodeur.decode(value, { stream: true });
        const lu = lignes(done ? `${tampon}\n` : tampon);
        tampon = lu.reste;
        for (const ev of lu.evenements) {
          if (ev.type === "etape") setEtape(ev.etape);
          else if (ev.type === "sources") setSources(ev.sources);
          else if (ev.type === "texte") setTexte((t) => t + ev.texte);
          else if (ev.type === "introuvable") setIntrouvable(ev.message);
          else if (ev.type === "controle") setControle(ev.citations);
          else if (ev.type === "erreur") echec = ev.erreur;
          else if (ev.type === "fin") fini = true;
        }
        if (done) break;
      }
      if (!fini && !echec) echec = "La réponse s'est interrompue avant la fin : elle est peut-être incomplète.";
    } catch (e) {
      if (ac.signal.aborted) return;
      echec = e instanceof Error ? e.message : "La question n'a pas pu être envoyée.";
    }
    setErreur(echec);
    setEtape(echec ? "erreur" : "fini");
  }

  const parCitation = controle ? new Map(controle.map((c) => [c.brut, c])) : null;
  const invalides = controle?.filter((c) => c.statut !== "valide") ?? [];
  const citees = new Set(controle?.filter((c) => c.statut === "valide").map((c) => `${c.documentId}#${c.page}`) ?? []);
  const { reponse, aVerifier } = separerAVerifier(texte);

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={poser} className="flex flex-col gap-3">
        <label htmlFor="question" className="text-sm font-medium">
          Votre question
        </label>
        <Textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
          placeholder="Par exemple : quel délai pour lever une réserve après la réception ?"
          aria-invalid={trop}
          rows={3}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("text-xs", trop ? "text-destructive" : "text-muted-foreground")}>
            {question.trim().length} / {QUESTION_MAX} caractères
          </p>
          <Button type="submit" disabled={enCours || question.trim().length < QUESTION_MIN || trop}>
            {enCours ? "Réponse en cours…" : "Poser la question"}
          </Button>
        </div>
      </form>

      {etape !== "repos" && (
        <section className="flex flex-col gap-4 rounded-3xl bg-card p-5 md:p-6" aria-live="polite" aria-busy={enCours}>
          <p className="text-xs text-muted-foreground">Question : {posee}</p>

          {enCours && (
            <p className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {LIBELLE_ETAPE[etape as "recherche" | "redaction"]}
              {etape === "redaction" && sources.length > 0 && <span className="font-normal text-muted-foreground">({sources.length} passages retenus)</span>}
            </p>
          )}

          {introuvable && <p className="text-sm font-medium">{introuvable} Essayez avec d&apos;autres mots, ou vérifiez que le document a bien été indexé.</p>}

          {reponse && <TexteCite texte={reponse} controle={parCitation} />}

          {aVerifier !== null && (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <TriangleAlert className="size-4" aria-hidden />À vérifier
              </p>
              <TexteCite texte={aVerifier} controle={parCitation} />
            </div>
          )}

          {invalides.length > 0 && (
            <div className="rounded-xl border border-destructive p-4 text-sm text-destructive">
              <p className="font-semibold">
                {invalides.length} citation{invalides.length > 1 ? "s" : ""} ne correspond{invalides.length > 1 ? "ent" : ""} à aucune source fournie : à vérifier.
              </p>
              <ul className="mt-1 list-disc pl-5">
                {invalides.map((c) => (
                  <li key={c.brut}>
                    {c.brut} : {RAISON[c.statut as keyof typeof RAISON]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {etape === "fini" && controle && controle.length === 0 && texte.trim() && (
            <p className="text-sm text-destructive">La réponse ne cite aucune source : ne vous y fiez pas sans vérifier les documents.</p>
          )}

          {erreur && <p className="border border-foreground p-3 text-sm">{erreur}</p>}

          {sources.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Sources retenues</h2>
              <ul className="flex flex-col gap-2">
                {sources.map((s) => {
                  const citee = citees.has(`${s.documentId}#${s.page}`);
                  return (
                    <li key={`${s.documentId}#${s.page}`}>
                      <details className="rounded-lg border p-3">
                        <summary className="cursor-pointer text-sm">
                          <span className="font-medium">{s.titre}</span>, p. {s.page}
                          {controle && <span className="ml-2 text-xs text-muted-foreground">{citee ? "citée" : "non citée"}</span>}
                        </summary>
                        <p className="mt-2 max-h-72 overflow-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{s.extrait}</p>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
