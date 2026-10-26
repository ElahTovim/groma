"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rejouer } from "./actions";

export function BoutonsLots(props: { lots: number[][] }) {
  const [enCours, demarrer] = useTransition();
  const [lot, setLot] = useState<number | null>(null);
  const [annonce, setAnnonce] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {props.lots.map((numeros, i) => (
          <Button
            key={i}
            variant="outline"
            disabled={enCours}
            focusableWhenDisabled
            className="aria-disabled:opacity-50"
            onClick={() => {
              if (enCours) return;
              setLot(i + 1);
              setAnnonce(`Lot ${i + 1} lancé.`);
              demarrer(async () => {
                const r = await rejouer(i + 1);
                setAnnonce(`Lot ${i + 1} terminé. ${r.message}`);
                if (r.ok) toast.success(r.message, { duration: 10000 });
                else toast.error(r.message);
              });
            }}
          >
            {enCours && lot === i + 1 ? "Lot en cours…" : `Lot ${i + 1} : n° ${numeros.join(", ")}`}
          </Button>
        ))}
      </div>
      <p role="status" className="sr-only">
        {annonce}
      </p>
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
