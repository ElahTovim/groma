"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIBELLE_STATUT, STATUTS } from "@/lib/chantier-forme";

// Les filtres s'appliquent tout seuls : au choix d'un statut, et pendant la
// frappe (après une courte pause). Ils vivent dans l'adresse : on peut la partager.
export function FiltresChantiers() {
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

  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2" role="search">
      <Input
        value={q}
        onChange={(e) => {
          const valeur = e.target.value;
          setQ(valeur);
          if (minuteur.current) clearTimeout(minuteur.current);
          minuteur.current = setTimeout(() => appliquer({ q: valeur.trim() }), 300);
        }}
        placeholder="Rechercher : nom, client, ville, référence"
        className="min-w-0 flex-1 basis-60"
        aria-label="Rechercher"
      />
      <select
        value={statut}
        onChange={(e) => appliquer({ statut: e.target.value })}
        aria-label="Filtrer par statut"
        className="h-8 rounded-lg border bg-background px-3 text-sm"
      >
        <option value="">Tous les statuts</option>
        {STATUTS.map((s) => (
          <option key={s} value={s}>
            {LIBELLE_STATUT[s]}
          </option>
        ))}
      </select>
      {(q || statut) && (
        <Button
          variant="ghost"
          onClick={() => {
            setQ("");
            appliquer({ q: "", statut: "" });
          }}
        >
          Effacer
        </Button>
      )}
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {enCours ? "Filtrage…" : ""}
      </span>
    </div>
  );
}
