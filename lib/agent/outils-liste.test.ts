import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { liste } from "./outils";

describe("une liste rendue à l'agent", () => {
  it("entière : ni coupée ni avertissement", () => {
    expect(liste([1, 2, 3], 40)).toEqual({ total: 3, affiches: 3, tronquee: false, elements: [1, 2, 3] });
  });
  it("coupée : le total et l'avertissement sont là", () => {
    const l = liste(Array.from({ length: 55 }, (_, i) => i), 40);
    expect(l).toMatchObject({ total: 55, affiches: 40, tronquee: true });
    expect(l.avertissement).toContain("40 sur 55");
    expect(l.elements).toHaveLength(40);
  });
  it("au plafond de la base (200), le total est un minimum", () => {
    expect(liste(Array.from({ length: 200 }, (_, i) => i), 40).avertissement).toContain("200 au moins");
  });
});
