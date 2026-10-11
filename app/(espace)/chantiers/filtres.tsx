"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LIBELLE_STATUT, STATUTS } from "@/lib/chantier-forme";
import { cn } from "@/lib/utils";

// Les onglets par statut, avec leur compteur, et la recherche qui s'applique
// pendant la frappe. Tout vit dans l'adresse : on peut la partager.
export function FiltresChantiers(props: { compteurs: Record<string, number>; total: number; aTraiter: number | null }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [choix, setChoix] = useState(false);
  const statut = params.get("statut") ?? "";
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  function appliquer(changements: Record<string, string>) {
    const suivant = new URLSearchParams(params.toString());
    for (const [cle, valeur] of Object.entries(changements)) {
      if (valeur) suivant.set(cle, valeur);
      else suivant.delete(cle);
    }
    const chaine = suivant.toString();
    demarrer(() => router.replace(chaine ? `${chemin}?${chaine}` : chemin, { scroll: false }));
  }

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  const onglets: { valeur: string; libelle: string; n: number }[] = [
    { valeur: "", libelle: "Tous", n: props.total },
    ...(props.aTraiter !== null ? [{ valeur: "a_traiter", libelle: "À traiter", n: props.aTraiter }] : []),
    ...STATUTS.filter((s) => props.compteurs[s]).map((s) => ({ valeur: s, libelle: LIBELLE_STATUT[s], n: props.compteurs[s] })),
  ];

  const actif = onglets.find((o) => o.valeur === statut) ?? onglets[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Ordinateur : tous les statuts visibles, sur plusieurs lignes si besoin. */}
      <nav aria-label="Statut" className="hidden md:block">
        <ul className="flex flex-wrap gap-2">
          {onglets.map((o) => (
            <li key={o.valeur || "tous"}>
              <Pastille o={o} actif={statut === o.valeur} onClick={() => appliquer({ statut: o.valeur })} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-2">
        <Input
          value={q}
          type="search"
          onChange={(e) => {
            const valeur = e.target.value;
            setQ(valeur);
            if (minuteur.current) clearTimeout(minuteur.current);
            minuteur.current = setTimeout(() => appliquer({ q: valeur.trim() }), 300);
          }}
          placeholder="Rechercher : nom, client, ville, référence"
          className="h-12 min-w-0 flex-1 rounded-full border-0 bg-card px-5"
          aria-label="Rechercher"
        />
        {/* Téléphone : un seul bouton montre le statut choisi ; la liste s'ouvre par le bas. */}
        <button
          type="button"
          onClick={() => setChoix(true)}
          className={cn(
            "flex h-12 shrink-0 items-center gap-1.5 rounded-full pr-3 pl-4 text-sm font-semibold md:hidden",
            actif.valeur ? "bg-foreground text-background" : "bg-card",
          )}
          aria-label={`Statut : ${actif.libelle}. Changer`}
        >
          {actif.libelle}
          <ChevronDown className="size-4" aria-hidden />
        </button>
        <span className="sr-only" aria-live="polite">
          {enCours ? "Filtrage…" : ""}
        </span>
      </div>
      <Dialog open={choix} onOpenChange={setChoix}>
        <DialogContent className="top-auto bottom-0 left-0 max-w-full translate-x-0 translate-y-0 gap-5 rounded-t-3xl rounded-b-none p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-full md:hidden">
          <DialogTitle className="font-display text-xl font-bold">Afficher</DialogTitle>
          <ul className="grid grid-cols-2 gap-2">
            {onglets.map((o) => (
              <li key={o.valeur || "tous"}>
                <button
                  type="button"
                  onClick={() => {
                    setChoix(false);
                    appliquer({ statut: o.valeur });
                  }}
                  className={cn(
                    "flex h-14 w-full items-center justify-between rounded-2xl px-4 text-left font-semibold",
                    statut === o.valeur ? "bg-foreground text-background" : "bg-muted",
                  )}
                >
                  {o.libelle}
                  <span className={cn("text-sm tabular-nums", statut === o.valeur ? "text-background/70" : "text-muted-foreground")}>{o.n}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pastille({ o, actif, onClick }: { o: { libelle: string; n: number }; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={actif ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap",
        actif ? "bg-foreground text-background" : "bg-card hover:bg-card/70",
      )}
    >
      {o.libelle}
      <span className={cn("text-xs tabular-nums", actif ? "text-background/70" : "text-muted-foreground")}>{o.n}</span>
    </button>
  );
}
