"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StatutChantier } from "@/lib/db/schema";
import { etapeSuivante, LIBELLE_ACTION, peutAnnuler } from "@/lib/regles";
import { annulerChantier, avancerChantier, fixerDebut } from "./actions";
import { useActionChantier } from "./use-action-chantier";

// L'étape suivante. Ce qui la bloque est calculé avant le clic, sur le serveur
// (`blocages`) : le bouton reste grisé et la liste dit quoi faire. Le bouton est
// en haut à droite sur ordinateur, fixé en bas sous le pouce sur téléphone.
export function EtapeChantier(props: { chantierId: string; statut: StatutChantier; debutPrevu: string | null; blocages: string[] }) {
  const { enCours, raisons, lancer } = useActionChantier();
  const suivante = etapeSuivante(props.statut);
  const [motif, setMotif] = useState("");
  const [ouvert, setOuvert] = useState(false);
  // Si un refus arrive quand même (quelqu'un a changé le chantier entre-temps), il prime.
  const aFaire = raisons.length ? raisons : props.blocages;
  const bloque = aFaire.length > 0;

  return (
    <div className="flex flex-col gap-3 md:items-stretch">
      <div className="flex flex-wrap items-end gap-3 md:justify-end">
        {(props.statut === "signe" || props.statut === "planifie" || props.statut === "devis") && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const debut = String(new FormData(e.currentTarget).get("debut") ?? "");
              lancer(() => fixerDebut(props.chantierId, debut));
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="debut" className="text-xs text-muted-foreground">
                Début prévu
              </Label>
              <Input id="debut" name="debut" type="date" defaultValue={props.debutPrevu ?? ""} className="w-40" />
            </div>
            <Button type="submit" variant="outline" disabled={enCours}>
              Enregistrer
            </Button>
          </form>
        )}

        {peutAnnuler(props.statut) && (
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger render={<Button variant="ghost" disabled={enCours} />}>Annuler le chantier</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Annuler ce chantier ?</DialogTitle>
                <DialogDescription>Le gérant en sera averti. Un chantier annulé ne revient pas en arrière.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="motif">Motif</Label>
                <Textarea id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Par exemple : le client renonce après le devis." />
              </div>
              <DialogFooter>
                <Button disabled={enCours || !motif.trim()} onClick={() => lancer(() => annulerChantier(props.chantierId, motif), () => setOuvert(false))}>
                  Annuler le chantier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {suivante && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:static md:order-first md:border-0 md:bg-transparent md:p-0">
          <Button
            size="lg"
            className="order-last h-14 w-full text-base md:order-first md:h-12"
            disabled={enCours || bloque}
            onClick={() => lancer(() => avancerChantier(props.chantierId, suivante))}
          >
            {enCours ? "Un instant…" : LIBELLE_ACTION[suivante]}
          </Button>
          {/* Ce qui bloque, dit avant le clic : au-dessus du bouton sous le pouce, en dessous sur ordinateur. */}
          {bloque && (
            <div className="flex gap-2 text-sm md:justify-end md:text-right" role="status">
              <Info className="mt-0.5 size-4 shrink-0 md:hidden" aria-hidden />
              <ul className="flex flex-col">
                {aFaire.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
