"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LotVu, ParticipantVu } from "@/lib/fiche";
import { dateCourte } from "@/lib/format";
import { ACTION_LOT, LIBELLE_LOT } from "@/lib/libelles";
import type { StatutLot } from "@/lib/db/schema";
import { etapeSuivanteLot, retardsLot } from "@/lib/regles";
import { cn } from "@/lib/utils";
import { ajouterLot, avancerLot } from "./actions";
import { useActionChantier } from "./use-action-chantier";

const CYCLE_LOT: StatutLot[] = ["a_commander", "commande", "livre", "pose", "fini"];
// Colonnes du tableau sur grand écran : Lot, Statut, Livraison, Fin, Retard, action.
// Des colonnes souples : les dates passent à la ligne plutôt que de rogner le bouton.
// En dessous de lg, la colonne de gauche est trop étroite pour six colonnes : des cartes.
// Le tableau porte les colonnes ; chaque ligne les reprend (subgrid) pour rester alignée.
const COLONNES = "lg:grid lg:grid-cols-[minmax(5rem,1.4fr)_auto_minmax(min-content,1fr)_minmax(min-content,1fr)_minmax(min-content,1fr)_auto] lg:gap-x-2 lg:gap-y-0";
const LIGNE = "lg:col-span-full lg:grid lg:grid-cols-subgrid lg:items-center lg:gap-x-2 lg:gap-y-0 lg:px-4";

function jours(n: number) {
  return `${n} jour${n > 1 ? "s" : ""}`;
}

function Retard({ texte }: { texte: React.ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-full bg-foreground py-1.5 pr-3.5 pl-1.5 font-semibold text-background lg:py-1 lg:text-sm">
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold leading-none text-foreground">
        !
      </span>
      {texte}
    </span>
  );
}

