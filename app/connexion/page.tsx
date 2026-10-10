import { count } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { FormulaireConnexion } from "./formulaire";

export const dynamic = "force-dynamic";

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  if (await auth()) redirect("/");
  const [{ n }] = await db.select({ n: count() }).from(comptes);
  const { installe, invite, reinitialise } = await searchParams;
  const annonce = installe ? "Compte gérant créé. Connectez-vous." : invite ? "Compte créé. Connectez-vous pour voir votre chantier." : reinitialise ? "Mot de passe changé. Connectez-vous." : null;

  return (
    // Deux panneaux : à gauche l'image d'accueil (public/images/accueil.jpg, sur fond
    // noir tant qu'elle n'existe pas), à droite le formulaire. Sur téléphone, un bandeau.
    <main className="grid flex-1 md:grid-cols-[1.1fr_1fr]">
      <div
        className="relative flex min-h-48 flex-col justify-end bg-foreground bg-cover bg-center p-6 text-background md:min-h-full md:p-10"
        style={{ backgroundImage: "url(/images/accueil.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0" aria-hidden />
        <div className="relative flex flex-col gap-2">
          <p className="text-4xl font-bold tracking-tight md:text-6xl">groma</p>
          <p className="max-w-sm text-base md:text-lg">Le suivi des chantiers de rénovation, du devis à la levée des réserves.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          {annonce && (
            <Alert>
              <AlertDescription>{annonce}</AlertDescription>
            </Alert>
          )}
          {n === 0 ? (
            <p className="text-sm">
              Aucun compte n&apos;existe encore.{" "}
              <Link href="/installation" className="underline">
                Faire la première installation
              </Link>
            </p>
          ) : (
            <>
              <FormulaireConnexion />
              <Link href="/mot-de-passe-oublie" className="text-sm underline">
                Mot de passe oublié ?
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
