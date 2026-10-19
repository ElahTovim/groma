import { describe, expect, it } from "vitest";
import { etatNuit, heureDuRecap } from "./sante-nuit";

const maintenant = new Date("2026-10-12T08:00:00Z");

describe("la santé de la machine de nuit", () => {
  it("va bien quand la nuit de ce matin est importée", () => {
    expect(etatNuit({ statut: "ok" }, new Date("2026-10-12T04:00:00Z"), maintenant).ok).toBe(true);
  });

  it("est en panne dès que la dernière tentative échoue (le flux est coupé)", () => {
    expect(etatNuit({ statut: "echec" }, new Date("2026-10-12T04:00:00Z"), maintenant).ok).toBe(false);
  });

  it("est en panne si plus rien n'a réussi depuis 26 heures (la tâche ne tourne plus)", () => {
    expect(etatNuit({ statut: "ok" }, new Date("2026-10-11T04:00:00Z"), maintenant).ok).toBe(false);
  });

  it("est en panne tant qu'aucune exécution n'a eu lieu", () => {
    expect(etatNuit(null, null, maintenant).ok).toBe(false);
  });
});

describe("l'heure du récapitulatif, été comme hiver", () => {
  it("l'été (UTC+2) : 5 h UTC = 7 h à Paris, il part", () => {
    expect(heureDuRecap(new Date("2026-10-19T05:10:00Z"))).toBe(true);
  });
  it("l'hiver (UTC+1) : 5 h UTC = 6 h à Paris, il attend le passage de 6 h UTC", () => {
    expect(heureDuRecap(new Date("2026-11-02T05:10:00Z"))).toBe(false);
    expect(heureDuRecap(new Date("2026-11-02T06:10:00Z"))).toBe(true);
  });
});
