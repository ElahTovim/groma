import { describe, expect, it } from "vitest";
import { composerRecap, LIGNE_ANALYSE_ABSENTE, type ContenuRecap } from "./recap-texte";

const base: ContenuRecap = {
  prenom: "Karim",
  jour: "2026-10-12",
  portee: "les siens",
  nuit: { reussie: true, nouveaux: 3, misesAJour: 1, messages: 2, misDeCote: 0 },
  aTraiter: [],
  demandesEnRetard: [],
  attestations: [],
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

  it("liste les pièces à obtenir, et les compte", () => {
    const r = composerRecap({ ...base, attestations: [{ reference: "CH-2026-0007", nom: "Cuisine Dumas", ville: "Lyon", lien: "https://x/7", detail: "Plomberie Ferrand : expirée" }] });
    expect(r.sujet).toContain("1 point à traiter");
    expect(r.texte).toContain("PIÈCES À OBTENIR\n- CH-2026-0007 · Cuisine Dumas (Lyon) : Plomberie Ferrand : expirée");
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

  it("affiche « Ce que la nuit dit » avec le texte et les points de l'analyse", () => {
    const r = composerRecap({
      ...base,
      portee: "tous",
      analyse: { etat: "faite", texte: "Nuit calme, sauf un chantier.", points: [{ titre: "Réclamations répétées", detail: "Trois relances sur les radiateurs.", references: ["CH-2026-0007"] }] },
    });
    expect(r.texte).toContain("CE QUE LA NUIT DIT\nNuit calme, sauf un chantier.\n- Réclamations répétées : Trois relances sur les radiateurs. (CH-2026-0007)");
    expect(r.texte).toContain("rien n'a été modifié à partir d'elle");
  });

  it("dit en une ligne que l'analyse manque quand l'IA est en panne ou au plafond", () => {
    const r = composerRecap({ ...base, analyse: { etat: "absente" } });
    expect(r.texte).toContain(`CE QUE LA NUIT DIT\n${LIGNE_ANALYSE_ABSENTE}`);
    expect(r.texte).toContain("3 nouveaux chantiers");
  });

  it("n'affiche pas la section quand il n'y a rien pour ce destinataire", () => {
    expect(composerRecap({ ...base, analyse: null }).texte).not.toContain("CE QUE LA NUIT DIT");
    expect(composerRecap({ ...base, analyse: { etat: "faite", texte: null, points: [] } }).texte).not.toContain("CE QUE LA NUIT DIT");
    expect(composerRecap(base).texte).not.toContain("\n\n\n");
  });
});
