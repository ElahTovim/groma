"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importerCourriers } from "./actions";

// Ce qui se passe pendant l'import, étape par étape (la lecture prend jusqu'à une minute).
const ETAPES = ["Récupération des courriers du flux…", "Lecture des courriers par l'IA…", "Vérification des champs proposés…"];

export function BoutonImport() {
  const [enCours, demarrer] = useTransition();
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    if (!enCours) return;
    const t = [setTimeout(() => setEtape(1), 2500), setTimeout(() => setEtape(2), 20000)];
    return () => t.forEach(clearTimeout);
  }, [enCours]);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="lg"
        disabled={enCours}
        onClick={() => {
          setEtape(0);
          demarrer(async () => {
            const r = await importerCourriers();
            if (r.ok) toast.success(r.message, { duration: 10000 });
            else toast.error(r.erreur, { duration: 12000 });
          });
        }}
      >
        {enCours ? "Import en cours…" : "Importer les courriers du flux"}
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {enCours ? `${ETAPES[etape]} Cela peut prendre jusqu'à une minute.` : ""}
      </p>
    </div>
  );
}
