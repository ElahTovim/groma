import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { limites } from "@/lib/db/schema";
import { depasse, LIMITES, type Sujet } from "@/lib/limites-regles";

// Compte les tentatives d'un sujet pour une clé (adresse, réseau, compte) dans la fenêtre.
export async function atteinte(sujet: Sujet, cle: string): Promise<boolean> {
  const depuis = new Date(Date.now() - LIMITES[sujet].fenetreMs);
  const [{ n }] = await db
    .select({ n: count() })
    .from(limites)
    .where(and(eq(limites.sujet, sujet), eq(limites.cle, cle), gt(limites.creeLe, depuis)));
  return depasse(n, sujet);
}

export async function noter(sujet: Sujet, cle: string): Promise<void> {
  await db.insert(limites).values({ sujet, cle });
  // Ménage au passage : on ne garde rien au-delà de deux jours.
  if (Math.random() < 0.05) await db.delete(limites).where(lt(limites.creeLe, new Date(Date.now() - 2 * 24 * 3600 * 1000)));
}

export async function oublier(sujet: Sujet, cle: string): Promise<void> {
  await db.delete(limites).where(and(eq(limites.sujet, sujet), eq(limites.cle, cle)));
}
