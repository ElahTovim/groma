import { describe, expect, it } from "vitest";
import { TAILLE_MAX } from "./fichiers";
import {
  bilanChamps,
  bilanGlobal,
  dateNormalisee,
  erreurDeLecture,
  idDepot,
  incertitudesAffichees,
  motifDuRejet,
  pdfTropLourdPourLIa,
  ressembleAUnPdf,
  schemaLecturePdf,
  verdictChamp,
  verifierDepot,
} from "./courriers-regles";

const IA = { expediteur: "Bernard Lefort", societe: "Carrelages du Marais", reference: "CHA-20261006-01", date: "2026-10-12", categorie: "relance_paiement", montant: 1250.5 };

describe("le bilan de l'IA, champ par champ", () => {
  it("tout juste : chaque champ validé tel que l'IA l'avait proposé", () => {
    expect(bilanChamps(IA, { ...IA }).map((l) => l.verdict)).toEqual(["juste", "juste", "juste", "juste", "juste", "juste"]);
  });
  it("un champ inventé : l'IA avait une valeur, la personne a vidé le champ", () => {
    const l = bilanChamps(IA, { ...IA, societe: null });
    expect(l.find((x) => x.champ === "societe")?.verdict).toBe("invente");
    expect(l.filter((x) => x.verdict !== "juste")).toHaveLength(1);
  });
  it("un champ manqué : l'IA n'avait rien, la personne a rempli", () => {
    expect(bilanChamps({ ...IA, montant: null }, IA).find((x) => x.champ === "montant")?.verdict).toBe("manque");
  });
  it("un champ corrigé, et un champ vide des deux côtés", () => {
    expect(verdictChamp("expediteur", "Bernard Lefort", "Bernard Lefèvre")).toBe("corrige");
    expect(verdictChamp("reference", null, "")).toBe("juste_vide");
  });
  it("une date du même jour écrite autrement est juste", () => {
    expect(verdictChamp("date", "2026-10-12", "12/10/2026")).toBe("juste");
    expect(verdictChamp("date", "12 octobre 2026", "2026-10-12")).toBe("juste");
    expect(verdictChamp("date", "1er octobre 2026", "2026-10-01")).toBe("juste");
    expect(verdictChamp("date", "2026-10-12", "2026-10-13")).toBe("corrige");
    expect(dateNormalisee("31/02/2026")).toBeNull();
  });
  it("un montant de 1 200 et de 1200,00 est juste", () => {
    expect(verdictChamp("montant", "1 200", "1200,00")).toBe("juste");
    expect(verdictChamp("montant", 1200, "1 200,00 €")).toBe("juste");
    expect(verdictChamp("montant", 1200, 1250)).toBe("corrige");
  });
  it("les espaces, la casse et l'apostrophe ne comptent pas", () => {
    expect(verdictChamp("societe", "  carrelages   DU marais ", "Carrelages du Marais")).toBe("juste");
    expect(verdictChamp("expediteur", "Jean D’Arc", "jean d'arc")).toBe("juste");
    expect(verdictChamp("reference", "cha-20261006-01", "CHA-20261006-01")).toBe("juste");
  });
});

describe("le bilan global des courriers validés", () => {
  it("compte les verdicts et le taux de justesse, et met à part les courriers sans lecture", () => {
    const b = bilanGlobal([
      { champs: { ...IA, ia: IA } }, // 6 justes
      { champs: { ...IA, societe: null, montant: 980, ia: { ...IA, reference: null } } }, // inventé, corrigé, manqué, 3 justes
      { champs: { ...IA, ia: null } }, // validé sans lecture
    ]);
    expect(b).toMatchObject({ courriers: 2, sansLecture: 1, champs: 12, juste: 9, justeVide: 0, corrige: 1, invente: 1, manque: 1 });
    expect(b.taux).toBeCloseTo(9 / 12);
  });
  it("sans courrier validé, le taux est vide (pas 0 %)", () => {
    expect(bilanGlobal([]).taux).toBeNull();
  });
});

