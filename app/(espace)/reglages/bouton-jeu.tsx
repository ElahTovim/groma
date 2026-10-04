"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERSONNES } from "@/lib/jeu-de-donnees";
import { rejouerJeu, type EtatJeu } from "./actions";

export function BoutonJeu() {
  const [etat, action, enCours] = useActionState<EtatJeu, FormData>(rejouerJeu, {});

  useEffect(() => {
    if (etat.erreur) toast.error(etat.erreur);
    if (etat.message) toast.success(etat.message);
  }, [etat]);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="motDePasse">Mot de passe des comptes fictifs</Label>
          <Input id="motDePasse" name="motDePasse" type="text" autoComplete="off" minLength={8} required />
          <p className="text-xs text-muted-foreground">
            Choisissez-le maintenant : les dix comptes fictifs l&apos;auront tous. Au moins 8 caractères.
          </p>
        </div>
        <Button type="submit" variant="outline" disabled={enCours}>
          {enCours ? "Rejeu en cours…" : "Rejouer le jeu de données"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Les comptes fictifs</p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {PERSONNES.map((p) => (
            <li key={p.email} className="flex min-w-0 flex-col">
              <span>
                {p.nom} <span className="text-muted-foreground">· {p.qualite}</span>
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground">{p.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
