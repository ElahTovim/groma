import { describe, expect, it } from "vitest";
import { ambiance, CONTRASTE_MIN, cielDe, momentDe, pireContraste } from "@/lib/ambiance";

describe("l'ambiance de la carte météo", () => {
  it("normal : pluie l'après-midi, fond gris et gouttes", () => {
    const a = ambiance({ description: "légère pluie", heure: 14, alertes: [] });
    expect(a.particules).toEqual(["pluie"]);
    expect(pireContraste(a.fond, a.texteSombre, a.voile)).toBeGreaterThanOrEqual(CONTRASTE_MIN);
  });

  it("vide : une description inconnue donne un ciel nuageux, pas une erreur", () => {
    expect(cielDe("")).toBe("nuageux");
    expect(ambiance({ description: "", heure: 12, alertes: [] }).particules).toEqual(["nuages"]);
  });

  it("piégé : « peu nuageux » est un ciel clair, pas nuageux ; la nuit, des étoiles et pas de soleil", () => {
    expect(cielDe("peu nuageux")).toBe("clair");
    expect(ambiance({ description: "ciel dégagé", heure: 23, alertes: ["Vent fort"] }).particules).toEqual(["etoiles", "vent"]);
  });

  it("les bascules d'heure : 5 h est l'aube, 21 h la nuit", () => {
    expect([4, 5, 9, 17, 21].map(momentDe)).toEqual(["nuit", "aube", "jour", "soir", "nuit"]);
  });

  it("neige de jour : texte en noir pour rester lisible", () => {
    expect(ambiance({ description: "neige", heure: 10, alertes: [] }).texteSombre).toBe(true);
  });
});

describe("lisibilité du texte sur le ciel", () => {
  const moments = ["aube", "jour", "soir", "nuit"] as const;
  const ciels = ["dégagé", "nuageux", "pluie", "orage", "neige", "brouillard"];
  const heure = { aube: 6, jour: 12, soir: 19, nuit: 23 };

  it("garantit un contraste d'au moins 4,5:1 sur les 24 ciels, partout dans le dégradé", () => {
    for (const c of ciels)
      for (const m of moments) {
        const a = ambiance({ description: c, heure: heure[m], alertes: [] });
        expect(pireContraste(a.fond, a.texteSombre, a.voile)).toBeGreaterThanOrEqual(CONTRASTE_MIN);
      }
  });

  it("écrit en noir sur un ciel clair de jour, en blanc la nuit", () => {
    expect(ambiance({ description: "ciel dégagé", heure: 12, alertes: [] }).texteSombre).toBe(true);
    expect(ambiance({ description: "ciel dégagé", heure: 23, alertes: [] }).texteSombre).toBe(false);
  });
});