describe("déposer un courrier", () => {
  it("accepte un texte collé, ou un PDF de 4 Mo au plus", () => {
    expect(verifierDepot({ texte: "  Bonjour, voici ma réclamation.  ", fichier: null })).toEqual({ ok: true, mode: "texte", texte: "Bonjour, voici ma réclamation." });
    expect(verifierDepot({ texte: "", fichier: { size: 120_000, type: "application/pdf", name: "lettre.pdf" } }).ok).toBe(true);
  });
  it("refuse un fichier qui n'est pas un PDF", () => {
    expect(verifierDepot({ texte: "", fichier: { size: 1000, type: "image/jpeg", name: "photo.jpg" } })).toMatchObject({ ok: false });
    expect(verifierDepot({ texte: "", fichier: { size: 1000, type: "application/msword", name: "lettre.doc" } })).toMatchObject({ ok: false });
  });
  it("refuse un PDF trop lourd", () => {
    expect(verifierDepot({ texte: "", fichier: { size: TAILLE_MAX + 1, type: "application/pdf", name: "gros.pdf" } })).toEqual({ ok: false, raison: "Fichier trop lourd : 4 Mo au plus." });
  });
  it("refuse un texte vide, un fichier vide, ou les deux à la fois", () => {
    expect(verifierDepot({ texte: "   \n ", fichier: null }).ok).toBe(false);
    expect(verifierDepot({ texte: undefined, fichier: null }).ok).toBe(false);
    expect(verifierDepot({ texte: "", fichier: { size: 0, type: "application/pdf", name: "vide.pdf" } })).toEqual({ ok: false, raison: "Le fichier est vide." });
    expect(verifierDepot({ texte: "Bonjour", fichier: { size: 10, type: "application/pdf", name: "a.pdf" } }).ok).toBe(false);
  });
  it("reconnaît un vrai PDF à ses premiers octets, pas à son nom", () => {
    expect(ressembleAUnPdf(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(ressembleAUnPdf(new TextEncoder().encode("MZ\x90\x00faux"))).toBe(false);
  });
  it("l'identifiant d'un dépôt ne peut pas se confondre avec un courrier du flux", () => {
    expect(idDepot("1b2c")).toBe("depot-1b2c");
  });
  it("pour un PDF, le format demandé au modèle inclut la transcription", () => {
    const r = schemaLecturePdf.safeParse({ expediteur: null, societe: null, reference: null, date: null, categorie: "autre", montant: null, incertitudes: [], consigneCachee: false, resume: "r", brouillon: "b" });
    expect(r.success).toBe(false);
    expect(schemaLecturePdf.shape.transcription).toBeDefined();
  });
});

describe("les anciennes données, déjà en production", () => {
  it("lit le motif d'un rejet rangé dans champs, et préfère la colonne quand elle existe", () => {
    expect(motifDuRejet({ motifRejet: null, champs: { expediteur: "X", motifRejet: "publicité" } })).toBe("publicité");
    expect(motifDuRejet({ motifRejet: "doublon", champs: { motifRejet: "publicité" } })).toBe("doublon");
    expect(motifDuRejet({ motifRejet: null, champs: null })).toBeNull();
  });
  it("lit l'échec de lecture rangé dans les incertitudes, et ne le montre pas deux fois", () => {
    const incertitudes = ["Lecture par l'IA impossible : L'IA ne répond pas pour l'instant.", "Date à relire."];
    expect(erreurDeLecture({ erreurLecture: null, incertitudes })).toBe("L'IA ne répond pas pour l'instant.");
    expect(erreurDeLecture({ erreurLecture: "Budget atteint.", incertitudes })).toBe("Budget atteint.");
    expect(erreurDeLecture({ erreurLecture: null, incertitudes: ["Date à relire."] })).toBeNull();
    expect(incertitudesAffichees(incertitudes)).toEqual(["Date à relire."]);
  });
});

describe("la taille d'un PDF que l'IA accepte de lire", () => {
  it("un petit PDF passe, un PDF de 1 Mo dépasse le plafond actuel de l'IA", () => {
    expect(pdfTropLourdPourLIa(30_000)).toBe(false);
    expect(pdfTropLourdPourLIa(1_000_000)).toBe(true);
  });
});
