"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Onglet = { cle: string; titre: string; nombre?: number; contenu: React.ReactNode };

// La suite de la fiche. Sur ordinateur : deux colonnes, tout visible (lots et fil à
// gauche, météo et infos à droite). Sur téléphone : la météo, puis des onglets
// Lots / Fil / Infos pour ne pas faire défiler toute la fiche.
export function SuiteFiche(props: { meteo: React.ReactNode; gauche: Onglet[]; infos: Onglet }) {
  const onglets = [...props.gauche, props.infos];
  const [actif, setActif] = useState(onglets[0].cle);

  // Un lien « À traiter » (#lot-…, #fil-…) ouvre le bon onglet avant de défiler.
  useEffect(() => {
    function suivre() {
      const cible = window.location.hash.match(/^#(lot|fil)-/)?.[1];
      if (!cible) return;
      setActif(cible === "lot" ? "lots" : "fil");
      requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" }));
    }
    suivre();
    window.addEventListener("hashchange", suivre);
    return () => window.removeEventListener("hashchange", suivre);
  }, []);

  const panneau = (o: Onglet) => (
    <div key={o.cle} id={`panneau-${o.cle}`} role="tabpanel" aria-labelledby={`onglet-${o.cle}`} className={cn("min-w-0 md:block", actif !== o.cle && "hidden")}>
      {o.contenu}
    </div>
  );

  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
      <div className="min-w-0 md:col-start-2 md:row-start-1">{props.meteo}</div>

      <div role="tablist" aria-label="Contenu du chantier" className="-mb-2 flex border-b md:hidden">
        {onglets.map((o) => (
          <button
            key={o.cle}
            id={`onglet-${o.cle}`}
            type="button"
            role="tab"
            aria-selected={actif === o.cle}
            aria-controls={`panneau-${o.cle}`}
            onClick={() => setActif(o.cle)}
            className={cn(
              "-mb-px flex h-13 flex-1 items-center justify-center gap-1.5 border-b-3 text-base",
              actif === o.cle ? "border-foreground font-bold" : "border-transparent font-medium text-muted-foreground",
            )}
          >
            {o.titre}
            {o.nombre !== undefined && <span className="text-sm font-normal text-muted-foreground">{o.nombre}</span>}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-8 md:col-start-1 md:row-span-2 md:row-start-1">{props.gauche.map(panneau)}</div>
      <div className="min-w-0 md:col-start-2 md:row-start-2">{panneau(props.infos)}</div>
    </div>
  );
}
