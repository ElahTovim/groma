import { describe, expect, it } from "vitest";
import { bilanIa, estimer, nomFonctionIa } from "./couts";

it("estime le coût d'un mois de nuits au tarif indicatif", () => {
  const e = estimer({ dureeMs: 30 * 2000, appelsFlux: 30, geocodages: 300, courriels: 60 }, { fonctionEuroParHeure: 0.2, courrielEuro: 0.001, appelFluxEuro: 0, geocodageEuro: 0 });
  expect(e.fonction).toBeCloseTo(0.00333, 4);
  expect(e.courriels).toBeCloseTo(0.06, 6);
  expect(e.total).toBeCloseTo(0.0633, 3);
});

describe("le coût de l'IA du mois", () => {
  const lignes = [
    { fonction: "courriers_lecture", appels: 10, echecs: 1, cout: "0.030000" },
    { fonction: "analyse_nuit", appels: 2, echecs: 0, cout: "0.040000" },
    { fonction: "question", appels: 0, echecs: 0, cout: "0" },
  ];

  it("calcule le coût moyen par appel, le total et ce qui reste du budget", () => {
    const b = bilanIa(lignes, { budgetEuros: 10, maintenant: new Date("2026-10-10T12:00:00Z") });
    expect(b.total).toBeCloseTo(0.07, 6);
    expect(b.appels).toBe(12);
    expect(b.echecs).toBe(1);
    expect(b.coutMoyen).toBeCloseTo(0.07 / 12, 6);
    expect(b.fonctions[0]).toMatchObject({ fonction: "analyse_nuit", nom: "Analyse de la nuit", coutMoyen: 0.02 });
    expect(b.fonctions.find((f) => f.fonction === "courriers_lecture")?.coutMoyen).toBeCloseTo(0.003, 6);
    // Une fonction sans appel ne divise pas par zéro.
    expect(b.fonctions.find((f) => f.fonction === "question")?.coutMoyen).toBe(0);
    expect(b.reste).toBeCloseTo(9.93, 6);
    expect(b.depasse).toBe(false);
  });

  it("prolonge la dépense au mois plein au rythme des jours écoulés", () => {
    // 0,07 € en 10 jours d'octobre (31 jours) : 0,217 €.
    expect(bilanIa(lignes, { budgetEuros: 10, maintenant: new Date("2026-10-10T12:00:00Z") }).estimationMoisPlein).toBeCloseTo(0.217, 6);
  });

  it("un budget dépassé ne laisse pas un reste négatif", () => {
    const b = bilanIa([{ fonction: "question", appels: 100, echecs: 0, cout: 12 }], { budgetEuros: 10, maintenant: new Date("2026-10-19T08:00:00Z") });
    expect(b.reste).toBe(0);
    expect(b.depasse).toBe(true);
  });

  it("un mois sans appel : tout est à zéro", () => {
    expect(bilanIa([], { budgetEuros: 10, maintenant: new Date("2026-10-01T05:00:00Z") })).toMatchObject({ total: 0, appels: 0, coutMoyen: 0, reste: 10, estimationMoisPlein: 0 });
  });

  it("nomme les fonctions en français, et garde un code inconnu tel quel", () => {
    expect(nomFonctionIa("courriers_lecture_nuit")).toBe("Lecture de courrier (nuit)");
    expect(nomFonctionIa("indexation_nuit")).toBe("Indexation des documents (nuit)");
    expect(nomFonctionIa("test")).toBe("Test des réglages");
    expect(nomFonctionIa("autre_chose")).toBe("autre_chose");
  });
});
