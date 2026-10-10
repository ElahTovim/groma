import { describe, expect, it } from "vitest";
import { ambiance, cielDe, momentDe } from "@/lib/ambiance";

describe("l'ambiance de la carte météo", () => {
  it("normal : pluie l'après-midi, fond gris et gouttes", () => {
    const a = ambiance({ description: "légère pluie", heure: 14, alertes: [] });
    expect(a.particules).toEqual(["pluie"]);
    expect(a.texteSombre).toBe(false);
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
