"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { autoriser, enregistrerPolitique } from "./actions";

export function Autorisation(props: { destinataire: "groma" | "entreprise"; libelle: string; detail: string; accepte: boolean; depuis: string | null }) {
  const [enCours, demarrer] = useTransition();
  const [coche, setCoche] = useState(props.accepte);
  const id = `autorisation-${props.destinataire}`;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4">
      <Label htmlFor={id} className="flex cursor-pointer items-start gap-3 font-normal">
        <Checkbox
          id={id}
          checked={coche}
          disabled={enCours}
          className="mt-0.5"
          onCheckedChange={(v) => {
            const oui = Boolean(v);
            setCoche(oui);
            demarrer(async () => {
              const r = await autoriser(props.destinataire, oui);
              if (r.ok) toast.success(r.message);
              else {
                setCoche(!oui);
                toast.error(r.erreur);
              }
            });
          }}
        />
        <span className="flex flex-col gap-1">
          <span className="font-medium">{props.libelle}</span>
          <span className="text-sm text-muted-foreground">{props.detail}</span>
        </span>
      </Label>
      {props.depuis && <p className="pl-7 text-xs text-muted-foreground">Dernière décision le {props.depuis}.</p>}
    </div>
  );
}

export function EditeurPolitique({ texte }: { texte: string }) {
  const [enCours, demarrer] = useTransition();
  const [v, setV] = useState(texte);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="politique">La politique de votre entreprise sur les données personnelles</Label>
      <Textarea id="politique" value={v} onChange={(e) => setV(e.target.value)} rows={10} maxLength={20000} placeholder={"Par exemple : quelles données vous gardez (coordonnées, documents de chantier), pourquoi (suivre les chantiers, répondre aux obligations légales), combien de temps (10 ans après la réception, pour la garantie décennale), qui y accède, et à qui écrire pour exercer ses droits."} />
      <div>
        <Button
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await enregistrerPolitique(v);
              if (r.ok) toast.success(r.message);
              else toast.error(r.erreur);
            })
          }
        >
          {enCours ? "Enregistrement…" : "Enregistrer la politique"}
        </Button>
      </div>
    </div>
  );
}
