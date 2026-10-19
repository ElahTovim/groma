import Link from "next/link";
import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { appelantObligatoire } from "@/lib/session";
import { FormulaireDepot } from "./formulaire";

export const dynamic = "force-dynamic";
// Le dépôt envoie le courrier puis le fait lire par l'IA dans la même action : on lui laisse le temps.
export const maxDuration = 60;

// Déposer un courrier que le flux n'a pas apporté : collé, ou en PDF. Gérant et équipe.
export default async function DeposerCourrier() {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/courriers" className="text-sm text-muted-foreground hover:underline">
          ← Courriers
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Déposer un courrier</h1>
        <p className="text-sm text-muted-foreground">
          Collez le texte d&apos;un courrier, ou déposez-le en PDF. L&apos;IA le lit tout de suite et propose ses champs. Rien n&apos;est appliqué tant qu&apos;une personne n&apos;a pas relu et validé.
        </p>
      </div>
      <FormulaireDepot />
    </div>
  );
}
