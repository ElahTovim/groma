"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rejouer } from "./actions";

export function BoutonsLots(props: { lots: number[][] }) {
  const [enCours, demarrer] = useTransition();
  const [lot, setLot] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {props.lots.map((numeros, i) => (
          <Button
            key={i}
            variant="outline"
            disabled={enCours}
            onClick={() => {
              setLot(i + 1);
              demarrer(async () => {
                const r = await rejouer(i + 1);
                if (r.ok) toast.success(r.message, { duration: 10000 });
                else toast.error(r.message);
              });
            }}
          >
            {enCours && lot === i + 1 ? "Lot en cours…" : `Lot ${i + 1} : n° ${numeros.join(", ")}`}
          </Button>
        ))}
      </div>
      {enCours && <p className="text-sm text-muted-foreground">Trois exécutions de l&apos;assistant, l&apos;une après l&apos;autre : jusqu&apos;à quatre minutes. Restez sur la page.</p>}
    </div>
  );
}

export function CopierBilan({ texte, libelle = "Copier le bilan", message = "Bilan copié : collez-le à Claude." }: { texte: string; libelle?: string; message?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigator.clipboard.writeText(texte).then(
          () => toast.success(message),
          () => toast.error("Copie impossible."),
        )
      }
    >
      {libelle}
    </Button>
  );
}
