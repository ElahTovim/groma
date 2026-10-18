import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » de la fiche : le texte d'origine et les champs, en gris.
export default function Chargement() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement du courrier">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
