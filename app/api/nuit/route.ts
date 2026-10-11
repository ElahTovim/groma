import { envoyerCourriel } from "@/lib/courriel";
import { journal } from "@/lib/journal";
import { rattraper } from "@/lib/nuit";
import { envoyerRecapitulatifs } from "@/lib/recap";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// La tâche planifiée de la nuit, appelée par Vercel Cron (vercel.json) :
// à 6 h l'import, à 7 h un nouvel essai puis le récapitulatif (?recap=1).
// Protégée par CRON_SECRET : Vercel l'envoie dans l'en-tête Authorization ;
// sans lui, personne d'autre ne peut la déclencher.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://gromaa.vercel.app";

export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || requete.headers.get("authorization") !== `Bearer ${secret}`) {
    journal("nuit_refusee", { raison: "secret absent ou faux" });
    return new Response("Non autorisé.", { status: 401 });
  }
  // Par paquets de 10 nuits (environ 2 s chacune) : la nuit qui vient de finir, ou les nuits manquées.
  const bilans = await rattraper("nuit", 10);
  const echec = bilans.find((b) => b.statut === "echec");

  // L'alerte : si le flux est en panne, le gérant est prévenu tout de suite (en plus de Sentry).
  if (echec) {
    const gerants = await db.select({ email: comptes.email }).from(comptes).where(eq(comptes.role, "gerant"));
    await Promise.all(
      gerants.map((g) =>
        envoyerCourriel({
          a: g.email,
          sujet: `groma · alerte : la nuit du ${echec.nuit} n'a pas pu être importée`,
          texte: `${echec.erreur ?? "Le flux de nuit ne répond pas."}\n\nLe reste du produit fonctionne. La nuit sera rattrapée au prochain passage.\n\n${SITE}/nuit`,
        }),
      ),
    );
  }

  const recap = new URL(requete.url).searchParams.get("recap") === "1" ? await envoyerRecapitulatifs(SITE) : null;
  return Response.json({ ok: !echec, bilans, recap });
}
