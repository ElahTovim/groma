import { describe, expect, it } from "vitest";
import { DOMAINE_FICTIF, genererChantiers, PERSONNES } from "./jeu-de-donnees";

describe("le jeu de données fictif", () => {
  it("contient dix personnes et cinquante chantiers", () => {
    expect(PERSONNES).toHaveLength(10);
    expect(genererChantiers()).toHaveLength(50);
  });

  it("donne exactement les mêmes données à chaque tirage", () => {
    expect(genererChantiers()).toEqual(genererChantiers());
  });

  it("n'utilise que des adresses courriel fictives", () => {
    expect(PERSONNES.every((p) => p.email.endsWith(`@${DOMAINE_FICTIF}`))).toBe(true);
  });

  it("a des références uniques", () => {
    const refs = genererChantiers().map((c) => c.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("contient des cas tordus : sans montant, sans externe, annulé avec motif", () => {
    const c = genererChantiers();
    expect(c.some((x) => x.montantHt === null)).toBe(true);
    expect(c.some((x) => x.participants.length === 1)).toBe(true);
    expect(c.filter((x) => x.statut === "annule").every((x) => x.motifAnnulation)).toBe(true);
  });

  it("chaque élément du fil est écrit, et partagé, par des participants du chantier", () => {
    for (const c of genererChantiers()) {
      for (const e of c.fil) {
        expect(c.participants).toContain(e.auteur);
        for (const v of e.visiblePar) expect(c.participants).toContain(v);
      }
    }
  });

  it("prépare la démo : une réception bloquée par un signalement, des lots en retard", () => {
    const c = genererChantiers();
    expect(c.some((x) => x.statut === "reception" && x.fil.some((e) => e.statutSignalement === "a_qualifier"))).toBe(true);
    expect(c.some((x) => x.lots.some((l) => (l.statut === "commande" || l.statut === "a_commander") && l.livraisonPrevue! < "2026-10-05"))).toBe(true);
  });
});
