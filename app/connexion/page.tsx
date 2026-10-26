import type { Metadata } from "next";
import { count } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { appelant } from "@/lib/session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export const dynamic = "force-dynamic";

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  if (await appelant()) redirect("/");
  const [{ n }] = await db.select({ n: count() }).from(comptes);
  const { installe, invite, reinitialise } = await searchParams;
  const annonce = installe ? "Compte gérant créé. Connectez-vous." : invite ? "Compte créé. Connectez-vous pour voir votre chantier." : reinitialise ? "Mot de passe changé. Connectez-vous." : null;

  return (
    // Deux panneaux : à gauche une photo (public/images/accueil.jpg si elle est déposée,
    // sinon une photo du jeu de données), à droite le formulaire sur papier quadrillé.
    // Sur téléphone, un bandeau.
    <main className="grid flex-1 md:grid-cols-[1.1fr_1fr]">
      <div
        className="relative flex min-h-48 flex-col justify-end bg-foreground bg-cover bg-center p-6 text-background md:min-h-full md:p-10"
        style={{ backgroundImage: "url(/images/accueil.jpg), url(/jeu-de-donnees/interieur-1.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0" aria-hidden />
        <div className="relative flex flex-col gap-2">
          <p className="logo-groma text-5xl leading-none md:text-7xl">groma</p>
          <p className="max-w-sm text-base text-white/90 md:text-lg">Le suivi des chantiers de rénovation, du devis à la levée des réserves.</p>
        </div>
      </div>
      <div className="papier flex items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="annotation text-muted-foreground">Suivi de chantiers</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Connexion</h1>
          </div>
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
