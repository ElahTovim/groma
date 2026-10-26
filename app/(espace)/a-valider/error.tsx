"use client";

import { Button } from "@/components/ui/button";

// L'état « erreur » de la file « À valider ».
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center">
      <h1 className="font-medium">Impossible de charger les propositions.</h1>
      <p className="text-sm text-muted-foreground">Réessayez dans un instant. Rien n&apos;a été envoyé.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
