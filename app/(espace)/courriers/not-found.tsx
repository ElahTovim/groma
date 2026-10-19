import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Même page pour un courrier qui n'existe pas et pour une personne qui n'a pas à le voir.
export default function CourrierIntrouvable() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">Courrier introuvable.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
