"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Resultat } from "./actions";

// Lance une action serveur, montre le retour (message ou refus motivé) et
// recharge la page si le chantier a changé entre-temps.
export function useActionChantier() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [raisons, setRaisons] = useState<string[]>([]);

  function lancer(action: () => Promise<Resultat>, apres?: () => void) {
    setRaisons([]);
    demarrer(async () => {
      const r = await action();
      if (r.ok) {
        toast.success(r.message);
        apres?.();
      } else {
        toast.error(r.erreur);
        setRaisons(r.raisons ?? []);
        if (r.erreur.includes("entre-temps")) router.refresh();
      }
    });
  }

  return { enCours, raisons, lancer };
}
