import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAINE_FICTIF, estPhotoFictive, genererChantiers, PERSONNES, photoAffichee, PHOTOS_FICTIVES, propositionsFictives } from "./jeu-de-donnees";

describe("le jeu de données fictif", () => {
  it("contient dix personnes et cinquante chantiers", () => {
    expect(PERSONNES).toHaveLength(10);
    expect(genererChantiers()).toHaveLength(50);
  });

  it("donne exactement les mêmes données à chaque tirage", () => {
    expect(genererChantiers()).toEqual(genererChantiers());
  });

  it("n'utilise que des adresses courriel fictives", () => {
    expect(PERSONNES.every((p) => p.email.endsWith(`@${DOMAINE_FICTIF}`))).toBe(true);
  });

  it("a des références uniques", () => {
    const refs = genererChantiers().map((c) => c.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("contient des cas tordus : sans montant, sans externe, annulé avec motif", () => {
    const c = genererChantiers();
    expect(c.some((x) => x.montantHt === null)).toBe(true);
    expect(c.some((x) => x.participants.length === 1)).toBe(true);
    expect(c.filter((x) => x.statut === "annule").every((x) => x.motifAnnulation)).toBe(true);
  });

  it("chaque élément du fil est écrit, et partagé, par des participants du chantier", () => {
    for (const c of genererChantiers()) {
      for (const e of c.fil) {
        expect(c.participants).toContain(e.auteur);
        for (const v of e.visiblePar) expect(c.participants).toContain(v);
      }
    }
  });

  it("prépare la démo : une réception bloquée par un signalement, des lots en retard", () => {
    const c = genererChantiers();
    expect(c.some((x) => x.statut === "reception" && x.fil.some((e) => e.statutSignalement === "a_qualifier"))).toBe(true);
    expect(c.some((x) => x.lots.some((l) => (l.statut === "commande" || l.statut === "a_commander") && l.livraisonPrevue! < "2026-10-05"))).toBe(true);
  });

  it("les photos : chaque image existe, le devis sans montant reste sans photo, une vraie photo n'est pas prise pour fictive", () => {
    for (const p of PHOTOS_FICTIVES) expect(existsSync(join(process.cwd(), "public", p))).toBe(true);
    const cs = genererChantiers();
    expect(cs.find((c) => c.nom === "Devis sans montant")?.photoUrl).toBeNull();
    expect(cs.filter((c) => c.photoUrl).length).toBe(49);
    expect(estPhotoFictive("https://x.private.blob.vercel-storage.com/jeu-de-donnees/interieur-1.jpg")).toBe(false);
  });
});

describe("photoAffichee", () => {
  it("garde la photo déposée pour le chantier", () => {
    expect(photoAffichee("https://x.private.blob.vercel-storage.com/a.jpg", "CHA-1")).toBe("https://x.private.blob.vercel-storage.com/a.jpg");
  });

  it("sans photo, prend une photo du jeu de données, toujours la même pour la référence", () => {
    const p = photoAffichee(null, "CHA-20261010-06");
    expect(PHOTOS_FICTIVES).toContain(p);
    expect(photoAffichee(null, "CHA-20261010-06")).toBe(p);
  });
});

describe("propositionsFictives", () => {
  const chantiersFictifs = genererChantiers();
  const props = propositionsFictives(chantiersFictifs);

  it("donne trois propositions, une de chaque type, sur trois chantiers différents", () => {
    expect(props.map((p) => p.type).sort()).toEqual(["courriel", "demande_externe", "partage"]);
    expect(new Set(props.map((p) => p.chantier)).size).toBe(3);
  });

  it("adresse chacune à un externe qui participe au chantier ; le partage vise un élément encore interne", () => {
    for (const p of props) {
      expect(chantiersFictifs[p.chantier].participants).toContain(p.externe);
      expect(PERSONNES[p.externe].role).toBe("externe");
      if (p.type === "partage") expect(chantiersFictifs[p.chantier].fil[p.element].visiblePar).toEqual([]);
    }
  });
});
