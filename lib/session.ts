import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { comptes, type Role } from "@/lib/db/schema";

export type Appelant = { id: string; nom: string; role: Role };

// Qui appelle ? Le rôle est relu en base à chaque demande, jamais pris dans le
// navigateur : un rôle changé ou un compte supprimé prend effet tout de suite.
export async function appelant(): Promise<Appelant | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [compte] = await db
    .select({ id: comptes.id, nom: comptes.nom, role: comptes.role })
    .from(comptes)
    .where(eq(comptes.id, session.user.id))
    .limit(1);
  return compte ?? null;
}

export async function appelantObligatoire(): Promise<Appelant> {
  const qui = await appelant();
  if (!qui) redirect("/connexion");
  return qui;
}
