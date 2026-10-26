"use client";

import { Layers, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Reticule } from "@/components/cote";
import { cn } from "@/lib/utils";

type Lien = { href: string; libelle: string; icone: (p: { className?: string }) => React.ReactNode };

const LIENS: Lien[] = [
  { href: "/", libelle: "Accueil", icone: ({ className }) => <Reticule className={className} plein={false} /> },
  { href: "/chantiers", libelle: "Chantiers", icone: ({ className }) => <Layers className={className} strokeWidth={1.6} aria-hidden /> },
  { href: "/courriers", libelle: "Courriers", icone: ({ className }) => <Mail className={className} strokeWidth={1.6} aria-hidden /> },
];

function actif(chemin: string, href: string) {
  return href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(`${href}/`);
}

function liensPour(interne: boolean) {
  // L'en-tête est celui du travail de tous les jours. Courriers est interne : un externe ne
  // voit que l'accueil et ses chantiers. Assistant, À valider et Questions vivent dans le
  // menu du compte (et l'accueil y mène par sa barre d'assistant).
  return interne ? LIENS : LIENS.slice(0, 2);
}

// Sur ordinateur, les liens de l'en-tête ; celui de la page ouverte est souligné.
export function LiensHaut({ interne }: { interne: boolean }) {
  const chemin = usePathname();
  return (
    <>
      {liensPour(interne).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={actif(chemin, l.href) ? "page" : undefined}
          className={cn(
            "hidden h-14 items-center text-sm transition-colors md:flex",
            actif(chemin, l.href) ? "font-semibold shadow-[inset_0_-2px_0_var(--foreground)]" : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {l.libelle}
        </Link>
      ))}
    </>
  );
}

// Sur téléphone, une barre d'onglets en bas, sous le pouce. Elle s'efface sur les
// pages de détail (une fiche chantier a déjà son bouton d'étape à cet endroit).
export function BarreBas({ interne }: { interne: boolean }) {
  const chemin = usePathname();
  const liens = liensPour(interne);
  const ici = liens.findIndex((l) => actif(chemin, l.href));
  if (!liens.some((l) => l.href === chemin)) return null;
  return (
    <nav
      aria-label="Onglets de navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-background/90 px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden"
      style={{ gridTemplateColumns: `repeat(${liens.length}, minmax(0, 1fr))`, viewTransitionName: "barre-bas" }}
    >
      {/* Un seul trait, qui glisse jusqu'à l'onglet ouvert. */}
      <span aria-hidden className="glisse pointer-events-none absolute top-0 left-2 flex justify-center" style={{ width: `calc((100% - 1rem) / ${liens.length})`, transform: `translateX(${ici * 100}%)` }}>
        <span className="h-0.5 w-6 rounded-full bg-foreground" />
      </span>
      {liens.map(({ href, libelle, icone: Icone }, i) => {
        const estIci = i === ici;
        return (
          <Link key={href} href={href} aria-current={estIci ? "page" : undefined} className={cn("relative flex min-h-13 flex-col items-center justify-center gap-1 transition-[color,transform] duration-150 active:scale-95", !estIci && "text-muted-foreground")}>
            <Icone className="size-[22px]" />
            <span className={cn("text-[11px]", estIci ? "font-semibold" : "font-medium")}>{libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// La place que la barre du bas prend sur téléphone, réservée en fin de page.
export function MargeBarreBas({ interne }: { interne: boolean }) {
  const chemin = usePathname();
  return liensPour(interne).some((l) => l.href === chemin) ? <div aria-hidden className="h-24 md:hidden" /> : null;
}
