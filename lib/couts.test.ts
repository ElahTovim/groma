import { expect, it } from "vitest";
import { estimer } from "./couts";

it("estime le coût d'un mois de nuits au tarif indicatif", () => {
  const e = estimer({ dureeMs: 30 * 2000, appelsFlux: 30, geocodages: 300, courriels: 60 }, { fonctionEuroParHeure: 0.2, courrielEuro: 0.001, appelFluxEuro: 0, geocodageEuro: 0 });
  expect(e.fonction).toBeCloseTo(0.00333, 4);
  expect(e.courriels).toBeCloseTo(0.06, 6);
  expect(e.total).toBeCloseTo(0.0633, 3);
});
