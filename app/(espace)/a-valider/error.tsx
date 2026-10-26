"use client";

import { Button } from "@/components/ui/button";

// L'état « erreur » de la file « À valider ».
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center">
      <p className="font-medium">Impossible de charger les propositions.</p>
      <p className="text-sm text-muted-foreground">Réessayez dans un instant. Rien n&apos;a été envoyé.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
