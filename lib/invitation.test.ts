import { describe, expect, it } from "vitest";
import { formulaireCompte, formulaireInvitation } from "./invitation";
import { empreinte } from "./empreinte";

describe("formulaireInvitation", () => {
  it("accepte un externe avec une qualité libre", () => {
    expect(formulaireInvitation.parse({ email: " Archi@Exemple.fr ", role: "externe", qualite: "diagnostiqueur" })).toEqual({
      email: "archi@exemple.fr",
      role: "externe",
      qualite: "diagnostiqueur",
    });
  });

  it("refuse d'inviter un gérant", () => {
    expect(formulaireInvitation.safeParse({ email: "a@b.fr", role: "gerant", qualite: "x" }).success).toBe(false);
  });

  it("refuse une invitation sans qualité", () => {
    expect(formulaireInvitation.safeParse({ email: "a@b.fr", role: "externe", qualite: " " }).success).toBe(false);
  });
});

describe("formulaireCompte", () => {
  it("refuse deux mots de passe différents", () => {
    expect(formulaireCompte.safeParse({ nom: "A", motDePasse: "un-long-mot-de-passe", confirmation: "autre-mot-de-passe" }).success).toBe(false);
  });
});

describe("les jetons", () => {
  it("on ne garde qu'une empreinte, toujours la même pour un même jeton, jamais le jeton lui-même", () => {
    expect(empreinte("abc")).toBe(empreinte("abc"));
    expect(empreinte("abc")).not.toContain("abc");
    expect(empreinte("abc")).toHaveLength(64);
  });
});