// `avance` : le lot vient de passer une étape. La carte s'éclaire un instant, le
// badge saute et le segment gagné se remplit : on voit que le geste a porté.
function LigneLot(props: { lot: LotVu; aujourdhui: string; replie: boolean; avance: boolean; children: React.ReactNode }) {
  const l = props.lot;
  const r = retardsLot(l, props.aujourdhui);
  const rang = CYCLE_LOT.indexOf(l.statut);
  const livre = rang >= CYCLE_LOT.indexOf("livre");
  return (
    <li
      id={`lot-${l.id}`}
      className={cn(
        LIGNE,
        "scroll-mt-24 flex-col gap-3 rounded-3xl bg-card p-5 lg:rounded-none lg:border-0 lg:border-t lg:py-3.5",
        l.enRetard ? "flex ring-2 ring-foreground lg:ring-0" : "flex",
        props.replie && "hidden",
        props.avance && "lot-avance",
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:contents">
        <span className="text-lg font-bold lg:text-[0.9375rem] lg:font-semibold">{l.nom}</span>
        <span>
          <Badge variant="outline" className={cn(props.avance && "saute", "h-auto px-2.5 py-1 text-sm font-semibold lg:text-[0.8125rem]", l.statut === "fini" ? "border-foreground bg-foreground text-background" : "border-foreground/60")}>
            {LIBELLE_LOT[l.statut]}
          </Badge>
        </span>
      </div>
      {/* Avancement du lot, sur téléphone seulement : le tableau a déjà la colonne Statut. */}
      <div className="flex flex-col gap-2 lg:hidden">
        <div className="grid grid-cols-5 gap-1" aria-hidden>
          {CYCLE_LOT.map((s, i) => (
            <span key={s} className="h-2 overflow-hidden rounded-full bg-foreground/10">
              {i <= rang && <span className={cn("block h-full rounded-full bg-foreground", props.avance && i === rang && "remplit [--rang:0]")} />}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Étape {rang + 1} sur 5
        </p>
      </div>
      <span className="lg:text-[0.9375rem]">
        <span className="lg:sr-only">{livre ? "Livraison : " : "Livraison prévue : "}</span>
        {l.statut === "fini" && !l.livraisonPrevue ? "—" : dateCourte(l.livraisonPrevue)}
        {livre && l.livraisonPrevue && (
          <>
            <span aria-hidden> ✓</span>
            <span className="sr-only"> (fait)</span>
          </>
        )}
      </span>
      <span className="-mt-2 lg:mt-0 lg:text-[0.9375rem]">
        <span className="lg:sr-only">Fin prévue : </span>
        {dateCourte(l.finPrevue)}
        {l.statut === "fini" && l.finPrevue && (
          <>
            <span aria-hidden> ✓</span>
            <span className="sr-only"> (fait)</span>
          </>
        )}
      </span>
      {l.fournisseur && <span className="text-muted-foreground lg:hidden">Fournisseur : {l.fournisseur}</span>}
      <span className="flex flex-col gap-2">
        {r.livraison !== null && <Retard texte={<><span className="lg:sr-only">Livraison en retard de </span>{jours(r.livraison)}</>} />}
        {r.fin !== null && <Retard texte={<><span className="lg:sr-only">Fin en retard de </span>{jours(r.fin)}</>} />}
        {!l.enRetard && (
          <span className="hidden lg:inline">
            <span aria-hidden>—</span>
            <span className="sr-only">Pas de retard</span>
          </span>
        )}
      </span>
      <span>{props.children}</span>
    </li>
  );
}

export function Lots(props: { chantierId: string; lots: LotVu[]; participants: ParticipantVu[]; modifiable: boolean; aujourdhui: string }) {
  const { enCours, lancer } = useActionChantier();
  const [ajout, setAjout] = useState(false);
  const [voirFinis, setVoirFinis] = useState(false);
  const [avance, setAvance] = useState<string | null>(null);
  const finis = props.lots.filter((l) => l.statut === "fini").length;
  // Sur téléphone, les lots en retard d'abord (le tri est stable : l'ordre de création reste sinon).
  const ordonnes = [...props.lots].sort((a, b) => Number(b.enRetard) - Number(a.enRetard));
  const boutonAjout = useRef<HTMLButtonElement>(null);

  // Le formulaire se referme (Annuler, ou lot ajouté) : le focus revient sur « + Ajouter un lot ».
  function fermerAjout() {
    setAjout(false);
    requestAnimationFrame(() => boutonAjout.current?.focus());
  }

  // Le bouton « Afficher… » disparaît : le focus passe au premier lot révélé.
  function afficherFinis() {
    const premier = ordonnes.find((l) => l.statut === "fini");
    setVoirFinis(true);
    if (!premier) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`lot-${premier.id}`);
      el?.setAttribute("tabindex", "-1");
      el?.focus();
    });
  }

  return (
    <Section
      titre={`Lots (${props.lots.length})`}
      action={
        props.modifiable && !ajout ? (
          <Button ref={boutonAjout} variant="outline" size="lg" onClick={() => setAjout(true)}>
            + Ajouter un lot
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {ajout && (
          <form
            className="grid gap-3 rounded-3xl bg-card p-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              lancer(() => ajouterLot(props.chantierId, d), fermerAjout);
            }}
          >
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="lot-nom">Nom du lot</Label>
              <Input id="lot-nom" name="nom" required placeholder="Carrelage, électricité, menuiseries…" autoFocus />
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
              <select id="lot-fournisseur" name="fournisseurId" className="h-8 rounded-lg border border-input bg-background px-2 text-sm" defaultValue="">
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
              <Button type="button" variant="ghost" onClick={fermerAjout}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {props.lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lot pour l&apos;instant.</p>
        ) : (
          <>
            {/* Une seule liste : cartes sur téléphone, lignes de tableau sur ordinateur. */}
            <div className={cn(COLONNES, "flex flex-col gap-3 lg:overflow-x-auto lg:rounded-3xl lg:bg-card")}>
              <div aria-hidden className={cn(LIGNE, "hidden py-3 text-[0.8125rem] font-semibold text-muted-foreground lg:grid")}>
                <span>Lot</span>
                <span>Statut</span>
                <span>Livraison prévue</span>
                <span>Fin prévue</span>
                <span>Retard</span>
                <span />
              </div>
              <p className="text-sm text-muted-foreground lg:hidden">Les lots en retard d&apos;abord</p>
              <ul className="flex flex-col gap-3 lg:col-span-full lg:grid lg:grid-cols-subgrid lg:gap-x-2 lg:gap-y-0">
                {ordonnes.map((l) => (
                  <LigneLot key={l.id} lot={l} aujourdhui={props.aujourdhui} replie={!voirFinis && l.statut === "fini" && avance !== l.id} avance={avance === l.id}>
                    {props.modifiable && etapeSuivanteLot(l.statut) && (
                      <Button
                        variant="outline"
                        className="h-13 w-full text-base lg:h-10 lg:text-sm"
                        disabled={enCours}
                        onClick={() =>
                          lancer(
                            () => avancerLot(props.chantierId, l.id, etapeSuivanteLot(l.statut)!),
                            () => {
                              setAvance(l.id);
                              setTimeout(() => setAvance((a) => (a === l.id ? null : a)), 1300);
                            },
                          )
                        }
                      >
                        {`Marquer ${ACTION_LOT[etapeSuivanteLot(l.statut)!]?.toLowerCase()}`}
                        <span className="sr-only"> : {l.nom}</span>
                      </Button>
                    )}
                  </LigneLot>
                ))}
              </ul>
            </div>
            {finis > 0 && !voirFinis && (
              <Button variant="outline" className="h-14 w-full justify-between border-0 bg-card px-5 text-base lg:hidden" onClick={afficherFinis}>
                Afficher {finis > 1 ? `les ${finis} lots finis` : "le lot fini"} <span aria-hidden>↓</span>
              </Button>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
