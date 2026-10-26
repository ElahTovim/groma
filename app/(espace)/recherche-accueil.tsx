"use client";

import { HelpCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reticule } from "@/components/cote";
import { VERS_FICHE } from "@/components/transitions";
import { Vignette } from "@/components/vignette";

export type ChantierCherche = { id: string; nom: string; ville: string; client: string; reference: string; etape: string; aPhoto: boolean };

const SUGGESTIONS = ["Quel délai pour lever une réserve ?", "Qui doit fournir l'attestation de vigilance ?", "Que dit le contrat sur les pénalités de retard ?"];

function aplatir(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Un seul champ en tête de l'accueil : pendant la frappe, les chantiers qui
// correspondent ; et, pour l'équipe, « Demander à groma » qui pose la question
// sur les documents, et « Confier à l'assistant » qui ouvre l'assistant avec la phrase. Tant que le champ est vide, le reste de l'accueil s'affiche.
export function RechercheAccueil(props: { entete: React.ReactNode; chantiers: ChantierCherche[]; questions: boolean; children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  const n = aplatir(q.trim());
  const trouves = n ? props.chantiers.filter((c) => aplatir(`${c.nom} ${c.ville} ${c.client} ${c.reference}`).includes(n)) : [];

  // ⌘K ou Ctrl+K place le curseur dans le champ, depuis n'importe où sur l'accueil.
  useEffect(() => {
    function raccourci(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
      }
    }
    window.addEventListener("keydown", raccourci);
    return () => window.removeEventListener("keydown", raccourci);
  }, []);

  return (
    <>
      {/* La bande du haut, sur papier quadrillé : le bonjour, puis le champ. */}
      <div className="papier -mx-4 -mt-6 flex flex-col gap-4 border-b border-foreground/10 px-4 pt-7 pb-6 md:mx-0 md:mt-0 md:rounded-3xl md:border md:px-8 md:pt-10 md:pb-8">
        {props.entete}
        <div role="search" className="flex h-14 items-center gap-3 rounded-2xl border border-input bg-card px-4 transition-[border-color,box-shadow] duration-300 focus-within:border-foreground focus-within:shadow-[0_18px_40px_-22px_rgb(0_0_0/0.45)] md:h-16 md:px-5">
          <Reticule className="size-6 shrink-0" />
          <input
            ref={champ}
            type="search"
            aria-label={props.questions ? "Chercher un chantier ou poser une question" : "Chercher un chantier"}
            aria-keyshortcuts="Meta+K Control+K"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder={props.questions ? "Un chantier, une question…" : "Chercher un chantier…"}
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted-foreground md:text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.07] active:scale-95">
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd aria-hidden className="annotation hidden rounded-md border border-foreground/20 px-2 py-1 text-muted-foreground md:block">⌘ K</kbd>
          )}
        </div>
        {!q && props.questions && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="h-9 shrink-0 rounded-full border border-input px-3.5 text-sm transition-colors hover:border-foreground active:scale-[0.97]">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toujours présente, pour que chaque nouveau résultat soit annoncé. */}
      <p role="status" className="sr-only">
        {q.trim() ? `${trouves.length} chantier${trouves.length > 1 ? "s" : ""} trouvé${trouves.length > 1 ? "s" : ""}` : ""}
      </p>
      {q.trim() ? (
        <div className="apparait flex flex-col gap-5">
          {props.questions && (
            <Link href={`/questions?q=${encodeURIComponent(q.trim())}`} className="flex items-start gap-3.5 rounded-2xl bg-foreground p-4 text-background active:scale-[0.99] md:p-5">
              <HelpCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">Demander à groma</span>
                <span className="text-background/85">« {q.trim()} »</span>
                <span className="annotation mt-1 text-background/60">Réponse tirée des documents, avec ses sources</span>
              </span>
            </Link>
          )}
          {props.questions && (
            // L'assistant (semaine 4) : il lit les chantiers et prépare le travail ; rien ne part sans validation.
            <Link href={`/assistant?q=${encodeURIComponent(q.trim())}`} className="flex items-start gap-3.5 rounded-2xl border border-foreground bg-card p-4 active:scale-[0.99] md:p-5">
              <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">Confier à l&apos;assistant</span>
                <span className="text-muted-foreground">« {q.trim()} »</span>
                <span className="annotation mt-1 text-muted-foreground">Il lit vos chantiers et prépare le travail ; ce qui part vers quelqu&apos;un attend votre validation</span>
              </span>
            </Link>
          )}
          <div className="flex flex-col">
            <p className="annotation border-b border-foreground/15 pb-2 text-muted-foreground" aria-hidden>
              Chantiers · {trouves.length}
            </p>
            {trouves.length === 0 ? (
              <p className="py-4 text-muted-foreground">Aucun chantier ne porte ce nom.{props.questions ? " Posez plutôt la question à groma, ou confiez-la à l'assistant, juste au-dessus." : ""}</p>
            ) : (
              <ul>
                {trouves.slice(0, 8).map((c) => (
                  <li key={c.id} className="border-b border-foreground/10">
                    <Link href={`/chantiers/${c.id}`} transitionTypes={VERS_FICHE} className="flex min-h-16 items-center gap-3 py-2 hover:bg-foreground/[0.03]">
                      <Vignette chantierId={c.id} aPhoto={c.aPhoto} alt="" className="size-11 rounded-lg" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-display text-lg font-bold tracking-tight">{c.nom}</span>
                        <span className="annotation truncate text-muted-foreground">
                          {c.reference} · {c.ville} · {c.etape}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        props.children
      )}
    </>
  );
}
