import { count } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>groma</CardTitle>
          <CardDescription>Suivi de chantiers de rénovation</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
              <Link href="/mot-de-passe-oublie" className="text-sm text-muted-foreground underline">
                Mot de passe oublié ?
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
