"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Onglet = { cle: string; titre: string; nombre?: number; contenu: React.ReactNode };

// Les onglets n'existent que sur téléphone (sous md) : ailleurs, tout est visible et
// les panneaux ne sont plus des onglets pour un lecteur d'écran.
const TELEPHONE = "(max-width: 767px)";

function abonner(rappel: () => void) {
  const requete = window.matchMedia(TELEPHONE);
  requete.addEventListener("change", rappel);
  return () => requete.removeEventListener("change", rappel);
}

function useTelephone() {
  return useSyncExternalStore(
    abonner,
    () => window.matchMedia(TELEPHONE).matches,
    () => false,
  );
}

// La suite de la fiche. Sur ordinateur : deux colonnes, tout visible (lots et fil à
// gauche, météo et infos à droite). Sur téléphone : la météo, puis des onglets
// Lots / Fil / Infos pour ne pas faire défiler toute la fiche.
// Au clavier : flèches gauche et droite, Début et Fin.
export function SuiteFiche(props: { meteo: React.ReactNode; gauche: Onglet[]; infos: Onglet; initial?: string }) {
  const onglets = [...props.gauche, props.infos];
  const telephone = useTelephone();
  // Un lien qui demande un onglet du fil (?onglet=…) ouvre directement le fil.
  const [actif, setActif] = useState(props.initial && onglets.some((o) => o.cle === props.initial) ? props.initial : onglets[0].cle);

  // Un lien « À traiter » (#lot-…, #fil-…) ouvre le bon onglet avant de défiler,
  // puis y place le focus pour que la lecture au clavier reprenne là.
  useEffect(() => {
    function suivre() {
      const cible = window.location.hash.match(/^#(lot|fil)-/)?.[1];
      if (!cible) return;
      setActif(cible === "lot" ? "lots" : "fil");
      requestAnimationFrame(() => {
        const el = document.getElementById(window.location.hash.slice(1));
        if (!el) return;
        el.scrollIntoView({ block: "center" });
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      });
    }
    suivre();
    window.addEventListener("hashchange", suivre);
    return () => window.removeEventListener("hashchange", suivre);
  }, []);

  function clavier(e: React.KeyboardEvent) {
    const i = onglets.findIndex((o) => o.cle === actif);
    const n = onglets.length;
    const cible = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    const o = onglets[cible];
    setActif(o.cle);
    document.getElementById(`onglet-${o.cle}`)?.focus();
  }

  const panneau = (o: Onglet) => (
    <div
      key={o.cle}
      id={`panneau-${o.cle}`}
      role={telephone ? "tabpanel" : undefined}
      aria-labelledby={telephone ? `onglet-${o.cle}` : undefined}
      className={cn("min-w-0 md:block", actif !== o.cle && "hidden")}
    >
      {o.contenu}
    </div>
  );

  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
      <div className="min-w-0 md:col-start-2 md:row-start-1">{props.meteo}</div>

      <div role="tablist" aria-label="Contenu du chantier" onKeyDown={clavier} className="-mb-2 flex border-b md:hidden">
        {onglets.map((o) => (
          <button
            key={o.cle}
            id={`onglet-${o.cle}`}
            type="button"
            role="tab"
            aria-selected={actif === o.cle}
            aria-controls={`panneau-${o.cle}`}
            tabIndex={actif === o.cle ? 0 : -1}
            onClick={() => setActif(o.cle)}
            className={cn(
              "-mb-px flex h-13 flex-1 items-center justify-center gap-1.5 border-b-3 text-base",
              actif === o.cle ? "border-foreground font-bold" : "border-transparent font-medium text-muted-foreground",
            )}
          >
            {o.titre}
            {o.nombre !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                {o.nombre}
                <span className="sr-only"> élément{o.nombre > 1 ? "s" : ""}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-8 md:col-start-1 md:row-span-2 md:row-start-1">{props.gauche.map(panneau)}</div>
      <div className="min-w-0 md:col-start-2 md:row-start-2">{panneau(props.infos)}</div>
    </div>
  );
}
