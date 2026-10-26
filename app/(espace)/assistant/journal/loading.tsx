import { Skeleton } from "@/components/ui/skeleton";

// L'état « chargement » du journal : la structure de la page en gris.
export default function Chargement() {
  return (
    <div>
      <p role="status" className="sr-only">Chargement du journal de l&apos;assistant…</p>
      <div aria-hidden="true" className="flex flex-col gap-5">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-11 w-56 rounded-full" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    </div>
  );
}
