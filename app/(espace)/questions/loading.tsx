import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » : la structure de la page en gris, sans texte inventé.
export default function Chargement() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
