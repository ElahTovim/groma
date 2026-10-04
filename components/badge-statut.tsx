import { Badge } from "@/components/ui/badge";
import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import type { StatutChantier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// Chaque statut a sa couleur, pour se distinguer au premier coup d'œil (brief des maquettes).
const COULEUR: Record<StatutChantier, string> = {
  devis: "bg-slate-100 text-slate-800 border-slate-300",
  signe: "bg-sky-100 text-sky-900 border-sky-300",
  planifie: "bg-indigo-100 text-indigo-900 border-indigo-300",
  en_cours: "bg-amber-100 text-amber-900 border-amber-300",
  reception: "bg-orange-100 text-orange-900 border-orange-300",
  clos: "bg-emerald-100 text-emerald-900 border-emerald-300",
  annule: "bg-zinc-100 text-zinc-500 border-zinc-300 line-through",
};

export function BadgeStatut({ statut }: { statut: StatutChantier }) {
  return (
    <Badge variant="outline" className={cn("font-medium", COULEUR[statut])}>
      {LIBELLE_STATUT[statut]}
    </Badge>
  );
}
