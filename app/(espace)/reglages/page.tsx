import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { equipeVoitTout } from "@/lib/acces";
import { commandeClaudeCode } from "@/lib/assistant-regles";
import { adresseDuSite } from "@/lib/courriel";
import { mesJetons } from "@/lib/operations/jetons";
import { appelantObligatoire } from "@/lib/session";
import { lireProfil } from "@/lib/profil";
import { BoutonIa } from "./bouton-ia";
import { FormulaireProfil } from "./profil";
import { BoutonJeu } from "./bouton-jeu";
import { BoutonSentry } from "./bouton-sentry";
import { JetonsMcp } from "./jetons-mcp";

export const dynamic = "force-dynamic";

export default async function Reglages() {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const profil = await lireProfil();
  // Les jetons : si leur lecture échoue, la carte le dit et le reste des réglages s'affiche.
  const [jetons, site] = await Promise.all([mesJetons(qui).catch(() => null), adresseDuSite()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Réglages</h1>
      <Card>
        <CardHeader>
          <CardTitle>L&apos;entreprise</CardTitle>
          <CardDescription>
            {profil.regle ? "Le nom et le dépôt de votre entreprise." : "À régler une première fois : le nom de votre entreprise et l'adresse de son dépôt."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireProfil nom={profil.nom} depot={profil.depot} geolocalise={profil.depot?.latitude != null} />
        </CardContent>
      </Card>
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
          <CardTitle>Claude Code (serveur MCP)</CardTitle>
          <CardDescription>
            Donnez à Claude Code, sur votre poste, les outils de l&apos;assistant : lire les chantiers, écrire dans le fil en interne, et proposer ce qui part vers quelqu&apos;un, qui attend alors dans « À valider ». Un jeton par poste, avec vos droits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jetons ? <JetonsMcp jetons={jetons} commande={commandeClaudeCode(site)} /> : <p className="text-sm">Les jetons n&apos;ont pas pu être lus. Rechargez la page dans un moment.</p>}
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
