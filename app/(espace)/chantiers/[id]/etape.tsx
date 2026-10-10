"use client";

import { CircleAlert } from "lucide-react";
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
// en haut sur ordinateur, fixé en bas sous le pouce sur téléphone.
export function EtapeChantier(props: { chantierId: string; statut: StatutChantier; debutPrevu: string | null; blocages: string[] }) {
  const { enCours, raisons, lancer } = useActionChantier();
  const suivante = etapeSuivante(props.statut);
  const [motif, setMotif] = useState("");
  const [ouvert, setOuvert] = useState(false);
  // Si un refus arrive quand même (quelqu'un a changé le chantier entre-temps), il prime.
  const aFaire = raisons.length ? raisons : props.blocages;
  const bloque = aFaire.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {suivante && bloque && (
        <div className="flex gap-3 border border-foreground p-3" role="status">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">Pour « {LIBELLE_ACTION[suivante]?.toLowerCase()} », il reste :</p>
            <ul className="list-disc pl-4">
              {aFaire.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
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
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0">
          <Button
            size="lg"
            className="h-12 w-full text-base md:h-10 md:w-auto md:px-5 md:text-sm"
            disabled={enCours || bloque}
            onClick={() => lancer(() => avancerChantier(props.chantierId, suivante))}
          >
            {enCours ? "Un instant…" : LIBELLE_ACTION[suivante]}
          </Button>
          {bloque && <p className="mt-1 text-center text-xs text-muted-foreground md:hidden">Voir ce qui reste à faire en haut de la fiche.</p>}
        </div>
      )}
    </div>
  );
}
