"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pdfTropLourdPourLIa, taillePdfLisible, verifierDepot } from "@/lib/courriers-regles";
import { cn } from "@/lib/utils";
import { deposerCourrier } from "../actions";

type Mode = "texte" | "pdf";
type Etape = "envoi" | "lecture";

const ETAPES: Record<Etape, string> = {
  envoi: "Envoi du courrier…",
  lecture: "Lecture par l'IA : elle lit le courrier, puis groma vérifie chaque champ proposé (date, montant, référence). Jusqu'à une minute.",
};

// Le formulaire de dépôt : un texte collé ou un PDF. L'écran dit ce qui se passe
// (envoi, puis lecture par l'IA), puis ouvre la fiche du courrier.
export function FormulaireDepot() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("texte");
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [etape, setEtape] = useState<Etape>("envoi");

  // L'envoi d'un PDF dure le temps de le transmettre ; ensuite, c'est l'IA qui lit.
  useEffect(() => {
    if (!enCours) return;
    const duree = mode === "pdf" && fichier ? Math.min(4000, 800 + fichier.size / 400) : 500;
    const t = setTimeout(() => setEtape("lecture"), duree);
    return () => clearTimeout(t);
  }, [enCours, mode, fichier]);

  function envoyer(e: FormEvent) {
    e.preventDefault();
    const v = verifierDepot({ texte: mode === "texte" ? texte : "", fichier: mode === "pdf" ? fichier : null });
    if (!v.ok) return setErreur(v.raison);
    setErreur(null);
    setEtape("envoi");
    const d = new FormData();
    if (mode === "texte") d.set("texte", texte);
    else if (fichier) d.set("fichier", fichier);
    demarrer(async () => {
      const r = await deposerCourrier(d);
      if (!r.ok) {
        setErreur(r.erreur);
        toast.error(r.erreur, { duration: 10000 });
        return;
      }
      if (r.lu) toast.success(r.message, { duration: 8000 });
      else toast.error(r.message, { duration: 12000 });
      router.push(`/courriers/${encodeURIComponent(r.id)}`);
    });
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div role="group" aria-label="Forme du courrier" className="flex flex-wrap gap-2">
        {(
          [
            ["texte", "Coller le texte"],
            ["pdf", "Déposer un PDF"],
          ] as [Mode, string][]
        ).map(([m, libelle]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            disabled={enCours}
            onClick={() => {
              setMode(m);
              setErreur(null);
            }}
            className={cn("flex min-h-11 items-center rounded-full px-4 text-sm font-medium", mode === m ? "bg-foreground text-background" : "bg-background hover:bg-background/70")}
          >
            {libelle}
          </button>
        ))}
      </div>

      {mode === "texte" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depot-texte">Texte du courrier</Label>
          <Textarea
            id="depot-texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Collez ici le courrier, en entier : en-tête, date, corps, signature."
            className="min-h-64"
            readOnly={enCours}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? "depot-texte-aide depot-erreur" : "depot-texte-aide"}
          />
          <p id="depot-texte-aide" className="text-xs text-muted-foreground">{texte.trim().length.toLocaleString("fr-FR")} caractères. Ce que le courrier demande n&apos;est jamais exécuté.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depot-fichier">Fichier PDF</Label>
          <input
            id="depot-fichier"
            type="file"
            accept="application/pdf,.pdf"
            disabled={enCours}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? "depot-fichier-aide depot-erreur" : "depot-fichier-aide"}
            onChange={(e) => {
              setFichier(e.currentTarget.files?.[0] ?? null);
              setErreur(null);
            }}
            className="text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:text-sm file:font-medium file:text-background"
          />
          <p id="depot-fichier-aide" className="text-xs text-muted-foreground">
            {fichier ? `${fichier.name} · ${(fichier.size / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} Ko` : "PDF seulement, 4 Mo au plus. L'IA lit le PDF et en transcrit le texte."}
          </p>
          {/* Région montée avant son contenu, pour que l'avertissement soit annoncé. */}
          <div role="status">
            {fichier && pdfTropLourdPourLIa(fichier.size) && (
              <p className="rounded-2xl border border-foreground p-3 text-sm">
                Ce PDF sera gardé, mais il dépasse ce que l&apos;IA accepte de lire ({Math.floor(taillePdfLisible() / 1000)} Ko au plus). Pour le faire lire, collez plutôt son texte.
              </p>
            )}
          </div>
        </div>
      )}

      {erreur && (
        <p id="depot-erreur" role="alert" className="rounded-2xl border-2 border-foreground p-3 text-sm">
          {erreur}
        </p>
      )}

      <p role="status" className="sr-only">
        {enCours ? ETAPES[etape] : ""}
      </p>
      {enCours && (
        <ol aria-hidden="true" className="flex flex-col gap-1 rounded-2xl border border-foreground p-4 text-sm">
          <li className={cn(etape !== "envoi" && "text-muted-foreground")}>{etape === "envoi" ? "1. " + ETAPES.envoi : "1. Courrier envoyé."}</li>
          <li className={cn(etape !== "lecture" && "text-muted-foreground")}>2. {etape === "lecture" ? ETAPES.lecture : "Lecture par l'IA."}</li>
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={enCours || (mode === "texte" ? !texte.trim() : !fichier)} focusableWhenDisabled className="aria-disabled:opacity-50">
          {enCours ? (etape === "envoi" ? "Envoi…" : "Lecture par l'IA…") : "Déposer et faire lire"}
        </Button>
        <span className="text-xs text-muted-foreground">La fiche du courrier s&apos;ouvre une fois la lecture finie.</span>
      </div>
    </form>
  );
}
