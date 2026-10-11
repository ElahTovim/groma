import { describe, expect, it } from "vitest";
import { aReverifier, libelleActivite, lireRecherche, lireReponse, lireResultat } from "./entreprises-regles";

// Une réponse réelle de l'API, raccourcie.
const active = {
  siren: "433900834",
  nom_complet: "BOUYGUES BATIMENT ILE DE FRANCE",
  activite_principale: "41.20B",
  etat_administratif: "A",
  date_creation: "2000-11-20",
  date_fermeture: null,
  siege: { siret: "43390083400040", adresse: "1 AVENUE EUGENE FREYSSINET 78280 GUYANCOURT" },
};

describe("la recherche", () => {
  it("accepte un nom", () => {
    expect(lireRecherche("  Transports Ferrand ")).toEqual({ ok: true, q: "Transports Ferrand", numero: false });
  });

  it("accepte un SIRET tapé avec ses espaces", () => {
    expect(lireRecherche("404 833 048 00022")).toEqual({ ok: true, q: "40483304800022", numero: true });
  });

  it("refuse une saisie vide ou trop courte", () => {
    expect(lireRecherche("").ok).toBe(false);
    expect(lireRecherche("ab").ok).toBe(false);
  });

  it("repère une faute de frappe dans le numéro, avant tout appel", () => {
    expect(lireRecherche("404833049")).toMatchObject({ ok: false, erreur: expect.stringContaining("faute de frappe") });
    expect(lireRecherche("12345678")).toMatchObject({ ok: false, erreur: expect.stringContaining("9 chiffres") });
  });

  it("laisse passer La Poste, qui ne suit pas la clé de contrôle", () => {
    expect(lireRecherche("35600000000048").ok).toBe(true);
  });
});

describe("la réponse de l'API", () => {
  it("une entreprise en activité", () => {
    expect(lireResultat(active)).toEqual({
      siren: "433900834",
      siret: "43390083400040",
      nom: "BOUYGUES BATIMENT ILE DE FRANCE",
      adresse: "1 AVENUE EUGENE FREYSSINET 78280 GUYANCOURT",
      activite: "41.20B",
      ferme: false,
      fermeeLe: null,
      creeeLe: "2000-11-20",
    });
  });

  it("une entreprise fermée est signalée comme telle", () => {
    expect(lireResultat({ ...active, etat_administratif: "C", date_fermeture: "2021-12-31" })).toMatchObject({ ferme: true, fermeeLe: "2021-12-31" });
  });

  it("une réponse vide ou abîmée ne donne rien, sans planter", () => {
    expect(lireReponse({ results: [] })).toEqual([]);
    expect(lireReponse(null)).toEqual([]);
    expect(lireReponse({ results: "erreur" })).toEqual([]);
    expect(lireReponse({ results: [{ siren: "abc", nom_complet: "X" }, { siren: "433900834" }, active] })).toHaveLength(1);
  });
});

describe("outils", () => {
  it("traduit les codes d'activité du bâtiment, et garde les autres tels quels", () => {
    expect(libelleActivite("43.22A")).toBe("Plomberie, eau, gaz");
    expect(libelleActivite("62.01Z")).toBe("Activité 62.01Z");
    expect(libelleActivite(null)).toBeNull();
  });

  it("revérifie une entreprise au bout d'une semaine", () => {
    const maintenant = new Date("2026-10-11T04:00:00Z");
    expect(aReverifier(new Date("2026-10-05T04:00:00Z"), maintenant)).toBe(false);
    expect(aReverifier(new Date("2026-10-04T04:00:00Z"), maintenant)).toBe(true);
  });
});
