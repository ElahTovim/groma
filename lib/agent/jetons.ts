import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { comptes, jetonsMcp } from "@/lib/db/schema";
import { empreinte } from "@/lib/empreinte";
import type { Appelant } from "@/lib/session";

// Les jetons du serveur MCP. On ne garde que l'empreinte : le jeton n'est montré qu'une fois.
// Personnel : créé dans Réglages, sans échéance, révocable. D'exécution : valable 10 minutes,
// pour le seul agent qui tourne dans son bac à sable.

export async function creerJeton(p: { compteId: string; nom: string; executionId?: string; dureeMs?: number }): Promise<{ jeton: string; id: string }> {
  const jeton = `groma_${randomBytes(24).toString("base64url")}`;
  const [l] = await db
    .insert(jetonsMcp)
    .values({ compteId: p.compteId, nom: p.nom.slice(0, 80), empreinte: empreinte(jeton), executionId: p.executionId ?? null, expireLe: p.dureeMs ? new Date(Date.now() + p.dureeMs) : null })
    .returning({ id: jetonsMcp.id });
  return { jeton, id: l.id };
}

// Qui présente ce jeton ? Le rôle est relu en base, comme pour une session.
export async function verifierJeton(entete: string | null): Promise<{ qui: Appelant; jetonId: string; executionId: string | null } | null> {
  const m = entete?.match(/^Bearer\s+(groma_[A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const [l] = await db
    .select({ id: jetonsMcp.id, executionId: jetonsMcp.executionId, compteId: comptes.id, nom: comptes.nom, role: comptes.role })
    .from(jetonsMcp)
    .innerJoin(comptes, eq(jetonsMcp.compteId, comptes.id))
    .where(and(eq(jetonsMcp.empreinte, empreinte(m[1])), isNull(jetonsMcp.revoqueLe), or(isNull(jetonsMcp.expireLe), gt(jetonsMcp.expireLe, new Date()))))
    .limit(1);
  if (!l) return null;
  await db.update(jetonsMcp).set({ derniereUtilisation: new Date() }).where(eq(jetonsMcp.id, l.id));
  return { qui: { id: l.compteId, nom: l.nom, role: l.role }, jetonId: l.id, executionId: l.executionId };
}

export async function revoquerJeton(id: string, compteId?: string): Promise<boolean> {
  const fait = await db
    .update(jetonsMcp)
    .set({ revoqueLe: new Date() })
    .where(and(eq(jetonsMcp.id, id), compteId ? eq(jetonsMcp.compteId, compteId) : undefined, isNull(jetonsMcp.revoqueLe)))
    .returning({ id: jetonsMcp.id });
  return fait.length > 0;
}

export async function jetonsPersonnels(compteId: string) {
  return db
    .select({ id: jetonsMcp.id, nom: jetonsMcp.nom, creeLe: jetonsMcp.creeLe, derniereUtilisation: jetonsMcp.derniereUtilisation, revoqueLe: jetonsMcp.revoqueLe })
    .from(jetonsMcp)
    .where(and(eq(jetonsMcp.compteId, compteId), isNull(jetonsMcp.executionId)))
    .orderBy(jetonsMcp.creeLe);
}
