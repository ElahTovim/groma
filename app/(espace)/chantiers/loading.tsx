import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » : la structure de la page en gris, sans texte inventé.
export default function Chargement() {
  return (
    <div>
      <p role="status" className="sr-only">Chargement des chantiers…</p>
      <div aria-hidden="true" className="flex flex-col gap-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
