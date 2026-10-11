import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/lib/db";
import { chantiers, comptes, pvReception } from "@/lib/db/schema";
import { garanties, texteCanonique, type ContenuPv } from "@/lib/reception-regles";

// Le nom de l'entreprise qui utilise groma, tel qu'il apparaît sur le PV.
export const NOM_ENTREPRISE = process.env.ENTREPRISE_NOM ?? "L'entreprise";

export type PvVu = {
  id: string;
  dateReception: string;
  reserves: { id: string; texte: string }[];
  observations: string | null;
  signataireId: string;
  signataire: string;
  prepareLe: string;
  signeLe: string | null;
  signeNom: string | null;
  contenuSigne: ContenuPv | null;
  empreinte: string | null;
};

export async function lirePv(chantierId: string): Promise<PvVu | null> {
  const [l] = await db
    .select({ pv: pvReception, signataire: comptes.nom })
    .from(pvReception)
    .innerJoin(comptes, eq(pvReception.signataireId, comptes.id))
    .where(eq(pvReception.chantierId, chantierId))
    .limit(1);
  if (!l) return null;
  return {
    id: l.pv.id,
    dateReception: l.pv.dateReception,
    reserves: l.pv.reserves,
    observations: l.pv.observations,
    signataireId: l.pv.signataireId,
    signataire: l.signataire,
    prepareLe: l.pv.prepareLe.toISOString(),
    signeLe: l.pv.signeLe?.toISOString() ?? null,
    signeNom: l.pv.signeNom,
    contenuSigne: l.pv.contenuSigne ?? null,
    empreinte: l.pv.empreinte,
  };
}

export function contenuPv(c: Pick<typeof chantiers.$inferSelect, "reference" | "nom" | "adresse" | "codePostal" | "ville" | "client">, pv: Pick<PvVu, "dateReception" | "reserves" | "observations" | "signataire">): ContenuPv {
  return {
    reference: c.reference,
    chantier: c.nom,
    adresse: `${c.adresse}, ${c.codePostal} ${c.ville}`,
    client: c.client,
    entreprise: NOM_ENTREPRISE,
    dateReception: pv.dateReception,
    reserves: pv.reserves.map((r) => ({ texte: r.texte })),
    observations: pv.observations,
    signataire: pv.signataire,
  };
}

// ——— Le PDF ———

// Les polices standard du PDF ne connaissent que l'alphabet latin : on remplace le reste.
const HORS_LATIN = /[^\n\u0020-\u007e\u00a0-\u00ff\u20ac\u2018\u2019\u201c\u201d\u2026\u2013\u2014\u0152\u0153\u2022]/gu;
const propre = (s: string) => s.normalize("NFC").replace(/[\r\t]/g, " ").replace(HORS_LATIN, "").replace(/ {2,}/g, " ").trim();

function dateLongue(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

function horodatage(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
}

class Mise {
  y: number;
  page: PDFPage;
  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private gras: PDFFont,
  ) {
    this.page = doc.addPage([595.28, 841.89]); // A4
    this.y = 841.89 - 64;
  }
  private place(h: number) {
    if (this.y - h < 64) {
      this.page = this.doc.addPage([595.28, 841.89]);
      this.y = 841.89 - 64;
    }
  }
  texte(t: string, o: { taille?: number; gras?: boolean; gris?: boolean; retrait?: number } = {}) {
    const taille = o.taille ?? 10.5;
    const police = o.gras ? this.gras : this.normal;
    const x = 56 + (o.retrait ?? 0);
    const largeur = 595.28 - 56 - x;
    for (const paragraphe of propre(t).split("\n")) {
      let ligne = "";
      const lignes: string[] = [];
      for (const mot of paragraphe.split(" ")) {
        const essai = ligne ? `${ligne} ${mot}` : mot;
        if (police.widthOfTextAtSize(essai, taille) > largeur && ligne) {
          lignes.push(ligne);
          ligne = mot;
        } else ligne = essai;
      }
      lignes.push(ligne);
      for (const l of lignes) {
        this.place(taille * 1.45);
        this.page.drawText(l, { x, y: this.y, size: taille, font: police, color: o.gris ? rgb(0.35, 0.35, 0.35) : rgb(0.08, 0.08, 0.08) });
        this.y -= taille * 1.45;
      }
    }
  }
  espace(h = 10) {
    this.y -= h;
  }
  filet() {
    this.place(12);
    this.page.drawLine({ start: { x: 56, y: this.y + 4 }, end: { x: 595.28 - 56, y: this.y + 4 }, thickness: 0.6, color: rgb(0.08, 0.08, 0.08) });
    this.y -= 12;
  }
}

