"use client";

import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateCourte } from "@/lib/format";
import type { ExigenceVue } from "@/lib/pieces";
import { CLES_PIECES, estFournie, libelleEtat, suggestions, TYPES_PIECES, type ClePiece, type EtatPiece } from "@/lib/pieces-regles";
import { deposerPiece, exigerPieces, refuserPiece, reglerBlocagePiece, retirerPiece, validerPiece } from "./actions";
import { useActionChantier } from "./use-action-chantier";

export type Intervenant = { compteId: string; nom: string; qualite: string };

function Icone({ etat }: { etat: EtatPiece }) {
  if (estFournie(etat)) return etat.etat === "bientot" ? <Clock className="size-4 shrink-0" aria-hidden /> : <CircleCheck className="size-4 shrink-0" aria-hidden />;
  if (etat.etat === "a_valider") return <Clock className="size-4 shrink-0" aria-hidden />;
  if (etat.etat === "manquante") return <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  return <CircleAlert className="size-4 shrink-0" aria-hidden />;
}

// Le badge noir plein : ce qui attend une action. Le contour : ce qui est en ordre ou en attente.
function EtatBadge({ etat }: { etat: EtatPiece }) {
  const enOrdre = etat.etat === "valide" || etat.etat === "a_valider";
  return <Badge variant={enOrdre ? "outline" : "default"}>{libelleEtat(etat)}</Badge>;
}

function Deposer(props: { chantierId: string; x: ExigenceVue }) {
  const [ouvert, setOuvert] = useState(false);
  const { enCours, lancer } = useActionChantier();
  const t = TYPES_PIECES[props.x.type];
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>
        {props.x.piece ? "Nouvelle version" : "Déposer"}
        <span className="sr-only"> : {props.x.libelle}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.libelle}</DialogTitle>
          <DialogDescription>
            {t.validiteMois ? `Elle vaut ${t.validiteMois} mois à compter de sa date de délivrance.` : "Elle ne périme pas."} {t.niveau === "intervenant" ? "Elle servira sur tous les chantiers de cet intervenant." : ""}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            lancer(() => deposerPiece(props.chantierId, props.x.id, fd), () => setOuvert(false));
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`p-f-${props.x.id}`}>{t.fichiers === "pdf" ? "Fichier PDF" : "PDF ou photo"}, 4 Mo au plus</Label>
            <Input id={`p-f-${props.x.id}`} name="fichier" type="file" required accept={t.fichiers === "pdf" ? "application/pdf" : "application/pdf,image/jpeg,image/png,image/webp,image/heic"} />
          </div>
          {t.validiteMois !== null && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`p-d-${props.x.id}`}>Délivrée le</Label>
              <Input id={`p-d-${props.x.id}`} name="delivreeLe" type="date" required className="w-44" />
            </div>
          )}
          {props.x.type === "vigilance" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`p-c-${props.x.id}`}>Code de sécurité (facultatif)</Label>
              <Input id={`p-c-${props.x.id}`} name="codeSecurite" autoComplete="off" />
              <p className="text-xs text-muted-foreground">Imprimé en bas de l&apos;attestation : il permet d&apos;en vérifier l&apos;authenticité sur urssaf.fr.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Trancher(props: { chantierId: string; pieceId: string; libelle: string }) {
  const { enCours, lancer } = useActionChantier();
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState("");
  return refus ? (
    <span className="flex flex-wrap items-center gap-2">
      <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du refus" aria-label={`Motif du refus : ${props.libelle}`} className="h-7 w-48" autoFocus />
      <Button size="xs" variant="outline" disabled={enCours || !motif.trim()} onClick={() => lancer(() => refuserPiece(props.chantierId, props.pieceId, motif))}>
        Refuser<span className="sr-only"> : {props.libelle}</span>
      </Button>
    </span>
  ) : (
    <span className="flex flex-wrap items-center gap-2">
      <Button size="xs" disabled={enCours} onClick={() => lancer(() => validerPiece(props.chantierId, props.pieceId))}>
        Valider<span className="sr-only"> : {props.libelle}</span>
      </Button>
      <Button size="xs" variant="ghost" onClick={() => setRefus(true)}>
        Refuser…<span className="sr-only"> : {props.libelle}</span>
      </Button>
    </span>
  );
}

function LignePiece(props: { chantierId: string; x: ExigenceVue; interne: boolean; moi: string; modifiable: boolean }) {
  const { x } = props;
  const { enCours, lancer } = useActionChantier();
  const peutDeposer = props.modifiable && (props.interne || x.compteId === props.moi);
  const detail = [
    x.piece?.expireLe && `valable jusqu'au ${dateCourte(x.piece.expireLe)}`,
    x.etat.etat === "refusee" && x.etat.motif && `refusée : ${x.etat.motif}`,
    x.bloque && `bloque ${x.bloque === "demarrage" ? "le démarrage" : "la clôture"}`,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex min-w-0 items-start gap-2">
        <Icone etat={x.etat} />
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{x.libelle}</span>
          {detail.length > 0 && <span className="text-xs text-muted-foreground">{detail.join(" · ")}</span>}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        <EtatBadge etat={x.etat} />
        {x.piece && (
          <a href={`/api/pieces/${x.piece.id}`} target="_blank" rel="noopener" className="inline-flex min-h-6 items-center text-xs underline underline-offset-2">
            voir<span className="sr-only"> : {x.libelle} (nouvel onglet)</span>
          </a>
        )}
        {props.interne && x.etat.etat === "a_valider" && x.piece && <Trancher chantierId={props.chantierId} pieceId={x.piece.id} libelle={x.libelle} />}
        {peutDeposer && <Deposer chantierId={props.chantierId} x={x} />}
        {props.interne && props.modifiable && (
          <>
            <select
              aria-label={`Étape bloquée par : ${x.libelle}`}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
              value={x.bloque ?? ""}
              disabled={enCours}
              onChange={(e) => lancer(() => reglerBlocagePiece(props.chantierId, x.id, e.target.value))}
            >
              <option value="">Ne bloque rien</option>
              <option value="demarrage">Bloque le démarrage</option>
              <option value="cloture">Bloque la clôture</option>
            </select>
            <Button size="xs" variant="ghost" disabled={enCours} onClick={() => lancer(() => retirerPiece(props.chantierId, x.id))}>
              Retirer<span className="sr-only"> : {x.libelle}</span>
            </Button>
          </>
        )}
      </span>
    </li>
  );
}

