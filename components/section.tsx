import { cn } from "@/lib/utils";

// Une section de page : un titre et un filet, sans boîte autour.
export function Section(props: { titre: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 border-t border-foreground/15 pt-4", props.className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{props.titre}</h2>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}
