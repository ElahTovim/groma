import * as Sentry from "@sentry/nextjs";
import { analyserNuit, analyseDeLaNuit } from "@/lib/analyse-nuit";
import { importerCourriers } from "@/lib/courriers";
import { journal } from "@/lib/journal";
import { delaiAccorde, peutLancer, recapAttendLAnalyse, tempsRestant, type Etape, type ResultatEtape } from "@/lib/nuit-etapes-regles";
import { envoyerRecapitulatifs } from "@/lib/recap";
import { indexerDocuments } from "@/lib/recherche";
import { aujourdhuiParis } from "@/lib/regles";

// Les étapes du matin, après l'import des événements : courriers, documents, analyse,
// puis le récapitulatif. Chacune est journalisée ; une étape en panne n'empêche pas
// les suivantes. Toutes sont idempotentes : un passage qui n'a pas fini reprend au suivant.

// Les demandeurs de la nuit : pas de compte, seul le budget mensuel les limite.
export const DEMANDEURS_NUIT = {
  courriers: { compteId: null, fonction: "courriers_lecture_nuit" },
  documents: { compteId: null, fonction: "indexation_nuit" },
} as const;

const TROP_LONG = Symbol("trop long");

// Une étape qui dépasse son temps est abandonnée par ce passage (elle finira, ou sera reprise au suivant).
async function avecDelai<T>(p: Promise<T>, ms: number): Promise<T | typeof TROP_LONG> {
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<typeof TROP_LONG>((r) => (minuterie = setTimeout(() => r(TROP_LONG), ms)));
  try {
    return await Promise.race([p, delai]);
  } finally {
    clearTimeout(minuterie);
  }
}

// `avecRecap` : le récapitulatif doit partir à ce passage (7 h passées à Paris).
// `dernierPassage` : il n'y a plus de passage après celui-ci ce matin (6 h UTC).
export async function etapesDuMatin(p: { site: string; avecRecap: boolean; dernierPassage?: boolean; debut?: number; nuit?: string }): Promise<ResultatEtape[]> {
  const debut = p.debut ?? Date.now();
  const nuit = p.nuit ?? aujourdhuiParis();
  const resultats: ResultatEtape[] = [];

  const lancer = async (etape: Etape, travail: () => Promise<Omit<ResultatEtape, "etape" | "dureeMs">>) => {
    const restant = tempsRestant(debut, Date.now());
    if (!peutLancer(etape, restant, p.avecRecap)) {
      const r: ResultatEtape = { etape, statut: "reportee", detail: `il restait ${Math.round(restant / 1000)} s : reprise au passage suivant` };
      journal("nuit_etape", { nuit, ...r });
      resultats.push(r);
      return;
    }
    const t0 = Date.now();
    let r: ResultatEtape;
    try {
      const fait = await avecDelai(travail(), delaiAccorde(etape, restant, p.avecRecap));
      r = fait === TROP_LONG ? { etape, statut: "trop_longue", detail: "temps dépassé : reprise au passage suivant" } : { etape, ...fait };
    } catch (e) {
      Sentry.captureException(e);
      r = { etape, statut: "en_panne", detail: String(e).slice(0, 200) };
    }
    r.dureeMs = Date.now() - t0;
    journal("nuit_etape", { nuit, ...r });
    resultats.push(r);
  };

  // L'analyse de la nuit est rangée en dernier : si elle existe, courriers et documents
  // ont déjà été traités ce matin, inutile de les relire au flux.
  const dejaAnalysee = !!(await analyseDeLaNuit(nuit));
  if (dejaAnalysee) {
    resultats.push({ etape: "courriers", statut: "deja_faite" }, { etape: "documents", statut: "deja_faite" }, { etape: "analyse", statut: "deja_faite" });
  } else {
    await lancer("courriers", async () => {
      const b = await importerCourriers(DEMANDEURS_NUIT.courriers);
      if (!b.ok) return { statut: "en_panne", detail: b.erreur };
      return { statut: "faite", detail: `${b.nouveaux} nouveau${b.nouveaux > 1 ? "x" : ""}, ${b.dejaConnus} déjà reçu${b.dejaConnus > 1 ? "s" : ""}, ${b.lus} lu${b.lus > 1 ? "s" : ""} par l'IA${b.echecsLecture ? `, ${b.echecsLecture} lecture${b.echecsLecture > 1 ? "s" : ""} en échec (${b.premiereErreurIa ?? "IA indisponible"})` : ""}` };
    });
    await lancer("documents", async () => {
      const b = await indexerDocuments(DEMANDEURS_NUIT.documents);
      if (!b.ok) return { statut: "en_panne", detail: b.erreur };
      return { statut: "faite", detail: `${b.indexes.length} indexé${b.indexes.length > 1 ? "s" : ""}, ${b.inchanges} inchangé${b.inchanges > 1 ? "s" : ""} (non revectorisé${b.inchanges > 1 ? "s" : ""})${b.misDeCote.length ? `, ${b.misDeCote.length} mis de côté` : ""}` };
    });
    await lancer("analyse", async () => {
      const b = await analyserNuit(nuit);
      if (!b.ok) return { statut: "en_panne", detail: b.erreur };
      if (b.statut === "analysee") return { statut: "faite", detail: `${b.points} point${b.points > 1 ? "s" : ""}${b.retirees ? `, ${b.retirees} référence${b.retirees > 1 ? "s" : ""} inventée${b.retirees > 1 ? "s" : ""} retirée${b.retirees > 1 ? "s" : ""}` : ""}${b.consignes ? `, ${b.consignes} consigne${b.consignes > 1 ? "s" : ""} glissée${b.consignes > 1 ? "s" : ""} signalée${b.consignes > 1 ? "s" : ""}` : ""}` };
      if (b.statut === "nuit_non_importee") return { statut: "sans_objet", detail: "la nuit n'est pas encore importée" };
      return { statut: "faite", detail: b.statut === "nuit_vide" ? "nuit vide : le modèle n'a pas été appelé" : "déjà faite" };
    });
  }

  const analyse = resultats.find((r) => r.etape === "analyse");
  if (p.avecRecap && recapAttendLAnalyse(analyse, !!p.dernierPassage)) {
    const r: ResultatEtape = { etape: "recapitulatif", statut: "reportee", detail: "il attend l'analyse de la nuit, il part au passage suivant" };
    journal("nuit_etape", { nuit, ...r });
    resultats.push(r);
  } else if (p.avecRecap) {
    await lancer("recapitulatif", async () => {
      const b = await envoyerRecapitulatifs(p.site, nuit);
      return { statut: b.refuses ? "en_panne" : "faite", detail: `${b.envoyes} envoyé${b.envoyes > 1 ? "s" : ""}, ${b.dejaEnvoyes} déjà envoyé${b.dejaEnvoyes > 1 ? "s" : ""}${b.refuses ? `, ${b.refuses} refusé${b.refuses > 1 ? "s" : ""}` : ""}` };
    });
  }
  return resultats;
}
