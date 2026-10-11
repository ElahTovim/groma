import { describe, expect, it } from "vitest";
import { echeancesAVenir } from "@/lib/tableau-de-bord";

const lot = (o: Partial<Parameters<typeof echeancesAVenir>[0][number]>) => ({
  nom: "Carrelage",
  statut: "commande" as const,
  livraisonPrevue: null,
  finPrevue: null,
  chantierId: "c1",
  chantier: "12 rue des Martyrs",
  ...o,
});

describe("les échéances de la semaine", () => {
  it("normal : une livraison et une fin dans les 7 jours, triées par date", () => {
    const r = echeancesAVenir([lot({ livraisonPrevue: "2026-10-14", finPrevue: "2026-10-12" })], "2026-10-10", 7);
    expect(r.map((e) => [e.date, e.quoi])).toEqual([
      ["2026-10-12", "fin"],
      ["2026-10-14", "livraison"],
    ]);
  });

  it("vide : sans lot ni date, rien à venir", () => {
    expect(echeancesAVenir([], "2026-10-10", 7)).toEqual([]);
    expect(echeancesAVenir([lot({})], "2026-10-10", 7)).toEqual([]);
  });

  it("piégé : un lot déjà livré n'attend plus sa livraison, et le 8e jour est hors de la semaine", () => {
    const r = echeancesAVenir([lot({ statut: "livre", livraisonPrevue: "2026-10-11", finPrevue: "2026-10-17" })], "2026-10-10", 7);
    expect(r).toEqual([]);
  });
});
