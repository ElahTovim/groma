import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dsnSentry } from "@/lib/sentry-dsn";

export const dynamic = "force-dynamic";

// Santé du produit, lisible sans compte : la base répond-elle ?
// « base » est une empreinte de l'adresse de la base, jamais l'adresse elle-même :
// elle permet de vérifier qu'une prévisualisation n'utilise pas la base de production.
export async function GET() {
  const hote = new URL(process.env.DATABASE_URL ?? "postgres://inconnu").hostname;
  const base = createHash("sha256").update(hote).digest("hex").slice(0, 8);
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, base, sentry: Boolean(dsnSentry()), meteo: Boolean(process.env.OPENWEATHER_GROMAA), courriel: Boolean(process.env.RESEND_GROMAA), fichiers: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
  } catch {
    return Response.json({ ok: false, base, erreur: "La base ne répond pas." }, { status: 503 });
  }
}
