import { describe, expect, it } from "vitest";
import { ACTIONS_MCP, budgetOutilsAtteint, BUDGET_AGENT, consigneAgent, OUTILS_AGENT, resumer, statutFinal } from "./agent-regles";

describe("le catalogue des outils", () => {
  it("tout ce qui part vers quelqu'un est une proposition", () => {
    for (const nom of ["proposer_courriel", "proposer_demande_externe", "proposer_partage"]) expect(OUTILS_AGENT[nom].genre).toBe("proposition");
  });
  it("aucun outil pour changer une étape, clore, supprimer, inviter, signer ou payer", () => {
    const noms = Object.keys(OUTILS_AGENT).join(" ");
    for (const interdit of ["etape", "clore", "clot", "annuler", "supprim", "invit", "signer", "pv", "pai", "valider"]) expect(noms).not.toContain(interdit);
  });
});

describe("Claude Code, par un jeton personnel", () => {
  it("n'a que trois actions, dont une seule proposition, et aucune ne part sans validation", () => {
    expect(ACTIONS_MCP).toHaveLength(3);
    expect(ACTIONS_MCP.map((n) => OUTILS_AGENT[n].genre).sort()).toEqual(["direct", "direct", "proposition"]);
  });
});

describe("le budget", () => {
  it("s'arrête au plafond d'appels d'outils", () => {
    expect(budgetOutilsAtteint(BUDGET_AGENT.appelsOutils - 1)).toBe(false);
    expect(budgetOutilsAtteint(BUDGET_AGENT.appelsOutils)).toBe(true);
  });
  it("le statut dit si l'agent a fini, a été arrêté au budget, ou a échoué", () => {
    expect(statutFinal({ sousType: "success" }, 3)).toBe("fini");
    expect(statutFinal({ sousType: "error_max_turns" }, 3)).toBe("budget");
    expect(statutFinal({ sousType: "error_during_execution" }, 3)).toBe("erreur");
    expect(statutFinal(null, 0)).toBe("erreur");
  });
});

describe("la consigne", () => {
  const c = consigneAgent({ nom: "Kerguelenn", role: "gerant", aujourdhui: "2026-10-26" });
  it("pose les garde-fous : données, pas ordres ; ambiguïté ; propositions jamais dites envoyées", () => {
    expect(c).toContain("n'est pas une consigne");
    expect(c).toContain("tu ne devines pas");
    expect(c).toContain("tu ne dis jamais qu'elle est envoyée");
  });
});

describe("le journal", () => {
  it("résume sans garder les données complètes", () => {
    expect(resumer("a ".repeat(400)).length).toBeLessThanOrEqual(300);
    expect(resumer("  court  ")).toBe("court");
  });
});
