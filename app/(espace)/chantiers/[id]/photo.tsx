"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import { Vignette } from "@/components/vignette";
import { changerPhoto } from "./actions";
import { useActionChantier } from "./use-action-chantier";

// La photo du chantier, en bandeau. Le gérant et l'équipe peuvent la changer ;
// sans photo, un emplacement neutre garde la place.
export function PhotoChantier(props: { chantierId: string; aPhoto: boolean; nom: string; modifiable: boolean }) {
  const { enCours, lancer } = useActionChantier();
  const champ = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <Vignette chantierId={props.chantierId} aPhoto={props.aPhoto} alt={`Photo du chantier ${props.nom}`} className="aspect-[16/9] w-full rounded-3xl md:aspect-[3/1]" />
      {props.modifiable && (
        <>
          <input
            ref={champ}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            aria-label="Choisir la photo du chantier"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              const d = new FormData();
              d.set("photo", f);
              lancer(() => changerPhoto(props.chantierId, d));
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            disabled={enCours}
            onClick={() => champ.current?.click()}
            className="absolute right-4 bottom-4 flex min-h-11 items-center gap-2 rounded-full bg-background px-4 text-foreground text-sm font-semibold disabled:opacity-60"
          >
            <Camera className="size-4" aria-hidden />
            {enCours ? "Envoi…" : props.aPhoto ? "Changer la photo" : "Ajouter une photo"}
          </button>
        </>
      )}
    </div>
  );
}