function Demander(props: { chantierId: string; intervenants: Intervenant[]; exigences: ExigenceVue[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [pour, setPour] = useState<string>(props.intervenants[0]?.compteId ?? "chantier");
  const { enCours, lancer } = useActionChantier();
  const deja = new Set(props.exigences.filter((x) => (x.compteId ?? "chantier") === pour).map((x) => x.type));
  const qualite = props.intervenants.find((i) => i.compteId === pour)?.qualite ?? "";
  const proposees = pour === "chantier" ? (["doe"] as ClePiece[]) : suggestions(qualite);
  const [coches, setCoches] = useState<ClePiece[]>([]);
  const ouvrir = (qui: string) => {
    setPour(qui);
    const q = props.intervenants.find((i) => i.compteId === qui)?.qualite ?? "";
    const d = new Set(props.exigences.filter((x) => (x.compteId ?? "chantier") === qui).map((x) => x.type));
    setCoches((qui === "chantier" ? (["doe"] as ClePiece[]) : suggestions(q)).filter((t) => !d.has(t)));
  };
  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) ouvrir(pour);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Demander des pièces</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander des pièces</DialogTitle>
          <DialogDescription>groma propose les pièces habituelles selon la qualité de la personne. Cochez, décochez : c&apos;est vous qui décidez.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pieces-pour">À qui</Label>
          <select id="pieces-pour" className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={pour} onChange={(e) => ouvrir(e.target.value)}>
            {props.intervenants.map((i) => (
              <option key={i.compteId} value={i.compteId}>
                {i.nom} · {i.qualite}
              </option>
            ))}
            <option value="chantier">Le chantier (DOE, autorisations…)</option>
          </select>
        </div>
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {CLES_PIECES.map((t) => {
            const id = `demande-${t}`;
            const demandee = deja.has(t);
            return (
              <li key={t}>
                <Label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-3 font-normal">
                  <Checkbox id={id} checked={demandee || coches.includes(t)} disabled={demandee} onCheckedChange={(v) => setCoches((c) => (v ? [...c, t] : c.filter((x) => x !== t)))} />
                  <span>
                    {TYPES_PIECES[t].libelle}
                    {demandee ? <span className="text-muted-foreground"> · déjà demandée</span> : proposees.includes(t) ? <span className="text-muted-foreground"> · proposée</span> : null}
                  </span>
                </Label>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button disabled={enCours || coches.length === 0} onClick={() => lancer(() => exigerPieces(props.chantierId, pour === "chantier" ? null : pour, coches), () => setOuvert(false))}>
            {coches.length ? `Demander ${coches.length} pièce${coches.length > 1 ? "s" : ""}` : "Demander"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// La rubrique « Pièces attendues », en tête de l'onglet Documents : une ligne par intervenant,
// ses pièces fournies ou manquantes, et l'avancement.
export function PiecesAttendues(props: { chantierId: string; exigences: ExigenceVue[]; intervenants: Intervenant[]; interne: boolean; moi: string; modifiable: boolean }) {
  const fournies = props.exigences.filter((x) => estFournie(x.etat)).length;
  const groupes = new Map<string, { titre: string; liste: ExigenceVue[] }>();
  for (const x of props.exigences) {
    const cle = x.compteId ?? "chantier";
    const inter = props.intervenants.find((i) => i.compteId === x.compteId);
    const titre = x.compteId ? (props.interne ? `${x.qui ?? "Intervenant"}${inter ? ` · ${inter.qualite}` : ""}` : "Vos pièces à fournir") : "Le chantier";
    groupes.set(cle, { titre, liste: [...(groupes.get(cle)?.liste ?? []), x] });
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Pièces attendues{props.exigences.length > 0 && <span className="ml-2 normal-case tabular-nums">{fournies} sur {props.exigences.length}</span>}
        </h3>
        {props.interne && props.modifiable && <Demander chantierId={props.chantierId} intervenants={props.intervenants} exigences={props.exigences} />}
      </div>
      {props.exigences.length === 0 ? (
        <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
          {props.interne ? "Aucune pièce demandée. « Demander des pièces » propose les pièces habituelles selon la qualité de chaque intervenant." : "Aucune pièce ne vous est demandée sur ce chantier."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...groupes.entries()].map(([cle, g]) => (
            <div key={cle} className="rounded-3xl bg-card px-5 pt-4 pb-1">
              <p className="text-sm font-semibold">{g.titre}</p>
              <ul className="flex flex-col divide-y">
                {g.liste.map((x) => (
                  <LignePiece key={x.id} chantierId={props.chantierId} x={x} interne={props.interne} moi={props.moi} modifiable={props.modifiable} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
