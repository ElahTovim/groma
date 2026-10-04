import { describe, expect, it } from "vitest";
import { nomPropre, TAILLE_MAX, verifierFichier } from "./fichiers";

describe("verifierFichier", () => {
  it("accepte un PDF de taille raisonnable", () => {
    expect(verifierFichier({ size: 200_000, type: "application/pdf" }).ok).toBe(true);
  });

  it("refuse un fichier trop lourd", () => {
    expect(verifierFichier({ size: TAILLE_MAX + 1, type: "application/pdf" }).ok).toBe(false);
  });

  it("refuse un type inattendu, par exemple un exécutable", () => {
    expect(verifierFichier({ size: 1000, type: "application/x-msdownload" }).ok).toBe(false);
  });

  it("refuse un fichier vide", () => {
    expect(verifierFichier({ size: 0, type: "image/png" }).ok).toBe(false);
  });
});

it("nomPropre retire accents et caractères spéciaux", () => {
  expect(nomPropre("Devis signé (v2) é.pdf")).toBe("Devis-signe-v2-e.pdf");
});
