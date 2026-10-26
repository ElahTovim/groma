"use client";

import { useParams } from "next/navigation";
import { PageGlissante, PhotoPartagee } from "@/components/transitions";
import { Skeleton } from "@/components/ui/skeleton";
import { Vignette } from "@/components/vignette";

// Pendant le chargement de la fiche, la photo du chantier est déjà là, à sa place de
// bandeau : c'est elle qui fait le lien avec la carte touchée (elle s'y agrandit).
export default function Chargement() {
  const { id } = useParams<{ id: string }>();
  return (
    <PageGlissante>
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement du chantier">
        <Skeleton className="h-5 w-28" />
        <PhotoPartagee chantierId={id}>
          <Vignette chantierId={id} aPhoto alt="" className="aspect-[16/9] w-full rounded-3xl md:aspect-[3/1]" />
        </PhotoPartagee>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </PageGlissante>
  );
}
