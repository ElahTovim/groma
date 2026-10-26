import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » de la machine de nuit : la structure de la page en gris.
export default function Chargement() {
  return (
    <div>
      <p role="status" className="sr-only">Chargement de la machine de nuit…</p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-96 max-w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
