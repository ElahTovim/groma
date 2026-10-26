"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JetonVue } from "@/lib/operations/jetons";
import { creerJetonMcp, revoquerJetonMcp } from "./actions";

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso)) : "jamais");

async function copier(texte: string, quoi: string) {
  try {
    await navigator.clipboard.writeText(texte);
    toast.success(`${quoi} copié.`);
  } catch {
    toast.error("La copie n'a pas marché : sélectionnez le texte et copiez-le à la main.");
  }
}

function BlocACopier({ texte, quoi, libelle }: { texte: string; quoi: string; libelle: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <code className="flex-1 rounded-2xl bg-muted p-3 font-mono text-xs break-all select-all">{texte}</code>
      <Button type="button" variant="outline" onClick={() => copier(texte, quoi)}>
        {libelle}
      </Button>
    </div>
  );
}

// Brancher Claude Code sur groma : un jeton par poste, montré une seule fois, révocable.
export function JetonsMcp({ jetons, commande }: { jetons: JetonVue[]; commande: string }) {
  const [nom, setNom] = useState("");
  const [nouveau, setNouveau] = useState<{ nom: string; jeton: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  // Toujours montée : annonce le début et la fin de chaque action.
  const [annonce, setAnnonce] = useState("");

  const creer = () => {
    if (enCours) return;
    setAnnonce("Création du jeton…");
    demarrer(async () => {
      setErreur(null);
      const r = await creerJetonMcp(nom);
      if (r.ok && r.jeton) {
        setNouveau({ nom: nom.trim(), jeton: r.jeton });
        setNom("");
        setAnnonce("Jeton créé : copiez-le maintenant, il ne sera plus jamais montré.");
        toast.success(r.message);
      } else if (!r.ok) {
        setAnnonce("");
        setErreur(r.erreur);
      }
    });
  };

  const revoquer = (j: JetonVue) => {
    if (enCours) return;
    if (!window.confirm(`Révoquer le jeton « ${j.nom} » ? Claude Code ne pourra plus s'en servir.`)) return;
    setAnnonce(`Révocation du jeton ${j.nom}…`);
    demarrer(async () => {
      const r = await revoquerJetonMcp(j.id);
      setAnnonce(r.ok ? r.message : r.erreur);
      if (r.ok) toast.success(r.message);
      else toast.error(r.erreur, { duration: 10000 });
    });
  };

  const actifs = jetons.filter((j) => !j.revoqueLe).length;

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          creer();
        }}
      >
        <label htmlFor="nom-jeton" className="text-sm font-medium">
          Nouveau jeton
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="nom-jeton"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={80}
            placeholder="Par exemple : portable de Kerguelenn"
            readOnly={enCours}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? "erreur-jeton" : undefined}
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50">
            {enCours ? "Un instant…" : "Créer le jeton"}
          </Button>
        </div>
        {erreur && (
          <p id="erreur-jeton" role="alert" className="text-sm font-medium">
            {erreur}
          </p>
        )}
      </form>

      <p role="status" className="sr-only">
        {annonce}
      </p>

      {nouveau && (
        <div className="flex flex-col gap-2 rounded-2xl border border-foreground p-4">
          <p className="text-sm font-medium">Jeton « {nouveau.nom} » : copiez-le maintenant, il ne sera plus jamais montré.</p>
          <BlocACopier texte={nouveau.jeton} quoi="Jeton" libelle="Copier le jeton" />
          <p className="text-xs text-muted-foreground">groma n&apos;en garde qu&apos;une empreinte. Perdu, il ne se retrouve pas : révoquez-le et créez-en un autre.</p>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setNouveau(null)}>
              C&apos;est copié, masquer
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Vos jetons {jetons.length > 0 && <span className="font-normal text-muted-foreground">({actifs} actif{actifs > 1 ? "s" : ""})</span>}</p>
        {jetons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun jeton pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {jetons.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {j.nom}
                    {j.revoqueLe ? <Badge variant="outline">Révoqué le {date(j.revoqueLe)}</Badge> : <Badge>Actif</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Créé le {date(j.creeLe)} · dernière utilisation : {date(j.derniereUtilisation)}
                  </span>
                </span>
                {!j.revoqueLe && (
                  <Button type="button" variant="outline" size="sm" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={() => revoquer(j)}>
                    Révoquer<span className="sr-only"> le jeton {j.nom}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Brancher Claude Code</p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            Mettez le jeton dans une variable d&apos;environnement de votre poste, nommée <code className="font-mono">GROMA_MCP</code> : par exemple, ajoutez la ligne{" "}
            <code className="font-mono">export GROMA_MCP=&quot;le jeton&quot;</code> à votre fichier <code className="font-mono">~/.zshrc</code>, puis ouvrez un nouveau terminal.
          </li>
          <li>Dans le terminal, lancez cette commande une fois :</li>
        </ol>
        <BlocACopier texte={commande} quoi="Commande" libelle="Copier la commande" />
        <p className="text-xs text-muted-foreground">
          Jamais le jeton dans un fichier du dépôt (le dépôt est public) : la commande ne contient que le nom de la variable, et Claude Code garde le branchement dans sa configuration personnelle, sur votre poste, hors du dépôt. Le jeton a vos droits, ni plus ni moins ; chaque appel est inscrit au journal de l&apos;assistant. Un poste perdu : révoquez son jeton ici.
        </p>
      </div>
    </div>
  );
}
