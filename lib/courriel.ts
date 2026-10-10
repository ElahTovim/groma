import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { DOMAINE_FICTIF } from "@/lib/jeu-de-donnees";
import { journal } from "@/lib/journal";

// L'expéditeur vient de COURRIEL_EXPEDITEUR (domaine groma.tovimstudio.com vérifié
// chez Resend). Sans lui, Resend n'envoie qu'à l'adresse du compte Resend ; un
// refus est dit à l'écran et noté, le produit ne plante pas.
const EXPEDITEUR = process.env.COURRIEL_EXPEDITEUR ?? "groma <onboarding@resend.dev>";

export type ResultatCourriel = { ok: true } | { ok: false; raison: string };

export async function envoyerCourriel(params: { a: string; sujet: string; texte: string }): Promise<ResultatCourriel> {
  // Les comptes du jeu de données ont des adresses inventées : un courriel vers elles
  // rebondirait et abîmerait la réputation du domaine d'envoi.
  if (params.a.toLowerCase().endsWith(`@${DOMAINE_FICTIF}`)) {
    journal("courriel_fictif_ignore", { sujet: params.sujet });
    return { ok: false, raison: "Adresse fictive du jeu de données : aucun courriel envoyé." };
  }
  const cle = process.env.RESEND_GROMAA;
  if (!cle) return { ok: false, raison: "Courriels non configurés." };
  try {
    const { error } = await new Resend(cle).emails.send({ from: EXPEDITEUR, to: params.a, subject: params.sujet, text: params.texte });
    if (error) {
      journal("courriel_refuse", { a: params.a, sujet: params.sujet, erreur: error.message });
      return { ok: false, raison: "Le courriel n'est pas parti : le service d'envoi l'a refusé." };
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
