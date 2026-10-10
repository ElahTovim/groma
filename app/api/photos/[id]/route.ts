import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers } from "@/lib/db/schema";
import { appelant } from "@/lib/session";

// La photo d'un chantier : visible par tous ceux qui ont accès au chantier, et par personne d'autre.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  const chantier = await lireChantier(qui, id);
  if (!chantier) return new Response("Introuvable.", { status: 404 });
  const [c] = await db.select({ photoUrl: chantiers.photoUrl }).from(chantiers).where(eq(chantiers.id, id)).limit(1);
  if (!c?.photoUrl) return new Response("Pas de photo.", { status: 404 });
  const b = await get(c.photoUrl, { access: "private" });
  if (!b) return new Response("Photo introuvable.", { status: 404 });
  return new Response(b.stream, {
    headers: {
      "Content-Type": b.blob.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
