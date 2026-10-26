"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { erreurDeTest } from "./actions";

export function BoutonSentry() {
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
          setAnnonce("Envoi de l'erreur de test…");
          demarrer(async () => {
            const r = await erreurDeTest();
            setAnnonce(r.erreur ?? r.message ?? "Terminé.");
            if (r.erreur) toast.error(r.erreur);
            else toast.success(r.message);
          });
        }}
      >
        {enCours ? "Envoi…" : "Envoyer une erreur de test à Sentry"}
      </Button>
      <p role="status" className="sr-only">
        {annonce}
      </p>
    </>
  );
}
