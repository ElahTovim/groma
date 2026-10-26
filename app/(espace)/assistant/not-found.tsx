import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Même page pour ce qui n'existe pas et pour ce qu'on n'a pas à voir.
export default function Introuvable() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center">
      <p className="font-medium">Page introuvable.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
