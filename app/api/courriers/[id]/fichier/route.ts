import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { courriers } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

// Le lien privé du PDF d'un courrier déposé : seuls le gérant et l'équipe l'ouvrent.
// Le fichier est en accès privé sur Vercel Blob : sans cette porte, il est illisible.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: brut } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  let id = brut;
  try {
    id = decodeURIComponent(brut);
  } catch {}
  if (!voitLInterne(qui.role) || !id || id.length > 120) {
    journal("fichier_refuse", { compte: qui.id, role: qui.role, courrier: id.slice(0, 120) });
    return new Response("Introuvable.", { status: 404 });
  }

  const [c] = await db.select({ fichierUrl: courriers.fichierUrl, fichierNom: courriers.fichierNom }).from(courriers).where(eq(courriers.id, id)).limit(1);
  if (!c?.fichierUrl) return new Response("Introuvable.", { status: 404 });

  const b = await get(c.fichierUrl, { access: "private" });
  if (!b) return new Response("Fichier introuvable.", { status: 404 });
  journal("fichier_ouvert", { compte: qui.id, courrier: id });
  return new Response(b.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(c.fichierNom ?? "courrier.pdf")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
