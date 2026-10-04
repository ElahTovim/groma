"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { erreurDeTest } from "./actions";

export function BoutonSentry() {
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await erreurDeTest();
          if (r.erreur) toast.error(r.erreur);
          else toast.success(r.message);
        })
      }
    >
      {enCours ? "Envoi…" : "Envoyer une erreur de test à Sentry"}
    </Button>
  );
}
