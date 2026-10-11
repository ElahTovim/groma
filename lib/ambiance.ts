// L'ambiance d'une carte météo : le seul endroit coloré de l'interface, comme une
// fenêtre sur le ciel. Le fond suit le moment de la journée et le temps qu'il fait ;
// les particules (pluie, neige, vent, étoiles) l'animent. Testé dans ambiance.test.ts.

export type Moment = "aube" | "jour" | "soir" | "nuit";
export type Ciel = "clair" | "nuageux" | "pluie" | "orage" | "neige" | "brouillard";
export type Particule = "pluie" | "neige" | "vent" | "etoiles" | "soleil" | "nuages";

// Les heures de bascule, à l'heure de Paris. Un réglage : on pourra les suivre au fil des saisons.
export const HEURES = { aube: 5, jour: 9, soir: 17, nuit: 21 };

export function momentDe(heure: number): Moment {
  if (heure >= HEURES.aube && heure < HEURES.jour) return "aube";
  if (heure >= HEURES.jour && heure < HEURES.soir) return "jour";
  if (heure >= HEURES.soir && heure < HEURES.nuit) return "soir";
  return "nuit";
}

// Le ciel décrit par OpenWeatherMap, en français (« légère pluie », « peu nuageux »…).
export function cielDe(description: string): Ciel {
  const c = description.toLowerCase();
  if (c.includes("orage")) return "orage";
  if (c.includes("neige")) return "neige";
  if (c.includes("pluie") || c.includes("averse") || c.includes("bruine")) return "pluie";
  if (c.includes("brouillard") || c.includes("brume")) return "brouillard";
  if (c.includes("dégagé") || c.includes("peu nuageux") || c.includes("éclaircie")) return "clair";
  return "nuageux";
}

const FONDS: Record<Ciel, Record<Moment, string>> = {
  clair: {
    aube: "linear-gradient(165deg, #ffb88c 0%, #ff9a9e 45%, #a1c4fd 100%)",
    jour: "linear-gradient(180deg, #1e6fd9 0%, #4a9af0 55%, #8ec5fc 100%)",
    soir: "linear-gradient(165deg, #f76b8a 0%, #fd9f5b 40%, #5b3f8c 100%)",
    nuit: "linear-gradient(180deg, #0b1a2e 0%, #1c2b4a 55%, #2c3e70 100%)",
  },
  nuageux: {
    aube: "linear-gradient(165deg, #b49a96 0%, #a9a3ad 50%, #8797ab 100%)",
    jour: "linear-gradient(180deg, #5f7387 0%, #8597a8 55%, #aab8c4 100%)",
    soir: "linear-gradient(165deg, #9a7b84 0%, #7c7590 50%, #4b5168 100%)",
    nuit: "linear-gradient(180deg, #1d232c 0%, #2c3440 55%, #3d4654 100%)",
  },
  pluie: {
    aube: "linear-gradient(180deg, #5b6573 0%, #737f8d 55%, #8c97a3 100%)",
    jour: "linear-gradient(180deg, #4b5563 0%, #64717f 55%, #8593a0 100%)",
    soir: "linear-gradient(180deg, #3e4552 0%, #545b6b 55%, #6a6f80 100%)",
    nuit: "linear-gradient(180deg, #161b22 0%, #232a34 55%, #333b47 100%)",
  },
  orage: {
    aube: "linear-gradient(180deg, #2a2f3a 0%, #434957 60%, #5a5f6b 100%)",
    jour: "linear-gradient(180deg, #2a2f3a 0%, #434957 60%, #5a5f6b 100%)",
    soir: "linear-gradient(180deg, #221f2e 0%, #3a3548 60%, #514a5e 100%)",
    nuit: "linear-gradient(180deg, #0e1015 0%, #1b1e26 60%, #2a2e38 100%)",
  },
  neige: {
    aube: "linear-gradient(180deg, #e8e4ec 0%, #eef1f6 55%, #ffffff 100%)",
    jour: "linear-gradient(180deg, #dbe4ec 0%, #eef3f7 55%, #ffffff 100%)",
    soir: "linear-gradient(180deg, #d9d3e0 0%, #e6e6ef 55%, #f6f6fa 100%)",
    nuit: "linear-gradient(180deg, #3b4658 0%, #56627a 55%, #75819a 100%)",
  },
  brouillard: {
    aube: "linear-gradient(180deg, #d6cfcc 0%, #e0dddc 55%, #eceaea 100%)",
    jour: "linear-gradient(180deg, #c9ccd1 0%, #dcdfe3 55%, #eceef0 100%)",
    soir: "linear-gradient(180deg, #c4bec6 0%, #d5d1d8 55%, #e6e3e8 100%)",
    nuit: "linear-gradient(180deg, #2e3238 0%, #40454d 55%, #535962 100%)",
  },
};

export type Ambiance = { fond: string; texteSombre: boolean; particules: Particule[] };

export function ambiance(p: { description: string; heure: number; alertes: string[] }): Ambiance {
  const moment = momentDe(p.heure);
  const ciel = cielDe(p.description);
  // Neige et brouillard de jour sont clairs : le texte passe en noir pour rester lisible.
  const texteSombre = (ciel === "neige" || ciel === "brouillard") && moment !== "nuit";
  const particules: Particule[] = [];
  if (ciel === "pluie" || ciel === "orage") particules.push("pluie");
  if (ciel === "neige") particules.push("neige");
  if (ciel === "nuageux") particules.push("nuages");
  if (ciel === "clair" && moment === "nuit") particules.push("etoiles");
  if (ciel === "clair" && moment !== "nuit") particules.push("soleil");
  if (p.alertes.includes("Vent fort")) particules.push("vent");
  return { fond: FONDS[ciel][moment], texteSombre, particules };
}
