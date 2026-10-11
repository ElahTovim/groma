import { describe, expect, it } from "vitest";
import { empreinte } from "./empreinte";
import { garanties, texteCanonique, verifierPreparation, verifierSignature, type ContenuPv } from "./reception-regles";

const prete = { statut: "reception" as const, dejaSigne: false, dateReception: "2026-10-09", aujourdhui: "2026-10-11", signataireEstExterne: true, signalementsAQualifier: 0 };

describe("préparer le PV", () => {
  it("cas normal : réception déclarée, date passée, un externe signataire", () => {
    expect(verifierPreparation(prete)).toEqual({ ok: true });
  });

  it("pas avant la réception déclarée", () => {
    expect(verifierPreparation({ ...prete, statut: "en_cours" }).ok).toBe(false);
  });

  it("pas daté dans le futur, ni à une date impossible", () => {
    expect(verifierPreparation({ ...prete, dateReception: "2026-10-12" }).ok).toBe(false);
    expect(verifierPreparation({ ...prete, dateReception: "2026-02-30" }).ok).toBe(false);
  });

  it("cas piégé : un signalement arrivé la veille et pas encore qualifié bloque le PV", () => {
    expect(verifierPreparation({ ...prete, signalementsAQualifier: 1 })).toMatchObject({ ok: false, raison: expect.stringContaining("à qualifier") });
  });

  it("un PV signé ne se modifie plus", () => {
    expect(verifierPreparation({ ...prete, dejaSigne: true }).ok).toBe(false);
  });

  it("le signataire est un externe, pas quelqu'un de l'équipe", () => {
    expect(verifierPreparation({ ...prete, signataireEstExterne: false }).ok).toBe(false);
  });
});

describe("signer le PV", () => {
  const ok = { estSignataire: true, dejaSigne: false, nomSaisi: "Claire Dumas", accepte: true };
  it("le signataire désigné signe avec son nom et sa confirmation", () => {
    expect(verifierSignature(ok)).toEqual({ ok: true });
  });
  it("personne d'autre ne signe à sa place", () => {
    expect(verifierSignature({ ...ok, estSignataire: false }).ok).toBe(false);
  });
  it("pas de signature vide, sans confirmation, ou deux fois", () => {
    expect(verifierSignature({ ...ok, nomSaisi: "  " }).ok).toBe(false);
    expect(verifierSignature({ ...ok, accepte: false }).ok).toBe(false);
    expect(verifierSignature({ ...ok, dejaSigne: true }).ok).toBe(false);
  });
});

describe("les garanties partent de la réception", () => {
  it("1 an, 2 ans, 10 ans", () => {
    expect(garanties("2026-10-09")).toEqual({ parfaitAchevement: "2027-10-09", biennale: "2028-10-09", decennale: "2036-10-09", retenueLiberable: "2027-10-09" });
  });
  it("un 29 février tombe au 28 l'année suivante", () => {
    expect(garanties("2028-02-29").parfaitAchevement).toBe("2029-02-28");
  });
});

describe("l'empreinte du PV", () => {
  const pv: ContenuPv = {
    reference: "CH-2026-0042",
    chantier: "Rénovation salle de bain",
    adresse: "12 rue des Lilas, 69003 Lyon",
    client: "Claire Dumas",
    entreprise: "groma BTP",
    dateReception: "2026-10-09",
    reserves: [{ texte: "Joint de douche à reprendre" }],
    observations: null,
    signataire: "Claire Dumas",
  };
  it("le même PV donne la même empreinte ; une virgule changée en donne une autre", () => {
    expect(empreinte(texteCanonique(pv))).toBe(empreinte(texteCanonique({ ...pv })));
    expect(empreinte(texteCanonique(pv))).not.toBe(empreinte(texteCanonique({ ...pv, reserves: [{ texte: "Joint de douche à reprendre." }] })));
  });
  it("le texte dit s'il y a des réserves", () => {
    expect(texteCanonique({ ...pv, reserves: [] })).toContain("Réception sans réserve.");
    expect(texteCanonique(pv)).toContain("1. Joint de douche à reprendre");
  });
});
