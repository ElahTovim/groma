import { describe, expect, it } from "vitest";
import { BUDGET_PASSAGE_MS, DUREES_ETAPES, delaiAccorde, peutLancer, recapAttendLAnalyse, tempsRestant } from "./nuit-etapes-regles";

describe("le temps d'un passage de la nuit", () => {
  it("le temps restant part du début du passage et ne descend pas sous zéro", () => {
    expect(tempsRestant(1000, 11_000)).toBe(BUDGET_PASSAGE_MS - 10_000);
    expect(tempsRestant(0, 10 * 60_000)).toBe(0);
  });

  it("une étape ne démarre que s'il reste de quoi la finir", () => {
    expect(peutLancer("courriers", DUREES_ETAPES.courriers, false)).toBe(true);
    expect(peutLancer("courriers", DUREES_ETAPES.courriers - 1, false)).toBe(false);
  });

  it("le récapitulatif garde sa place quand il doit partir à ce passage", () => {
    const juste = DUREES_ETAPES.analyse + 1000;
    expect(peutLancer("analyse", juste, false)).toBe(true);
    expect(peutLancer("analyse", juste, true)).toBe(false);
    expect(peutLancer("recapitulatif", DUREES_ETAPES.recapitulatif, true)).toBe(true);
    expect(delaiAccorde("analyse", 40_000, true)).toBe(40_000 - DUREES_ETAPES.recapitulatif);
  });

  it("un passage de 5 h ordinaire (import déjà fait) tient courriers, documents, analyse et récapitulatif", () => {
    let restant = tempsRestant(0, 2_000);
    for (const e of ["courriers", "documents", "analyse", "recapitulatif"] as const) {
      expect(peutLancer(e, restant, true)).toBe(true);
      restant -= DUREES_ETAPES[e];
    }
    expect(restant).toBeGreaterThanOrEqual(0);
  });

  it("un rattrapage de dix nuits laisse l'analyse au passage suivant", () => {
    const restant = tempsRestant(0, 25_000) - DUREES_ETAPES.courriers - DUREES_ETAPES.documents;
    expect(peutLancer("analyse", restant, true)).toBe(false);
  });
});

describe("le récapitulatif et l'analyse", () => {
  it("attend une analyse qui n'a pas eu le temps, sauf au dernier passage", () => {
    expect(recapAttendLAnalyse({ etape: "analyse", statut: "reportee" }, false)).toBe(true);
    expect(recapAttendLAnalyse({ etape: "analyse", statut: "trop_longue" }, false)).toBe(true);
    expect(recapAttendLAnalyse({ etape: "analyse", statut: "reportee" }, true)).toBe(false);
  });
  it("n'attend pas une analyse en panne, faite, ou sans objet", () => {
    for (const statut of ["en_panne", "faite", "deja_faite", "sans_objet"] as const) expect(recapAttendLAnalyse({ etape: "analyse", statut }, false)).toBe(false);
  });
});
