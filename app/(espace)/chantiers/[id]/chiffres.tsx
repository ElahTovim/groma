import type { LotVu } from "@/lib/fiche";
import { euros } from "@/lib/format";
import { cn } from "@/lib/utils";

function dateSansAnnee(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
}

// L'essentiel du chantier en quatre chiffres lisibles de loin. Les retards passent
// en aplat noir dès qu'il y en a un : c'est ce qui doit sauter aux yeux.
export function Chiffres(props: { lots: LotVu[]; montantHt: string | null | undefined; finPrevue: string | null }) {
  const finis = props.lots.filter((l) => l.statut === "fini").length;
  const enRetard = props.lots.filter((l) => l.enRetard).length;
  const cartes = [
    { titre: "Lots finis", valeur: `${finis}`, suite: ` / ${props.lots.length}` },
    { titre: "En retard", valeur: `${enRetard}`, suite: enRetard > 1 ? " lots" : enRetard === 1 ? " lot" : "", alerte: enRetard > 0 },
    { titre: "Fin prévue", valeur: dateSansAnnee(props.finPrevue) },
    { titre: "Montant HT", valeur: euros(props.montantHt) },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cartes.map((c) => (
        <li key={c.titre} className={cn("flex min-w-0 flex-col justify-between gap-6 rounded-3xl p-5", c.alerte ? "bg-foreground text-background" : "bg-card")}>
          <span className={cn("text-sm font-medium", c.alerte ? "text-background/80" : "text-muted-foreground")}>{c.titre}</span>
          <span className="truncate text-3xl leading-none font-bold tracking-tighter tabular-nums md:text-5xl">
            {c.valeur}
            {c.suite && <span className={cn("text-xl tracking-tight md:text-2xl", c.alerte ? "text-background/70" : "text-muted-foreground")}>{c.suite}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
