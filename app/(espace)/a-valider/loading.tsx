import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » de la file « À valider » : la structure de la page en gris.
export default function Chargement() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement des propositions">
      <Skeleton className="h-14 w-56" />
      <Skeleton className="h-5 w-full max-w-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-3xl" />
      ))}
    </div>
  );
}
