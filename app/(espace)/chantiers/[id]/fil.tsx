"use client";

import { CalendarClock, Eye, FileText, Flag, Lock, MessageSquare, Send, Users } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TypeFil } from "@/lib/db/schema";
import type { ElementVu, LotVu, ParticipantVu } from "@/lib/fiche";
import { dateCourte } from "@/lib/format";
import { LIBELLE_SIGNALEMENT, LIBELLE_TYPE } from "@/lib/libelles";
import { ecrireDansLeFil, partagerElement, qualifierSignalement } from "./actions";
import { useActionChantier } from "./use-action-chantier";

function horodatage(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

// Les gestes du fil, en boutons directs plutôt qu'une liste déroulante.
const GESTES: { type: TypeFil; libelle: string; icone: typeof Flag; interneSeulement?: boolean }[] = [
  { type: "message", libelle: "Écrire", icone: MessageSquare },
  { type: "signalement", libelle: "Signaler un problème", icone: Flag },
  { type: "document", libelle: "Joindre un document", icone: FileText },
  { type: "demande", libelle: "Demander à…", icone: Send, interneSeulement: true },
  { type: "disponibilite", libelle: "Mes disponibilités", icone: CalendarClock },
];

const ICONE_TYPE: Record<TypeFil, typeof Flag> = {
  message: MessageSquare,
  demande: Send,
  reponse: MessageSquare,
  disponibilite: CalendarClock,
  document: FileText,
  signalement: Flag,
};

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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Eye aria-hidden /> Qui voit ça ?
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qui voit ça ?</DialogTitle>
          <DialogDescription>Le gérant et l&apos;équipe voient tout. Cochez les externes qui verront cet élément.</DialogDescription>
        </DialogHeader>
        {props.externes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun externe n&apos;est invité sur ce chantier.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {props.externes.map((p) => {
              const id = `voit-${props.element.id}-${p.compteId}`;
              return (
                <li key={p.compteId}>
                  <Label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 font-normal">
                    <Checkbox
                      id={id}
                      checked={coches.includes(p.compteId)}
                      onCheckedChange={(v) => setCoches((c) => (v ? [...c, p.compteId] : c.filter((x) => x !== p.compteId)))}
                    />
                    <span>
                      {p.nom} <span className="text-muted-foreground">· {p.qualite}</span>
                    </span>
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
      <Button variant="outline" disabled={enCours} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "levee", ""))}>
        Lever la réserve
      </Button>
    );
  }
  if (s !== "a_qualifier") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={enCours} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "reserve_ouverte", ""))}>
        Retenir comme réserve
      </Button>
      {ecarter ? (
        <>
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif" className="w-48" aria-label="Motif" />
          <Button variant="outline" disabled={enCours || !motif.trim()} onClick={() => lancer(() => qualifierSignalement(props.chantierId, props.element.id, "ecarte", motif))}>
            Écarter
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setEcarter(true)}>
          Écarter…
        </Button>
      )}
    </div>
  );
}

const AIDE: Record<TypeFil, string> = {
  message: "Écrire dans le fil…",
  signalement: "Décrivez le problème constaté : où, quoi.",
  document: "Titre du document : devis signé, plan, procès-verbal…",
  demande: "Ce que vous demandez.",
  disponibilite: "Par exemple : présent de 8 h à 12 h.",
  reponse: "Votre réponse.",
};

