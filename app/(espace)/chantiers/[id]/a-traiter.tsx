import type { ElementVu, LotVu } from "@/lib/fiche";
import { retardsLot } from "@/lib/regles";

function jours(n: number) {
  return `${n} jour${n > 1 ? "s" : ""}`;
}

// Ce qui demande de l'attention sur ce chantier, en pastilles cliquables :
// chacune mène au lot ou à l'élément du fil en cause.
export function ATraiterFiche(props: { lots: LotVu[]; elements: ElementVu[]; aujourdhui: string }) {
  const items: { href: string; texte: string }[] = [];
  for (const l of props.lots) {
    const r = retardsLot(l, props.aujourdhui);
    if (r.livraison !== null) items.push({ href: `#lot-${l.id}`, texte: `${l.nom} : livraison en retard de ${jours(r.livraison)}` });
    if (r.fin !== null) items.push({ href: `#lot-${l.id}`, texte: `${l.nom} : fin en retard de ${jours(r.fin)}` });
  }
  const aQualifier = props.elements.filter((e) => e.statutSignalement === "a_qualifier");
  if (aQualifier.length) {
    items.push({ href: `#fil-${aQualifier[0].id}`, texte: `${aQualifier.length} signalement${aQualifier.length > 1 ? "s" : ""} à qualifier` });
  }
  const reserves = props.elements.filter((e) => e.statutSignalement === "reserve_ouverte");
  if (reserves.length) {
    items.push({ href: `#fil-${reserves[0].id}`, texte: `${reserves.length} réserve${reserves.length > 1 ? "s" : ""} ouverte${reserves.length > 1 ? "s" : ""}` });
  }
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="a-traiter" className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
      <h2 id="a-traiter" className="text-xl font-bold tracking-tight md:text-base">
        À traiter <span className="md:hidden">({items.length})</span>
      </h2>
      <ul className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3">
        {items.map((i) => (
          <li key={i.texte}>
            <a href={i.href} className="flex min-h-12 items-center gap-2.5 rounded-full bg-foreground py-2 pr-4 pl-2 font-semibold text-background hover:bg-foreground/85 md:min-h-10">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold leading-none text-foreground">
                !
              </span>
              <span>{i.texte}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
