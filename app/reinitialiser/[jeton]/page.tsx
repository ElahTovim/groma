import Link from "next/link";
import { FormulaireMotDePasse } from "@/components/formulaire-mot-de-passe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireJeton } from "@/lib/jetons";
import { reinitialiser } from "./actions";

export const dynamic = "force-dynamic";

export default async function PageReinitialiser({ params }: PageProps<"/reinitialiser/[jeton]">) {
  const { jeton } = await params;
  const j = await lireJeton(jeton, "reinitialisation");

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{j ? "Nouveau mot de passe" : "Lien expiré"}</CardTitle>
          <CardDescription>
            {j ? `Pour le compte ${j.email}.` : "Ce lien n'est plus valable : il a expiré ou a déjà servi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {j ? (
            <FormulaireMotDePasse action={reinitialiser.bind(null, jeton)} avecNom={false} bouton="Enregistrer le mot de passe" />
          ) : (
            <Link href="/mot-de-passe-oublie" className="text-sm underline">
              Refaire une demande
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
