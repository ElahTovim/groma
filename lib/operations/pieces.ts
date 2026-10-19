import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { exigencesPieces, pieces } from "@/lib/db/schema";
import { nomPropre, verifierFichier } from "@/lib/fichiers";
import { journal } from "@/lib/journal";
import { atteinte, noter } from "@/lib/limites";
import { exigence, participe, pieceDuChantier } from "@/lib/pieces";
import { estClePiece, TYPES_PIECES, verifierDepot, type ClePiece } from "@/lib/pieces-regles";
import { aujourdhuiParis } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

// Les pièces attendues : la porte unique de AGENTS.md.
// Exiger, régler un blocage, retirer : gérant et équipe. Déposer : l'équipe, ou l'intervenant
// pour ses propres pièces. Valider ou refuser : gérant et équipe.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

async function porte(qui: Appelant | null, chantierId: string, interneSeulement: boolean): Promise<{ ok: false; erreur: string } | { qui: Appelant; chantier: NonNullable<Awaited<ReturnType<typeof lireChantier>>> }> {
  if (!qui) return { ok: false as const, erreur: "Votre session a expiré. Reconnectez-vous." };
  const chantier = await lireChantier(qui, chantierId);
  if (!chantier) {
    journal("acces_refuse", { compte: qui.id, role: qui.role, chantier: chantierId });
    return { ok: false as const, erreur: "Chantier introuvable." };
  }
  if (interneSeulement && !voitLInterne(qui.role)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, chantier: chantierId, action: "pieces" });
    return { ok: false as const, erreur: "Votre rôle ne permet pas cette action." };
  }
  return { qui, chantier };
}

function rafraichir(chantierId: string) {
  revalidatePath(`/chantiers/${chantierId}`);
}

// Les blocages par défaut, quand on demande une pièce : de bon sens, et réglables ensuite.
const BLOCAGE_PAR_DEFAUT: Partial<Record<ClePiece, "demarrage" | "cloture">> = { decennale: "demarrage", doe: "cloture" };

export async function exiger(demandeur: Appelant | null, chantierId: string, compteId: string | null, types: string[]): Promise<Resultat> {
  const p = await porte(demandeur, chantierId, true);
  if ("ok" in p) return p;
  const choisis = [...new Set(types)].filter(estClePiece);
  if (choisis.length === 0) return { ok: false, erreur: "Choisissez au moins une pièce." };
  if (compteId) {
    const qui = await participe(chantierId, compteId);
    if (!qui || qui.role !== "externe") return { ok: false, erreur: "Cette personne ne participe pas à ce chantier." };
  }
  const faites = await db
    .insert(exigencesPieces)
    .values(choisis.map((type) => ({ chantierId, compteId, type, bloque: BLOCAGE_PAR_DEFAUT[type] ?? null, creePar: p.qui.id })))
    .onConflictDoNothing()
    .returning({ id: exigencesPieces.id });
  journal("pieces_exigees", { compte: p.qui.id, chantier: chantierId, intervenant: compteId, types: choisis, nouvelles: faites.length });
  rafraichir(chantierId);
  return { ok: true, message: faites.length ? `${faites.length} pièce${faites.length > 1 ? "s" : ""} demandée${faites.length > 1 ? "s" : ""}.` : "Ces pièces étaient déjà demandées." };
}

export async function reglerBlocage(demandeur: Appelant | null, chantierId: string, exigenceId: string, bloque: string): Promise<Resultat> {
  const p = await porte(demandeur, chantierId, true);
  if ("ok" in p) return p;
  if (!(await exigence(chantierId, exigenceId))) return { ok: false, erreur: "Pièce introuvable." };
  const valeur = bloque === "demarrage" || bloque === "cloture" ? bloque : null;
  await db.update(exigencesPieces).set({ bloque: valeur }).where(eq(exigencesPieces.id, exigenceId));
  journal("piece_blocage", { compte: p.qui.id, chantier: chantierId, exigence: exigenceId, bloque: valeur });
  rafraichir(chantierId);
  return { ok: true, message: valeur ? `Bloque désormais ${valeur === "demarrage" ? "le démarrage" : "la clôture"}.` : "Ne bloque plus aucune étape." };
}

export async function retirer(demandeur: Appelant | null, chantierId: string, exigenceId: string): Promise<Resultat> {
  const p = await porte(demandeur, chantierId, true);
  if ("ok" in p) return p;
  const fait = await db.delete(exigencesPieces).where(and(eq(exigencesPieces.id, exigenceId), eq(exigencesPieces.chantierId, chantierId))).returning({ id: exigencesPieces.id });
  if (fait.length === 0) return { ok: false, erreur: "Pièce introuvable." };
  journal("piece_retiree", { compte: p.qui.id, chantier: chantierId, exigence: exigenceId });
  rafraichir(chantierId);
  return { ok: true, message: "Pièce retirée de la liste." };
}

