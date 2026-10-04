import { describe, expect, it } from "vitest";
import { peutCreerChantier, peutVoirChantier, voitLInterne } from "./acces";

describe("peutVoirChantier", () => {
  it("le gérant voit tout, même sans être participant", () => {
    expect(peutVoirChantier({ role: "gerant", estParticipant: false, equipeVoitTout: false })).toBe(true);
  });

  it("l'équipe voit tout quand le réglage est actif", () => {
    expect(peutVoirChantier({ role: "equipe", estParticipant: false, equipeVoitTout: true })).toBe(true);
  });

  it("l'équipe ne voit que ses chantiers quand le réglage est coupé", () => {
    expect(peutVoirChantier({ role: "equipe", estParticipant: false, equipeVoitTout: false })).toBe(false);
    expect(peutVoirChantier({ role: "equipe", estParticipant: true, equipeVoitTout: false })).toBe(true);
  });

  it("un externe ne voit que les chantiers où il est invité, quel que soit le réglage", () => {
    expect(peutVoirChantier({ role: "externe", estParticipant: false, equipeVoitTout: true })).toBe(false);
    expect(peutVoirChantier({ role: "externe", estParticipant: true, equipeVoitTout: true })).toBe(true);
  });
});

describe("droits d'action", () => {
  it("seuls le gérant et l'équipe créent un chantier", () => {
    expect(peutCreerChantier("gerant")).toBe(true);
    expect(peutCreerChantier("equipe")).toBe(true);
    expect(peutCreerChantier("externe")).toBe(false);
  });

  it("un externe ne voit jamais l'interne", () => {
    expect(voitLInterne("externe")).toBe(false);
    expect(voitLInterne("equipe")).toBe(true);
  });
});
