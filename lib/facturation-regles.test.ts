import { describe, expect, it } from "vitest";
import { prochainJalon, versCsv } from "./facturation-regles";

const jour = "2026-10-11";

describe("le prochain jalon de facturation", () => {
  it("rien à facturer sur un devis ou un chantier annulé", () => {
    expect(prochainJalon({ statut: "devis", pvSigneLe: null, reservesOuvertes: 0 }, jour)).toBeNull();
    expect(prochainJalon({ statut: "annule", pvSigneLe: null, reservesOuvertes: 0 }, jour)).toBeNull();
  });

  it("acompte à la signature, situations pendant les travaux", () => {
    expect(prochainJalon({ statut: "signe", pvSigneLe: null, reservesOuvertes: 0 }, jour)?.cle).toBe("acompte");
    expect(prochainJalon({ statut: "en_cours", pvSigneLe: null, reservesOuvertes: 0 }, jour)?.cle).toBe("situation");
  });

  it("le solde attend le PV signé, puis la retenue se libère un an après", () => {
    expect(prochainJalon({ statut: "reception", pvSigneLe: null, reservesOuvertes: 1 }, jour)).toMatchObject({ cle: "solde", date: null });
    expect(prochainJalon({ statut: "reception", pvSigneLe: "2026-10-09", reservesOuvertes: 1 }, jour)).toMatchObject({ cle: "solde", date: "2026-10-09" });
    expect(prochainJalon({ statut: "clos", pvSigneLe: "2026-10-09", reservesOuvertes: 0 }, jour)).toMatchObject({ cle: "retenue", date: "2027-10-09" });
    expect(prochainJalon({ statut: "clos", pvSigneLe: "2025-01-10", reservesOuvertes: 0 }, jour)).toBeNull();
  });
});

describe("le fichier CSV", () => {
  it("point-virgule, accents lisibles dans Excel, guillemets protégés", () => {
    const csv = versCsv(["Client", "Montant HT"], [["Dupont; fils", 1200.5], ['Le "Clos"', null]]);
    expect(csv.startsWith("﻿Client;Montant HT\r\n")).toBe(true);
    expect(csv).toContain('"Dupont; fils";1200.5');
    expect(csv).toContain('"Le ""Clos""";');
  });

  it("piégé : un nom qui commence par = ne devient pas une formule", () => {
    expect(versCsv(["Client"], [["=HYPERLINK(\"x\")"]])).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
