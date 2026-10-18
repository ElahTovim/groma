"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { indexerLesDocuments } from "./actions";

export function BoutonIndexer({ libelle = "Indexer les documents du flux", variant = "default" }: { libelle?: string; variant?: "default" | "outline" }) {
  const [enCours, demarrer] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await indexerLesDocuments();
          if (!r.ok) {
            toast.error(r.erreur, { duration: 12000 });
            return;
          }
          if (r.misDeCote.length) {
            toast.warning(`${r.message} Mis de côté : ${r.misDeCote.map((d) => `${d.id} (${d.raison})`).join(" ; ")}`, { duration: 20000 });
          } else toast.success(r.message, { duration: 10000 });
          router.refresh();
        })
      }
    >
      {enCours ? "Indexation en cours…" : libelle}
    </Button>
  );
}
