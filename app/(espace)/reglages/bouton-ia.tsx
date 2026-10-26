"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testerIa } from "./actions";

export function BoutonIa() {
  const [enCours, demarrer] = useTransition();
  const [annonce, setAnnonce] = useState("");
  return (
    <>
      <Button
        variant="outline"
        disabled={enCours}
        focusableWhenDisabled
        className="aria-disabled:opacity-50"
        onClick={() => {
          if (enCours) return;
          setAnnonce("Test de l'IA en cours…");
          demarrer(async () => {
            const r = await testerIa();
            setAnnonce(r.erreur ?? r.message ?? "Terminé.");
            if (r.erreur) toast.error(r.erreur, { duration: 12000 });
            else toast.success(r.message, { duration: 8000 });
          });
        }}
      >
        {enCours ? "Test en cours…" : "Tester l'IA"}
      </Button>
      <p role="status" className="sr-only">
        {annonce}
      </p>
    </>
  );
}
