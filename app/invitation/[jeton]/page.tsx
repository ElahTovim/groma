import { eq } from "drizzle-orm";
import Link from "next/link";
import { FormulaireMotDePasse } from "@/components/formulaire-mot-de-passe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { chantiers } from "@/lib/db/schema";
import { lireJeton } from "@/lib/jetons";
import { accepterInvitation } from "./actions";

export const dynamic = "force-dynamic";

export default async function PageInvitation({ params }: PageProps<"/invitation/[jeton]">) {
  const { jeton } = await params;
  const j = await lireJeton(jeton, "invitation");
  const [chantier] = j?.chantierId ? await db.select({ nom: chantiers.nom, ville: chantiers.ville }).from(chantiers).where(eq(chantiers.id, j.chantierId)).limit(1) : [];

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        {!j || !chantier ? (
          <>
            <CardHeader>
              <CardTitle>Lien expiré</CardTitle>
              <CardDescription>Ce lien d&apos;invitation n&apos;est plus valable : il a expiré ou a déjà servi. Demandez-en un nouveau à la personne qui vous a invité.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/connexion" className="text-sm underline">
                Aller à la connexion
              </Link>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Bienvenue sur groma</CardTitle>
              <CardDescription>
                Vous êtes invité sur le chantier « {chantier.nom} » ({chantier.ville}), en tant que {j.qualite}. Créez votre compte pour {j.email}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormulaireMotDePasse action={accepterInvitation.bind(null, jeton)} avecNom bouton="Créer mon compte" />
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
