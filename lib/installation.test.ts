import { describe, expect, it } from "vitest";
import { formulaireInstallation, peutInstaller } from "./installation";

describe("peutInstaller", () => {
  const emailPrevu = "gerant@exemple.fr";

  it("accepte l'adresse prévue quand aucun compte n'existe", () => {
    expect(peutInstaller({ email: "gerant@exemple.fr", emailPrevu, nombreDeComptes: 0 })).toEqual({ ok: true });
  });

  it("ignore la casse et les espaces de l'adresse", () => {
    expect(peutInstaller({ email: "  Gerant@Exemple.FR ", emailPrevu, nombreDeComptes: 0 }).ok).toBe(true);
  });

  it("refuse une seconde installation", () => {
    expect(peutInstaller({ email: "gerant@exemple.fr", emailPrevu, nombreDeComptes: 1 }).ok).toBe(false);
  });

  it("refuse une autre adresse que celle prévue", () => {
    expect(peutInstaller({ email: "intrus@exemple.fr", emailPrevu, nombreDeComptes: 0 }).ok).toBe(false);
  });

  it("refuse tout si l'adresse prévue n'est pas réglée", () => {
    expect(peutInstaller({ email: "gerant@exemple.fr", emailPrevu: undefined, nombreDeComptes: 0 }).ok).toBe(false);
  });
});

describe("formulaireInstallation", () => {
  const base = { nom: "Kerguelenn", email: "gerant@exemple.fr", motDePasse: "un-long-mot-de-passe", confirmation: "un-long-mot-de-passe" };

  it("accepte un formulaire complet", () => {
    expect(formulaireInstallation.safeParse(base).success).toBe(true);
  });

  it("refuse un mot de passe trop court", () => {
    expect(formulaireInstallation.safeParse({ ...base, motDePasse: "court", confirmation: "court" }).success).toBe(false);
  });

  it("refuse deux mots de passe différents", () => {
    expect(formulaireInstallation.safeParse({ ...base, confirmation: "autre-mot-de-passe" }).success).toBe(false);
  });
});
