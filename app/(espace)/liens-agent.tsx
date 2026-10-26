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
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background tabular-nums" aria-label={`${n} en attente`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

const actif = (chemin: string, href: string) => chemin === href || chemin.startsWith(`${href}/`);

export function LiensAgent({ enAttente }: { enAttente: number }) {
  const chemin = usePathname();
  const liens = [
    { href: "/assistant", libelle: "Assistant", n: 0 },
    { href: "/a-valider", libelle: "À valider", n: enAttente },
  ];
  return (
    <>
      {liens.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={actif(chemin, l.href) ? "page" : undefined}
          className={cn(
            "hidden h-14 items-center gap-1.5 text-sm transition-colors md:flex",
            actif(chemin, l.href) ? "font-semibold shadow-[inset_0_-2px_0_var(--foreground)]" : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {l.libelle}
          <Pastille n={l.n} />
        </Link>
      ))}
    </>
  );
}

// Sur téléphone, l'en-tête n'a pas la place : les deux liens vivent dans le menu du compte,
// et la pastille reste visible à côté du nom.
export function PastilleMobile({ enAttente }: { enAttente: number }) {
  return (
    <span className="md:hidden">
      <Pastille n={enAttente} />
    </span>
  );
}

export function LiensAgentMenu({ enAttente }: { enAttente: number }) {
  return (
    <>
      <Link href="/assistant" className="flex min-h-11 items-center px-3 text-sm hover:bg-muted md:hidden">
        Assistant
      </Link>
      <Link href="/a-valider" className="flex min-h-11 items-center justify-between gap-2 px-3 text-sm hover:bg-muted md:hidden">
        À valider
        <Pastille n={enAttente} />
      </Link>
    </>
  );
}
