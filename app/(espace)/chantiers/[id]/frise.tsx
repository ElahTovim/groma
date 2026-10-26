import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import type { StatutChantier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const CYCLE: StatutChantier[] = ["devis", "signe", "planifie", "en_cours", "reception", "clos"];

// Les six étapes du chantier en segments, comme un jalon d'arpenteur.
// Sur téléphone, pas de liste des six libellés : l'étape actuelle et la suivante suffisent.
export function FriseEtapes({ statut }: { statut: StatutChantier }) {
  const rang = CYCLE.indexOf(statut);
  if (rang < 0) return null; // annulé : le badge suffit
  // Clos : tout le jalon est plein, il n'y a plus d'étape en cours.
  const enCours = statut === "clos" ? -1 : rang;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-3 text-sm md:hidden">
        <span className="font-semibold">
          Étape {rang + 1} sur {CYCLE.length} · {LIBELLE_STATUT[statut]}
        </span>
        {CYCLE[rang + 1] && <span className="text-muted-foreground">Ensuite : {LIBELLE_STATUT[CYCLE[rang + 1]]}</span>}
      </p>
      <ol className="grid grid-cols-6 gap-[3px]" aria-label={`Étape ${rang + 1} sur ${CYCLE.length} : ${LIBELLE_STATUT[statut]}`}>
        {CYCLE.map((s, i) => (
          <li key={s} className="flex min-w-0 flex-col gap-2" aria-current={i === rang ? "step" : undefined}>
            {/* Un jalon d'arpenteur : les étapes franchies en plein, l'étape en cours hachurée,
                les suivantes en simple contour. */}
            <span className={cn("h-2.5 overflow-hidden", i === enCours ? "hachure ring-1 ring-foreground ring-inset" : i > rang && "ring-1 ring-foreground/35 ring-inset")}>
              {(i < rang || (i === rang && enCours < 0)) && <span className="remplit block h-full bg-foreground" style={{ "--rang": i } as React.CSSProperties} />}
            </span>
            <span className={cn("annotation sr-only truncate text-[10px] md:not-sr-only md:block", i === rang ? "font-semibold" : "text-muted-foreground")}>
              {LIBELLE_STATUT[s]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
