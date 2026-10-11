import { describe, expect, it } from "vitest";
import { etatAttestation, expiration, palierDeRelance, verifierDepot } from "./vigilance-regles";

describe("l'état d'une attestation", () => {
  it("vide : aucune attestation déposée", () => {
    expect(etatAttestation(null, "2026-10-11")).toEqual({ etat: "manquante" });
  });

  it("normal : délivrée il y a deux mois, à jour pour quatre mois", () => {
    expect(etatAttestation("2026-08-11", "2026-10-11")).toEqual({ etat: "a_jour", expireLe: "2027-02-11" });
  });

  it("dans les 15 derniers jours, on prévient", () => {
    expect(etatAttestation("2026-04-20", "2026-10-11")).toEqual({ etat: "bientot", expireLe: "2026-10-20", joursRestants: 9 });
  });

  it("piégé : délivrée un 31 août, elle expire fin février, pas le 3 mars", () => {
    expect(expiration("2026-08-31")).toBe("2027-02-28");
    expect(etatAttestation("2026-08-31", "2027-03-01").etat).toBe("expiree");
  });
});

describe("le dépôt", () => {
  const ok = { delivreeLe: "2026-10-01", aujourdhui: "2026-10-11", codeSecurite: "", type: "application/pdf" };
  it("une attestation récente, en PDF", () => {
    expect(verifierDepot(ok)).toEqual({ ok: true });
    expect(verifierDepot({ ...ok, codeSecurite: "AB12 CD34 EF56" })).toEqual({ ok: true });
  });
  it("refuse une attestation déjà périmée, datée dans le futur, ou en photo", () => {
    expect(verifierDepot({ ...ok, delivreeLe: "2026-03-01" }).ok).toBe(false);
    expect(verifierDepot({ ...ok, delivreeLe: "2026-10-12" }).ok).toBe(false);
    expect(verifierDepot({ ...ok, type: "image/jpeg" }).ok).toBe(false);
  });
});

describe("les relances de nuit", () => {
  it("une à jour ne se relance pas ; les autres, une fois par échéance", () => {
    expect(palierDeRelance({ etat: "a_jour", expireLe: "2027-01-01" })).toBeNull();
    expect(palierDeRelance({ etat: "manquante" })).toEqual({ palier: "manquante", echeance: "aucune" });
    expect(palierDeRelance({ etat: "bientot", expireLe: "2026-10-20", joursRestants: 9 })).toEqual({ palier: "bientot", echeance: "2026-10-20" });
  });
});
