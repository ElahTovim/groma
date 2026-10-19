import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { pieces } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

// Le fichier d'une pièce attendue. Le lisent : l'équipe et le gérant ; l'intervenant à qui la
// pièce appartient ; pour une pièce de chantier, quiconque a accès à ce chantier.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  if (!z.uuid().safeParse(id).success) return new Response("Introuvable.", { status: 404 });
  const [p] = await db.select().from(pieces).where(eq(pieces.id, id)).limit(1);
  const autorise = p && (voitLInterne(qui.role) || p.compteId === qui.id || (p.chantierId && !p.compteId && (await lireChantier(qui, p.chantierId))));
  if (!p || !autorise) {
    journal("piece_refusee_lecture", { compte: qui.id, role: qui.role, piece: id });
    return new Response("Introuvable.", { status: 404 });
  }
  const b = await get(p.fichierUrl, { access: "private" });
  if (!b) return new Response("Fichier introuvable.", { status: 404 });
  journal("piece_ouverte", { compte: qui.id, piece: id });
  return new Response(b.stream, {
    headers: {
      "Content-Type": p.fichierType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(p.fichierNom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
