"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testerIa } from "./actions";

export function BoutonIa() {
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await testerIa();
          if (r.erreur) toast.error(r.erreur, { duration: 12000 });
          else toast.success(r.message, { duration: 8000 });
        })
      }
    >
      {enCours ? "Test en cours…" : "Tester l'IA"}
    </Button>
  );
}