export async function deposer(demandeur: Appelant | null, chantierId: string, exigenceId: string, formData: FormData): Promise<Resultat> {
  const p = await porte(demandeur, chantierId, false);
  if ("ok" in p) return p;
  const { qui } = p;
  const x = await exigence(chantierId, exigenceId);
  if (!x || !estClePiece(x.type)) return { ok: false, erreur: "Pièce introuvable." };
  const interne = voitLInterne(qui.role);
  // Un intervenant ne dépose que les pièces qu'on attend de lui.
  if (!interne && x.compteId !== qui.id) {
    journal("action_refusee", { compte: qui.id, role: qui.role, chantier: chantierId, action: "deposer_piece" });
    return { ok: false, erreur: "Vous ne pouvez déposer que vos propres pièces." };
  }
  const f = formData.get("fichier");
  if (!(f instanceof File) || f.size === 0) return { ok: false, erreur: "Joignez le fichier." };
  const forme = verifierFichier(f);
  if (!forme.ok) return { ok: false, erreur: forme.raison };
  const champ = (k: string) => (typeof formData.get(k) === "string" ? String(formData.get(k)).trim() : "");
  const verdict = verifierDepot({ type: x.type, delivreeLe: champ("delivreeLe"), aujourdhui: aujourdhuiParis(), mime: f.type });
  if (!verdict.ok) return { ok: false, erreur: verdict.raison };
  const code = champ("codeSecurite").replace(/\s/g, "").toUpperCase();
  if (code && !/^[A-Z0-9]{10,20}$/.test(code)) return { ok: false, erreur: "Le code de sécurité est la suite de lettres et de chiffres imprimée sur l'attestation." };
  if (await atteinte("fichiersParJour", qui.id)) return { ok: false, erreur: "Plafond de dépôts atteint pour aujourd'hui. Réessayez demain." };
  await noter("fichiersParJour", qui.id);

  let url: string;
  try {
    url = (await put(`pieces/${chantierId}/${nomPropre(f.name)}`, f, { access: "private", addRandomSuffix: true, contentType: f.type })).url;
  } catch (e) {
    journal("fichier_echec", { compte: qui.id, chantier: chantierId, erreur: String(e) });
    return { ok: false, erreur: "Le fichier n'a pas pu être enregistré. Réessayez." };
  }
  const t = TYPES_PIECES[x.type];
  await db.insert(pieces).values({
    type: x.type,
    // Une pièce d'intervenant sert sur tous ses chantiers ; une pièce de chantier reste ici.
    compteId: x.compteId,
    chantierId: t.niveau === "chantier" ? chantierId : null,
    fichierUrl: url,
    fichierNom: f.name.slice(0, 200),
    fichierType: f.type,
    fichierTaille: f.size,
    delivreeLe: champ("delivreeLe") || null,
    expireLe: verdict.expireLe,
    codeSecurite: code || null,
    // Déposée par l'équipe : validée d'office. Par l'intervenant : l'équipe la relit.
    statut: interne ? "validee" : "deposee",
    deposePar: qui.id,
    valideePar: interne ? qui.id : null,
    valideLe: interne ? new Date() : null,
  });
  journal("piece_deposee", { compte: qui.id, chantier: chantierId, type: x.type, intervenant: x.compteId, validee: interne });
  rafraichir(chantierId);
  return { ok: true, message: interne ? `${t.libelle} : enregistrée.` : `${t.libelle} : envoyée. L'équipe va la vérifier.` };
}

async function trancher(demandeur: Appelant | null, chantierId: string, pieceId: string, verdict: "validee" | "refusee", motif: string): Promise<Resultat> {
  const p = await porte(demandeur, chantierId, true);
  if ("ok" in p) return p;
  if (verdict === "refusee" && !motif.trim()) return { ok: false, erreur: "Indiquez pourquoi la pièce est refusée : l'intervenant le lira." };
  const exigees = await db.select({ compteId: exigencesPieces.compteId }).from(exigencesPieces).where(eq(exigencesPieces.chantierId, chantierId));
  const piece = await pieceDuChantier(chantierId, pieceId, exigees.map((e) => e.compteId).filter((c): c is string => Boolean(c)));
  if (!piece) return { ok: false, erreur: "Pièce introuvable." };
  const fait = await db
    .update(pieces)
    .set({ statut: verdict, motif: verdict === "refusee" ? motif.trim().slice(0, 300) : null, valideePar: p.qui.id, valideLe: new Date() })
    .where(and(eq(pieces.id, pieceId), eq(pieces.statut, "deposee")))
    .returning({ id: pieces.id });
  if (fait.length === 0) return { ok: false, erreur: "Cette pièce a déjà été traitée." };
  journal(verdict === "validee" ? "piece_validee" : "piece_refusee", { compte: p.qui.id, chantier: chantierId, piece: pieceId });
  rafraichir(chantierId);
  return { ok: true, message: verdict === "validee" ? "Pièce validée." : "Pièce refusée : l'intervenant sera relancé avec le motif." };
}

export const valider = (qui: Appelant | null, chantierId: string, pieceId: string) => trancher(qui, chantierId, pieceId, "validee", "");
export const refuser = (qui: Appelant | null, chantierId: string, pieceId: string, motif: string) => trancher(qui, chantierId, pieceId, "refusee", String(motif ?? ""));
