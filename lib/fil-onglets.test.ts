import { describe, expect, it } from "vitest";
import { bandeDesJours, compteurs, dansOnglet, gestesDe, ongletDepuis } from "./fil-onglets";

const jour = "2026-10-19";
const el = (type: "message" | "document" | "demande" | "reponse" | "disponibilite" | "signalement", o: { statut?: "a_qualifier" | "reserve_ouverte" | "levee" | "ecarte"; date?: string } = {}) => ({
  type,
  statutSignalement: o.statut ?? null,
  dateCible: o.date ?? null,
});

describe("les onglets du fil", () => {
  it("chaque élément tombe dans le bon onglet, et le fil garde tout", () => {
    expect(dansOnglet("documents", "document")).toBe(true);
    expect(dansOnglet("documents", "message")).toBe(false);
    expect(dansOnglet("demandes", "disponibilite")).toBe(true);
    expect(dansOnglet("fil", "signalement")).toBe(true);
  });

  it("une adresse inconnue ou absente ouvre le fil", () => {
    expect(ongletDepuis("documents")).toBe("documents");
    expect(ongletDepuis("n'importe-quoi")).toBe("fil");
    expect(ongletDepuis(undefined)).toBe("fil");
  });

  it("le bouton d'ajout ne propose que les gestes de l'onglet", () => {
    const tous = ["message", "signalement", "document", "demande", "disponibilite"] as const;
    expect(gestesDe("documents", [...tous])).toEqual(["document"]);
    expect(gestesDe("demandes", [...tous])).toEqual(["demande", "disponibilite"]);
    expect(gestesDe("fil", [...tous])).toEqual([...tous]);
  });
});

describe("les compteurs", () => {
  it("cas vide : tout à zéro", () => {
    const c = compteurs([], jour);
    expect(c.fil).toEqual({ nombre: 0, aTraiter: 0 });
    expect(c.signalements).toEqual({ nombre: 0, aTraiter: 0 });
  });

  it("normal : ce qui attend une action est compté à part", () => {
    const c = compteurs(
      [el("message"), el("document"), el("demande", { date: "2026-10-18" }), el("demande", { date: "2026-10-25" }), el("signalement", { statut: "a_qualifier" }), el("signalement", { statut: "levee" })],
      jour,
      { documents: 2 },
    );
    expect(c.fil.nombre).toBe(6);
    expect(c.documents).toEqual({ nombre: 3, aTraiter: 0 }); // 1 du fil + PV et courrier
    expect(c.demandes).toEqual({ nombre: 2, aTraiter: 1 });
    expect(c.signalements).toEqual({ nombre: 2, aTraiter: 1 });
  });

  it("piégé : une demande pour aujourd'hui n'est pas encore en retard", () => {
    expect(compteurs([el("demande", { date: jour })], jour).demandes.aTraiter).toBe(0);
  });
});

describe("la bande des disponibilités", () => {
  it("sept jours à partir d'aujourd'hui, une personne comptée une fois par jour, en passant le mois", () => {
    const b = bandeDesJours(
      [
        { dateCible: "2026-10-20", auteur: "Claire" },
        { dateCible: "2026-10-20", auteur: "Claire" },
        { dateCible: "2026-10-20", auteur: "Karim" },
        { dateCible: "2026-11-01", auteur: "Inès" },
      ],
      "2026-10-26",
    );
    expect(b).toHaveLength(7);
    expect(b[0].jour).toBe("2026-10-26");
    expect(b[6].jour).toBe("2026-11-01");
    expect(b[6].presents).toEqual(["Inès"]);
    expect(bandeDesJours([{ dateCible: "2026-10-20", auteur: "Claire" }, { dateCible: "2026-10-20", auteur: "Claire" }, { dateCible: "2026-10-20", auteur: "Karim" }], "2026-10-20")[0].presents).toEqual(["Claire", "Karim"]);
  });
});
