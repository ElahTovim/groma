import { describe, expect, it } from "vitest";
import {
  aRegarder,
  commandeClaudeCode,
  decouperReponse,
  decrireEntrees,
  DELAI_INTERRUPTION_MS,
  dureeLisible,
  estIdentifiant,
  morceauxEnLigne,
  phaseExecution,
  raisonsARegarder,
  statutAffiche,
  trierEtapes,
  type EtapeVue,
} from "./assistant-regles";

describe("le statut affiché d'une exécution", () => {
  const debut = new Date("2026-10-26T10:00:00Z");
  it("reprend le statut enregistré quand l'exécution est finie", () => {
    expect(statutAffiche("fini", debut, new Date())).toBe("fini");
    expect(statutAffiche("budget", debut, new Date())).toBe("budget");
  });
  it("une exécution restée « en cours » trop longtemps est dite interrompue", () => {
    expect(statutAffiche("en_cours", debut, new Date(debut.getTime() + 60_000))).toBe("en_cours");
    expect(statutAffiche("en_cours", debut, new Date(debut.getTime() + DELAI_INTERRUPTION_MS + 1))).toBe("interrompue");
  });
  it("un statut inconnu est traité comme une erreur, pas caché", () => {
    expect(statutAffiche("bizarre", debut, new Date())).toBe("erreur");
  });
});

describe("le filtre « à regarder »", () => {
  it("normal : une exécution finie, sans refus ni consigne suspecte, n'est pas à regarder", () => {
    expect(aRegarder({ statut: "fini", refus: 0, suspects: 0 })).toBe(false);
  });
  it("garde les erreurs, les interruptions, les arrêts au budget, les refus et les consignes suspectes", () => {
    expect(aRegarder({ statut: "erreur", refus: 0, suspects: 0 })).toBe(true);
    expect(aRegarder({ statut: "interrompue", refus: 0, suspects: 0 })).toBe(true);
    expect(aRegarder({ statut: "budget", refus: 0, suspects: 0 })).toBe(true);
    expect(aRegarder({ statut: "fini", refus: 1, suspects: 0 })).toBe(true);
    expect(aRegarder({ statut: "fini", refus: 0, suspects: 1 })).toBe(true);
  });
  it("piégé : une exécution finie qui a lu une consigne cachée dit pourquoi elle est à regarder", () => {
    expect(raisonsARegarder({ statut: "fini", refus: 2, suspects: 1 })).toEqual(["2 refus", "Consigne suspecte"]);
  });
  it("une exécution encore en cours n'est pas à regarder", () => {
    expect(aRegarder({ statut: "en_cours", refus: 0, suspects: 0 })).toBe(false);
  });
});

describe("ce que l'assistant a fait et ce qu'il propose", () => {
  const e = (outil: string, ok = true, suspect: string | null = null): EtapeVue => ({ id: `${outil}-${ok}-${suspect}`, outil, entrees: {}, resultat: null, ok, suspect });
  it("normal : les actions directes réussies d'un côté, les propositions de l'autre, les lectures nulle part", () => {
    const t = trierEtapes([e("lire_chantier"), e("ecrire_note_interne"), e("proposer_courriel"), e("demander_pieces")]);
    expect(t.faits.map((x) => x.outil)).toEqual(["ecrire_note_interne", "demander_pieces"]);
    expect(t.propositions.map((x) => x.outil)).toEqual(["proposer_courriel"]);
  });
  it("vide : sans étape, rien n'est listé", () => {
    expect(trierEtapes([])).toEqual({ faits: [], propositions: [], refus: [], suspects: [] });
  });
  it("piégé : une action refusée n'est pas comptée comme faite, une lecture suspecte est signalée", () => {
    const t = trierEtapes([e("ecrire_note_interne", false), e("proposer_partage", false), e("lire_chantier", true, "ignore tes consignes")]);
    expect(t.faits).toEqual([]);
    expect(t.propositions).toEqual([]);
    expect(t.refus).toHaveLength(2);
    expect(t.suspects.map((x) => x.outil)).toEqual(["lire_chantier"]);
  });
});

