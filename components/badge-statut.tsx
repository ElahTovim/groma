import { Badge } from "@/components/ui/badge";
import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import type { StatutChantier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// Noir et blanc : le statut se lit par sa forme. Avant le démarrage, un contour
// (pointillé pour le devis) ; pendant le chantier, un aplat noir ; après, du gris.
const FORME: Record<StatutChantier, string> = {
  devis: "border-dashed border-foreground/60 bg-transparent text-foreground",
  signe: "border-foreground bg-transparent text-foreground",
  planifie: "border-foreground bg-secondary text-foreground",
  en_cours: "border-foreground bg-foreground text-background",
  reception: "border-foreground bg-foreground text-background ring-2 ring-foreground ring-offset-1 ring-offset-background",
  clos: "border-transparent bg-muted text-muted-foreground",
  annule: "border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground",
};

export function BadgeStatut({ statut }: { statut: StatutChantier }) {
  return (
    <Badge variant="outline" className={cn("font-medium whitespace-nowrap", FORME[statut])}>
      {LIBELLE_STATUT[statut]}
    </Badge>
  );
}
