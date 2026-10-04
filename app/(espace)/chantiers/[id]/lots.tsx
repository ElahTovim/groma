"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LotVu, ParticipantVu } from "@/lib/fiche";
import { dateCourte } from "@/lib/format";
import { ACTION_LOT, LIBELLE_LOT } from "@/lib/libelles";
import { etapeSuivanteLot } from "@/lib/regles";
import { ajouterLot, avancerLot } from "./actions";
import { useActionChantier } from "./use-action-chantier";

export function Lots(props: { chantierId: string; lots: LotVu[]; participants: ParticipantVu[]; modifiable: boolean }) {
  const { enCours, lancer } = useActionChantier();
  const [ajout, setAjout] = useState(false);
  const enRetard = props.lots.filter((l) => l.enRetard).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          Lots
          {enRetard > 0 && (
            <Badge variant="destructive" className="ml-2 align-middle">
              {enRetard} en retard
            </Badge>
          )}
        </CardTitle>
        {props.modifiable && !ajout && (
          <Button variant="outline" size="sm" onClick={() => setAjout(true)}>
            Ajouter un lot
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ajout && (
          <form
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              lancer(() => ajouterLot(props.chantierId, d), () => setAjout(false));
            }}
          >
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="lot-nom">Nom du lot</Label>
              <Input id="lot-nom" name="nom" required placeholder="Carrelage, électricité, menuiseries…" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="lot-livraison">Livraison prévue</Label>
              <Input id="lot-livraison" name="livraisonPrevue" type="date" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="lot-fin">Fin prévue</Label>
              <Input id="lot-fin" name="finPrevue" type="date" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="lot-fournisseur">Fournisseur</Label>
              <select id="lot-fournisseur" name="fournisseurId" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue="">
                <option value="">Aucun pour l&apos;instant</option>
                {props.participants.map((p) => (
                  <option key={p.compteId} value={p.compteId}>
                    {p.nom} ({p.qualite})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={enCours}>
                Ajouter
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAjout(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {props.lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lot pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {props.lots.map((l) => {
              const suivant = etapeSuivanteLot(l.statut);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{l.nom}</span>
                      <Badge variant="outline">{LIBELLE_LOT[l.statut]}</Badge>
                      {l.enRetard && <Badge variant="destructive">En retard</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Livraison {dateCourte(l.livraisonPrevue)} · fin {dateCourte(l.finPrevue)}
                      {l.fournisseur ? ` · ${l.fournisseur}` : ""}
                    </span>
                  </div>
                  {props.modifiable && suivant && (
                    <Button variant="outline" size="sm" disabled={enCours} onClick={() => lancer(() => avancerLot(props.chantierId, l.id, suivant))}>
                      {ACTION_LOT[suivant]}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
