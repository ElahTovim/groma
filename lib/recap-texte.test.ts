import { describe, expect, it } from "vitest";
import { composerRecap, type ContenuRecap } from "./recap-texte";

const base: ContenuRecap = {
  prenom: "Karim",
  jour: "2026-10-12",
  portee: "les siens",
  nuit: { reussie: true, nouveaux: 3, misesAJour: 1, messages: 2, misDeCote: 0 },
  aTraiter: [],
  demandesEnRetard: [],
  lienNuit: null,
};

describe("le récapitulatif du matin", () => {
  it("dit « rien à signaler » quand il n'y a rien à traiter", () => {
    const r = composerRecap(base);
    expect(r.sujet).toContain("rien à signaler");
    expect(r.texte).toContain("3 nouveaux chantiers, 1 mise à jour, 2 messages");
    expect(r.texte).toContain("pour vos chantiers");
  });

  it("compte les points à traiter dans le sujet", () => {
    const l = { reference: "CH-1", nom: "Toiture", ville: "Paris", lien: "https://x/1", detail: "1 à qualifier" };
    expect(composerRecap({ ...base, aTraiter: [l], demandesEnRetard: [l] }).sujet).toContain("2 points à traiter");
  });

  it("prévient quand la nuit n'a pas pu être importée", () => {
    const r = composerRecap({ ...base, nuit: { reussie: false, nouveaux: 0, misesAJour: 0, messages: 0, misDeCote: 0, erreur: "Flux indisponible" } });
    expect(r.sujet).toContain("la nuit n'a pas pu être importée");
    expect(r.texte).toContain("Elle sera rattrapée automatiquement");
  });

  it("n'affiche que dix lignes et dit combien il en reste", () => {
    const lignes = Array.from({ length: 13 }, (_, i) => ({ reference: `CH-${i}`, nom: "x", ville: "y", lien: "z", detail: "1 en retard" }));
    expect(composerRecap({ ...base, aTraiter: lignes }).texte).toContain("… et 3 autres.");
  });
});
