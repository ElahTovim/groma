import { and, desc, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { executions } from "@/lib/db/schema";
import { etatNuit } from "@/lib/sante-nuit";

export const dynamic = "force-dynamic";

// La sonde de la machine de nuit, pour UptimeRobot : 200 si la nuit est importée,
// 503 sinon. Publique, comme /api/sante : elle ne dit que oui ou non, et pourquoi.
export async function GET() {
  const [derniere] = await db.select({ statut: executions.statut, debut: executions.debut }).from(executions).where(isNotNull(executions.fin)).orderBy(desc(executions.debut)).limit(1);
  const [reussie] = await db
    .select({ fin: executions.fin })
    .from(executions)
    .where(and(isNotNull(executions.fin), inArray(executions.statut, ["ok", "partiel"])))
    .orderBy(desc(executions.fin))
    .limit(1);
  const etat = etatNuit(derniere ?? null, reussie?.fin ?? null);
  return Response.json({ ok: etat.ok, raison: etat.raison, derniere_reussite: reussie?.fin ?? null }, { status: etat.ok ? 200 : 503 });
}
