import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { journal } from "@/lib/journal";

// Sans nom de domaine vérifié chez Resend, l'expéditeur est celui de Resend, et
// les courriels ne partent que vers l'adresse du compte Resend. Les autres
// destinataires sont refusés par Resend : le produit le dit, et ne plante pas.
const EXPEDITEUR = process.env.COURRIEL_EXPEDITEUR ?? "groma <onboarding@resend.dev>";

export type ResultatCourriel = { ok: true } | { ok: false; raison: string };

export async function envoyerCourriel(params: { a: string; sujet: string; texte: string }): Promise<ResultatCourriel> {
  const cle = process.env.RESEND_GROMAA;
  if (!cle) return { ok: false, raison: "Courriels non configurés." };
  try {
    const { error } = await new Resend(cle).emails.send({ from: EXPEDITEUR, to: params.a, subject: params.sujet, text: params.texte });
    if (error) {
      journal("courriel_refuse", { a: params.a, sujet: params.sujet, erreur: error.message });
      return { ok: false, raison: "Le courriel n'est pas parti (sans nom de domaine, Resend n'envoie qu'à l'adresse du compte)." };
    }
    journal("courriel", { a: params.a, sujet: params.sujet });
    return { ok: true };
  } catch (e) {
    journal("courriel_echec", { a: params.a, erreur: String(e) });
    return { ok: false, raison: "Le service de courriel ne répond pas." };
  }
}

// Les alertes au gérant : à chaque étape qui compte (docs/cycle-de-vie.md).
export async function alerterGerants(sujet: string, texte: string): Promise<void> {
  const gerants = await db.select({ email: comptes.email }).from(comptes).where(eq(comptes.role, "gerant"));
  await Promise.all(gerants.map((g) => envoyerCourriel({ a: g.email, sujet, texte })));
}

// L'adresse du site, pour fabriquer les liens des courriels (prévisualisation ou production).
export async function adresseDuSite(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "gromaa.vercel.app";
  const protocole = h.get("x-forwarded-proto") ?? "https";
  return `${protocole}://${hote}`;
}