export async function fabriquerPdf(contenu: ContenuPv, pv: Pick<PvVu, "signeLe" | "signeNom" | "empreinte">): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`PV de réception ${contenu.reference}`);
  doc.setAuthor(contenu.entreprise);
  doc.setCreator("groma");
  const m = new Mise(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  const g = garanties(contenu.dateReception);

  m.texte("PROCÈS-VERBAL DE RÉCEPTION DES TRAVAUX", { taille: 15, gras: true });
  m.texte(`${contenu.reference} · article 1792-6 du Code civil`, { gris: true });
  m.espace(6);
  m.filet();

  m.texte("Chantier", { gras: true });
  m.texte(`${contenu.chantier}\n${contenu.adresse}`);
  m.espace();
  m.texte("Maître d'ouvrage", { gras: true });
  m.texte(contenu.client);
  m.espace();
  m.texte("Entreprise", { gras: true });
  m.texte(contenu.entreprise);
  m.espace();
  m.filet();

  m.texte(`Le maître d'ouvrage déclare recevoir les travaux à la date du ${dateLongue(contenu.dateReception)},`);
  if (contenu.reserves.length === 0) m.texte("sans réserve.", { gras: true });
  else {
    m.texte(`avec les ${contenu.reserves.length} réserve${contenu.reserves.length > 1 ? "s" : ""} suivante${contenu.reserves.length > 1 ? "s" : ""}, que l'entreprise s'engage à lever :`, { gras: true });
    m.espace(4);
    contenu.reserves.forEach((r, i) => m.texte(`${i + 1}. ${r.texte}`, { retrait: 12 }));
  }
  m.espace();
  m.texte("Observations", { gras: true });
  m.texte(contenu.observations?.trim() || "Aucune.");
  m.espace();
  m.filet();

  m.texte("Garanties, à compter de cette date", { gras: true });
  m.texte(`Parfait achèvement : jusqu'au ${dateLongue(g.parfaitAchevement)}`);
  m.texte(`Bon fonctionnement (biennale) : jusqu'au ${dateLongue(g.biennale)}`);
  m.texte(`Décennale : jusqu'au ${dateLongue(g.decennale)}`);
  m.espace();
  m.filet();

  m.texte("Signature", { gras: true });
  if (pv.signeLe && pv.signeNom) {
    const qui = pv.signeNom.trim().toLowerCase() === contenu.signataire.trim().toLowerCase() ? pv.signeNom : `${pv.signeNom} (compte de ${contenu.signataire})`;
    m.texte(`Signé électroniquement par ${qui}, le ${horodatage(pv.signeLe)}, depuis son compte groma.`);
    m.espace(4);
    m.texte(`Empreinte SHA-256 du contenu signé :\n${pv.empreinte ?? ""}`, { taille: 8, gris: true });
  } else {
    m.texte(`En attente de la signature de ${contenu.signataire}.`, { gris: true });
    m.texte("Ce document n'a pas de valeur tant qu'il n'est pas signé.", { gris: true });
  }
  m.espace(18);
  m.texte("Contenu signé, mot pour mot :", { taille: 7.5, gris: true });
  m.texte(texteCanonique(contenu), { taille: 7.5, gris: true });

  return doc.save();
}
