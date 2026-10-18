"use client";

import { useState } from "react";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateCourte } from "@/lib/format";
import { garanties } from "@/lib/reception-regles";
import { preparerPv, signerPv } from "./actions";
import { useActionChantier } from "./use-action-chantier";

export type PvAffiche = {
  dateReception: string;
  reserves: { texte: string }[];
  observations: string | null;
  signataireId: string;
  signataire: string;
  signeLe: string | null;
  signeNom: string | null;
};

function heure(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
}

function Reserves({ reserves }: { reserves: { texte: string }[] }) {
  if (reserves.length === 0) return <p className="text-sm">Sans réserve.</p>;
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
      {reserves.map((r, i) => (
        <li key={i}>{r.texte}</li>
      ))}
    </ol>
  );
}

function Garanties({ dateReception }: { dateReception: string }) {
  const g = garanties(dateReception);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Parfait achèvement</dt>
      <dd className="tabular-nums">jusqu&apos;au {dateCourte(g.parfaitAchevement)}</dd>
      <dt className="text-muted-foreground">Biennale</dt>
      <dd className="tabular-nums">jusqu&apos;au {dateCourte(g.biennale)}</dd>
      <dt className="text-muted-foreground">Décennale</dt>
      <dd className="tabular-nums">jusqu&apos;au {dateCourte(g.decennale)}</dd>
    </dl>
  );
}

// Le PV de réception sur la fiche : l'équipe le prépare, le maître d'ouvrage le signe.
export function Reception(props: {
  chantierId: string;
  moi: string;
  interne: boolean;
  enReception: boolean;
  pv: PvAffiche | null;
  // Pour préparer : les réserves ouvertes maintenant, et les externes qui peuvent signer.
  reservesOuvertes: { texte: string }[];
  externes: { compteId: string; nom: string; qualite: string }[];
  aujourdhui: string;
}) {
  const { pv } = props;
  const { enCours, lancer } = useActionChantier();
  const [modifier, setModifier] = useState(false);
  const [accepte, setAccepte] = useState(false);
  const lienPdf = `/api/pv/${props.chantierId}`;

  // Signé : le PV ne bouge plus.
  if (pv?.signeLe) {
    return (
      <Section carte titre="Réception" action={<a href={lienPdf} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>Ouvrir le PV</a>}>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>PV signé</Badge> par {pv.signeNom}, le {heure(pv.signeLe)}
        </p>
        <p className="text-sm">Réception du {dateCourte(pv.dateReception)}, {pv.reserves.length ? `avec ${pv.reserves.length} réserve${pv.reserves.length > 1 ? "s" : ""}` : "sans réserve"}.</p>
        <Garanties dateReception={pv.dateReception} />
      </Section>
    );
  }

  // Le maître d'ouvrage désigné : relire, puis signer.
  if (pv && pv.signataireId === props.moi) {
    return (
      <Section carte titre="PV de réception à signer" action={<a href={lienPdf} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>Lire le PV</a>}>
        <p className="text-sm">
          Réception des travaux à la date du <strong>{dateCourte(pv.dateReception)}</strong>, {pv.reserves.length ? "avec les réserves suivantes :" : "sans réserve."}
        </p>
        {pv.reserves.length > 0 && <Reserves reserves={pv.reserves} />}
        {pv.observations && <p className="text-sm text-muted-foreground">Observations : {pv.observations}</p>}
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const nom = String(new FormData(e.currentTarget).get("nom") ?? "");
            lancer(() => signerPv(props.chantierId, { nom, accepte }));
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pv-nom">Votre nom complet</Label>
            <Input id="pv-nom" name="nom" required autoComplete="name" />
          </div>
          <Label htmlFor="pv-accepte" className="flex min-h-11 cursor-pointer items-start gap-3 font-normal">
            <Checkbox id="pv-accepte" checked={accepte} onCheckedChange={(v) => setAccepte(Boolean(v))} className="mt-0.5" />
            <span>Je déclare recevoir les travaux à cette date, {pv.reserves.length ? "avec les réserves listées ci-dessus" : "sans réserve"}. Cette signature fait partir les garanties.</span>
          </Label>
          <Button type="submit" size="lg" disabled={enCours || !accepte} className="self-start">
            {enCours ? "Signature…" : "Signer le PV"}
          </Button>
        </form>
      </Section>
    );
  }

  if (!props.interne) return null;

  // L'équipe : en attente de signature, ou à préparer.
  const formulaire = (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        lancer(() => preparerPv(props.chantierId, { dateReception: d.dateReception, signataireId: d.signataireId, observations: d.observations }), () => setModifier(false));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pv-date">Date de réception</Label>
          <Input id="pv-date" name="dateReception" type="date" required max={props.aujourdhui} defaultValue={pv?.dateReception ?? props.aujourdhui} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pv-signataire">Signataire (maître d&apos;ouvrage)</Label>
          <select id="pv-signataire" name="signataireId" required className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue={pv?.signataireId ?? ""}>
            <option value="" disabled>
              Choisir…
            </option>
            {props.externes.map((p) => (
              <option key={p.compteId} value={p.compteId}>
                {p.nom} · {p.qualite}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Réserves reprises dans le PV</span>
        <Reserves reserves={props.reservesOuvertes} />
        <p className="text-xs text-muted-foreground">Ce sont les réserves ouvertes du fil. Pour en ajouter une, qualifiez un signalement en réserve.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pv-obs">Observations (facultatif)</Label>
        <Textarea id="pv-obs" name="observations" defaultValue={pv?.observations ?? ""} maxLength={2000} />
      </div>
      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Envoi…" : pv ? "Mettre à jour et renvoyer" : "Préparer le PV et l'envoyer au signataire"}
      </Button>
    </form>
  );

  if (pv && !modifier) {
    return (
      <Section carte titre="Réception" action={<a href={lienPdf} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>Ouvrir le PV</a>}>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">En attente de signature</Badge> de {pv.signataire}
        </p>
        <p className="text-sm">Réception du {dateCourte(pv.dateReception)}, {pv.reserves.length ? `avec ${pv.reserves.length} réserve${pv.reserves.length > 1 ? "s" : ""}` : "sans réserve"}.</p>
        {props.enReception && (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setModifier(true)}>
            Modifier le PV
          </Button>
        )}
      </Section>
    );
  }

  if (!props.enReception) return null;
  return (
    <Section carte titre="Réception">
      {props.externes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Invitez d&apos;abord le maître d&apos;ouvrage (le client) sur ce chantier : c&apos;est lui qui signera le PV.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Le PV de réception fait partir les garanties. Le client le signe depuis son compte ; le chantier ne peut pas être clos avant.</p>
          {formulaire}
        </>
      )}
    </Section>
  );
}
