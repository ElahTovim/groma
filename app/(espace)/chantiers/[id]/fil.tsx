"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TypeFil } from "@/lib/db/schema";
import type { ElementVu, LotVu, ParticipantVu } from "@/lib/fiche";
import { dateCourte } from "@/lib/format";
import { LIBELLE_SIGNALEMENT, LIBELLE_TYPE } from "@/lib/libelles";
import { TYPES_EXTERNE } from "@/lib/regles";
import { ecrireDansLeFil, partagerElement, qualifierSignalement } from "./actions";
import { useActionChantier } from "./use-action-chantier";

const TOUS_TYPES: TypeFil[] = ["message", "demande", "reponse", "disponibilite", "document", "signalement"];

function horodatage(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

// La fenêtre « Qui voit ça ? » : on coche, un par un, les externes qui verront l'élément.
function QuiVoit(props: { chantierId: string; element: ElementVu; externes: ParticipantVu[] }) {
  const { enCours, lancer } = useActionChantier();
  const [ouvert, setOuvert] = useState(false);
  const [coches, setCoches] = useState<string[]>(props.element.visiblePar);

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) setCoches(props.element.visiblePar);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="xs" />}>Qui voit ça ?</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qui voit ça ?</DialogTitle>
          <DialogDescription>Le gérant et l&apos;équipe voient tout. Cochez les externes qui verront cet élément.</DialogDescription>
        </DialogHeader>
        {props.externes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun externe n&apos;est invité sur ce chantier.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {props.externes.map((p) => {
              const id = `voit-${props.element.id}-${p.compteId}`;
              return (
                <li key={p.compteId} className="flex items-center gap-3">
                  <Checkbox
                    id={id}
                    checked={coches.includes(p.compteId)}
                    onCheckedChange={(v) => setCoches((c) => (v ? [...c, p.compteId] : c.filter((x) => x !== p.compteId)))}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {p.nom} <span className="text-muted-foreground">· {p.qualite}</span>
                  </Label>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button disabled={enCours} onClick={() => lancer(() => partagerElement(props.chantierId, props.element.id, coches), () => setOuvert(false))}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Qualifier(props: { chantierId: string; element: ElementVu }) {
  const { enCours, lancer } = useActionChantier();
  const [motif, setMotif] = useState("");
  const [ecarter, setEcarter] = useState(false);
  const s = props.element.statutSignalement;

  if (s === "reserve_ouverte") {
    return (
      <Button size="sm" variant="outline" disabled={enCours} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "levee", ""))}>
        Lever la réserve
      </Button>
    );
  }
  if (s !== "a_qualifier") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={enCours} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "reserve_ouverte", ""))}>
        Retenir comme réserve
      </Button>
      {ecarter ? (
        <>
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif" className="h-7 w-48" aria-label="Motif" />
          <Button size="sm" variant="outline" disabled={enCours || !motif.trim()} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "ecarte", motif))}>
            Écarter
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setEcarter(true)}>
          Écarter…
        </Button>
      )}
    </div>
  );
}

