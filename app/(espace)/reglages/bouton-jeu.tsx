"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rejouerJeu } from "./actions";

export function BoutonJeu() {
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await rejouerJeu();
          if (r.erreur) toast.error(r.erreur);
          else toast.success(r.message);
        })
      }
    >
      {enCours ? "Rejeu en cours…" : "Rejouer le jeu de données"}
    </Button>
  );
}
