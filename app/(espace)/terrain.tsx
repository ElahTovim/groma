"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Cote, Reticule } from "@/components/cote";
import { PhotoPartagee, VERS_FICHE } from "@/components/transitions";
import type { DonneesCote } from "@/lib/cote";
import { nomCarte } from "@/lib/nom-carte";
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
  lien?: string; // où mène la carte (par défaut la fiche ; « À viser » ouvre l'onglet qui attend)
};

type Vue = "cartes" | "liste";
const CLE_VUE = "groma-vue-terrain";

// Le choix est retenu dans le navigateur, une clé par page ; s'il ne peut pas l'être,
// il vaut pour la visite.
const vuesEnMemoire = new Map<string, Vue>();
const abonnes = new Set<() => void>();
function lireVue(cle: string): Vue {
  try {
    const v = localStorage.getItem(cle);
    if (v === "liste" || v === "cartes") return v;
  } catch {}
  return vuesEnMemoire.get(cle) ?? "cartes";
}
function ecrireVue(cle: string, v: Vue) {
  vuesEnMemoire.set(cle, v);
  try {
    localStorage.setItem(cle, v);
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
// appareil. Sur téléphone, les cartes forment une pile ; sur ordinateur, une grille.
export function Terrain({ titre, chantiers, cle = CLE_VUE }: { titre?: string; chantiers: ChantierTerrain[]; cle?: string }) {
  // Cartes par défaut, y compris au premier affichage par le serveur.
  const vue = useSyncExternalStore(abonner, () => lireVue(cle), () => "cartes" as Vue);
  const choisir = (v: Vue) => ecrireVue(cle, v);

  return (
    <section className="flex flex-col gap-4" aria-label={titre ?? "Chantiers"}>
      <div className={cn("flex items-end justify-between gap-4", titre && "border-b border-foreground pb-2.5")}>
        {titre ? (
          <h2 className="annotation font-semibold">
            {titre} · {chantiers.length}
          </h2>
        ) : (
          <p className="annotation text-muted-foreground">
            {chantiers.length} chantier{chantiers.length > 1 ? "s" : ""}
          </p>
        )}
        <div className="flex items-center gap-4">
          {titre && (
            <Link href="/chantiers" className="annotation hidden underline underline-offset-4 md:inline">
              Tous les chantiers
            </Link>
          )}
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
                className={cn("relative flex h-7 items-center justify-center gap-1.5 px-3 text-[13px] transition-colors", vue === v ? "font-semibold" : "text-muted-foreground")}
              >
                <Icone className="size-3.5" aria-hidden />
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

export function Carte({ c, className, rang }: { c: ChantierTerrain; className?: string; rang: number }) {
  return (
    <Link
      href={c.lien ?? `/chantiers/${c.id}`}
      transitionTypes={VERS_FICHE}
      aria-label={nomCarte(c)}
      className={cn("carte-photo relative isolate flex flex-col justify-between overflow-hidden rounded-3xl bg-foreground p-4 text-white md:p-5", className)}
    >
      {c.aPhoto ? (
        <PhotoPartagee chantierId={c.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits */}
          <img src={`/api/photos/${c.id}`} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
        </PhotoPartagee>
      ) : (
        <Reticule className="absolute top-1/2 left-1/2 -z-20 size-40 -translate-1/2 text-white/10" plein={false} />
      )}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/35 to-black/90" />
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
          <span className="annotation text-white">
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

// Téléphone : une pile, comme des dossiers posés les uns sur les autres. Chaque carte
// laisse voir son bandeau (le titre en entier sur deux lignes, la ville, l'étape) ; la
// dernière se voit en entier. On fait défiler la page pour parcourir la pile, dans
// l'ordre de lecture ; la carte qui reçoit le focus clavier sort de la pile.
export function Pile({ chantiers }: { chantiers: ChantierTerrain[] }) {
  return (
    <ul className="flex flex-col pt-1 pb-2 md:hidden">
      {chantiers.map((c, i) => (
        <li
          key={c.id}
          className={cn("relative z-(--rang-pile) transition-transform duration-300 ease-out focus-within:z-50 focus-within:-translate-y-3", i > 0 && "-mt-[13rem]")}
          style={{ "--rang-pile": i + 1 } as React.CSSProperties}
        >
          <CartePile c={c} rang={i} />
        </li>
      ))}
    </ul>
  );
}

function CartePile({ c, rang }: { c: ChantierTerrain; rang: number }) {
  return (
    <Link
      href={c.lien ?? `/chantiers/${c.id}`}
      transitionTypes={VERS_FICHE}
      aria-label={nomCarte(c)}
      className="carte-photo relative isolate flex h-[20rem] flex-col justify-between overflow-hidden rounded-3xl bg-foreground p-4 text-white shadow-[0_-10px_28px_-14px_rgb(0_0_0/0.55)] border-[0.5px] border-white active:scale-[0.99]"
    >
      {c.aPhoto ? (
        <PhotoPartagee chantierId={c.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits */}
          <img src={`/api/photos/${c.id}`} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
        </PhotoPartagee>
      ) : (
        <Reticule className="absolute top-1/2 left-1/2 -z-20 size-40 -translate-1/2 text-white/10" plein={false} />
      )}
      {/* Voile sombre en haut (le bandeau qui reste visible) et en bas (la cote). */}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/35 to-black/85" />
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="line-clamp-2 font-display text-[1.55rem] leading-[1.02] font-extrabold tracking-tight">{c.nom}</span>
          <span className="annotation truncate text-white">
            {c.ville} · {c.etape}
          </span>
        </span>
        {c.aViser && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black" title="À viser">
            <Reticule className="size-5" />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-3">
        {c.aViser && <span className="w-fit rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black">{c.aViser}</span>}
        <Cote c={c.cote} clair rang={rang} />
      </span>
    </Link>
  );
}

function Cartes({ chantiers }: { chantiers: ChantierTerrain[] }) {
  return (
    <>
      <Pile chantiers={chantiers} />
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
          <Link href={`/chantiers/${c.id}`} transitionTypes={VERS_FICHE} className="grid gap-3 py-4 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-7 md:px-2">
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
