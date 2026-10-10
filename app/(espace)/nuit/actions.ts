"use server";

import { revalidatePath } from "next/cache";
import { journal } from "@/lib/journal";
import { importerNuit, rattraper, type BilanNuit } from "@/lib/nuit";
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
  const bilans = await rattraper("manuel", 4);
  revalidatePath("/nuit");
  if (bilans.length === 0) return { ok: true, message: "Rien à rattraper : toutes les nuits sont importées." };
  return { ok: !bilans.some((b) => b.statut === "echec"), message: bilans.map(resumer).join(" ") };
}
