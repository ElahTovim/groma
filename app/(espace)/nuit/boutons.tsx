"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { envoyerRecapMaintenant, etapesDuMatinMaintenant, rattraperMaintenant, relancerNuit } from "./actions";

type Cle = "import" | "matin" | "recap" | "relance";

const LIBELLES: Record<Cle, { repos: string; enCours: string }> = {
  import: { repos: "Importer les nuits manquantes", enCours: "Import en cours…" },
  matin: { repos: "Courriers, documents et analyse", enCours: "Courriers, documents et analyse en cours…" },
  recap: { repos: "Envoyer le récapitulatif du jour", enCours: "Envoi du récapitulatif…" },
  relance: { repos: "Relancer cette nuit", enCours: "Relance en cours…" },
};

// Les boutons restent focalisables pendant l'action (aria-disabled, pas disabled) :
// le focus ne se perd pas, et la région d'état annonce le début et la fin.
export function BoutonsNuit({ derniereNuit }: { derniereNuit: string }) {
  const [enCours, demarrer] = useTransition();
  const [nuit, setNuit] = useState(derniereNuit);
  const [lance, setLance] = useState<Cle | null>(null);
  const [annonce, setAnnonce] = useState("");
  const lancer = (cle: Cle, f: () => Promise<{ ok: boolean; message: string }>) => {
    if (enCours) return;
    setLance(cle);
    setAnnonce(LIBELLES[cle].enCours);
    demarrer(async () => {
      const r = await f();
      setAnnonce(`Terminé. ${r.message}`);
      if (r.ok) toast.success(r.message, { duration: 8000 });
      else toast.error(r.message, { duration: 10000 });
    });
  };
  const libelle = (cle: Cle) => (enCours && lance === cle ? LIBELLES[cle].enCours : LIBELLES[cle].repos);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Button size="lg" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={() => lancer("import", rattraperMaintenant)}>
        {libelle("import")}
      </Button>
      <Button variant="outline" size="lg" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={() => lancer("matin", etapesDuMatinMaintenant)}>
        {libelle("matin")}
      </Button>
      <Button variant="outline" size="lg" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={() => lancer("recap", envoyerRecapMaintenant)}>
        {libelle("recap")}
      </Button>
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nuit-a-relancer">Nuit à relancer</Label>
          <Input id="nuit-a-relancer" type="date" value={nuit} max={derniereNuit} onChange={(e) => setNuit(e.target.value)} className="w-44" />
        </div>
        <Button
          variant="outline"
          disabled={enCours || !nuit}
          focusableWhenDisabled
          className="aria-disabled:opacity-50"
          onClick={() => {
            if (nuit) lancer("relance", () => relancerNuit(nuit));
          }}
        >
          {libelle("relance")}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {annonce}
      </p>
    </div>
  );
}
