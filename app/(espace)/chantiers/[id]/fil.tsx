"use client";

import { CalendarClock, Check, ClipboardCheck, Eye, FileText, Flag, ImageIcon, Lock, Mail, MessageSquare, Plus, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { bandeDesJours, compteurs, dansOnglet, GESTE_PAR_DEFAUT, gestesDe, ONGLETS_FIL, TITRE_ONGLET, type Compteur, type OngletFil } from "@/lib/fil-onglets";
import { LIBELLE_SIGNALEMENT, LIBELLE_TYPE } from "@/lib/libelles";
import type { ExigenceVue } from "@/lib/pieces";
import { estFournie } from "@/lib/pieces-regles";
import { cn } from "@/lib/utils";
import { PiecesAttendues, type Intervenant } from "./pieces";
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

// Le titre du formulaire suit l'onglet ouvert, le bouton suit le geste choisi.
const TITRE_ECRIRE: Record<OngletFil, string> = {
  fil: "Écrire dans le fil",
  documents: "Déposer un document",
  demandes: "Demander ou proposer une dispo",
  signalements: "Signaler un problème",
};

const ENVOYER: Record<TypeFil, string> = {
  message: "Envoyer",
  signalement: "Signaler",
  document: "Déposer le document",
  demande: "Envoyer la demande",
  disponibilite: "Donner ma dispo",
  reponse: "Répondre",
};

function Ecrire(props: { chantierId: string; interne: boolean; participants: ParticipantVu[]; lots: LotVu[]; onglet: OngletFil }) {
  const { enCours, lancer } = useActionChantier();
  const gestes = GESTES.filter((g) => (props.interne || !g.interneSeulement) && gestesDe(props.onglet, [g.type]).length > 0);
  const parDefaut = gestes.some((g) => g.type === GESTE_PAR_DEFAUT[props.onglet]) ? GESTE_PAR_DEFAUT[props.onglet] : (gestes[0]?.type ?? "message");
  const [type, setType] = useState<TypeFil>(parDefaut);
  const [cle, setCle] = useState(0);
  // Un externe, dans Demandes et dispos, ne peut que donner ses disponibilités : le titre le dit.
  const titre = props.onglet === "demandes" && !props.interne ? "Donner mes disponibilités" : TITRE_ECRIRE[props.onglet];

  return (
    <section id="ecrire-fil" aria-labelledby="ecrire-fil-titre" className="flex scroll-mt-32 flex-col gap-4 rounded-3xl bg-card p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h3 id="ecrire-fil-titre" className="font-display text-lg font-bold tracking-tight">
          {titre}
        </h3>
        {!props.interne &&
          (props.onglet === "fil" ? (
            <p className="text-sm">
              Vous pouvez écrire à l&apos;équipe, <strong>signaler un problème</strong>, joindre un document ou <strong>donner vos disponibilités</strong>. Seule l&apos;équipe voit ce que vous écrivez.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Seule l&apos;équipe voit ce que vous envoyez.</p>
          ))}
      </div>
      {/* Un seul geste possible dans l'onglet : le titre suffit, pas de choix à faire. */}
      {gestes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type d'élément">
          {gestes.map(({ type: t, libelle, icone: Icone }) => (
            <Button key={t} type="button" variant={type === t ? "default" : "outline"} aria-pressed={type === t} onClick={() => setType(t)}>
              <Icone aria-hidden /> {libelle}
            </Button>
          ))}
        </div>
      )}
      <form
        key={cle}
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          d.set("type", type);
          lancer(() => ecrireDansLeFil(props.chantierId, d), () => {
            setType(parDefaut);
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
        <Textarea name="texte" required placeholder={AIDE[type]} aria-label={type === "document" ? "Titre du document" : "Texte"} />
        {/* Sur téléphone, le bouton prend toute la largeur, en bas du formulaire, sous le pouce. */}
        <Button type="submit" size="lg" disabled={enCours} className="h-12 w-full text-base md:h-10 md:w-fit md:text-sm">
          {enCours ? "Envoi…" : ENVOYER[type]}
        </Button>
      </form>
    </section>
  );
}

// Le fil montre les derniers éléments ; les plus anciens se déplient à la demande.
// Un signalement en attente reste toujours visible, quel que soit son âge.
const DERNIERS_VISIBLES = 5;

function enAttenteDe(e: ElementVu) {
  return e.statutSignalement === "a_qualifier" || e.statutSignalement === "reserve_ouverte";
}

// Ce que l'onglet Documents rassemble en plus du fil : chacun reste à sa place, rien n'est copié.
export type DossierFiche = {
  pv: { lien: string; signeLe: string | null; dateReception: string; reserves: number } | null;
  courriers: { id: string; titre: string; date: string; origine: string }[];
  // Les pièces attendues (lib/pieces.ts) : pour un externe, seulement les siennes.
  pieces: { exigences: ExigenceVue[]; intervenants: Intervenant[]; moi: string; modifiable: boolean };
};

function CarteElement(props: { chantierId: string; e: ElementVu; interne: boolean; externes: ParticipantVu[]; nomDe: Map<string, string> }) {
  const { e } = props;
  const Icone = ICONE_TYPE[e.type];
  const enAttente = enAttenteDe(e);
  const estImage = e.fichier?.type.startsWith("image/");
  return (
    <li id={`fil-${e.id}`} className={enAttente ? "flex scroll-mt-24 flex-col gap-2 rounded-3xl bg-card p-5 ring-2 ring-foreground" : "flex scroll-mt-24 flex-col gap-2 rounded-3xl bg-card p-5"}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <Icone className="size-3.5" aria-hidden /> {LIBELLE_TYPE[e.type]}
        </span>
        {e.statutSignalement && <Badge variant={enAttente ? "default" : "secondary"}>{LIBELLE_SIGNALEMENT[e.statutSignalement]}</Badge>}
        <span className="text-foreground">{e.auteur}</span>
        <span>{horodatage(e.creeLe)}</span>
        {e.lot && <span>· {e.lot}</span>}
      </div>
      <p className="whitespace-pre-wrap">{e.texte}</p>
      {e.fichier &&
        (estImage ? (
          <a href={`/api/fichiers/${e.id}`} target="_blank" rel="noopener" className="block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits */}
            <img src={`/api/fichiers/${e.id}`} alt={e.texte} loading="lazy" className="max-h-64 max-w-full rounded-2xl object-contain" />
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <VuPar e={e} nomDe={props.nomDe} />
          <div className="flex flex-wrap items-center gap-2">
            {e.type === "signalement" && <Qualifier chantierId={props.chantierId} element={e} />}
            <QuiVoit chantierId={props.chantierId} element={e} externes={props.externes} />
          </div>
        </div>
      )}
    </li>
  );
}

// Qui voit cet élément, dit en clair : c'est le cœur de « Qui voit ça ? ».
function VuPar({ e, nomDe }: { e: ElementVu; nomDe: Map<string, string> }) {
  return e.visiblePar.length === 0 ? (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
      <Lock className="size-3.5 shrink-0" aria-hidden /> Vu par : l&apos;équipe seulement
    </span>
  ) : (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
      <Users className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">Vu par : l&apos;équipe · {e.visiblePar.map((id) => nomDe.get(id) ?? "?").join(", ")}</span>
    </span>
  );
}

// Le dossier : chaque rubrique est un tiroir, titre discret en petites capitales,
// puis ses lignes. Une rubrique vide dit quoi faire pour la remplir.
function Rubrique(props: { titre: string; nombre: number; vide?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col px-5 py-4 md:px-6">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {props.titre}
          {props.nombre > 0 && <span className="tabular-nums"> · {props.nombre}</span>}
        </h3>
        {props.action}
      </div>
      {props.nombre === 0 ? <p className="py-2 text-sm text-muted-foreground">{props.vide}</p> : <ul className="flex flex-col divide-y">{props.children}</ul>}
    </section>
  );
}

// L'état d'une pièce, sans couleur : en noir plein, ce qui attend un geste (à signer,
// expirée) ; en contour avec une coche, ce qui est en règle (signé, à jour).
function Etat(props: { aFaire: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap",
        props.aFaire ? "border-foreground bg-foreground text-background" : "border-foreground/40",
      )}
    >
      {!props.aFaire && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      {props.children}
    </span>
  );
}

// Interne ou partagé : une information, pas un état à traiter. Du texte, sans cadre.
function Diffusion({ visiblePar, nomDe }: { visiblePar: string[]; nomDe: Map<string, string> }) {
  if (visiblePar.length === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden /> Interne
      </span>
    );
  }
  const noms = visiblePar.map((id) => nomDe.get(id) ?? "?").join(", ");
  return (
    <span className="flex max-w-56 items-center gap-1 text-xs font-medium" title={`Partagé avec ${noms}`}>
      <Users className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate max-md:hidden">Partagé avec {noms}</span>
      <span className="md:hidden">Partagé ({visiblePar.length})</span>
    </span>
  );
}

function Ligne(props: { lien: string | null; icone: typeof Flag; titre: string; detail: string; etat?: React.ReactNode }) {
  const Icone = props.icone;
  const corps = (
    <>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icone className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold group-hover:underline">{props.titre}</span>
        <span className="truncate text-sm text-muted-foreground">{props.detail}</span>
      </span>
    </>
  );
  return (
    <li className="flex min-h-16 items-center gap-3 py-3">
      {props.lien ? (
        <a href={props.lien} target="_blank" rel="noopener" className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
          {corps}
        </a>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{corps}</span>
      )}
      {props.etat && <span className="shrink-0">{props.etat}</span>}
    </li>
  );
}

function jourMois(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
}

// L'onglet Documents se lit comme un dossier rangé : une seule carte, des rubriques
// l'une sous l'autre. La rubrique « Pièces attendues » (tranche suivante) viendra
// se poser en tête de cette carte, avant « Documents du chantier ».
function Documents(props: { chantierId: string; elements: ElementVu[]; dossier: DossierFiche; interne: boolean; nomDe: Map<string, string> }) {
  const { dossier } = props;
  // « Déposer » mène au formulaire en bas de l'onglet, déjà réglé sur le dépôt d'un document.
  const deposer = () => {
    document.getElementById("ecrire-fil")?.scrollIntoView({ block: "start" });
    document.getElementById("fichier")?.focus({ preventScroll: true });
  };
  return (
    <div className="flex flex-col gap-5">
      {/* En tête : ce qu'on attend de chacun, avant ce qui a été déposé. */}
      <PiecesAttendues chantierId={props.chantierId} exigences={dossier.pieces.exigences} intervenants={dossier.pieces.intervenants} interne={props.interne} moi={dossier.pieces.moi} modifiable={dossier.pieces.modifiable} />
      <div className="flex flex-col divide-y rounded-3xl bg-card">
      <Rubrique
        titre="Documents du chantier"
        nombre={props.elements.length}
        vide={
          props.interne
            ? "Aucun document. Déposez le devis signé, les plans ou les photos : ils restent internes tant que vous ne les partagez pas."
            : "Aucun document partagé avec vous pour l'instant. Vous pouvez en déposer un pour l'équipe."
        }
        action={
          <Button type="button" variant="outline" size="sm" onClick={deposer}>
            <Plus aria-hidden /> Déposer
          </Button>
        }
      >
        {props.elements.map((e) => (
          <Ligne
            key={e.id}
            lien={e.fichier ? `/api/fichiers/${e.id}` : null}
            icone={e.fichier?.type.startsWith("image/") ? ImageIcon : FileText}
            titre={e.texte}
            detail={[e.fichier?.nom, e.auteur, jourMois(e.creeLe)].filter(Boolean).join(" · ")}
            etat={props.interne ? <Diffusion visiblePar={e.visiblePar} nomDe={props.nomDe} /> : undefined}
          />
        ))}
      </Rubrique>
      {props.interne && (
        <Rubrique titre="Courriers reçus" nombre={dossier.courriers.length} vide="Aucun courrier rattaché. Un courrier validé dans Courriers se range ici de lui-même.">
          {dossier.courriers.map((c) => (
            <Ligne key={c.id} lien={`/courriers/${c.id}`} icone={Mail} titre={c.titre} detail={`${c.origine === "depot" ? "Déposé" : "Flux"} · validé le ${jourMois(c.date)}`} />
          ))}
        </Rubrique>
      )}
      <Rubrique titre="Fin de chantier" nombre={dossier.pv ? 1 : 0} vide="Le PV de réception se rangera ici quand le chantier passera en réception.">
        {dossier.pv && (
          <Ligne
            lien={dossier.pv.lien}
            icone={ClipboardCheck}
            titre="PV de réception"
            detail={`Réception du ${dateCourte(dossier.pv.dateReception)} · ${dossier.pv.reserves ? `${dossier.pv.reserves} réserve${dossier.pv.reserves > 1 ? "s" : ""}` : "sans réserve"}`}
            etat={<Etat aFaire={!dossier.pv.signeLe}>{dossier.pv.signeLe ? "Signé" : "À signer"}</Etat>}
          />
        )}
      </Rubrique>
      </div>
    </div>
  );
}

// Qui est là sur les sept prochains jours. Un jour avec quelqu'un : carte blanche
// cerclée de noir ; un jour vide : simple pointillé. Aujourd'hui porte une pastille.
// Sur téléphone, une liste verticale plutôt qu'une bande à faire défiler : sept
// lignes courtes se lisent d'un coup d'œil, sans rien cacher sur le côté.
function BandeDispos(props: { elements: ElementVu[]; aujourdhui: string }) {
  const bande = bandeDesJours(
    props.elements.filter((e) => e.type === "disponibilite").map((e) => ({ dateCible: e.dateCible, auteur: e.auteur })),
    props.aujourdhui,
  );
  const jourCourt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Qui est là cette semaine</h3>
      <ol className="flex flex-col gap-1.5 md:grid md:grid-cols-7 md:gap-2">
        {bande.map((j) => {
          const auj = j.jour === props.aujourdhui;
          const quelquun = j.presents.length > 0;
          return (
            <li
              key={j.jour}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-2 md:min-h-28 md:flex-col md:items-start md:gap-2 md:p-3",
                quelquun ? "bg-card ring-1 ring-foreground" : "border border-dashed border-foreground/30",
              )}
            >
              <span className="flex w-24 shrink-0 items-center gap-1.5 md:w-full md:justify-between">
                <span className={cn("text-sm capitalize", auj ? "font-bold" : "font-semibold")}>{jourCourt(j.jour)}</span>
                {auj && <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[11px] leading-none font-semibold text-background">Auj.</span>}
              </span>
              {quelquun ? (
                <span className="flex min-w-0 flex-wrap gap-x-2 text-sm font-medium md:flex-col">
                  {j.presents.map((n) => (
                    <span key={n} className="truncate">
                      {n}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Personne</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// La barre des onglets. L'onglet ouvert est un aplat noir ; à côté de chaque titre,
// un chiffre gris (le nombre d'éléments) ou une pastille pleine (ce qui attend un geste).
// Sur téléphone elle défile au doigt, et un fondu en bord dit qu'il y a d'autres onglets.
// Au clavier : flèches gauche et droite, Début et Fin.
function BarreOnglets(props: { actif: OngletFil; compte: Record<OngletFil, Compteur>; choisir: (o: OngletFil) => void }) {
  const barre = useRef<HTMLDivElement>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });

  useEffect(() => {
    const el = barre.current;
    if (!el) return;
    const mesurer = () => setBords({ gauche: el.scrollLeft > 4, droite: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    mesurer();
    el.addEventListener("scroll", mesurer, { passive: true });
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => {
      el.removeEventListener("scroll", mesurer);
      observateur.disconnect();
    };
  }, []);

  // Le trait sous l'onglet ouvert glisse d'un titre à l'autre.
  const [trait, setTrait] = useState<{ x: number; l: number } | null>(null);

  // L'onglet ouvert reste visible dans la barre (sans faire défiler la page).
  useEffect(() => {
    const el = barre.current;
    const onglet = document.getElementById(`onglet-fil-${props.actif}`);
    if (!el || !onglet) return;
    setTrait({ x: onglet.offsetLeft + 12, l: onglet.offsetWidth - 24 });
    const debut = onglet.offsetLeft - 24;
    const fin = onglet.offsetLeft + onglet.offsetWidth - el.clientWidth + 24;
    if (el.scrollLeft > debut) el.scrollLeft = debut;
    else if (el.scrollLeft < fin) el.scrollLeft = fin;
  }, [props.actif]);

  function clavier(e: React.KeyboardEvent) {
    const i = ONGLETS_FIL.indexOf(props.actif);
    const n = ONGLETS_FIL.length;
    const cible = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    const o = ONGLETS_FIL[cible];
    props.choisir(o);
    document.getElementById(`onglet-fil-${o}`)?.focus();
  }

  return (
    <div className="sticky top-14 z-20 -mx-1 border-b bg-background/95 backdrop-blur">
      <div ref={barre} role="tablist" aria-label="Filtrer le fil" onKeyDown={clavier} className="relative flex overflow-x-auto px-1 [scrollbar-width:none]">
        {ONGLETS_FIL.map((o) => {
          const c = props.compte[o];
          const actif = props.actif === o;
          return (
            <button
              key={o}
              type="button"
              role="tab"
              id={`onglet-fil-${o}`}
              aria-selected={actif}
              aria-controls="panneau-fil"
              tabIndex={actif ? 0 : -1}
              onClick={() => props.choisir(o)}
              className={cn(
                "flex h-12 shrink-0 items-center gap-2 px-3 text-[15px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                actif ? "font-semibold" : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {TITRE_ONGLET[o]}
              {c.aTraiter > 0 ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 font-mono text-[11px] font-semibold text-background tabular-nums",
                  )}
                >
                  {c.aTraiter}
                  <span className="sr-only"> à traiter</span>
                </span>
              ) : (
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {c.nombre}
                  <span className="sr-only"> élément{c.nombre > 1 ? "s" : ""}</span>
                </span>
              )}
            </button>
          );
        })}
        {trait && <span aria-hidden className="glisse absolute bottom-0 left-0 h-0.5 bg-foreground" style={{ transform: `translateX(${trait.x}px)`, width: trait.l }} />}
      </div>
      <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background transition-opacity", bords.gauche ? "opacity-100" : "opacity-0")} />
      <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background transition-opacity", bords.droite ? "opacity-100" : "opacity-0")} />
    </div>
  );
}

export function Fil(props: {
  chantierId: string;
  interne: boolean;
  elements: ElementVu[];
  participants: ParticipantVu[];
  lots: LotVu[];
  dossier: DossierFiche;
  ongletInitial: OngletFil;
  aujourdhui: string;
}) {
  const externes = props.participants.filter((p) => p.role === "externe");
  const nomDe = new Map(props.participants.map((p) => [p.compteId, p.nom]));
  const [onglet, setOnglet] = useState<OngletFil>(props.ongletInitial);
  const [tout, setTout] = useState(false);
  const extras = (props.dossier.pv ? 1 : 0) + props.dossier.courriers.length + props.dossier.pieces.exigences.length;
  // Une pièce attend une action quand elle n'est pas fournie : manquante, refusée, expirée, ou à valider (équipe).
  const piecesATraiter = props.dossier.pieces.exigences.filter((x) => !estFournie(x.etat) && (props.interne || x.etat.etat !== "a_valider")).length;
  const compte = compteurs(props.elements, props.aujourdhui, { documents: extras, documentsATraiter: piecesATraiter });
  const elements = props.elements.filter((e) => dansOnglet(onglet, e.type));
  const debut = elements.length - DERNIERS_VISIBLES;
  const visible = (e: ElementVu, i: number) => onglet !== "fil" || tout || i >= debut || enAttenteDe(e);
  const caches = elements.filter((e, i) => !visible(e, i)).length;

  // L'onglet ouvert se lit dans l'adresse (?onglet=documents) : un lien y mène droit.
  function choisir(o: OngletFil) {
    setOnglet(o);
    const url = new URL(window.location.href);
    if (o === "fil") url.searchParams.delete("onglet");
    else url.searchParams.set("onglet", o);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  // L'onglet demandé à l'arrivée sur la page (il ne change plus ensuite).
  const ongletDArrivee = useRef(props.ongletInitial);

  // Un lien vers un élément (#fil-…) ouvre le fil complet et le montre.
  useEffect(() => {
    const verifier = () => {
      const id = window.location.hash.startsWith("#fil-") ? window.location.hash.slice(5) : null;
      if (!id) return;
      setOnglet("fil");
      setTout(true);
      requestAnimationFrame(() => document.getElementById(`fil-${id}`)?.scrollIntoView({ block: "center" }));
    };
    // Arrivée par un lien vers un onglet (« À viser » → Signalements) : on descend jusqu'au fil.
    const versOnglet = () => {
      if (!window.location.hash && ongletDArrivee.current !== "fil") document.getElementById("panneau-fil")?.scrollIntoView({ block: "start" });
    };
    const image = requestAnimationFrame(() => {
      verifier();
      versOnglet();
    });
    window.addEventListener("hashchange", verifier);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("hashchange", verifier);
    };
  }, []);

  return (
    <Section titre="Fil du chantier">
      <BarreOnglets actif={onglet} compte={compte} choisir={choisir} />

      <div id="panneau-fil" role="tabpanel" aria-labelledby={`onglet-fil-${onglet}`} className="flex scroll-mt-32 flex-col gap-5">
        {onglet === "documents" ? (
          <Documents chantierId={props.chantierId} elements={elements} dossier={props.dossier} interne={props.interne} nomDe={nomDe} />
        ) : (
          <>
            {onglet === "demandes" && <BandeDispos elements={elements} aujourdhui={props.aujourdhui} />}
            {elements.length === 0 ? (
              <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
                {onglet === "fil"
                  ? "Le fil est vide. Écrivez le premier message ci-dessous."
                  : onglet === "demandes"
                    ? props.interne
                      ? "Aucune demande. Demandez une pièce ou une date à un intervenant ci-dessous."
                      : "Aucune demande pour vous. Donnez vos disponibilités ci-dessous."
                    : "Aucun signalement. Un problème constaté sur place ? Signalez-le ci-dessous."}
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {caches > 0 && (
                  <li>
                    <button type="button" onClick={() => setTout(true)} className="flex h-12 w-full items-center justify-center rounded-full bg-card text-sm font-semibold">
                      Afficher {caches > 1 ? `les ${caches} éléments plus anciens` : "l'élément plus ancien"} ↑
                    </button>
                  </li>
                )}
                {elements.map((e, i) => (visible(e, i) ? <CarteElement key={e.id} chantierId={props.chantierId} e={e} interne={props.interne} externes={externes} nomDe={nomDe} /> : null))}
              </ol>
            )}
          </>
        )}
        <Ecrire key={onglet} chantierId={props.chantierId} interne={props.interne} participants={props.participants} lots={props.lots} onglet={onglet} />
      </div>
    </Section>
  );
}