function Ecrire(props: { chantierId: string; interne: boolean; participants: ParticipantVu[]; lots: LotVu[] }) {
  const { enCours, lancer } = useActionChantier();
  const types = props.interne ? TOUS_TYPES : TYPES_EXTERNE;
  const [type, setType] = useState<TypeFil>("message");
  const [cle, setCle] = useState(0);

  return (
    <form
      key={cle}
      className="flex flex-col gap-3 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        lancer(() => ecrireDansLeFil(props.chantierId, d), () => {
          setType("message");
          setCle((c) => c + 1);
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        <select name="type" value={type} onChange={(e) => setType(e.target.value as TypeFil)} aria-label="Type" className="h-8 rounded-lg border bg-background px-2 text-sm">
          {types.map((t) => (
            <option key={t} value={t}>
              {LIBELLE_TYPE[t]}
            </option>
          ))}
        </select>
        {type === "demande" && (
          <select name="destinataireId" required aria-label="Destinataire" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue="">
            <option value="" disabled>
              À qui ?
            </option>
            {props.participants.map((p) => (
              <option key={p.compteId} value={p.compteId}>
                {p.nom} ({p.qualite})
              </option>
            ))}
          </select>
        )}
        {(type === "demande" || type === "disponibilite") && (
          <Input name="dateCible" type="date" required={type === "disponibilite"} aria-label={type === "demande" ? "Pour quand" : "Quel jour"} className="h-8 w-40" />
        )}
        {props.interne && props.lots.length > 0 && (
          <select name="lotId" aria-label="Lot concerné" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue="">
            <option value="">Tout le chantier</option>
            {props.lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        )}
      </div>
      {type === "document" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="fichier" className="text-xs text-muted-foreground">
            Fichier (PDF ou photo, 4 Mo au plus)
          </Label>
          <Input id="fichier" name="fichier" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" />
        </div>
      )}
      <Textarea
        name="texte"
        required
        placeholder={
          type === "signalement"
            ? "Décrivez l'anomalie constatée."
            : type === "document"
              ? "Titre du document : devis signé, plan, procès-verbal…"
              : type === "disponibilite"
                ? "Par exemple : présent de 8 h à 12 h."
                : "Écrire dans le fil…"
        }
      />
      <div>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Envoi…" : "Ajouter au fil"}
        </Button>
      </div>
    </form>
  );
}

export function Fil(props: { chantierId: string; interne: boolean; elements: ElementVu[]; participants: ParticipantVu[]; lots: LotVu[] }) {
  const externes = props.participants.filter((p) => p.role === "externe");
  const nomDe = new Map(props.participants.map((p) => [p.compteId, p.nom]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fil du chantier</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {props.elements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Le fil est vide. Écrivez le premier message.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {props.elements.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{LIBELLE_TYPE[e.type]}</Badge>
                  {e.statutSignalement && (
                    <Badge variant={e.statutSignalement === "a_qualifier" || e.statutSignalement === "reserve_ouverte" ? "destructive" : "secondary"}>
                      {LIBELLE_SIGNALEMENT[e.statutSignalement]}
                    </Badge>
                  )}
                  <span className="font-medium text-foreground">{e.auteur}</span>
                  <span>{horodatage(e.creeLe)}</span>
                  {e.lot && <span>· {e.lot}</span>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{e.texte}</p>
                {e.fichier && (
                  <a href={`/api/fichiers/${e.id}`} target="_blank" rel="noopener" className="w-fit text-sm underline">
                    Ouvrir {e.fichier.nom} ({Math.max(1, Math.round(e.fichier.taille / 1024))} Ko)
                  </a>
                )}
                {(e.destinataire || e.dateCible) && (
                  <p className="text-xs text-muted-foreground">
                    {e.destinataire ? `Pour ${e.destinataire}` : ""}
                    {e.destinataire && e.dateCible ? " · " : ""}
                    {e.dateCible ? (e.type === "demande" ? `à rendre le ${dateCourte(e.dateCible)}` : dateCourte(e.dateCible)) : ""}
                  </p>
                )}
                {e.motif && <p className="text-xs text-muted-foreground">Motif : {e.motif}</p>}
                {props.interne && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                    <span className="min-w-0 text-xs text-muted-foreground">
                      Vu par : équipe{e.visiblePar.length ? `, ${e.visiblePar.map((id) => nomDe.get(id) ?? "?").join(", ")}` : " seulement"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {e.type === "signalement" && <Qualifier chantierId={props.chantierId} element={e} />}
                      <QuiVoit chantierId={props.chantierId} element={e} externes={externes} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <Ecrire chantierId={props.chantierId} interne={props.interne} participants={props.participants} lots={props.lots} />
      </CardContent>
    </Card>
  );
}
