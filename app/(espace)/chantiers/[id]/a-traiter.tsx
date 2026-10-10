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
      <h2 id="a-traiter" className="font-bold">
        À traiter <span className="md:hidden">({items.length})</span>
      </h2>
      <ul className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3">
        {items.map((i) => (
          <li key={i.texte}>
            <a href={i.href} className="flex min-h-11 items-center gap-2 rounded-md border-2 border-foreground px-2.5 py-1.5 font-bold hover:bg-muted md:min-h-0">
              <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded bg-foreground text-xs leading-none text-background">
                !
              </span>
              <span className="underline-offset-2 hover:underline">{i.texte}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
