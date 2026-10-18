import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { equipeVoitTout } from "@/lib/acces";
import { appelantObligatoire } from "@/lib/session";
import { BoutonIa } from "./bouton-ia";
import { BoutonJeu } from "./bouton-jeu";
import { BoutonSentry } from "./bouton-sentry";

export const dynamic = "force-dynamic";

export default async function Reglages() {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Réglages</h1>
      <Card>
        <CardHeader>
          <CardTitle>Jeu de données fictif</CardTitle>
          <CardDescription>
            Efface puis recrée à l&apos;identique cinquante chantiers et dix personnes fictives, pour essayer le produit. Vos
            vrais comptes et vos vrais chantiers ne sont pas touchés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BoutonJeu />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Facturation</CardTitle>
          <CardDescription>
            Un fichier par chantier, à importer dans votre outil de facturation : le client tel que le registre le connaît, le montant HT, la date de réception, et le prochain jalon à facturer (acompte, situation, solde, retenue de garantie).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/export/facturation" className={buttonVariants({ variant: "outline" })}>
            Exporter pour la facturation (CSV)
          </a>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Flux de nuit</CardTitle>
          <CardDescription>Lire une nuit du flux telle quelle, sans rien importer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/reglages/flux" className={buttonVariants({ variant: "outline" })}>
            Lire le flux
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Intelligence artificielle</CardTitle>
          <CardDescription>Un petit appel réel au modèle (Anthropic) et au service de vecteurs (Voyage), pour vérifier que les clés sont bonnes. Coût : une fraction de centime.</CardDescription>
        </CardHeader>
        <CardContent>
          <BoutonIa />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Suivi des erreurs</CardTitle>
          <CardDescription>Envoie une erreur fictive à Sentry, pour vérifier que les vraies erreurs y arriveront.</CardDescription>
        </CardHeader>
        <CardContent>
          <BoutonSentry />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Accès de l&apos;équipe</CardTitle>
          <CardDescription>
            {equipeVoitTout()
              ? "L'équipe voit tous les chantiers de l'entreprise."
              : "Chaque membre de l'équipe ne voit que les chantiers où il est invité."}{" "}
            Ce réglage se change dans Vercel (EQUIPE_VOIT_TOUT).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
