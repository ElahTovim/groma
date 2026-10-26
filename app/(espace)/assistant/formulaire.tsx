"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EXEMPLES_DEMANDES, phaseExecution } from "@/lib/assistant-regles";
import { demanderALAssistant } from "./actions";

const LONGUEUR_MAX = 2000;

// Le champ de demande. L'exécution dure de 15 à 90 secondes : on dit ce qui se passe.
export function FormulaireAssistant() {
  const router = useRouter();
  const [demande, setDemande] = useState("");
  const [enCours, demarrer] = useTransition();
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<{ texte: string; executionId?: string } | null>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!enCours) return;
    const debut = Date.now();
    const minuteur = setInterval(() => setSecondes(Math.floor((Date.now() - debut) / 1000)), 1000);
    return () => {
      clearInterval(minuteur);
      setSecondes(0);
    };
  }, [enCours]);

  const envoyer = () => {
    const texte = demande.trim();
    if (texte.length < 3) {
      setErreur({ texte: "Écrivez votre demande." });
      champ.current?.focus();
      return;
    }
    setErreur(null);
    demarrer(async () => {
      try {
        const r = await demanderALAssistant(texte);
        if (r.ok) {
          setDemande("");
          router.push(`/assistant?e=${r.executionId}#resultat`);
        } else setErreur({ texte: r.erreur, executionId: r.executionId });
      } catch {
        setErreur({ texte: "La demande n'a pas abouti (connexion coupée ou délai dépassé). Si l'assistant a commencé, ce qu'il a fait est dans l'historique ci-dessous." });
        router.refresh();
      }
    });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-3xl bg-card p-5 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        envoyer();
      }}
    >
      <label htmlFor="demande" className="font-display text-lg font-bold">
        Votre demande
      </label>
      <Textarea
        id="demande"
        ref={champ}
        value={demande}
        onChange={(e) => setDemande(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) envoyer();
        }}
        maxLength={LONGUEUR_MAX}
        rows={3}
        disabled={enCours}
        placeholder="Par exemple : qu'est-ce qui bloque le chantier CH-2026-0007 ?"
        className="min-h-24 bg-background"
        aria-describedby="aide-demande"
      />
      <div className="flex flex-wrap gap-2" aria-label="Exemples de demandes">
        {EXEMPLES_DEMANDES.map((x) => (
          <button
            key={x}
            type="button"
            disabled={enCours}
            onClick={() => {
              setDemande(x);
              setErreur(null);
              champ.current?.focus();
            }}
            className="min-h-9 rounded-full bg-background px-3 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {x}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={enCours}>
          {enCours ? "En cours…" : "Demander"}
        </Button>
        <p id="aide-demande" className="text-xs text-muted-foreground">
          Il lit les chantiers, fait ce qui reste interne, et propose le reste : rien ne part sans votre clic dans « À valider ».
        </p>
      </div>
      {enCours && (
        <p role="status" aria-live="polite" className="rounded-2xl bg-background p-3 text-sm">
          <span className="font-medium">{phaseExecution(secondes)}</span> <span className="tabular-nums text-muted-foreground">{secondes} s</span>
          <span className="block text-xs text-muted-foreground">Cela prend jusqu&apos;à une minute et demie. Gardez la page ouverte.</span>
        </p>
      )}
      {erreur && (
        <p role="alert" className="rounded-2xl border border-foreground p-3 text-sm">
          {erreur.texte}
          {erreur.executionId && (
            <>
              {" "}
              <Link href={`/assistant/journal/${erreur.executionId}`} className="underline underline-offset-2">
                Voir ce qui a été fait
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
