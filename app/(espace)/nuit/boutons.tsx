"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { envoyerRecapMaintenant, rattraperMaintenant, relancerNuit } from "./actions";

export function BoutonsNuit({ derniereNuit }: { derniereNuit: string }) {
  const [enCours, demarrer] = useTransition();
  const [nuit, setNuit] = useState(derniereNuit);
  const lancer = (f: () => Promise<{ ok: boolean; message: string }>) =>
    demarrer(async () => {
      const r = await f();
      if (r.ok) toast.success(r.message, { duration: 8000 });
      else toast.error(r.message, { duration: 10000 });
    });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Button size="lg" disabled={enCours} onClick={() => lancer(rattraperMaintenant)}>
        {enCours ? "Import en cours…" : "Importer les nuits manquantes"}
      </Button>
      <Button variant="outline" size="lg" disabled={enCours} onClick={() => lancer(envoyerRecapMaintenant)}>
        Envoyer le récapitulatif du jour
      </Button>
      <div className="flex items-end gap-2">
        <Input type="date" value={nuit} max={derniereNuit} onChange={(e) => setNuit(e.target.value)} aria-label="Nuit à relancer" className="w-44" />
        <Button variant="outline" disabled={enCours || !nuit} onClick={() => lancer(() => relancerNuit(nuit))}>
          Relancer cette nuit
        </Button>
      </div>
    </div>
  );
}
