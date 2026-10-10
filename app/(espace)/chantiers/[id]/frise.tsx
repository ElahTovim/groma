import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import type { StatutChantier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const CYCLE: StatutChantier[] = ["devis", "signe", "planifie", "en_cours", "reception", "clos"];

// Les six étapes du chantier en segments : pleins jusqu'à l'étape actuelle, en gras.
// Sur téléphone, les libellés tiennent sur une ligne sous la barre.
export function FriseEtapes({ statut }: { statut: StatutChantier }) {
  const rang = CYCLE.indexOf(statut);
  if (rang < 0) return null; // annulé : le badge suffit

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold md:hidden">
        Étape {rang + 1} sur {CYCLE.length}
      </p>
      <ol className="grid grid-cols-6 gap-1" aria-label={`Étape ${rang + 1} sur ${CYCLE.length} : ${LIBELLE_STATUT[statut]}`}>
        {CYCLE.map((s, i) => (
          <li key={s} className="flex min-w-0 flex-col gap-2" aria-current={i === rang ? "step" : undefined}>
            <span className={cn("h-2 rounded-full", i <= rang ? "bg-foreground" : "bg-foreground/10")} />
            <span className={cn("hidden truncate text-sm md:block", i === rang ? "font-bold" : i > rang && "text-muted-foreground")}>
              {i === rang && "● "}
              {LIBELLE_STATUT[s]}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground md:hidden">{CYCLE.map((s) => LIBELLE_STATUT[s]).join(" · ")}</p>
    </div>
  );
}
