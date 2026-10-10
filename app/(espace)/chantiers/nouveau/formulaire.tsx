"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerChantier, type EtatNouveauChantier } from "./actions";
import { ChampsAdresse } from "./adresse";

function Champ(props: {
  id: string;
  label: string;
  aide?: string;
  defaut?: string;
  requis?: boolean;
  type?: string;
  inputMode?: "numeric" | "decimal";
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.id}>
        {props.label}
        {props.requis ? "" : <span className="font-normal text-muted-foreground"> (facultatif)</span>}
      </Label>
      <Input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        required={props.requis}
        defaultValue={props.defaut}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
      />
      {props.aide && <p className="text-xs text-muted-foreground">{props.aide}</p>}
    </div>
  );
}

export function FormulaireNouveauChantier() {
  const [etat, action, enCours] = useActionState<EtatNouveauChantier, FormData>(creerChantier, {});
  const v = etat.champs ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <Alert variant="destructive">
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}
      <Champ id="nom" label="Nom du chantier" requis defaut={v.nom} aide="Par exemple : Rénovation salle de bain." />
      <Champ id="client" label="Client" requis defaut={v.client} />
      <ChampsAdresse defauts={v} />
      <Champ id="montantHt" label="Montant du devis HT, en euros" defaut={v.montantHt} inputMode="decimal" aide="Interne : jamais montré aux externes." />
      <Champ id="debutPrevu" label="Début prévu" type="date" defaut={v.debutPrevu} />
      <Button type="submit" size="lg" disabled={enCours} className="mt-2">
        {enCours ? "Création…" : "Créer le chantier"}
      </Button>
    </form>
  );
}
