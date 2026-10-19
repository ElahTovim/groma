import type { DonneesCote } from "@/lib/cote";
import { cn } from "@/lib/utils";

// Le réticule de visée de la groma : il marque ce qui attend un geste.
export function Reticule({ className, plein = true }: { className?: string; plein?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden className={className}>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      {plein && <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />}
    </svg>
  );
}

// L'avancement dessiné comme une cote de plan : deux bornes, le trait des lots
// finis, et un repère « aujourd'hui ». `clair` pour la poser sur une photo.
export function Cote({ c, clair = false, rang = 0 }: { c: DonneesCote; clair?: boolean; rang?: number }) {
  const encre = clair ? "bg-white" : "bg-foreground";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="relative block h-4" aria-hidden>
        <span className={cn("absolute inset-x-0 top-[7px] h-px", clair ? "bg-white/45" : "bg-foreground/35")} />
        <span className={cn("absolute top-0.5 left-0 h-[11px] w-px", encre)} />
        <span className={cn("absolute top-0.5 right-0 h-[11px] w-px", encre)} />
        <span className={cn("remplit absolute top-1.5 left-0 h-[3px]", encre)} style={{ width: `${c.pct}%`, "--rang": rang } as React.CSSProperties} />
        {c.aujourdhui !== null && !clair && (
          <>
            <span className="absolute top-0 h-[15px] w-px bg-foreground" style={{ left: `${c.aujourdhui}%` }} />
            <span className="absolute -top-[3px] -ml-[3px] size-[7px] rounded-full bg-foreground" style={{ left: `${c.aujourdhui}%` }} />
          </>
        )}
      </span>
      <span className={cn("annotation flex justify-between text-[10px]", clair ? "text-white/80" : "text-muted-foreground")}>
        <span>{c.debut}</span>
        <span className={clair ? "text-white" : "text-foreground"}>{c.total ? `Lots ${c.finis}/${c.total}` : ""}</span>
        <span>{c.fin}</span>
      </span>
    </div>
  );
}
