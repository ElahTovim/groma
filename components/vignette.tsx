import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// L'emplacement d'une image de chantier. Tant qu'aucune photo n'est déposée, un
// cadre neutre garde la place, pour que la mise en page ne bouge pas quand elle arrive.
export function Vignette({ chantierId, aPhoto, className, alt }: { chantierId: string; aPhoto: boolean; className?: string; alt: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-sm bg-muted", className)}>
      {aPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits
        <img src={`/api/photos/${chantierId}`} alt={alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
          <ImageIcon className="size-1/3 max-h-8 max-w-8" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
