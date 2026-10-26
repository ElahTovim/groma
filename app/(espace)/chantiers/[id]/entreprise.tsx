"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { libelleActivite, type FicheEntreprise } from "@/lib/entreprises-regles";
import { dateCourte } from "@/lib/format";
import { chercherEntreprise, delierEntreprise, lierEntreprise } from "./actions";

export type EntrepriseAffichee = {
  siren: string;
  nom: string;
  adresse: string | null;
  activite: string | null;
  ferme: boolean;
  fermeeLe: string | null;
  verifieeLe: string;
};

function siren(s: string) {
  return s.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

function Etat({ ferme, fermeeLe }: { ferme: boolean; fermeeLe: string | null }) {
  return ferme ? <Badge>Fermée{fermeeLe ? ` le ${dateCourte(fermeeLe)}` : ""}</Badge> : <Badge variant="outline">En activité</Badge>;
}

// L'entreprise d'un client ou d'un externe, vérifiée dans le registre Sirene.
// « cible » vaut « client » pour le client du chantier, sinon l'identifiant du compte.
export function Entreprise(props: { chantierId: string; cible: string; suggestion: string; entreprise: EntrepriseAffichee | null; modifiable: boolean; compacte?: boolean }) {
  const { entreprise: e } = props;
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [fiches, setFiches] = useState<FicheEntreprise[]>([]);
  // Le nombre de résultats de la dernière recherche, annoncé aux lecteurs d'écran.
  const [trouvees, setTrouvees] = useState<number | null>(null);
  // Lier ou retirer change ce qui est affiché (le bouton d'ouverture change de place) :
  // une fois la fiche à jour, le focus revient sur ce bouton plutôt que de se perdre.
  const declencheur = useRef<HTMLButtonElement>(null);
  const refocaliser = useRef(false);
  useEffect(() => {
    if (!refocaliser.current) return;
    refocaliser.current = false;
    declencheur.current?.focus();
  }, [e]);

  const chercher = (saisie: string) => {
    setErreur("");
    setTrouvees(null);
    demarrer(async () => {
      const r = await chercherEntreprise(props.chantierId, saisie);
      if (r.ok) {
        setFiches(r.fiches);
        setTrouvees(r.fiches.length);
      } else {
        setFiches([]);
        setErreur(r.erreur);
      }
    });
  };

  const choisir = (s: string) =>
    demarrer(async () => {
      const r = await lierEntreprise(props.chantierId, props.cible, s);
      if (r.ok) {
        toast.success(r.message);
        refocaliser.current = true;
        setOuvert(false);
      } else setErreur(r.erreur);
    });

  const retirer = () =>
    demarrer(async () => {
      const r = await delierEntreprise(props.chantierId, props.cible);
      if (r.ok) {
        toast.success(r.message);
        refocaliser.current = true;
      } else toast.error(r.erreur);
    });

  const fenetre = (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) {
          setErreur("");
          setFiches([]);
          setTrouvees(null);
        }
      }}
    >
      <DialogTrigger ref={declencheur} render={<Button variant={e ? "ghost" : "outline"} size="xs" />}>
        {e ? (
          <>
            Changer<span className="sr-only"> l&apos;entreprise {e.nom}</span>
          </>
        ) : (
          "Vérifier l'entreprise"
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérifier l&apos;entreprise</DialogTitle>
          <DialogDescription>Dans le registre public des entreprises (Sirene). groma garde son nom officiel, son adresse, son activité, et vérifie chaque semaine qu&apos;elle est toujours en activité.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            chercher(String(new FormData(ev.currentTarget).get("q") ?? ""));
          }}
        >
          <Label htmlFor={`q-${props.cible}`}>Nom, SIREN ou SIRET</Label>
          <div className="flex gap-2">
            <Input id={`q-${props.cible}`} name="q" defaultValue={props.suggestion} autoComplete="off" aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? `err-${props.cible}` : undefined} />
            <Button type="submit" disabled={enCours}>
              {enCours ? "Recherche…" : "Chercher"}
            </Button>
          </div>
          {erreur && (
            <p id={`err-${props.cible}`} role="alert" className="text-sm text-destructive">
              {erreur}
            </p>
          )}
        </form>
        <p role="status" className="sr-only">
          {trouvees === null ? "" : trouvees === 0 ? "Aucune entreprise trouvée." : `${trouvees} entreprise${trouvees > 1 ? "s" : ""} trouvée${trouvees > 1 ? "s" : ""}.`}
        </p>
        {fiches.length > 0 && (
          <ul className="flex max-h-80 flex-col divide-y overflow-y-auto border-y">
            {fiches.map((f) => (
              <li key={f.siren}>
                <button type="button" disabled={enCours} onClick={() => choisir(f.siren)} className="flex w-full flex-col gap-1 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:opacity-50">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {f.nom} <Etat ferme={f.ferme} fermeeLe={f.fermeeLe} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    SIREN {siren(f.siren)}
                    {f.activite && ` · ${libelleActivite(f.activite)}`}
                  </span>
                  {f.adresse && <span className="text-xs text-muted-foreground">{f.adresse}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );

  if (!e) return props.modifiable ? fenetre : null;

  if (props.compacte)
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {e.nom}
        {e.ferme && <Etat ferme fermeeLe={e.fermeeLe} />}
        {props.modifiable && fenetre}
      </span>
    );

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{e.nom}</span>
        <Etat ferme={e.ferme} fermeeLe={e.fermeeLe} />
      </span>
      <span className="text-xs text-muted-foreground">
        SIREN {siren(e.siren)}
        {e.activite && ` · ${libelleActivite(e.activite)}`}
      </span>
      {e.adresse && <span className="text-xs text-muted-foreground">{e.adresse}</span>}
      <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        Vérifiée le {dateCourte(e.verifieeLe)}
        {props.modifiable && (
          <>
            {fenetre}
            <Button variant="ghost" size="xs" disabled={enCours} onClick={retirer}>
              Retirer<span className="sr-only"> l&apos;entreprise {e.nom}</span>
            </Button>
          </>
        )}
      </span>
    </div>
  );
}
