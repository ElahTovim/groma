import { describe, expect, it } from "vitest";
import { eurosCourt } from "@/lib/format";

// Intl sépare par des espaces insécables : on les ramène à des espaces simples pour comparer.
const net = (s: string) => s.replace(/\s/g, " ");

describe("les montants arrondis des grands chiffres", () => {
  it("normal : les milliers en k €, les millions en M €", () => {
    expect(net(eurosCourt(845000))).toBe("845 k €");
    expect(net(eurosCourt(1245000))).toBe("1,2 M €");
  });

  it("vide : zéro reste zéro euro", () => {
    expect(net(eurosCourt(0))).toBe("0 €");
  });

  it("piégé : sous mille euros, pas de « k » et pas de décimale", () => {
    expect(net(eurosCourt(950))).toBe("950 €");
  });
});