function Ecrire(props: { chantierId: string; interne: boolean; participants: ParticipantVu[]; lots: LotVu[] }) {
  const { enCours, lancer } = useActionChantier();
  const [type, setType] = useState<TypeFil>("message");
  const [cle, setCle] = useState(0);
  const gestes = GESTES.filter((g) => props.interne || !g.interneSeulement);

  return (
    <div className="flex flex-col gap-3 border border-foreground/20 p-3">
      {!props.interne && (
        <p className="text-sm">
          Vous pouvez écrire à l&apos;équipe, <strong>signaler un problème</strong>, joindre un document ou <strong>donner vos disponibilités</strong>. Seule l&apos;équipe voit ce que vous écrivez.
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type d'élément">
        {gestes.map(({ type: t, libelle, icone: Icone }) => (
          <Button key={t} type="button" variant={type === t ? "default" : "outline"} aria-pressed={type === t} onClick={() => setType(t)}>
            <Icone aria-hidden /> {libelle}
          </Button>
        ))}
      </div>
      <form
        key={cle}
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          d.set("type", type);
          lancer(() => ecrireDansLeFil(props.chantierId, d), () => {
            setType("message");
            setCle((c) => c + 1);
          });
        }}
      >
        <div className="flex flex-wrap gap-2">
          {type === "demande" && (
            <select name="destinataireId" required aria-label="Destinataire" className="h-8 rounded-md border bg-background px-2 text-sm" defaultValue="">
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
            <Input name="dateCible" type="date" required={type === "disponibilite"} aria-label={type === "demande" ? "Pour quand" : "Quel jour"} className="w-40" />
          )}
          {props.interne && props.lots.length > 0 && (
            <select name="lotId" aria-label="Lot concerné" className="h-8 rounded-md border bg-background px-2 text-sm" defaultValue="">
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
              Fichier : PDF ou photo, 4 Mo au plus
            </Label>
            <Input id="fichier" name="fichier" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" />
          </div>
        )}
        <Textarea name="texte" required placeholder={AIDE[type]} />
        <div>
          <Button type="submit" size="lg" disabled={enCours}>
            {enCours ? "Envoi…" : "Ajouter au fil"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function Fil(props: { chantierId: string; interne: boolean; elements: ElementVu[]; participants: ParticipantVu[]; lots: LotVu[] }) {
  const externes = props.participants.filter((p) => p.role === "externe");
  const nomDe = new Map(props.participants.map((p) => [p.compteId, p.nom]));

  return (
    <Section titre="Fil du chantier">
      {props.elements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Le fil est vide. Écrivez le premier message.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {props.elements.map((e) => {
            const Icone = ICONE_TYPE[e.type];
            const enAttente = e.statutSignalement === "a_qualifier" || e.statutSignalement === "reserve_ouverte";
            const estImage = e.fichier?.type.startsWith("image/");
            return (
              <li key={e.id} className={enAttente ? "flex flex-col gap-2 border-2 border-foreground p-3" : "flex flex-col gap-2 border border-foreground/20 p-3"}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Icone className="size-3.5" aria-hidden /> {LIBELLE_TYPE[e.type]}
                  </span>
                  {e.statutSignalement && (
                    <Badge variant={enAttente ? "default" : "secondary"}>{LIBELLE_SIGNALEMENT[e.statutSignalement]}</Badge>
                  )}
                  <span className="text-foreground">{e.auteur}</span>
                  <span>{horodatage(e.creeLe)}</span>
                  {e.lot && <span>· {e.lot}</span>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{e.texte}</p>
                {e.fichier &&
                  (estImage ? (
                    <a href={`/api/fichiers/${e.id}`} target="_blank" rel="noopener" className="block w-fit">
                      {/* eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits */}
                      <img src={`/api/fichiers/${e.id}`} alt={e.texte} loading="lazy" className="max-h-64 max-w-full border border-foreground/20 object-contain" />
                    </a>
                  ) : (
                    <a href={`/api/fichiers/${e.id}`} target="_blank" rel="noopener" className="flex w-fit items-center gap-2 text-sm underline">
                      <FileText className="size-4" aria-hidden /> {e.fichier.nom} ({Math.max(1, Math.round(e.fichier.taille / 1024))} Ko)
                    </a>
                  ))}
                {(e.destinataire || e.dateCible) && (
                  <p className="text-xs text-muted-foreground">
                    {e.destinataire ? `Pour ${e.destinataire}` : ""}
                    {e.destinataire && e.dateCible ? " · " : ""}
                    {e.dateCible ? (e.type === "demande" ? `à rendre le ${dateCourte(e.dateCible)}` : dateCourte(e.dateCible)) : ""}
                  </p>
                )}
                {e.motif && <p className="text-xs text-muted-foreground">Motif : {e.motif}</p>}
                {props.interne && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 pt-2">
                    {/* Qui voit cet élément, dit en clair : c'est le cœur de « Qui voit ça ? ». */}
                    {e.visiblePar.length === 0 ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Lock className="size-3.5" aria-hidden /> Interne
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                        <Users className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">Partagé avec {e.visiblePar.map((id) => nomDe.get(id) ?? "?").join(", ")}</span>
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {e.type === "signalement" && <Qualifier chantierId={props.chantierId} element={e} />}
                      <QuiVoit chantierId={props.chantierId} element={e} externes={externes} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <Ecrire chantierId={props.chantierId} interne={props.interne} participants={props.participants} lots={props.lots} />
    </Section>
  );
}
