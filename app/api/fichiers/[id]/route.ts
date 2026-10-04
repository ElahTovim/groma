import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { fil } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { voitElement } from "@/lib/regles";
import { appelant } from "@/lib/session";

// Le lien privé d'une pièce jointe : on vérifie que la personne connectée a accès
// au chantier ET à cet élément du fil, puis on lui passe le fichier. Le fichier
// lui-même est en accès privé sur Vercel Blob : sans cette porte, il est illisible.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  if (!z.uuid().safeParse(id).success) return new Response("Introuvable.", { status: 404 });

  const [e] = await db.select().from(fil).where(eq(fil.id, id)).limit(1);
  const chantier = e ? await lireChantier(qui, e.chantierId) : null;
  if (!e || !e.fichierUrl || !chantier || !voitElement(qui, e)) {
    journal("fichier_refuse", { compte: qui.id, role: qui.role, element: id });
    return new Response("Introuvable.", { status: 404 });
  }

  const b = await get(e.fichierUrl, { access: "private" });
  if (!b) return new Response("Fichier introuvable.", { status: 404 });
  journal("fichier_ouvert", { compte: qui.id, element: id });
  return new Response(b.stream, {
    headers: {
      "Content-Type": e.fichierType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(e.fichierNom ?? "fichier")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
