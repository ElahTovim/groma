import { exporterMesDonnees } from "@/lib/donnees-personnelles";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

export const dynamic = "force-dynamic";

// « Exporter mes données » (RGPD, droit d'accès et de portabilité) : un fichier JSON avec tout
// ce que groma garde sur la personne connectée, et rien sur les autres.
export async function GET() {
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  const donnees = await exporterMesDonnees(qui);
  journal("export_donnees_personnelles", { compte: qui.id });
  return new Response(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="groma-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
