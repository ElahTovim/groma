import { describe, expect, it } from "vitest";
import { etatNuit } from "./sante-nuit";

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
