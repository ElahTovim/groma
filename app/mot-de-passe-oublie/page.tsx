"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demanderReinitialisation, type EtatOubli } from "./actions";

export default function MotDePasseOublie() {
  const [etat, action, enCours] = useActionState<EtatOubli, FormData>(demanderReinitialisation, {});

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {etat.envoye ? (
            <Alert>
              <AlertDescription>Si un compte existe pour cette adresse, un courriel vient de partir. Le lien est valable une heure.</AlertDescription>
            </Alert>
          ) : (
            <form action={action} className="flex flex-col gap-4">
              {etat.erreur && <p className="text-sm text-destructive">{etat.erreur}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Adresse courriel</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button type="submit" disabled={enCours}>
                {enCours ? "Envoi…" : "Recevoir le lien"}
              </Button>
            </form>
          )}
          <Link href="/connexion" className="text-sm underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
