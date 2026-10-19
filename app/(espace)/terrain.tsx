"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Cote, Reticule } from "@/components/cote";
import type { DonneesCote } from "@/lib/cote";
import { cn } from "@/lib/utils";

export type ChantierTerrain = {
  id: string;
  nom: string;
  ville: string;
  client: string;
  etape: string;
  enChantier: boolean; // en cours ou en réception : l'étiquette passe en noir
  aPhoto: boolean;
  aViser: string | null; // ce qui attend un geste, en clair
  cote: DonneesCote;
};

type Vue = "cartes" | "liste";
const CLE_VUE = "groma-vue-terrain";

// Le choix est retenu dans le navigateur ; s'il ne peut pas l'être, il vaut pour la visite.
let vueEnMemoire: Vue = "cartes";
const abonnes = new Set<() => void>();
function lireVue(): Vue {
  try {
    const v = localStorage.getItem(CLE_VUE);
    if (v === "liste" || v === "cartes") return v;
  } catch {}
  return vueEnMemoire;
}
function ecrireVue(v: Vue) {
  vueEnMemoire = v;
  try {
    localStorage.setItem(CLE_VUE, v);
  } catch {}
  abonnes.forEach((f) => f());
}
function abonner(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

// Les chantiers en cartes (par défaut) ou en liste. Le choix est retenu sur cet
// appareil. Sur téléphone, les cartes défilent sur le côté ; sur ordinateur, une grille.
export function Terrain({ titre, chantiers }: { titre: string; chantiers: ChantierTerrain[] }) {
  // Cartes par défaut, y compris au premier affichage par le serveur.
  const vue = useSyncExternalStore(abonner, lireVue, () => "cartes" as Vue);
  const choisir = ecrireVue;

  return (
    <section className="flex flex-col gap-4" aria-label={titre}>
      <div className="flex items-center justify-between gap-4 border-b border-foreground pb-2.5">
        <h2 className="annotation font-semibold">
          {titre} · {chantiers.length}
        </h2>
        <div className="flex items-center gap-4">
          <Link href="/chantiers" className="annotation hidden underline underline-offset-4 md:inline">
            Tous les chantiers
          </Link>
          <div role="group" aria-label="Affichage des chantiers" className="relative grid grid-cols-2 rounded-full bg-foreground/[0.07] p-[3px]">
            <span aria-hidden className={cn("glisse absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-card shadow-sm", vue === "liste" && "translate-x-full")} />
            {(
              [
                ["cartes", "Cartes", LayoutGrid],
                ["liste", "Liste", List],
              ] as const
            ).map(([v, libelle, Icone]) => (
              <button
                key={v}
                type="button"
                aria-pressed={vue === v}
                onClick={() => choisir(v)}
                className={cn("relative flex h-9 items-center justify-center gap-1.5 px-3.5 text-sm transition-colors", vue === v ? "font-semibold" : "text-muted-foreground")}
              >
                <Icone className="size-4" aria-hidden />
                {libelle}
              </button>
            ))}
          </div>
        </div>
      </div>
      {vue === "cartes" ? <Cartes chantiers={chantiers} /> : <Liste chantiers={chantiers} />}
    </section>
  );
}

function Carte({ c, className, rang }: { c: ChantierTerrain; className?: string; rang: number }) {
  return (
    <Link
      href={`/chantiers/${c.id}`}
      className={cn("carte-photo relative isolate flex flex-col justify-between overflow-hidden rounded-3xl bg-foreground p-4 text-white md:p-5", className)}
    >
      {c.aPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits
        <img src={`/api/photos/${c.id}`} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
      ) : (
        <Reticule className="absolute top-1/2 left-1/2 -z-20 size-40 -translate-1/2 text-white/10" plein={false} />
      )}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/10 to-black/85" />
      <span className="flex items-center justify-between">
        <span className="annotation rounded-full bg-white px-2.5 py-1.5 text-[10px] font-semibold text-black">{c.etape}</span>
        {c.aViser && (
          <span className="flex size-8 items-center justify-center rounded-full bg-black/60 backdrop-blur" title="À viser">
            <Reticule className="size-5" plein={false} />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-3">
        <span className="flex flex-col gap-1">
          <span className="annotation text-white/80">
            {c.ville} · {c.client}
          </span>
          <span className="line-clamp-3 font-display text-[2rem] leading-[0.95] font-extrabold tracking-tight md:text-[1.75rem]">{c.nom}</span>
        </span>
        {c.aViser && <span className="w-fit rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black">{c.aViser}</span>}
        <Cote c={c.cote} clair rang={rang} />
      </span>
    </Link>
  );
}

function Cartes({ chantiers }: { chantiers: ChantierTerrain[] }) {
  const piste = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function suivre() {
    const el = piste.current;
    const premiere = el?.firstElementChild as HTMLElement | null;
    if (!el || !premiere) return;
    const pas = premiere.offsetWidth + 12;
    setIndex(Math.min(chantiers.length - 1, Math.max(0, Math.round(el.scrollLeft / pas))));
  }

  return (
    <>
      {/* Téléphone : un carrousel, la carte suivante dépasse sur le bord. */}
      <div className="flex flex-col gap-3 md:hidden">
        <div ref={piste} onScroll={suivre} className="carrousel -mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-2">
          {chantiers.map((c, i) => (
            <Carte key={c.id} c={c} rang={i} className="h-[26rem] w-[80%] shrink-0" />
          ))}
        </div>
        {chantiers.length > 1 && (
          <div className="flex items-center gap-3" aria-hidden>
            <span className="annotation min-w-14 tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(chantiers.length).padStart(2, "0")}
            </span>
            <span className="flex flex-1 gap-1">
              {chantiers.map((c, i) => (
                <span key={c.id} className={cn("h-0.5 flex-1 rounded-full transition-colors duration-300", i === index ? "bg-foreground" : "bg-foreground/15")} />
              ))}
            </span>
          </div>
        )}
      </div>
      {/* Ordinateur : une grille. */}
      <div className="hidden grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 md:grid">
        {chantiers.map((c, i) => (
          <Carte key={c.id} c={c} rang={i} className="apparait h-[21rem]" />
        ))}
      </div>
    </>
  );
}

function Liste({ chantiers }: { chantiers: ChantierTerrain[] }) {
  return (
    <ul className="flex flex-col">
      {chantiers.map((c, i) => (
        <li key={c.id} className="apparait border-b border-foreground/10" style={{ "--rang": i } as React.CSSProperties}>
          <Link href={`/chantiers/${c.id}`} className="grid gap-3 py-4 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-7 md:px-2">
            <span className="flex items-start justify-between gap-3 md:block">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-[1.45rem] leading-[1.05] font-bold tracking-tight">{c.nom}</span>
                <span className="annotation truncate text-muted-foreground">
                  {c.ville} · {c.client}
                </span>
              </span>
              <Etiquette c={c} className="md:hidden" />
            </span>
            <Cote c={c.cote} rang={i} />
            <Etiquette c={c} className="hidden justify-self-end md:inline-flex" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Etiquette({ c, className }: { c: ChantierTerrain; className?: string }) {
  return (
    <span className={cn("annotation shrink-0 rounded-md border border-foreground px-2 py-1 text-[10px]", c.enChantier ? "bg-foreground text-background" : "", className)}>{c.etape}</span>
  );
}
