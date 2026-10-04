import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Même page pour un chantier qui n'existe pas et pour un chantier où l'on n'est
// pas invité : on ne révèle pas lequel des deux.
export default function ChantierIntrouvable() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">Chantier introuvable.</p>
      <p className="text-sm text-muted-foreground">Il n&apos;existe pas, ou vous n&apos;y êtes pas invité.</p>
      <Link href="/chantiers" className={buttonVariants({ variant: "outline" })}>
        Retour aux chantiers
      </Link>
    </div>
  );
}
