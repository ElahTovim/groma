"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ChampsAdresse } from "@/app/(espace)/chantiers/nouveau/adresse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enregistrerProfil, type EtatJeu } from "./actions";

// Le profil de l'entreprise : son nom (sur les PV) et son dépôt (départ des trajets).
export function FormulaireProfil(props: { nom: string; depot: { adresse: string; codePostal: string; ville: string } | null; geolocalise: boolean }) {
  const [etat, action, enCours] = useActionState<EtatJeu, FormData>(enregistrerProfil, {});
  useEffect(() => {
    if (etat.erreur) toast.error(etat.erreur);
    if (etat.message) toast.success(etat.message, { duration: 8000 });
  }, [etat]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profil-nom">Nom de l&apos;entreprise</Label>
        <Input id="profil-nom" name="nom" required defaultValue={props.nom} autoComplete="organization" />
        <p className="text-xs text-muted-foreground">Imprimé sur les PV de réception.</p>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Adresse du dépôt</legend>
        <ChampsAdresse defauts={{ adresse: props.depot?.adresse, codePostal: props.depot?.codePostal, ville: props.depot?.ville }} />
        <p className="text-xs text-muted-foreground">
          Le point de départ de l&apos;équipe : groma en calcule le temps de route vers chaque chantier et la zone de déplacement.
          {props.depot && !props.geolocalise && " L'adresse actuelle n'a pas été trouvée sur la carte : vérifiez-la."}
        </p>
      </fieldset>
      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
