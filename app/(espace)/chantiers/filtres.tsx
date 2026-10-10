"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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

  return (
    <div className="flex flex-col gap-3">
      {/* Sur téléphone, les onglets défilent à l'horizontale plutôt que de s'empiler. */}
      <nav aria-label="Statut" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex w-max gap-1 border-b">
          {onglets.map((o) => {
            const actif = statut === o.valeur;
            return (
              <li key={o.valeur || "tous"}>
                <button
                  type="button"
                  aria-current={actif ? "page" : undefined}
                  onClick={() => appliquer({ statut: o.valeur })}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
                    actif ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.libelle}
                  <span className={cn("rounded-sm px-1.5 text-xs tabular-nums", actif ? "bg-foreground text-background" : "bg-muted")}>{o.n}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-3">
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
          className="min-w-0 flex-1"
          aria-label="Rechercher"
        />
        <span className="w-20 text-sm text-muted-foreground" aria-live="polite">
          {enCours ? "Filtrage…" : ""}
        </span>
      </div>
    </div>
  );
}
