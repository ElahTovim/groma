"use client";

import { useState } from "react";
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
// Colonnes du tableau sur ordinateur : Lot, Statut, Livraison, Fin, Retard, action.
const LIGNE = "md:grid md:grid-cols-[minmax(6rem,1.1fr)_6.5rem_8rem_8rem_6.5rem_8.5rem] md:items-center md:gap-2 md:px-4";

function jours(n: number) {
  return `${n} jour${n > 1 ? "s" : ""}`;
}

function Retard({ texte }: { texte: React.ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-md border-2 border-foreground px-2.5 py-1.5 font-bold md:py-1 md:text-sm">
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded bg-foreground text-xs leading-none text-background">
        !
      </span>
      {texte}
    </span>
  );
}

function LigneLot(props: { lot: LotVu; aujourdhui: string; replie: boolean; children: React.ReactNode }) {
  const l = props.lot;
  const r = retardsLot(l, props.aujourdhui);
  const rang = CYCLE_LOT.indexOf(l.statut);
  const livre = rang >= CYCLE_LOT.indexOf("livre");
  return (
    <li
      id={`lot-${l.id}`}
      className={cn(
        LIGNE,
        "scroll-mt-24 flex-col gap-3 rounded-xl p-4 md:rounded-none md:border-0 md:border-t md:py-3.5",
        l.enRetard ? "flex border-2 border-foreground" : "flex border-[1.5px]",
        props.replie && "hidden",
      )}
    >
      <div className="flex items-center justify-between gap-3 md:contents">
        <span className="text-lg font-bold md:text-[0.9375rem] md:font-semibold">{l.nom}</span>
        <span>
          <Badge variant="outline" className={cn("h-auto px-2.5 py-1 text-sm font-semibold md:text-[0.8125rem]", l.statut === "fini" ? "border-foreground bg-foreground text-background" : "border-foreground/60")}>
            {LIBELLE_LOT[l.statut]}
          </Badge>
        </span>
      </div>
      {/* Avancement du lot, sur téléphone seulement : le tableau a déjà la colonne Statut. */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="grid grid-cols-5 gap-1" aria-hidden>
          {CYCLE_LOT.map((s, i) => (
            <span key={s} className={cn("h-2 rounded-full", i <= rang ? "bg-foreground" : "bg-foreground/10")} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Étape {rang + 1} sur 5 : {CYCLE_LOT.map((s) => LIBELLE_LOT[s]).join(" · ")}
        </p>
      </div>
      <span className="md:text-[0.9375rem]">
        <span className="md:hidden">{livre ? "Livraison : " : "Livraison prévue : "}</span>
        {l.statut === "fini" && !l.livraisonPrevue ? "—" : dateCourte(l.livraisonPrevue)}
        {livre && l.livraisonPrevue && " ✓"}
      </span>
      <span className="-mt-2 md:mt-0 md:text-[0.9375rem]">
        <span className="md:hidden">Fin prévue : </span>
        {dateCourte(l.finPrevue)}
        {l.statut === "fini" && l.finPrevue && " ✓"}
      </span>
      {l.fournisseur && <span className="text-muted-foreground md:hidden">Fournisseur : {l.fournisseur}</span>}
      <span className="flex flex-col gap-2">
        {r.livraison !== null && <Retard texte={<><span className="md:hidden">Livraison en retard de </span>{jours(r.livraison)}</>} />}
        {r.fin !== null && <Retard texte={<><span className="md:hidden">Fin en retard de </span>{jours(r.fin)}</>} />}
        {!l.enRetard && <span className="hidden md:inline">—</span>}
      </span>
      <span>{props.children}</span>
    </li>
  );
}

export function Lots(props: { chantierId: string; lots: LotVu[]; participants: ParticipantVu[]; modifiable: boolean; aujourdhui: string }) {
  const { enCours, lancer } = useActionChantier();
  const [ajout, setAjout] = useState(false);
  const [voirFinis, setVoirFinis] = useState(false);
  const finis = props.lots.filter((l) => l.statut === "fini").length;
  // Sur téléphone, les lots en retard d'abord (le tri est stable : l'ordre de création reste sinon).
  const ordonnes = [...props.lots].sort((a, b) => Number(b.enRetard) - Number(a.enRetard));

  return (
    <Section
      titre={`Lots (${props.lots.length})`}
      action={
        props.modifiable && !ajout ? (
          <Button variant="outline" size="lg" onClick={() => setAjout(true)}>
            + Ajouter un lot
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
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
          <>
            {/* Une seule liste : cartes sur téléphone, lignes de tableau sur ordinateur. */}
            <div className="flex flex-col gap-3 md:gap-0 md:overflow-hidden md:rounded-lg md:border">
              <div aria-hidden className={cn(LIGNE, "hidden bg-muted py-2.5 text-[0.8125rem] font-semibold text-muted-foreground md:grid")}>
                <span>Lot</span>
                <span>Statut</span>
                <span>Livraison prévue</span>
                <span>Fin prévue</span>
                <span>Retard</span>
                <span />
              </div>
              <p className="text-sm text-muted-foreground md:hidden">Les lots en retard d&apos;abord</p>
              <ul className="flex flex-col gap-3 md:gap-0">
                {ordonnes.map((l) => (
                  <LigneLot key={l.id} lot={l} aujourdhui={props.aujourdhui} replie={!voirFinis && l.statut === "fini"}>
                    {props.modifiable && etapeSuivanteLot(l.statut) && (
                      <Button
                        variant="outline"
                        className="h-13 w-full border-[1.5px] text-base md:h-10 md:text-sm"
                        disabled={enCours}
                        onClick={() => lancer(() => avancerLot(props.chantierId, l.id, etapeSuivanteLot(l.statut)!))}
                      >
                        {`Marquer ${ACTION_LOT[etapeSuivanteLot(l.statut)!]?.toLowerCase()}`}
                      </Button>
                    )}
                  </LigneLot>
                ))}
              </ul>
            </div>
            {finis > 0 && !voirFinis && (
              <Button variant="outline" className="h-14 w-full justify-between px-4 text-base md:hidden" onClick={() => setVoirFinis(true)}>
                Afficher {finis > 1 ? `les ${finis} lots finis` : "le lot fini"} <span aria-hidden>↓</span>
              </Button>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
