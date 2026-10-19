import { alerterGerants } from "@/lib/courriel";
import { ouEstCitee, reverifierEntreprises } from "@/lib/entreprises";
import { journal } from "@/lib/journal";
import { rattraper } from "@/lib/nuit";
import { etapesDuMatin } from "@/lib/nuit-etapes";
import { relancerPieces } from "@/lib/pieces";
import { heureDuRecap } from "@/lib/sante-nuit";

// La tâche planifiée de la nuit, appelée par Vercel Cron (vercel.json), en trois passages :
// - 4 h UTC : l'import des événements, le registre des entreprises, les relances de pièces ;
// - 5 h UTC (?recap=1) : un nouvel essai de l'import, puis les étapes du matin
//   (courriers, documents, analyse de la nuit par le modèle) et le récapitulatif ;
// - 6 h UTC (?recap=1&passage=2) : la reprise de ce que le passage de 5 h n'a pas fini.
// Le récapitulatif ne part qu'une fois 7 h passées à Paris (heure d'été comme d'hiver).
// Chaque étape tient dans le temps restant (lib/nuit-etapes-regles.ts) ; ce qui ne tient
// pas est repris au passage suivant, sans rien doubler.
// Protégée par CRON_SECRET : Vercel l'envoie dans l'en-tête Authorization ;
// sans lui, personne d'autre ne peut la déclencher.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://gromaa.vercel.app";

export async function GET(requete: Request) {
  const debut = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!secret || requete.headers.get("authorization") !== `Bearer ${secret}`) {
    journal("nuit_refusee", { raison: "secret absent ou faux" });
    return new Response("Non autorisé.", { status: 401 });
  }
  // Par paquets de 10 nuits (environ 2 s chacune) : la nuit qui vient de finir, ou les nuits manquées.
  const bilans = await rattraper("nuit", 10);
  const echec = bilans.find((b) => b.statut === "echec");

  // L'alerte au gérant part depuis lib/nuit.ts, à chaque import en échec (en plus de Sentry).
  const avecRecap = new URL(requete.url).searchParams.get("recap") === "1";

  // Au passage de 6 h : les entreprises vérifiées il y a plus d'une semaine sont revérifiées
  // dans le registre. Une entreprise qui vient de fermer déclenche un courriel au gérant.
  const registre = avecRecap ? null : await reverifierEntreprises(20);
  for (const f of registre?.nouvellementFermees ?? []) {
    const ou = await ouEstCitee(f.siren);
    const lignes = [...ou.chantiers.map((c) => `- client du chantier ${c.reference} (${c.nom})`), ...ou.comptes.map((n) => `- entreprise de ${n}`)];
    await alerterGerants(
      `groma · ${f.nom} est fermée dans le registre`,
      `Le registre des entreprises indique désormais que ${f.nom} (SIREN ${f.siren}) est fermée.\n\nElle est citée ici :\n${lignes.join("\n") || "- nulle part pour l'instant"}\n\nÀ vérifier avant toute nouvelle commande ou facture.\n\n${SITE}/chantiers`,
    );
  }

  // Au même passage : les intervenants dont une pièce attendue manque, est refusée ou expire.
  const pieces = avecRecap ? null : await relancerPieces(SITE);

  // Les étapes du matin, aux passages de 5 h et 6 h. Avant 7 h à Paris (l'hiver, au
  // passage de 5 h UTC), le récapitulatif attend le passage suivant.
  const dernierPassage = new URL(requete.url).searchParams.get("passage") === "2";
  const etapes = avecRecap ? await etapesDuMatin({ site: SITE, avecRecap: heureDuRecap(), dernierPassage, debut }) : [];
  return Response.json({ ok: !echec, bilans, registre, pieces, etapes });
}