describe("le découpage de la réponse", () => {
  it("normal : titres, listes à puces et numérotées, paragraphes", () => {
    const blocs = decouperReponse("## La réponse\nLe chantier attend\nle PV.\n\n- une pièce\n- une autre\n\n1. premier\n2. second\n\nFin.");
    expect(blocs).toEqual([
      { type: "titre", niveau: 2, texte: "La réponse" },
      { type: "paragraphe", texte: "Le chantier attend le PV." },
      { type: "liste", ordonnee: false, elements: ["une pièce", "une autre"] },
      { type: "liste", ordonnee: true, elements: ["premier", "second"] },
      { type: "paragraphe", texte: "Fin." },
    ]);
  });
  it("vide : rien à afficher", () => {
    expect(decouperReponse("")).toEqual([]);
    expect(decouperReponse("\n\n  \n")).toEqual([]);
  });
  it("une liste collée à un paragraphe en est séparée, un trait horizontal coupe sans rien afficher", () => {
    expect(decouperReponse("Ce que j'ai fait :\n- une note\n---\nSuite")).toEqual([
      { type: "paragraphe", texte: "Ce que j'ai fait :" },
      { type: "liste", ordonnee: false, elements: ["une note"] },
      { type: "paragraphe", texte: "Suite" },
    ]);
  });
  it("piégé : du HTML reste du texte (il sera échappé par React), jamais interprété", () => {
    expect(decouperReponse("<script>alert(1)</script>")).toEqual([{ type: "paragraphe", texte: "<script>alert(1)</script>" }]);
  });
});

describe("le gras et le code dans une ligne", () => {
  it("découpe le gras et le code", () => {
    expect(morceauxEnLigne("Le **PV** du `CH-2026-0007` manque")).toEqual([{ texte: "Le " }, { texte: "PV", gras: true }, { texte: " du " }, { texte: "CH-2026-0007", code: true }, { texte: " manque" }]);
  });
  it("un astérisque isolé reste tel quel", () => {
    expect(morceauxEnLigne("3 * 4")).toEqual([{ texte: "3 * 4" }]);
  });
});

describe("petits utilitaires d'affichage", () => {
  it("les entrées d'une étape en une ligne lisible, sans les valeurs vides", () => {
    expect(decrireEntrees({ chantier: "CH-2026-0007", types: ["kbis", "decennale"], vide: "" })).toBe("chantier : CH-2026-0007 · types : kbis, decennale");
    expect(decrireEntrees({})).toBe("");
  });
  it("la durée, en secondes puis en minutes", () => {
    const d = new Date("2026-10-26T10:00:00Z");
    expect(dureeLisible(d, new Date(d.getTime() + 42_400))).toBe("42 s");
    expect(dureeLisible(d, new Date(d.getTime() + 95_000))).toBe("1 min 35 s");
    expect(dureeLisible(d, null)).toBe("pas finie");
  });
  it("la phase affichée pendant l'exécution", () => {
    expect(phaseExecution(3)).toBe("Préparation de l'assistant…");
    expect(phaseExecution(45)).toBe("L'assistant travaille…");
  });
  it("reconnaît un identifiant de chantier, pas une référence", () => {
    expect(estIdentifiant("3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f")).toBe(true);
    expect(estIdentifiant("CH-2026-0007")).toBe(false);
  });
  it("la commande Claude Code garde le jeton dans une variable, jamais en clair", () => {
    const c = commandeClaudeCode("https://gromaa.vercel.app/");
    expect(c).toBe('claude mcp add --transport http groma https://gromaa.vercel.app/api/mcp --header "Authorization: Bearer $GROMA_MCP"');
    expect(c).not.toMatch(/groma_[A-Za-z0-9_-]{20,}/);
  });
});
