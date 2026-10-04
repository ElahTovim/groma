"use client";

import { Button } from "@/components/ui/button";

// L'état « erreur » de toutes les pages chantiers.
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">Impossible de charger les chantiers.</p>
      <p className="text-sm text-muted-foreground">Réessayez dans un instant. Si l&apos;erreur persiste, elle a été notée.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
