"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateCourte } from "@/lib/format";
import { libelleEtat, VIGILANCE, type EtatAttestation } from "@/lib/vigilance-regles";
import { deposerAttestation, exigerVigilance } from "./actions";
import { useActionChantier } from "./use-action-chantier";

export type VigilanceAffichee = {
  exigee: boolean;
  etat: EtatAttestation;
  attestation: { id: string; delivreeLe: string; codeSecurite: string | null } | null;
  entrepriseVerifiee: boolean;
};

function EtatBadge({ etat }: { etat: EtatAttestation }) {
  return etat.etat === "a_jour" ? <Badge variant="outline">À jour</Badge> : <Badge>{libelleEtat(etat)}</Badge>;
}

function Deposer(props: { chantierId: string; compteId: string; libelle: string }) {
  const [ouvert, setOuvert] = useState(false);
  const { enCours, lancer } = useActionChantier();
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>{props.libelle}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attestation de vigilance URSSAF</DialogTitle>
          <DialogDescription>
            Le PDF tel que délivré sur urssaf.fr. Il vaut {VIGILANCE.validiteMois} mois à compter de sa date de délivrance.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            lancer(() => deposerAttestation(props.chantierId, props.compteId, fd), () => setOuvert(false));
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`att-f-${props.compteId}`}>Fichier PDF</Label>
            <Input id={`att-f-${props.compteId}`} name="fichier" type="file" accept="application/pdf" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`att-d-${props.compteId}`}>Délivrée le</Label>
            <Input id={`att-d-${props.compteId}`} name="delivreeLe" type="date" required className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`att-c-${props.compteId}`}>Code de sécurité (facultatif)</Label>
            <Input id={`att-c-${props.compteId}`} name="codeSecurite" autoComplete="off" />
            <p className="text-xs text-muted-foreground">Imprimé en bas de l&apos;attestation : il permet d&apos;en vérifier l&apos;authenticité sur urssaf.fr.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi…" : "Enregistrer l'attestation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ v }: { v: VigilanceAffichee }) {
  if (!v.attestation) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Délivrée le {dateCourte(v.attestation.delivreeLe)}
      {"expireLe" in v.etat && `, valable jusqu'au ${dateCourte(v.etat.expireLe)}`} ·{" "}
      <a href={`/api/attestations/${v.attestation.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">
        voir
      </a>
    </span>
  );
}

// Dans la liste des participants (équipe) : exiger l'attestation, voir son état, la déposer.
export function VigilanceParticipant(props: { chantierId: string; compteId: string; v: VigilanceAffichee; modifiable: boolean }) {
  const { enCours, lancer } = useActionChantier();
  const id = `vig-${props.compteId}`;
  return (
    <div className="flex flex-col gap-1">
      {props.modifiable ? (
        <Label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs font-normal text-muted-foreground">
          <Checkbox id={id} checked={props.v.exigee} disabled={enCours} onCheckedChange={(c) => lancer(() => exigerVigilance(props.chantierId, props.compteId, Boolean(c)))} />
          Sous-traitant, contrat ≥ {VIGILANCE.seuilEurosHt.toLocaleString("fr-FR")} € HT : attestation exigée
        </Label>
      ) : (
        props.v.exigee && <span className="text-xs text-muted-foreground">Attestation de vigilance exigée</span>
      )}
      {props.v.exigee && (
        <span className="flex flex-wrap items-center gap-2">
          <EtatBadge etat={props.v.etat} />
          {props.v.entrepriseVerifiee ? (
            props.modifiable && <Deposer chantierId={props.chantierId} compteId={props.compteId} libelle={props.v.attestation ? "Nouvelle attestation" : "Déposer"} />
          ) : (
            <span className="text-xs text-muted-foreground">Vérifiez d&apos;abord son entreprise.</span>
          )}
        </span>
      )}
      {props.v.exigee && <Detail v={props.v} />}
    </div>
  );
}

// Pour le sous-traitant lui-même, sur la fiche du chantier.
export function MaVigilance(props: { chantierId: string; moi: string; v: VigilanceAffichee }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t border-foreground/15 pt-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Votre attestation de vigilance</h2>
        <EtatBadge etat={props.v.etat} />
      </div>
      <p className="text-sm text-muted-foreground">
        Pour ce chantier, l&apos;entreprise doit avoir votre attestation de vigilance URSSAF, renouvelée tous les {VIGILANCE.validiteMois} mois. Téléchargez-la sur urssaf.fr, puis déposez-la ici.
      </p>
      <Detail v={props.v} />
      {props.v.entrepriseVerifiee ? (
        <div>
          <Deposer chantierId={props.chantierId} compteId={props.moi} libelle={props.v.attestation ? "Déposer une attestation plus récente" : "Déposer mon attestation"} />
        </div>
      ) : (
        <p className="text-sm">Votre entreprise n&apos;est pas encore vérifiée : l&apos;équipe s&apos;en charge, puis vous pourrez déposer l&apos;attestation.</p>
      )}
    </section>
  );
}
