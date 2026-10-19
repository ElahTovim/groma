import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » : la structure de la page en gris, sans texte inventé.
export default function Chargement() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement des courriers">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-full max-w-md" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
