import { describe, expect, it } from "vitest";
import { resumerPrevisions } from "./meteo";

// Un créneau de 3 heures, au format d'OpenWeatherMap.
function creneau(iso: string, min: number, max: number, opts: { pluie?: number; vent?: number; ciel?: string } = {}) {
  return {
    dt: Date.parse(iso) / 1000,
    main: { temp_min: min, temp_max: max },
    weather: [{ description: opts.ciel ?? "ciel dégagé" }],
    wind: { speed: opts.vent ?? 3 },
    rain: opts.pluie ? { "3h": opts.pluie } : undefined,
  };
}

describe("resumerPrevisions", () => {
  it("regroupe les créneaux par jour de Paris et garde trois jours", () => {
    const jours = resumerPrevisions(
      [
        creneau("2026-10-05T09:00:00Z", 8, 12),
        creneau("2026-10-05T15:00:00Z", 11, 16),
        creneau("2026-10-06T09:00:00Z", 7, 10),
        creneau("2026-10-07T09:00:00Z", 6, 9),
        creneau("2026-10-08T09:00:00Z", 5, 8),
      ],
      "2026-10-05",
    );
    expect(jours.map((j) => j.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(jours[0]).toMatchObject({ min: 8, max: 16, alertes: [] });
  });

  it("signale le gel, la pluie et le vent fort", () => {
    const [j] = resumerPrevisions(
      [creneau("2026-10-05T03:00:00Z", -1, 2, { pluie: 1.5 }), creneau("2026-10-05T12:00:00Z", 2, 5, { pluie: 1, vent: 15 })],
      "2026-10-05",
    );
    expect(j.alertes).toEqual(["Gel", "Pluie", "Vent fort"]);
    expect(j.ventKmh).toBe(54);
  });

  it("ignore les créneaux d'hier", () => {
    expect(resumerPrevisions([creneau("2026-10-04T12:00:00Z", 5, 9)], "2026-10-05")).toEqual([]);
  });
});
