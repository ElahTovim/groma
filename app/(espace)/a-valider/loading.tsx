import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » de la file « À valider » : la structure de la page en gris.
export default function Chargement() {
  return (
    <div>
      <p role="status" className="sr-only">Chargement des propositions…</p>
      <div aria-hidden="true" className="flex flex-col gap-5">
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
