"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DELAI_FOURNISSEUR_MAX_JOURS } from "@/lib/distances-regles";
import { fixerDelaiFournisseur } from "./livraisons-actions";
import { useActionChantier } from "./use-action-chantier";

// Le délai du fournisseur d'un lot, modifiable sur place. Le serveur revérifie tout.
export function DelaiFournisseur(props: { chantierId: string; lotId: string; lot: string; delai: number | null; modifiable: boolean }) {
  const { enCours, lancer } = useActionChantier();
  const [edition, setEdition] = useState(false);
  const texte = props.delai === null ? "à indiquer" : `${props.delai} jour${props.delai > 1 ? "s" : ""} ouvré${props.delai > 1 ? "s" : ""}`;

  if (!edition) {
    return (
      <span className="flex flex-wrap items-center gap-x-2">
        <span>{texte}</span>
        {props.modifiable && (
          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setEdition(true)}>
            {props.delai === null ? "Indiquer" : "Modifier"}
          </Button>
        )}
      </span>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const valeur = String(new FormData(e.currentTarget).get("delai") ?? "");
        lancer(() => fixerDelaiFournisseur(props.chantierId, props.lotId, valeur), () => setEdition(false));
      }}
    >
      <Input
        name="delai"
        type="number"
        inputMode="numeric"
        min={0}
        max={DELAI_FOURNISSEUR_MAX_JOURS}
        defaultValue={props.delai ?? ""}
        aria-label={`Délai du fournisseur pour ${props.lot}, en jours ouvrés`}
        className="w-20"
        autoFocus
      />
      <span className="text-sm text-muted-foreground">jours</span>
      <Button type="submit" size="sm" disabled={enCours}>
        {enCours ? "…" : "OK"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(false)}>
        Annuler
      </Button>
    </form>
  );
}
