"use client";

import { Button } from "@/components/ui/button";

// L'état « erreur » de l'accueil et des pages qui n'ont pas le leur.
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center">
      <p className="text-xl font-bold tracking-tight">Impossible de charger cette page.</p>
      <p className="text-muted-foreground">Réessayez dans un instant. Si l&apos;erreur persiste, elle a été notée.</p>
      <Button size="lg" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
