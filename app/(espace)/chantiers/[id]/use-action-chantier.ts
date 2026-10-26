"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Resultat } from "./actions";

// Lance une action serveur, montre le retour (message ou refus motivé) et
// recharge la page si le chantier a changé entre-temps. `avant` affiche tout de suite
// le résultat attendu (il s'efface de lui-même si le serveur refuse) ; `siEchec` rend
// à l'utilisateur ce qu'il avait saisi.
export function useActionChantier() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [raisons, setRaisons] = useState<string[]>([]);

  function lancer(action: () => Promise<Resultat>, apres?: () => void, options: { avant?: () => void; siEchec?: () => void } = {}) {
    setRaisons([]);
    demarrer(async () => {
      options.avant?.();
      const r = await action();
      if (r.ok) {
        toast.success(r.message);
        apres?.();
      } else {
        // Un refus motivé s'affiche une seule fois, dans l'encadré ; sinon, un message.
        if (r.raisons?.length) setRaisons(r.raisons);
        // L'erreur reste affichée jusqu'à ce qu'on la ferme : le temps de la lire.
        else toast.error(r.erreur, { duration: Infinity, closeButton: true });
        if (r.erreur.includes("entre-temps")) router.refresh();
        options.siEchec?.();
      }
    });
  }

  return { enCours, raisons, lancer };
}
