import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { FormulaireInstallation } from "./formulaire";

export const dynamic = "force-dynamic";

export default async function PageInstallation() {
  const [{ n }] = await db.select({ n: count() }).from(comptes);
  if (n > 0) redirect("/connexion");

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Première installation</CardTitle>
          <CardDescription>
            Créez le compte du gérant. Seule l&apos;adresse prévue dans les réglages est acceptée, et cette page
            disparaît une fois le compte créé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireInstallation />
        </CardContent>
      </Card>
    </main>
  );
}
