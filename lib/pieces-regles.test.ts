import { describe, expect, it } from "vitest";
import { etatPiece, expiration, palierDeRelance, piecesBloquantes, suggestions, verifierDepot } from "./pieces-regles";

const jour = "2026-10-19";

describe("les suggestions à l'invitation", () => {
  it("selon la qualité saisie, accents et majuscules compris", () => {
    expect(suggestions("Architecte")).toEqual(["plans", "cctp", "rc_pro"]);
    expect(suggestions("sous-traitant électricité")).toEqual(["decennale", "vigilance", "kbis"]);
    expect(suggestions("Électricien")).toEqual(["decennale", "vigilance", "kbis"]);
    expect(suggestions("Syndic de copropriété")).toEqual(["ag_travaux", "reglement_copro"]);
  });
  it("une qualité inconnue ne propose rien : l'équipe choisit", () => {
    expect(suggestions("voisin")).toEqual([]);
  });
});

describe("l'état d'une pièce", () => {
  it("vide : manquante", () => {
    expect(etatPiece(null, jour)).toEqual({ etat: "manquante" });
  });
  it("déposée par l'intervenant : à valider ; refusée : avec son motif", () => {
    expect(etatPiece({ statut: "deposee", expireLe: "2027-04-01", motif: null }, jour).etat).toBe("a_valider");
    expect(etatPiece({ statut: "refusee", expireLe: null, motif: "illisible" }, jour)).toEqual({ etat: "refusee", motif: "illisible" });
  });
  it("normal : validée, sans échéance ou loin de l'échéance", () => {
    expect(etatPiece({ statut: "validee", expireLe: null, motif: null }, jour)).toEqual({ etat: "valide", expireLe: null });
    expect(etatPiece({ statut: "validee", expireLe: "2027-04-01", motif: null }, jour).etat).toBe("valide");
  });
  it("dans les 15 derniers jours, on prévient ; passée, elle est expirée même si elle attendait validation", () => {
    expect(etatPiece({ statut: "validee", expireLe: "2026-10-28", motif: null }, jour)).toEqual({ etat: "bientot", expireLe: "2026-10-28", joursRestants: 9 });
    expect(etatPiece({ statut: "deposee", expireLe: "2026-10-18", motif: null }, jour).etat).toBe("expiree");
  });
  it("piégé : une attestation de 6 mois délivrée un 31 août expire fin février", () => {
    expect(expiration("2026-08-31", 6)).toBe("2027-02-28");
  });
});

describe("le dépôt", () => {
  it("une décennale en PDF, datée, reçoit son échéance", () => {
    expect(verifierDepot({ type: "decennale", delivreeLe: "2026-01-15", aujourdhui: jour, mime: "application/pdf" })).toEqual({ ok: true, expireLe: "2027-01-15" });
  });
  it("des plans en photo, sans date : acceptés, sans échéance", () => {
    expect(verifierDepot({ type: "plans", delivreeLe: "", aujourdhui: jour, mime: "image/jpeg" })).toEqual({ ok: true, expireLe: null });
  });
  it("refuse un justificatif officiel en photo, sans date, daté dans le futur ou déjà périmé", () => {
    expect(verifierDepot({ type: "kbis", delivreeLe: "2026-10-01", aujourdhui: jour, mime: "image/jpeg" }).ok).toBe(false);
    expect(verifierDepot({ type: "kbis", delivreeLe: "", aujourdhui: jour, mime: "application/pdf" }).ok).toBe(false);
    expect(verifierDepot({ type: "kbis", delivreeLe: "2026-10-20", aujourdhui: jour, mime: "application/pdf" }).ok).toBe(false);
    expect(verifierDepot({ type: "kbis", delivreeLe: "2026-06-01", aujourdhui: jour, mime: "application/pdf" }).ok).toBe(false);
  });
});

describe("les blocages", () => {
  const exigences = [
    { libelle: "Attestation d'assurance décennale", qui: "Plomberie Ferrand", bloque: "demarrage" as const, etat: { etat: "manquante" as const } },
    { libelle: "Extrait Kbis", qui: "Plomberie Ferrand", bloque: null, etat: { etat: "manquante" as const } },
    { libelle: "DOE (dossier des ouvrages exécutés)", qui: null, bloque: "cloture" as const, etat: { etat: "valide" as const, expireLe: null } },
  ];
  it("seules les pièces qui bloquent cette étape, et pas encore fournies, sont citées", () => {
    expect(piecesBloquantes(exigences, "demarrage")).toEqual(["Attestation d'assurance décennale de Plomberie Ferrand : manquante."]);
    expect(piecesBloquantes(exigences, "cloture")).toEqual([]);
  });
  it("une pièce qui expire bientôt ne bloque pas ; une pièce à valider bloque encore", () => {
    expect(piecesBloquantes([{ ...exigences[0], etat: { etat: "bientot", expireLe: "2026-10-28", joursRestants: 9 } }], "demarrage")).toEqual([]);
    expect(piecesBloquantes([{ ...exigences[0], etat: { etat: "a_valider" } }], "demarrage")).toHaveLength(1);
  });
});

describe("les relances", () => {
  it("une pièce fournie ne se relance pas ; une refusée, si", () => {
    expect(palierDeRelance({ etat: "valide", expireLe: null })).toBeNull();
    expect(palierDeRelance({ etat: "a_valider" })).toBeNull();
    expect(palierDeRelance({ etat: "refusee", motif: "illisible" })).toEqual({ palier: "refusee", echeance: "aucune" });
  });
});
