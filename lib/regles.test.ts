import { describe, expect, it } from "vitest";
import {
  aujourdhuiParis,
  lotEnRetard,
  partageInitial,
  peutAnnuler,
  peutEcrire,
  verifierPassage,
  verifierPassageLot,
  verifierQualification,
  voitElement,
  type ContexteChantier,
} from "./regles";

const ctx: ContexteChantier = {
  debutPrevu: "2026-10-01",
  aujourdhui: "2026-10-05",
  nbDocuments: 1,
  lots: [{ nom: "Carrelage", statut: "fini" }],
  signalementsAQualifier: 0,
  reservesOuvertes: 0,
};

describe("la règle de clôture", () => {
  it("cas normal : toutes les réserves levées, la clôture passe", () => {
    expect(verifierPassage("reception", "clos", ctx)).toEqual({ ok: true });
  });

  it("cas vide : aucun signalement jamais fait, la clôture passe", () => {
    expect(verifierPassage("reception", "clos", { ...ctx, signalementsAQualifier: 0, reservesOuvertes: 0 }).ok).toBe(true);
  });

  it("cas piégé : un signalement arrivé la veille bloque la clôture", () => {
    const v = verifierPassage("reception", "clos", { ...ctx, signalementsAQualifier: 1 });
    expect(v).toEqual({ ok: false, raisons: ["1 signalement à qualifier."] });
  });

  it("une réserve ouverte bloque aussi, et le refus dit tout ce qui bloque", () => {
    const v = verifierPassage("reception", "clos", { ...ctx, signalementsAQualifier: 1, reservesOuvertes: 2 });
    expect(v).toEqual({ ok: false, raisons: ["1 signalement à qualifier.", "2 réserves ouvertes."] });
  });
});

describe("les autres étapes du chantier", () => {
  it("refuse de sauter une étape", () => {
    expect(verifierPassage("devis", "planifie", ctx).ok).toBe(false);
  });

  it("refuse « signé » sans devis joint", () => {
    expect(verifierPassage("devis", "signe", { ...ctx, nbDocuments: 0 }).ok).toBe(false);
  });

  it("refuse « planifié » sans date de début ni lot", () => {
    const v = verifierPassage("signe", "planifie", { ...ctx, debutPrevu: null, lots: [] });
    expect(v.ok === false && v.raisons).toHaveLength(2);
  });

  it("refuse de démarrer avant la date prévue", () => {
    expect(verifierPassage("planifie", "en_cours", { ...ctx, debutPrevu: "2026-10-20" }).ok).toBe(false);
  });

  it("refuse la réception tant qu'un lot n'est pas fini, et nomme les lots", () => {
    const v = verifierPassage("en_cours", "reception", { ...ctx, lots: [{ nom: "Carrelage", statut: "pose" }, { nom: "Peinture", statut: "commande" }] });
    expect(v).toEqual({ ok: false, raisons: ["2 lots ne sont pas finis : Carrelage, Peinture."] });
  });

  it("l'annulation n'est possible qu'avant le démarrage", () => {
    expect(peutAnnuler("planifie")).toBe(true);
    expect(peutAnnuler("en_cours")).toBe(false);
  });
});

describe("les lots", () => {
  it("pas de pose sans livraison", () => {
    expect(verifierPassageLot("commande", "pose")).toEqual({ ok: false, raisons: ["Pas de pose sans livraison : le lot doit d'abord être livré."] });
    expect(verifierPassageLot("livre", "pose").ok).toBe(true);
  });

  it("un lot non livré dont la date de livraison est passée est en retard", () => {
    expect(lotEnRetard({ statut: "commande", livraisonPrevue: "2026-10-01", finPrevue: null }, "2026-10-05")).toBe(true);
  });

  it("un lot fini n'est jamais en retard", () => {
    expect(lotEnRetard({ statut: "fini", livraisonPrevue: "2026-09-01", finPrevue: "2026-09-10" }, "2026-10-05")).toBe(false);
  });

  it("un lot sans date n'est pas en retard", () => {
    expect(lotEnRetard({ statut: "a_commander", livraisonPrevue: null, finPrevue: null }, "2026-10-05")).toBe(false);
  });
});

describe("qui voit quoi dans le fil", () => {
  const externe = { id: "ext", role: "externe" as const };

  it("l'interne voit tout", () => {
    expect(voitElement({ id: "e", role: "equipe" }, { auteurId: "x", visiblePar: [] })).toBe(true);
  });

  it("un externe ne voit pas un élément interne", () => {
    expect(voitElement(externe, { auteurId: "x", visiblePar: [] })).toBe(false);
  });

  it("un externe voit ce qui a été coché pour lui, et ce qu'il a écrit", () => {
    expect(voitElement(externe, { auteurId: "x", visiblePar: ["ext"] })).toBe(true);
    expect(voitElement(externe, { auteurId: "ext", visiblePar: [] })).toBe(true);
  });

  it("une demande adressée à un externe arrive cochée pour lui, pas pour un interne", () => {
    expect(partageInitial("demande", externe)).toEqual(["ext"]);
    expect(partageInitial("demande", { id: "e", role: "equipe" })).toEqual([]);
    expect(partageInitial("message", externe)).toEqual([]);
  });

  it("un externe ne crée pas de demande", () => {
    expect(peutEcrire("externe", "demande")).toBe(false);
    expect(peutEcrire("externe", "signalement")).toBe(true);
  });
});

describe("les signalements", () => {
  it("écarter demande un motif", () => {
    expect(verifierQualification("a_qualifier", "ecarte", " ").ok).toBe(false);
    expect(verifierQualification("a_qualifier", "ecarte", "Hors devis").ok).toBe(true);
  });

  it("une réserve se lève, elle ne s'écarte pas", () => {
    expect(verifierQualification("reserve_ouverte", "levee", "").ok).toBe(true);
    expect(verifierQualification("reserve_ouverte", "ecarte", "x").ok).toBe(false);
  });
});

it("la date du jour est celle de Paris", () => {
  expect(aujourdhuiParis(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
});
