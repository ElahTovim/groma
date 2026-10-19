"use server";

import { revalidatePath } from "next/cache";
import { journal } from "@/lib/journal";
import { adresseDuSite } from "@/lib/courriel";
import { importerNuit, rattraper, type BilanNuit } from "@/lib/nuit";
import { etapesDuMatin } from "@/lib/nuit-etapes";
import type { ResultatEtape } from "@/lib/nuit-etapes-regles";
import { envoyerRecapitulatifs } from "@/lib/recap";
import { aujourdhuiParis } from "@/lib/regles";
import { appelant } from "@/lib/session";

export type ResultatNuit = { ok: boolean; message: string };

function resumer(b: BilanNuit): string {
  if (b.statut === "deja_en_cours") return `Nuit du ${b.nuit} : un import est déjà en cours.`;
  if (b.statut === "echec") return `Nuit du ${b.nuit} : échec. ${b.erreur ?? ""}`;
  return `Nuit du ${b.nuit} : ${b.recus} reçus, ${b.appliques} appliqués, ${b.doublons} doublons ignorés, ${b.rejetes} mis de côté.`;
}

async function gerant() {
  const qui = await appelant();
  return qui && qui.role === "gerant" ? qui : null;
}

// Relancer une nuit à la main : sans danger, c'est le même import, et un événement
// déjà reçu est reconnu et ignoré.
export async function relancerNuit(nuit: string): Promise<ResultatNuit> {
  const qui = await gerant();
  if (!qui) return { ok: false, message: "Seul le gérant peut relancer la machine de nuit." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nuit) || nuit > aujourdhuiParis()) return { ok: false, message: "Nuit invalide." };
  journal("nuit_relancee", { compte: qui.id, nuit });
  const b = await importerNuit(nuit, "manuel");
  revalidatePath("/nuit");
  return { ok: b.statut !== "echec", message: resumer(b) };
}

export async function rattraperMaintenant(): Promise<ResultatNuit> {
  const qui = await gerant();
  if (!qui) return { ok: false, message: "Seul le gérant peut lancer un rattrapage." };
  const bilans = await rattraper("manuel", 10);
  revalidatePath("/nuit");
  if (bilans.length === 0) return { ok: true, message: "Rien à rattraper : toutes les nuits sont importées." };
  return { ok: !bilans.some((b) => b.statut === "echec"), message: bilans.map(resumer).join(" ") };
}

// Envoyer le récapitulatif du jour maintenant. Une seule fois par jour et par personne :
// un second clic n'envoie rien.
export async function envoyerRecapMaintenant(): Promise<ResultatNuit> {
  const qui = await gerant();
  if (!qui) return { ok: false, message: "Seul le gérant peut envoyer le récapitulatif." };
  const b = await envoyerRecapitulatifs(await adresseDuSite());
  revalidatePath("/nuit");
  const parts = [`${b.envoyes} envoyé${b.envoyes > 1 ? "s" : ""}`, `${b.dejaEnvoyes} déjà envoyé${b.dejaEnvoyes > 1 ? "s" : ""} aujourd'hui`];
  if (b.refuses) parts.push(`${b.refuses} refusé${b.refuses > 1 ? "s" : ""} par le service d'envoi`);
  return { ok: b.refuses === 0, message: `Récapitulatif : ${parts.join(", ")}.` };
}

const NOM_ETAPE: Record<ResultatEtape["etape"], string> = { courriers: "Courriers", documents: "Documents", analyse: "Analyse", recapitulatif: "Récapitulatif" };
const STATUT_ETAPE: Record<ResultatEtape["statut"], string> = { faite: "fait", deja_faite: "déjà fait ce matin", reportee: "reporté", en_panne: "en panne", trop_longue: "trop long, repris au prochain passage", sans_objet: "rien à faire pour l'instant" };

// Les étapes du matin à la main : courriers, documents, analyse de la nuit, sans le
// récapitulatif. Sans danger : chaque étape est idempotente, et l'analyse n'est faite
// qu'une fois par nuit.
export async function etapesDuMatinMaintenant(): Promise<ResultatNuit> {
  const qui = await gerant();
  if (!qui) return { ok: false, message: "Seul le gérant peut lancer les étapes du matin." };
  journal("nuit_etapes_lancees", { compte: qui.id });
  const etapes = await etapesDuMatin({ site: await adresseDuSite(), avecRecap: false });
  revalidatePath("/nuit");
  return {
    ok: !etapes.some((e) => e.statut === "en_panne"),
    message: etapes.map((e) => `${NOM_ETAPE[e.etape]} : ${STATUT_ETAPE[e.statut]}${e.detail ? ` (${e.detail})` : ""}.`).join(" "),
  };
}
