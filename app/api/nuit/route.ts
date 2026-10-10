import { journal } from "@/lib/journal";
import { rattraper } from "@/lib/nuit";

// La tâche planifiée de la nuit, appelée par Vercel Cron (vercel.json).
// Protégée par CRON_SECRET : Vercel l'envoie dans l'en-tête Authorization ;
// sans lui, personne d'autre ne peut déclencher l'import.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || requete.headers.get("authorization") !== `Bearer ${secret}`) {
    journal("nuit_refusee", { raison: "secret absent ou faux" });
    return new Response("Non autorisé.", { status: 401 });
  }
  // Par paquets de 4 nuits : la nuit qui vient de finir, ou les nuits manquées.
  const bilans = await rattraper("nuit", 4);
  return Response.json({ ok: !bilans.some((b) => b.statut === "echec"), bilans });
}
