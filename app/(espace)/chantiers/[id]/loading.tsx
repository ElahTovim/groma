import { Skeleton } from "@/components/ui/skeleton";

export default function Chargement() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement du chantier">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
