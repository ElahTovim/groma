import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { voitLInterne } from "@/lib/acces";
import { listerChantiers, lireChantier } from "@/lib/chantiers";
import { envoyerCourriel } from "@/lib/courriel";
import { db } from "@/lib/db";
import { chantiers, comptes, fil, propositions } from "@/lib/db/schema";
import { lireParticipants } from "@/lib/fiche";
import { journal } from "@/lib/journal";
import { ecrireDansLeFil, partagerElement } from "@/lib/operations/chantier";
import type { Appelant } from "@/lib/session";

// La file « À valider » : ce que l'agent propose sans le faire. La porte unique de AGENTS.md :
// valider exécute l'opération au nom de la personne qui valide, avec SES droits ; jamais deux fois.

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };
export type PropositionVue = {
  id: string;
  type: string;
  contenu: Record<string, unknown>;
  chantierId: string;
  chantier: string;
  propose: string;
  executionId: string | null;
  creeLe: string;
};

export async function propositionsEnAttente(qui: Appelant): Promise<PropositionVue[]> {
  if (!voitLInterne(qui.role)) return [];
  const accessibles = (await listerChantiers(qui, {})).map((c) => c.id);
  if (accessibles.length === 0) return [];
  const lignes = await db
    .select({ p: propositions, reference: chantiers.reference, nom: chantiers.nom, propose: comptes.nom })
    .from(propositions)
    .innerJoin(chantiers, eq(propositions.chantierId, chantiers.id))
    .innerJoin(comptes, eq(propositions.proposePar, comptes.id))
    .where(and(eq(propositions.statut, "en_attente"), inArray(propositions.chantierId, accessibles)))
    .orderBy(desc(propositions.creeLe));
  return lignes.map((l) => ({ id: l.p.id, type: l.p.type, contenu: l.p.contenu, chantierId: l.p.chantierId, chantier: `${l.reference} · ${l.nom}`, propose: l.propose, executionId: l.p.executionId, creeLe: l.p.creeLe.toISOString() }));
}

async function lire(qui: Appelant, id: string) {
  const [p] = await db.select().from(propositions).where(eq(propositions.id, id)).limit(1);
  if (!p || !(await lireChantier(qui, p.chantierId))) return null;
  return p;
}

export async function accepter(qui: Appelant | null, id: string, modifications: { sujet?: string; texte?: string } = {}): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!voitLInterne(qui.role)) return { ok: false, erreur: "Réservé à l'équipe." };
  const p = await lire(qui, id);
  if (!p) return { ok: false, erreur: "Proposition introuvable." };
  if (p.statut !== "en_attente") return { ok: false, erreur: "Cette proposition a déjà été traitée." };
  // On réserve la proposition avant d'agir : deux clics ne l'exécutent pas deux fois.
  const reserve = await db
    .update(propositions)
    .set({ statut: "acceptee", decidePar: qui.id, decideLe: new Date() })
    .where(and(eq(propositions.id, id), eq(propositions.statut, "en_attente")))
    .returning({ id: propositions.id });
  if (reserve.length === 0) return { ok: false, erreur: "Cette proposition a déjà été traitée." };

  const c = p.contenu as Record<string, string>;
  const texte = (modifications.texte ?? c.texte ?? "").trim();
  let r: Resultat;
  if (p.type === "courriel") {
    const dest = (await lireParticipants(p.chantierId)).find((x) => x.compteId === c.destinataireId);
    const [compte] = dest ? await db.select({ email: comptes.email }).from(comptes).where(eq(comptes.id, dest.compteId)).limit(1) : [];
    if (!dest || !compte) r = { ok: false, erreur: "Le destinataire ne participe plus à ce chantier." };
    else {
      const sujet = (modifications.sujet ?? c.sujet ?? "").trim() || "Votre chantier";
      const envoi = await envoyerCourriel({ a: compte.email, sujet, texte });
      if (!envoi.ok) r = { ok: false, erreur: "Le courriel n'est pas parti (service d'envoi)." };
      else {
        // La trace dans le fil, interne : qui a envoyé quoi, à qui.
        const fd = new FormData();
        fd.set("type", "message");
        fd.set("texte", `Courriel envoyé à ${dest.nom} : « ${sujet} »\n\n${texte.slice(0, 1500)}`);
        await ecrireDansLeFil(qui, p.chantierId, fd);
        r = { ok: true, message: `Courriel envoyé à ${dest.nom}.` };
      }
    }
  } else if (p.type === "demande_externe") {
    const fd = new FormData();
    fd.set("type", "demande");
    fd.set("texte", texte);
    fd.set("destinataireId", c.destinataireId);
    fd.set("dateCible", c.echeance);
    // Une demande à un externe arrive déjà partagée avec lui (lib/regles.ts, partageInitial).
    const e = await ecrireDansLeFil(qui, p.chantierId, fd);
    r = e.ok ? { ok: true, message: `Demande adressée à ${c.destinataire}.` } : { ok: false, erreur: e.erreur };
  } else if (p.type === "partage") {
    const [el] = await db.select({ visiblePar: fil.visiblePar }).from(fil).where(and(eq(fil.id, c.elementId), eq(fil.chantierId, p.chantierId))).limit(1);
    if (!el) r = { ok: false, erreur: "Cet élément n'existe plus." };
    else {
      const e = await partagerElement(qui, p.chantierId, c.elementId, [...new Set([...el.visiblePar, c.compteId])]);
      r = e.ok ? { ok: true, message: `Élément partagé avec ${c.destinataire}.` } : { ok: false, erreur: e.erreur };
    }
  } else r = { ok: false, erreur: "Type de proposition inconnu." };

  if (!r.ok) {
    // L'opération a échoué : la proposition revient en attente, avec la raison.
    await db.update(propositions).set({ statut: "en_attente", decidePar: null, decideLe: null, motif: r.erreur }).where(eq(propositions.id, id));
  } else if (modifications.texte !== undefined || modifications.sujet !== undefined) {
    await db.update(propositions).set({ contenu: { ...c, ...modifications, modifiee: true } }).where(eq(propositions.id, id));
  }
  journal(r.ok ? "proposition_acceptee" : "proposition_echec", { compte: qui.id, proposition: id, type: p.type, modifiee: modifications.texte !== undefined });
  revalidatePath("/a-valider");
  revalidatePath(`/chantiers/${p.chantierId}`);
  return r;
}

export async function refuser(qui: Appelant | null, id: string, motif: string): Promise<Resultat> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!voitLInterne(qui.role)) return { ok: false, erreur: "Réservé à l'équipe." };
  if (!String(motif ?? "").trim()) return { ok: false, erreur: "Dites en quelques mots pourquoi : c'est gardé au journal de l'assistant." };
  const p = await lire(qui, id);
  if (!p) return { ok: false, erreur: "Proposition introuvable." };
  const fait = await db
    .update(propositions)
    .set({ statut: "refusee", motif: String(motif).trim().slice(0, 300), decidePar: qui.id, decideLe: new Date() })
    .where(and(eq(propositions.id, id), eq(propositions.statut, "en_attente")))
    .returning({ id: propositions.id });
  if (fait.length === 0) return { ok: false, erreur: "Cette proposition a déjà été traitée." };
  journal("proposition_refusee", { compte: qui.id, proposition: id, type: p.type });
  revalidatePath("/a-valider");
  return { ok: true, message: "Proposition refusée." };
}
