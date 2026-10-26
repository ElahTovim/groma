import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » de l'assistant : la structure de la page en gris.
export default function Chargement() {
  return (
    <div>
      <p role="status" className="sr-only">Chargement de l&apos;assistant…</p>
      <div aria-hidden="true" className="flex flex-col gap-5">
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
