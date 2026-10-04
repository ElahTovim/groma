import { describe, expect, it } from "vitest";
import { formulaireChantier } from "./chantier-forme";

const base = {
  nom: "Rénovation salle de bain",
  client: "Famille Morel",
  adresse: "12 rue des Tilleuls",
  codePostal: "75011",
  ville: "Paris",
  montantHt: "",
  debutPrevu: "",
};

describe("formulaireChantier", () => {
  it("accepte un chantier complet sans montant ni date", () => {
    const r = formulaireChantier.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.montantHt).toBeNull();
  });

  it("lit un montant écrit à la française", () => {
    expect(formulaireChantier.parse({ ...base, montantHt: "18 500,50" }).montantHt).toBe("18500.50");
  });

  it("refuse un chantier sans client", () => {
    expect(formulaireChantier.safeParse({ ...base, client: "  " }).success).toBe(false);
  });

  it("refuse un chantier sans adresse", () => {
    expect(formulaireChantier.safeParse({ ...base, adresse: "" }).success).toBe(false);
  });

  it("refuse un code postal mal formé", () => {
    expect(formulaireChantier.safeParse({ ...base, codePostal: "7501" }).success).toBe(false);
  });

  it("refuse un montant en texte", () => {
    expect(formulaireChantier.safeParse({ ...base, montantHt: "environ 20k" }).success).toBe(false);
  });
});
