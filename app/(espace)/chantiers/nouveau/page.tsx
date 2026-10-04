import Link from "next/link";
import { notFound } from "next/navigation";
import { peutCreerChantier } from "@/lib/acces";
import { appelantObligatoire } from "@/lib/session";
import { FormulaireNouveauChantier } from "./formulaire";

export default async function NouveauChantier() {
  const qui = await appelantObligatoire();
  if (!peutCreerChantier(qui.role)) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link href="/chantiers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tous les chantiers
      </Link>
      <h1 className="text-2xl font-semibold">Nouveau chantier</h1>
      <FormulaireNouveauChantier />
    </div>
  );
}
