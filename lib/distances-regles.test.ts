import { describe, expect, it } from "vitest";
import {
  arrondir,
  cleDuPoint,
  dateLimiteCommande,
  duree,
  estOuvre,
  joursDeTransport,
  joursFeries,
  lireItineraire,
  reculerJoursOuvres,
  volDOiseauKm,
  zoneDeplacement,
} from "./distances-regles";

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LYON = { latitude: 45.764, longitude: 4.8357 };
const MARSEILLE = { latitude: 43.2965, longitude: 5.3698 };

describe("les zones de petits déplacements", () => {
  it("chaque borne appartient à sa zone (un cercle de 5 km inclut le point à 5 km)", () => {
    expect(zoneDeplacement(0)).toEqual({ grandDeplacement: false, zone: "1A" });
    expect(zoneDeplacement(5)).toEqual({ grandDeplacement: false, zone: "1A" });
    expect(zoneDeplacement(5.01)).toEqual({ grandDeplacement: false, zone: "1B" });
    expect(zoneDeplacement(10)).toEqual({ grandDeplacement: false, zone: "1B" });
    expect(zoneDeplacement(10.01)).toEqual({ grandDeplacement: false, zone: "2" });
    expect(zoneDeplacement(30)).toEqual({ grandDeplacement: false, zone: "3" });
    expect(zoneDeplacement(50)).toEqual({ grandDeplacement: false, zone: "5" });
  });

  it("au-delà de la dernière zone : grand déplacement", () => {
    expect(zoneDeplacement(50.01)).toEqual({ grandDeplacement: true });
    expect(zoneDeplacement(400)).toEqual({ grandDeplacement: true });
  });

  it("les bornes sont un paramètre : une autre convention change la zone", () => {
    expect(zoneDeplacement(8, [{ zone: "1", jusquaKm: 10 }])).toEqual({ grandDeplacement: false, zone: "1" });
    expect(zoneDeplacement(12, [{ zone: "1", jusquaKm: 10 }])).toEqual({ grandDeplacement: true });
  });
});

describe("la distance à vol d'oiseau", () => {
  it("Paris-Lyon fait environ 392 km", () => {
    expect(volDOiseauKm(PARIS, LYON)).toBeGreaterThan(385);
    expect(volDOiseauKm(PARIS, LYON)).toBeLessThan(400);
  });

  it("Paris-Marseille fait environ 660 km, et l'ordre des points ne change rien", () => {
    const d = volDOiseauKm(PARIS, MARSEILLE);
    expect(d).toBeGreaterThan(650);
    expect(d).toBeLessThan(670);
    expect(volDOiseauKm(MARSEILLE, PARIS)).toBeCloseTo(d, 6);
  });

  it("un point vers lui-même : zéro", () => {
    expect(volDOiseauKm(PARIS, PARIS)).toBe(0);
  });
});

