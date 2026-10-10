import { cn } from "@/lib/utils";

// Une section de page. Par défaut, un titre posé sur le fond, au-dessus d'une suite
// de cartes (lots, fil). Avec `carte`, la section devient elle-même une carte blanche.
export function Section(props: { titre: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; carte?: boolean }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4", props.carte && "rounded-3xl bg-card p-5 md:p-6", props.className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className={cn("font-bold tracking-tight", props.carte ? "text-lg" : "text-xl")}>{props.titre}</h2>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}
