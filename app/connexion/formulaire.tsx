"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seConnecter, type EtatConnexion } from "./actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(seConnecter, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <Alert variant="destructive">
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Adresse courriel</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