describe("la date limite de commande", () => {
  const base = { minutesTransport: 30, statut: "a_commander", aujourdhui: "2026-10-01" };

  it("les jours ouvrés enjambent le week-end : livraison mardi, 3 jours, commande le jeudi d'avant", () => {
    // Mardi 27 octobre 2026 → lundi 26 (1), vendredi 23 (2), jeudi 22 (3).
    const r = dateLimiteCommande({ ...base, livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3 });
    expect(r).toEqual({ etat: "a_commander", limite: "2026-10-22", joursTransport: 0 });
  });

  it("un transport de plus de 4 h ajoute un jour ouvré", () => {
    const court = dateLimiteCommande({ ...base, livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3, minutesTransport: 240 });
    const long = dateLimiteCommande({ ...base, livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3, minutesTransport: 241 });
    expect(court).toMatchObject({ limite: "2026-10-22", joursTransport: 0 });
    expect(long).toMatchObject({ limite: "2026-10-21", joursTransport: 1 });
  });

  it("date passée et lot encore à commander : commande en retard", () => {
    const r = dateLimiteCommande({ ...base, aujourdhui: "2026-10-23", livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3 });
    expect(r.etat).toBe("en_retard");
  });

  it("le jour même de la limite n'est pas encore en retard", () => {
    const r = dateLimiteCommande({ ...base, aujourdhui: "2026-10-22", livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3 });
    expect(r.etat).toBe("a_commander");
  });

  it("date passée mais lot déjà commandé : pas d'alerte", () => {
    const r = dateLimiteCommande({ ...base, statut: "commande", aujourdhui: "2026-10-23", livraisonPrevue: "2026-10-27", delaiFournisseurJours: 3 });
    expect(r.etat).toBe("commande");
  });

  it("délai absent : pas de date, et on dit pourquoi", () => {
    const r = dateLimiteCommande({ ...base, livraisonPrevue: "2026-10-27", delaiFournisseurJours: null });
    expect(r).toEqual({ etat: "sans_date", raison: "Délai du fournisseur à indiquer." });
  });

  it("livraison absente : pas de date", () => {
    expect(dateLimiteCommande({ ...base, livraisonPrevue: null, delaiFournisseurJours: 5 }).etat).toBe("sans_date");
  });

  it("le 11 novembre (mercredi en 2026) ne compte pas comme jour ouvré", () => {
    // Jeudi 12 novembre, 1 jour → mardi 10, le mercredi 11 étant férié.
    expect(reculerJoursOuvres("2026-11-12", 1)).toBe("2026-11-10");
  });
});

describe("les jours fériés", () => {
  it("2026 : Pâques le 5 avril, donc lundi de Pâques le 6, Ascension le 14 mai, Pentecôte le 25 mai", () => {
    const f = joursFeries(2026);
    expect(f.has("2026-04-06")).toBe(true);
    expect(f.has("2026-05-14")).toBe(true);
    expect(f.has("2026-05-25")).toBe(true);
    expect(f.size).toBe(11);
  });

  it("samedi et dimanche ne sont pas ouvrés, un lundi ordinaire l'est", () => {
    expect(estOuvre("2026-10-24")).toBe(false);
    expect(estOuvre("2026-10-25")).toBe(false);
    expect(estOuvre("2026-10-26")).toBe(true);
  });
});

describe("le transport en jours", () => {
  it("rien jusqu'au seuil, puis un jour par 24 h entamées", () => {
    expect(joursDeTransport(null)).toBe(0);
    expect(joursDeTransport(240)).toBe(0);
    expect(joursDeTransport(300)).toBe(1);
    expect(joursDeTransport(1500)).toBe(2);
  });
});

describe("l'arrondi des coordonnées du cache", () => {
  it("deux points à quelques mètres partagent la même clé", () => {
    expect(cleDuPoint({ latitude: 48.85661, longitude: 2.35222 })).toBe("48.857,2.352");
    expect(cleDuPoint({ latitude: 48.85689, longitude: 2.35249 })).toBe("48.857,2.352");
  });

  it("des zéros gardés et pas de « -0 »", () => {
    expect(cleDuPoint({ latitude: 45.7, longitude: -0.0001 })).toBe("45.700,0.000");
    expect(arrondir({ latitude: 45.76449, longitude: 4.83571 })).toEqual({ latitude: 45.764, longitude: 4.836 });
  });
});

describe("l'affichage d'une durée", () => {
  it("minutes, heures, heures et minutes", () => {
    expect(duree(45)).toBe("45 min");
    expect(duree(120)).toBe("2 h");
    expect(duree(286)).toBe("4 h 46");
  });
});

describe("la réponse du calcul d'itinéraire", () => {
  it("lit la forme réelle du service (Paris-Lyon, appel du 19 octobre 2026)", () => {
    const reponse = { resource: "bdtopo-osrm", distanceUnit: "kilometer", timeUnit: "minute", distance: 465.60159999999996, duration: 286.1933333333333, constraints: [] };
    expect(lireItineraire(reponse)).toEqual({ km: 465.6, minutes: 286 });
  });

  it("refuse une réponse vide ou d'une autre forme", () => {
    expect(lireItineraire(null)).toBeNull();
    expect(lireItineraire({ error: "x" })).toBeNull();
    expect(lireItineraire({ distance: "12", duration: 3 })).toBeNull();
  });
});
