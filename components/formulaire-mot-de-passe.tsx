"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOT_DE_PASSE_MIN } from "@/lib/installation";

type Etat = { erreur?: string };

// Le formulaire commun à « accepter une invitation » et « nouveau mot de passe ».
export function FormulaireMotDePasse(props: {
  action: (etat: Etat, formData: FormData) => Promise<Etat>;
  avecNom: boolean;
  bouton: string;
}) {
  const [etat, action, enCours] = useActionState<Etat, FormData>(props.action, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <Alert variant="destructive">
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}
      {props.avecNom && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="nom">Votre nom</Label>
          <Input id="nom" name="nom" autoComplete="name" required />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" minLength={MOT_DE_PASSE_MIN} required />
        <p className="text-xs text-muted-foreground">Au moins {MOT_DE_PASSE_MIN} caractères.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation">Mot de passe, une seconde fois</Label>
        <Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required />
      </div>
      <Button type="submit" disabled={enCours}>
        {enCours ? "Un instant…" : props.bouton}
      </Button>
    </form>
  );
}
