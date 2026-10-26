import { ArrowRight, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Reticule } from "@/components/cote";
import { VERS_FICHE } from "@/components/transitions";
import { cn } from "@/lib/utils";

export type LigneAttente = { id: string; href: string; titre: string; detail: string };

// Une tuile d'accès rapide : ce qui attend, avec les trois premiers éléments en lien direct.
// En noir plein quand quelque chose attend (comme les pastilles), en carte claire sinon.
export function TuileAttente(props: { titre: string; n: number; icone: "viser" | "valider"; lignes: LigneAttente[]; tout: { href: string; texte: string }; vide: string }) {
  const attend = props.n > 0;
  const Icone = props.icone === "viser" ? <Reticule className="size-5" /> : <CheckCheck className="size-5" aria-hidden />;
  return (
    <section aria-label={`${props.n} ${props.titre}`} className={cn("flex min-w-0 flex-col gap-4 rounded-3xl p-5", attend ? "bg-foreground text-background" : "bg-card")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          {Icone}
          {props.titre}
        </h3>
        <span className="font-display text-4xl leading-none font-extrabold tabular-nums" aria-hidden>
          {props.n}
        </span>
      </div>
      {props.lignes.length === 0 ? (
        <p className={cn("flex-1 text-sm", attend ? "text-background/80" : "text-muted-foreground")}>{props.vide}</p>
      ) : (
        <ul className="flex flex-1 flex-col">
          {props.lignes.slice(0, 3).map((l) => (
            <li key={l.id} className={cn("border-t", attend ? "border-background/20" : "border-foreground/10")}>
              <Link href={l.href} transitionTypes={VERS_FICHE} className="flex min-h-14 flex-col justify-center py-2 hover:underline">
                <span className="truncate font-semibold">{l.titre}</span>
                <span className={cn("truncate text-sm", attend ? "text-background/80" : "text-muted-foreground")}>{l.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={props.tout.href} className="flex min-h-11 items-center justify-between gap-2 text-sm font-semibold underline-offset-4 hover:underline">
        {props.tout.texte}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
