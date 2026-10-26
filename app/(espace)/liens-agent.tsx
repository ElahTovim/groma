"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Les liens de l'assistant dans l'en-tête : « Assistant » et « À valider », ce dernier avec le
// nombre en attente en pastille noire. Le cadre ne les montre qu'à l'équipe ; chaque page
// revérifie le droit.
function Pastille({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <>
      <span aria-hidden className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background tabular-nums">
        {n > 99 ? "99+" : n}
      </span>
      <span className="sr-only">, {n} en attente</span>
    </>
  );
}

const actif = (chemin: string, href: string) => chemin === href || chemin.startsWith(`${href}/`);

// Les outils de l'assistant vivent dans le menu du compte. Ce qui attend une validation ne
// se perd pas pour autant : la pastille noire reste visible sur le nom, dans l'en-tête,
// tant qu'une proposition attend (et la puce « à valider » de l'accueil le dit aussi).
export function PastilleCompte({ enAttente }: { enAttente: number }) {
  return <Pastille n={enAttente} />;
}

const LIGNE = "flex min-h-11 items-center justify-between gap-2 px-3 text-sm hover:bg-muted";

export function LiensAgentMenu({ enAttente, gerant }: { enAttente: number; gerant: boolean }) {
  const chemin = usePathname();
  const ici = (href: string) => (actif(chemin, href) ? "page" : undefined);
  return (
    <>
      <Link href="/a-valider" aria-current={ici("/a-valider")} className={cn(LIGNE, enAttente > 0 && "font-semibold")}>
        À valider
        <Pastille n={enAttente} />
      </Link>
      <Link href="/assistant" aria-current={ici("/assistant")} className={LIGNE}>
        Assistant
      </Link>
      {gerant && (
        <Link href="/assistant/journal" aria-current={ici("/assistant/journal")} className={LIGNE}>
          Journal de l&apos;assistant
        </Link>
      )}
      <Link href="/questions" aria-current={ici("/questions")} className={LIGNE}>
        Questions sur les documents
      </Link>
    </>
  );
}
