import { describe, expect, it } from "vitest";
import { controlerCitations, decouperEnCitations, extraireCitations, separerAVerifier } from "@/lib/recherche-citations";
import { lignes } from "@/lib/recherche-flux";

const sources = [
  { documentId: "DOC-01", titre: "Procédure de réception", page: 2 },
  { documentId: "DOC-07", titre: "Contrat cadre, lot 3", page: 5 },
];

describe("extraction des citations", () => {
  it("trouve chaque citation, même quand le titre contient une virgule", () => {
    const c = extraireCitations("Délai de 8 jours [Procédure de réception, p. 2]. Pénalités [Contrat cadre, lot 3, p. 5]. Encore [Procédure de réception, p. 2].");
    expect(c).toEqual([
      { brut: "[Procédure de réception, p. 2]", titre: "Procédure de réception", page: 2 },
      { brut: "[Contrat cadre, lot 3, p. 5]", titre: "Contrat cadre, lot 3", page: 5 },
    ]);
  });

  it("ignore les crochets qui ne sont pas des citations", () => {
    expect(extraireCitations("Voir [annexe] et [1].")).toEqual([]);
  });
});

describe("contrôle des citations", () => {
  it("une citation d'une source fournie est valide, aux accents et à la casse près", () => {
    const [c] = controlerCitations("Oui [procedure de RECEPTION, p. 2].", sources);
    expect(c).toMatchObject({ statut: "valide", documentId: "DOC-01" });
  });

  it("une page qui n'a pas été fournie est signalée", () => {
    const [c] = controlerCitations("Oui [Procédure de réception, p. 9].", sources);
    expect(c.statut).toBe("page_non_fournie");
  });

  it("un document inventé est signalé", () => {
    const [c] = controlerCitations("Oui [Guide imaginaire du BTP, p. 2].", sources);
    expect(c.statut).toBe("document_inconnu");
  });

  it("le texte se découpe en morceaux et en citations, sans rien perdre", () => {
    const t = "A [Procédure de réception, p. 2] B";
    const parts = decouperEnCitations(t);
    expect(parts.map((p) => p.type)).toEqual(["texte", "citation", "texte"]);
    expect(parts.map((p) => (p.type === "texte" ? p.texte : p.brut)).join("")).toBe(t);
  });
});

describe("section « À vérifier »", () => {
  it("est isolée quelle que soit sa forme", () => {
    for (const titre of ["À vérifier", "## À vérifier", "**À vérifier :**", "A verifier :"]) {
      const r = separerAVerifier(`Réponse.\n\n${titre}\n- le montant`);
      expect(r).toEqual({ reponse: "Réponse.", aVerifier: "- le montant" });
    }
  });

  it("absente, toute la réponse reste la réponse", () => {
    expect(separerAVerifier("Réponse seule, à vérifier plus tard.")).toEqual({ reponse: "Réponse seule, à vérifier plus tard.", aVerifier: null });
  });
});

describe("lecture du flux de la route", () => {
  it("garde la ligne incomplète pour la suite et ignore une ligne illisible", () => {
    const r = lignes('{"type":"etape","etape":"recherche"}\npas du json\n{"type":"tex');
    expect(r.evenements).toEqual([{ type: "etape", etape: "recherche" }]);
    expect(r.reste).toBe('{"type":"tex');
  });
});
