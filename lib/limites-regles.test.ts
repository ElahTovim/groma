import { describe, expect, it } from "vitest";
import { adresseReseau, depasse, LIMITES, sessionValable } from "./limites-regles";

describe("les limites", () => {
  it("bloque à partir du plafond, pas avant", () => {
    const max = LIMITES.connexionParAdresse.max;
    expect(depasse(max - 1, "connexionParAdresse")).toBe(false);
    expect(depasse(max, "connexionParAdresse")).toBe(true);
  });

  it("lit l'adresse réseau transmise par Vercel, la première de la liste", () => {
    expect(adresseReseau(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(adresseReseau(new Headers())).toBe("inconnue");
  });
});

describe("la session révocable", () => {
  it("accepte une session au bon numéro", () => {
    expect(sessionValable(2, 2)).toBe(true);
  });

  it("refuse une session ouverte avant un changement de mot de passe", () => {
    expect(sessionValable(1, 2)).toBe(false);
  });

  it("une session ancienne, sans numéro, vaut zéro", () => {
    expect(sessionValable(undefined, 0)).toBe(true);
    expect(sessionValable(undefined, 1)).toBe(false);
  });
});
