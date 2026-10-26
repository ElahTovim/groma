"use server";

import { revalidatePath } from "next/cache";
import { rejouerLot } from "@/lib/agent/scenarios";
import { adresseDuSite } from "@/lib/courriel";
import { appelant } from "@/lib/session";

// Rejouer un lot de scénarios : le gérant seulement. Chaque scénario est une vraie exécution de
// l'assistant, avec son budget, son journal et ses propositions (rien ne part sans validation).
export async function rejouer(lot: number): Promise<{ ok: boolean; message: string }> {
  const qui = await appelant();
  if (!qui || qui.role !== "gerant") return { ok: false, message: "Réservé au gérant." };
  const r = await rejouerLot(qui, Number(lot), await adresseDuSite());
  revalidatePath("/assistant/scenarios");
  return { ok: true, message: r.map((x) => `n° ${x.n} : ${x.statut}`).join(" · ") };
}
