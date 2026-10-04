import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { jetons, type Role } from "@/lib/db/schema";
import { empreinte } from "@/lib/empreinte";

// Les liens à usage unique : invitation (7 jours) et mot de passe oublié (1 heure).
export const DUREE = { invitation: 7 * 24 * 3600 * 1000, reinitialisation: 3600 * 1000 };

export async function creerJeton(params: {
  type: "invitation" | "reinitialisation";
  email: string;
  chantierId?: string;
  role?: Role;
  qualite?: string;
  creePar?: string;
}): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");
  await db.insert(jetons).values({
    ...params,
    empreinte: empreinte(jeton),
    expireLe: new Date(Date.now() + DUREE[params.type]),
  });
  return jeton;
}

// Lire un jeton encore valable, sans le consommer (pour afficher la page).
export async function lireJeton(jeton: string, type: "invitation" | "reinitialisation") {
  const [j] = await db
    .select()
    .from(jetons)
    .where(and(eq(jetons.empreinte, empreinte(jeton)), eq(jetons.type, type), isNull(jetons.utiliseLe), gt(jetons.expireLe, new Date())))
    .limit(1);
  return j ?? null;
}

// Consommer un jeton : une seule fois. Le « where utilise_le is null » empêche
// deux envois du même lien de réussir tous les deux.
export async function consommerJeton(jeton: string, type: "invitation" | "reinitialisation") {
  const [j] = await db
    .update(jetons)
    .set({ utiliseLe: new Date() })
    .where(and(eq(jetons.empreinte, empreinte(jeton)), eq(jetons.type, type), isNull(jetons.utiliseLe), gt(jetons.expireLe, new Date())))
    .returning();
  return j ?? null;
}
