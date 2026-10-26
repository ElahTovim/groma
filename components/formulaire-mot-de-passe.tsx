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
  // À la création d'un compte : les deux autorisations (RGPD), décochées par défaut.
  autorisations?: { entreprise: string };
}) {
  const [etat, action, enCours] = useActionState<Etat, FormData>(
    props.action,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <Alert variant="destructive" id="erreur-formulaire">
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}
      {props.avecNom && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="nom">Votre nom</Label>
          <Input
            aria-invalid={etat.erreur ? true : undefined}
            aria-describedby={etat.erreur ? "erreur-formulaire" : undefined}
            id="nom"
            name="nom"
            autoComplete="name"
            required
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input
          aria-invalid={etat.erreur ? true : undefined}
          aria-describedby={
            etat.erreur ? "aide-mdp erreur-formulaire" : "aide-mdp"
          }
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          minLength={MOT_DE_PASSE_MIN}
          required
        />
        <p id="aide-mdp" className="text-xs text-muted-foreground">
          Au moins {MOT_DE_PASSE_MIN} caractères.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation">Mot de passe, une seconde fois</Label>
        <Input
          aria-invalid={etat.erreur ? true : undefined}
          aria-describedby={etat.erreur ? "erreur-formulaire" : undefined}
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {props.autorisations && (
        <fieldset className="flex flex-col gap-3 rounded-xl border p-3">
          <legend className="px-1 text-sm font-medium">Vos données</legend>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="autorisationGroma" className="mt-0.5 size-4 accent-foreground" />
            <span>J&apos;autorise groma, l&apos;éditeur du logiciel, à traiter mes données pour faire fonctionner le service.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="autorisationEntreprise" className="mt-0.5 size-4 accent-foreground" />
            <span>J&apos;autorise {props.autorisations.entreprise} à utiliser mes données pour suivre les chantiers où j&apos;interviens.</span>
          </label>
          <p className="text-xs text-muted-foreground">Vous pourrez les retirer à tout moment, et exporter vos données, dans « Mes données ».</p>
        </fieldset>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Un instant…" : props.bouton}
      </Button>
    </form>
  );
}
