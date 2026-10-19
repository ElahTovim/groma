import { eq } from "drizzle-orm";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { lireProfil } from "@/lib/profil";
import { contenuPv, fabriquerPdf, lirePv } from "@/lib/reception";
import { appelant } from "@/lib/session";

// Le PDF du PV de réception, fabriqué à la demande depuis la base. Le lisent :
// l'équipe et le gérant, et le signataire désigné. Aucun autre externe.
export async function GET(_: Request, { params }: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = await params;
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  const vu = await lireChantier(qui, chantierId);
  const pv = vu ? await lirePv(chantierId) : null;
  if (!vu || !pv || !(voitLInterne(qui.role) || pv.signataireId === qui.id)) {
    journal("pv_refuse", { compte: qui.id, role: qui.role, chantier: chantierId });
    return new Response("Introuvable.", { status: 404 });
  }
  // Signé : le contenu figé à la signature. Sinon : le brouillon, d'après la base.
  const [c] = await db.select().from(chantiers).where(eq(chantiers.id, chantierId)).limit(1);
  const pdf = await fabriquerPdf(pv.contenuSigne ?? contenuPv(c, pv, (await lireProfil()).nom), pv);
  journal("pv_ouvert", { compte: qui.id, chantier: chantierId, signe: Boolean(pv.signeLe) });
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PV-reception-${c.reference}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
