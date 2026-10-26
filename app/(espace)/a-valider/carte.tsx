"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { refuserProposition, validerProposition } from "./actions";

export type CarteProposition = {
  id: string;
  type: string;
  libelleType: string;
  chantier: string;
  chantierId: string;
  destinataire: string;
  sujet: string | null;
  texte: string | null;
  echeance: string | null;
  extrait: string | null;
  propose: string;
  creeLe: string;
  executionId: string | null;
};

const quand = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
const jour = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));

// Une proposition de l'assistant : le texte exact, modifiable pour un courriel ou une demande,
// puis Valider (l'opération part avec les droits de la personne qui clique) ou Refuser (avec un motif).
export function Carte({ p }: { p: CarteProposition }) {
  const modifiable = p.type === "courriel" || p.type === "demande_externe";
  const [sujet, setSujet] = useState(p.sujet ?? "");
  const [texte, setTexte] = useState(p.texte ?? "");
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  // Le champ en cause, pour relier le message au bon champ.
  const [champ, setChamp] = useState<"texte" | "motif" | null>(null);
  const [enCours, demarrer] = useTransition();
  const carte = useRef<HTMLElement>(null);
  const base = useId();
  const idErreur = `${base}-erreur`;

  // La carte va disparaître de la file : le focus passe à la suivante, ou au titre de la page.
  const focusApres = () => {
    const suivante = carte.current?.closest("li")?.nextElementSibling?.querySelector<HTMLElement>("article");
    const cible = suivante ?? document.getElementById("titre-a-valider");
    cible?.focus();
  };

  const valider = () =>
    demarrer(async () => {
      setErreur(null);
      setChamp(null);
      if (modifiable && !texte.trim()) {
        setErreur("Le texte est vide.");
        setChamp("texte");
        return;
      }
      // Seuls les champs changés partent : la proposition garde la trace d'une modification.
      const modifications: { sujet?: string; texte?: string } = {};
      if (p.type === "courriel" && sujet !== (p.sujet ?? "")) modifications.sujet = sujet;
      if (modifiable && texte !== (p.texte ?? "")) modifications.texte = texte;
      try {
        const r = await validerProposition(p.id, modifications);
        if (r.ok) {
          focusApres();
          toast.success(r.message, { duration: 8000 });
        } else {
          setErreur(r.erreur);
          toast.error(r.erreur, { duration: 10000 });
        }
      } catch {
        setErreur("La validation n'a pas abouti. Réessayez dans un instant.");
      }
    });

  const confirmerRefus = () =>
    demarrer(async () => {
      setErreur(null);
      setChamp(null);
      if (!motif.trim()) {
        setErreur("Dites en quelques mots pourquoi : c'est gardé au journal de l'assistant.");
        setChamp("motif");
        return;
      }
      try {
        const r = await refuserProposition(p.id, motif);
        if (r.ok) {
          focusApres();
          toast.success(r.message, { duration: 6000 });
        } else {
          setErreur(r.erreur);
          toast.error(r.erreur, { duration: 10000 });
        }
      } catch {
        setErreur("Le refus n'a pas abouti. Réessayez dans un instant.");
      }
    });

  return (
    <article ref={carte} tabIndex={-1} aria-label={`${p.libelleType} pour ${p.destinataire}`} className="flex flex-col gap-4 rounded-3xl bg-card p-5 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{p.libelleType}</Badge>
            <Link href={`/chantiers/${p.chantierId}`} className="text-sm font-medium underline underline-offset-2">
              {p.chantier}
            </Link>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{quand(p.creeLe)}</span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">{p.type === "partage" ? "À rendre visible de " : "Pour "}</span>
          <strong>{p.destinataire}</strong>
          {p.echeance && (
            <>
              <span className="text-muted-foreground">, avant le </span>
              {jour(p.echeance)}
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Proposé par l&apos;assistant pour {p.propose}, le {quand(p.creeLe)}
          {p.executionId && (
            <>
              {" · "}
              <Link href={`/assistant/journal/${p.executionId}`} className="underline underline-offset-2">
                Voir l&apos;exécution
              </Link>
            </>
          )}
        </p>
      </header>

      {modifiable ? (
        <div className="flex flex-col gap-3">
          {p.type === "courriel" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Sujet</span>
              <Input value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={200} disabled={enCours} className="bg-background" />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Texte exact, modifiable avant de valider</span>
            <Textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              maxLength={p.type === "courriel" ? 5000 : 2000}
              disabled={enCours}
              aria-invalid={champ === "texte" || undefined}
              aria-describedby={champ === "texte" ? idErreur : undefined}
              className="min-h-32 bg-background"
            />
          </label>
        </div>
      ) : (
        <blockquote className="rounded-2xl bg-background p-3 text-sm whitespace-pre-wrap">{p.extrait || "Élément du fil sans texte."}</blockquote>
      )}

      {refus ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Pourquoi refuser ?</span>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              maxLength={300}
              disabled={enCours}
              required
              autoFocus
              placeholder="Par exemple : mauvais destinataire"
              aria-invalid={champ === "motif" || undefined}
              aria-describedby={champ === "motif" ? idErreur : undefined}
              className="bg-background"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={confirmerRefus}>
              {enCours ? "Refus…" : "Confirmer le refus"}
            </Button>
            <Button
              variant="outline"
              disabled={enCours}
              onClick={() => {
                setRefus(false);
                setErreur(null);
                setChamp(null);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={valider}>
            {enCours ? "Envoi…" : "Valider"}
          </Button>
          <Button variant="outline" disabled={enCours} onClick={() => setRefus(true)}>
            Refuser
          </Button>
        </div>
      )}

      {erreur && (
        <p id={idErreur} role="alert" className="rounded-2xl border border-foreground p-3 text-sm">
          {erreur}
        </p>
      )}
    </article>
  );
}
