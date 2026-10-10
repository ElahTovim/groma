import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { compterATraiter } from "@/lib/chantiers";
import { envoyerCourriel } from "@/lib/courriel";
import { db } from "@/lib/db";
import { chantiers, comptes, evenementsFlux, executions, fil, participants, recapitulatifs } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { composerRecap, type ContenuRecap, type LigneRecap } from "@/lib/recap-texte";
import { aujourdhuiParis } from "@/lib/regles";

// Qui reçoit le récapitulatif (décision de Kerguelenn) : le gérant pour tous les
// chantiers, chaque membre de l'équipe pour ses seuls chantiers. Jamais un externe.

function detail(a: { aQualifier: number; reservesOuvertes: number; lotsEnRetard: number }): string {
  return [
    a.aQualifier && `${a.aQualifier} signalement${a.aQualifier > 1 ? "s" : ""} à qualifier`,
    a.reservesOuvertes && `${a.reservesOuvertes} réserve${a.reservesOuvertes > 1 ? "s" : ""} ouverte${a.reservesOuvertes > 1 ? "s" : ""}`,
    a.lotsEnRetard && `${a.lotsEnRetard} lot${a.lotsEnRetard > 1 ? "s" : ""} en retard`,
  ]
    .filter(Boolean)
    .join(", ");
}

async function bilanDeLaNuit(jour: string): Promise<ContenuRecap["nuit"]> {
  const [x] = await db.select().from(executions).where(eq(executions.nuit, jour)).orderBy(desc(executions.debut)).limit(1);
  if (!x) return null;
  if (x.statut === "echec" || x.statut === "en_cours") return { reussie: false, nouveaux: 0, misesAJour: 0, messages: 0, misDeCote: 0, erreur: x.erreur ?? undefined };
  const evts = await db.select({ type: evenementsFlux.type, resultat: evenementsFlux.resultat }).from(evenementsFlux).where(eq(evenementsFlux.nuit, jour));
  const appliques = evts.filter((e) => e.resultat === "applique");
  return {
    reussie: true,
    nouveaux: appliques.filter((e) => e.type === "creation").length,
    misesAJour: appliques.filter((e) => e.type === "mise_a_jour").length,
    messages: appliques.filter((e) => e.type === "message").length,
    misDeCote: evts.filter((e) => e.resultat === "rejete").length,
  };
}

export async function contenuPour(compte: { id: string; nom: string; role: "gerant" | "equipe" }, jour: string, site: string): Promise<ContenuRecap> {
  // Les chantiers en jeu : tous pour le gérant, ceux où il participe pour l'équipe ; jamais les terminés.
  const visibles =
    compte.role === "gerant"
      ? await db.select({ id: chantiers.id, reference: chantiers.reference, nom: chantiers.nom, ville: chantiers.ville }).from(chantiers).where(and(ne(chantiers.statut, "clos"), ne(chantiers.statut, "annule")))
      : await db
          .select({ id: chantiers.id, reference: chantiers.reference, nom: chantiers.nom, ville: chantiers.ville })
          .from(chantiers)
          .innerJoin(participants, eq(participants.chantierId, chantiers.id))
          .where(and(eq(participants.compteId, compte.id), ne(chantiers.statut, "clos"), ne(chantiers.statut, "annule")));
  const ids = visibles.map((c) => c.id);
  const parId = new Map(visibles.map((c) => [c.id, c]));
  const lien = (id: string) => `${site}/chantiers/${id}`;

  const compte_ = await compterATraiter(ids);
  const aTraiter: LigneRecap[] = [...compte_.entries()]
    .map(([id, a]) => ({ id, a, poids: a.aQualifier * 3 + a.reservesOuvertes * 2 + a.lotsEnRetard }))
    .filter((x) => x.poids > 0)
    .sort((a, b) => b.poids - a.poids)
    .map(({ id, a }) => ({ reference: parId.get(id)!.reference, nom: parId.get(id)!.nom, ville: parId.get(id)!.ville, lien: lien(id), detail: detail(a) }));

  const demandes = ids.length
    ? await db
        .select({ chantierId: fil.chantierId, texte: fil.texte, dateCible: fil.dateCible })
        .from(fil)
        .where(and(inArray(fil.chantierId, ids), eq(fil.type, "demande"), lt(fil.dateCible, jour)))
    : [];
  const demandesEnRetard: LigneRecap[] = demandes.map((d) => {
    const c = parId.get(d.chantierId)!;
    return { reference: c.reference, nom: c.nom, ville: c.ville, lien: lien(c.id), detail: `« ${d.texte.slice(0, 80)} », à rendre le ${d.dateCible}` };
  });

  return {
    prenom: compte.nom.split(" ")[0],
    jour,
    portee: compte.role === "gerant" ? "tous" : "les siens",
    nuit: await bilanDeLaNuit(jour),
    aTraiter,
    demandesEnRetard,
    lienNuit: compte.role === "gerant" ? `${site}/nuit` : null,
  };
}

export type BilanRecap = { destinataires: number; envoyes: number; dejaEnvoyes: number; refuses: number };

// Une seule fois par jour et par personne : la ligne est posée avant l'envoi.
// Si l'envoi échoue, la ligne est retirée, pour qu'un passage suivant réessaie.
export async function envoyerRecapitulatifs(site: string, jour = aujourdhuiParis()): Promise<BilanRecap> {
  const destinataires = await db
    .select({ id: comptes.id, nom: comptes.nom, email: comptes.email, role: comptes.role })
    .from(comptes)
    .where(and(inArray(comptes.role, ["gerant", "equipe"]), eq(comptes.fictif, false)));
  const bilan: BilanRecap = { destinataires: destinataires.length, envoyes: 0, dejaEnvoyes: 0, refuses: 0 };

  for (const d of destinataires) {
    const [pose] = await db.insert(recapitulatifs).values({ jour, compteId: d.id }).onConflictDoNothing().returning({ id: recapitulatifs.id });
    if (!pose) {
      bilan.dejaEnvoyes++;
      continue;
    }
    const { sujet, texte } = composerRecap(await contenuPour({ id: d.id, nom: d.nom, role: d.role as "gerant" | "equipe" }, jour, site));
    const envoi = await envoyerCourriel({ a: d.email, sujet, texte });
    if (envoi.ok) {
      await db.update(recapitulatifs).set({ parti: true }).where(eq(recapitulatifs.id, pose.id));
      bilan.envoyes++;
    } else {
      await db.delete(recapitulatifs).where(eq(recapitulatifs.id, pose.id));
      bilan.refuses++;
    }
  }
  journal("recapitulatif", { jour, ...bilan });
  return bilan;
}
