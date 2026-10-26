import { Compteur } from "@/components/compteur";
import type { LotVu } from "@/lib/fiche";
import { dateCourte, euros } from "@/lib/format";
import { cn } from "@/lib/utils";

// « 12.03.26 » à l'écran ; un lecteur d'écran entend « 12 mars 2026 ».
function datePoints(iso: string | null) {
  if (!iso) return "—";
  const [a, m, j] = iso.split("-");
  return (
    <time dateTime={iso}>
      <span aria-hidden>{`${j}.${m}.${a.slice(2)}`}</span>
      <span className="sr-only">{dateCourte(iso)}</span>
    </time>
  );
}

// L'essentiel du chantier dans un cartouche, comme le bloc-titre d'un plan :
// des cases cerclées d'un trait, l'intitulé en annotation, la valeur dessous.
// Les retards passent en aplat noir dès qu'il y en a un : c'est ce qui doit sauter aux yeux.
export function Chiffres(props: { lots: LotVu[]; montantHt: string | null | undefined; debutPrevu: string | null; finPrevue: string | null; client: string }) {
  const finis = props.lots.filter((l) => l.statut === "fini").length;
  const enRetard = props.lots.filter((l) => l.enRetard).length;
  const cases: { titre: string; valeur: React.ReactNode; alerte?: boolean; mono?: boolean }[] = [
    { titre: "Client", valeur: props.client },
    { titre: "Montant HT", valeur: props.montantHt == null ? euros(props.montantHt) : <Compteur valeur={Number(props.montantHt)} format="euros" /> },
    { titre: "Début", valeur: datePoints(props.debutPrevu), mono: true },
    { titre: "Fin prévue", valeur: datePoints(props.finPrevue), mono: true },
    { titre: "Lots finis", valeur: <><Compteur valeur={finis} /> sur {props.lots.length}</> },
    { titre: "En retard", valeur: enRetard ? <><Compteur valeur={enRetard} /> lot{enRetard > 1 ? "s" : ""}</> : "Aucun", alerte: enRetard > 0 },
  ];

  return (
    <dl className="apparait grid grid-cols-2 overflow-hidden rounded-md border border-foreground md:grid-cols-6">
      {cases.map((c) => (
        <div
          key={c.titre}
          className={cn(
            "flex min-w-0 flex-col gap-1 border-foreground/25 px-3 py-2.5 [&:not(:nth-child(2n))]:border-r md:[&:not(:last-child)]:border-r [&:nth-child(-n+4)]:border-b md:[&:nth-child(-n+4)]:border-b-0",
            c.alerte && "bg-foreground text-background",
          )}
        >
          <dt className={cn("annotation text-[10px]", c.alerte ? "text-background/75" : "text-muted-foreground")}>{c.titre}</dt>
          <dd className={cn("truncate font-semibold tabular-nums", c.mono && "font-mono text-sm tracking-wide")}>{c.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
