import { describe, expect, it } from "vitest";
import { donneesCote } from "./cote";

describe("donneesCote", () => {
  it("place aujourd'hui entre le début et la fin, et compte les lots finis", () => {
    const c = donneesCote("2026-09-01", "2026-11-30", "2026-10-16", { finis: 2, total: 8 });
    expect(c).toMatchObject({ pct: 25, aujourdhui: 50, debut: "01.09", fin: "30.11", finis: 2, total: 8 });
  });

  it("sans date ou sans lot, ne trace ni repère ni avancement", () => {
    expect(donneesCote(null, "2026-11-30", "2026-10-16", undefined)).toMatchObject({ pct: 0, aujourdhui: null, debut: "—", total: 0 });
  });

  it("un chantier en retard garde son repère sur la borne de fin, sans déborder", () => {
    expect(donneesCote("2026-09-01", "2026-10-01", "2026-12-01", { finis: 1, total: 2 }).aujourdhui).toBe(100);
  });
});
