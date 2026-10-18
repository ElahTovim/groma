import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { attestations, comptes } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { appelant } from "@/lib/session";

// Une attestation de vigilance : l'équipe et le gérant, ou l'entreprise elle-même.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  if (!z.uuid().safeParse(id).success) return new Response("Introuvable.", { status: 404 });
  const [a] = await db.select().from(attestations).where(eq(attestations.id, id)).limit(1);
  const [moi] = await db.select({ siren: comptes.siren }).from(comptes).where(eq(comptes.id, qui.id)).limit(1);
  if (!a || !(voitLInterne(qui.role) || (moi?.siren && moi.siren === a.siren))) {
    journal("attestation_refusee", { compte: qui.id, role: qui.role, attestation: id });
    return new Response("Introuvable.", { status: 404 });
  }
  const b = await get(a.fichierUrl, { access: "private" });
  if (!b) return new Response("Fichier introuvable.", { status: 404 });
  journal("attestation_ouverte", { compte: qui.id, attestation: id });
  return new Response(b.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.fichierNom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
