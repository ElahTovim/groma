import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { estPhotoFictive, photoAffichee } from "@/lib/jeu-de-donnees";
import { chantiers } from "@/lib/db/schema";
import { appelant } from "@/lib/session";

// La photo d'un chantier : visible par tous ceux qui ont accès au chantier, et par personne d'autre.
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  const chantier = await lireChantier(qui, id);
  if (!chantier) return new Response("Introuvable.", { status: 404 });
  const [c] = await db.select({ photoUrl: chantiers.photoUrl, reference: chantiers.reference }).from(chantiers).where(eq(chantiers.id, id)).limit(1);
  const url = c ? photoAffichee(c.photoUrl, c.reference) : null;
  if (!url) return new Response("Pas de photo.", { status: 404 });
  // Photo du jeu de données (la sienne ou celle par défaut) : une image fixe du site, on y renvoie.
  if (estPhotoFictive(url)) return Response.redirect(new URL(url, requete.url), 302);
  const b = await get(url, { access: "private" });
  if (!b) return new Response("Photo introuvable.", { status: 404 });
  return new Response(b.stream, {
    headers: {
      "Content-Type": b.blob.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
