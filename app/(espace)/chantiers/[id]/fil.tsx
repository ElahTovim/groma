"use client";

import { CalendarClock, Eye, FileText, Flag, Lock, MessageSquare, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
import { bandeDesJours, compteurs, dansOnglet, GESTE_PAR_DEFAUT, gestesDe, ONGLETS_FIL, TITRE_ONGLET, type OngletFil } from "@/lib/fil-onglets";
import { LIBELLE_SIGNALEMENT, LIBELLE_TYPE } from "@/lib/libelles";
import { cn } from "@/lib/utils";
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

function Ecrire(props: { chantierId: string; interne: boolean; participants: ParticipantVu[]; lots: LotVu[]; onglet: OngletFil }) {
  const { enCours, lancer } = useActionChantier();
  const gestes = GESTES.filter((g) => (props.interne || !g.interneSeulement) && gestesDe(props.onglet, [g.type]).length > 0);
  const parDefaut = gestes.some((g) => g.type === GESTE_PAR_DEFAUT[props.onglet]) ? GESTE_PAR_DEFAUT[props.onglet] : (gestes[0]?.type ?? "message");
  const [type, setType] = useState<TypeFil>(parDefaut);
  const [cle, setCle] = useState(0);

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
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
  attestations: { nom: string; etat: string; aJour: boolean; lien: string | null }[];
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

function Rubrique(props: { titre: string; children: React.ReactNode; vide?: string; nombre: number }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{props.titre}</h3>
      {props.nombre === 0 ? <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">{props.vide}</p> : <ul className="flex flex-col divide-y rounded-3xl bg-card px-5">{props.children}</ul>}
    </section>
  );
}

function Ligne(props: { lien: string | null; titre: string; detail: string; aside?: React.ReactNode }) {
  const corps = (
    <>
      <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{props.titre}</span>
        <span className="text-xs text-muted-foreground">{props.detail}</span>
      </span>
    </>
  );
  return (
    <li className="flex min-h-14 items-start gap-3 py-3 text-sm">
      {props.lien ? (
        <a href={props.lien} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-start gap-3 hover:underline">
          {corps}
        </a>
      ) : (
        <span className="flex min-w-0 flex-1 items-start gap-3">{corps}</span>
      )}
      {props.aside}
    </li>
  );
}

function Documents(props: { elements: ElementVu[]; dossier: DossierFiche; interne: boolean; nomDe: Map<string, string> }) {
  const { dossier } = props;
  return (
    <div className="flex flex-col gap-5">
      <Rubrique titre="Documents du chantier" nombre={props.elements.length} vide="Aucun document déposé. Devis signé, plans, photos : déposez-les ci-dessous.">
        {props.elements.map((e) => (
          <Ligne
            key={e.id}
            lien={e.fichier ? `/api/fichiers/${e.id}` : null}
            titre={e.texte}
            detail={`${e.auteur} · ${horodatage(e.creeLe)}${e.fichier ? ` · ${e.fichier.nom}` : ""}`}
            aside={props.interne ? <span className="shrink-0 text-xs text-muted-foreground">{e.visiblePar.length ? `Partagé (${e.visiblePar.length})` : "Interne"}</span> : undefined}
          />
        ))}
      </Rubrique>
      {props.interne && (
        <Rubrique titre="Courriers reçus" nombre={dossier.courriers.length} vide="Aucun courrier validé n'est rattaché à ce chantier.">
          {dossier.courriers.map((c) => (
            <Ligne key={c.id} lien={`/courriers/${c.id}`} titre={c.titre} detail={`${c.origine === "depot" ? "Déposé" : "Flux"} · validé le ${horodatage(c.date)}`} />
          ))}
        </Rubrique>
      )}
      {dossier.attestations.length > 0 && (
        <Rubrique titre="Attestations de vigilance" nombre={dossier.attestations.length}>
          {dossier.attestations.map((a) => (
            <Ligne key={a.nom} lien={a.lien} titre={a.nom} detail="Attestation URSSAF, renouvelée tous les 6 mois" aside={<Badge variant={a.aJour ? "outline" : "default"}>{a.etat}</Badge>} />
          ))}
        </Rubrique>
      )}
      <Rubrique titre="Fin de chantier" nombre={dossier.pv ? 1 : 0} vide="Le PV de réception apparaîtra ici une fois préparé.">
        {dossier.pv && (
          <Ligne
            lien={dossier.pv.lien}
            titre="PV de réception"
            detail={`Réception du ${dateCourte(dossier.pv.dateReception)} · ${dossier.pv.reserves ? `${dossier.pv.reserves} réserve${dossier.pv.reserves > 1 ? "s" : ""}` : "sans réserve"}`}
            aside={<Badge variant={dossier.pv.signeLe ? "default" : "outline"}>{dossier.pv.signeLe ? "Signé" : "À signer"}</Badge>}
          />
        )}
      </Rubrique>
    </div>
  );
}

function BandeDispos(props: { elements: ElementVu[]; aujourdhui: string }) {
  const bande = bandeDesJours(
    props.elements.filter((e) => e.type === "disponibilite").map((e) => ({ dateCible: e.dateCible, auteur: e.auteur })),
    props.aujourdhui,
  );
  const jourCourt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Qui est là cette semaine</h3>
      <div className="overflow-x-auto">
        <ol className="grid min-w-[36rem] grid-cols-7 gap-2">
          {bande.map((j) => (
            <li key={j.jour} className={j.presents.length ? "flex min-h-24 flex-col gap-1 rounded-2xl bg-card p-3 ring-1 ring-foreground" : "flex min-h-24 flex-col gap-1 rounded-2xl bg-card p-3"}>
              <span className="text-xs font-semibold capitalize">{jourCourt(j.jour)}</span>
              {j.presents.length === 0 ? (
                <span className="text-xs text-muted-foreground">personne</span>
              ) : (
                j.presents.map((n) => (
                  <span key={n} className="truncate text-xs">
                    {n}
                  </span>
                ))
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
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
  const extras = (props.dossier.pv ? 1 : 0) + props.dossier.courriers.length + props.dossier.attestations.length;
  const compte = compteurs(props.elements, props.aujourdhui, { documents: extras });
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

  // Un lien vers un élément (#fil-…) ouvre le fil complet et le montre.
  useEffect(() => {
    const verifier = () => {
      const id = window.location.hash.startsWith("#fil-") ? window.location.hash.slice(5) : null;
      if (!id) return;
      setOnglet("fil");
      setTout(true);
      requestAnimationFrame(() => document.getElementById(`fil-${id}`)?.scrollIntoView({ block: "center" }));
    };
    const image = requestAnimationFrame(verifier);
    window.addEventListener("hashchange", verifier);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("hashchange", verifier);
    };
  }, []);

  return (
    <Section titre="Fil du chantier">
      {/* Les onglets : une barre qui défile au doigt sur téléphone, collée en haut au défilement. */}
      <div role="tablist" aria-label="Filtrer le fil" className="sticky top-14 z-20 -mx-1 flex gap-1 overflow-x-auto bg-background px-1 py-1">
        {ONGLETS_FIL.map((o) => {
          const c = compte[o];
          return (
            <button
              key={o}
              type="button"
              role="tab"
              id={`onglet-fil-${o}`}
              aria-selected={onglet === o}
              aria-controls="panneau-fil"
              onClick={() => choisir(o)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm whitespace-nowrap transition-colors",
                onglet === o ? "bg-foreground font-semibold text-background" : "bg-card font-medium hover:bg-muted",
              )}
            >
              {TITRE_ONGLET[o]}
              {c.aTraiter > 0 ? (
                <span className={cn("rounded-full px-1.5 text-xs font-bold tabular-nums", onglet === o ? "bg-background text-foreground" : "bg-foreground text-background")} aria-label={`${c.aTraiter} à traiter`}>
                  {c.aTraiter}
                </span>
              ) : (
                <span className={cn("text-xs tabular-nums", onglet === o ? "text-background/70" : "text-muted-foreground")}>{c.nombre}</span>
              )}
            </button>
          );
        })}
      </div>

      <div id="panneau-fil" role="tabpanel" aria-labelledby={`onglet-fil-${onglet}`} className="flex flex-col gap-5">
        {onglet === "documents" ? (
          <Documents elements={elements} dossier={props.dossier} interne={props.interne} nomDe={nomDe} />
        ) : (
          <>
            {onglet === "demandes" && <BandeDispos elements={elements} aujourdhui={props.aujourdhui} />}
            {elements.length === 0 ? (
              <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
                {onglet === "fil" ? "Le fil est vide. Écrivez le premier message." : onglet === "demandes" ? "Aucune demande ni disponibilité pour l'instant." : "Aucun signalement : rien à reprendre pour l'instant."}
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
