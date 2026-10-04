// Les pièces jointes acceptées : ce qu'on échange sur un chantier.
export const TAILLE_MAX = 4 * 1024 * 1024;

export const TYPES_ACCEPTES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "photo",
  "image/png": "image",
  "image/webp": "image",
  "image/heic": "photo",
};

export type VerdictFichier = { ok: true } | { ok: false; raison: string };

export function verifierFichier(f: { size: number; type: string }): VerdictFichier {
  if (f.size === 0) return { ok: false, raison: "Le fichier est vide." };
  if (f.size > TAILLE_MAX) return { ok: false, raison: "Fichier trop lourd : 4 Mo au plus." };
  if (!(f.type in TYPES_ACCEPTES)) return { ok: false, raison: "Type de fichier refusé : PDF, JPEG, PNG, WebP ou HEIC." };
  return { ok: true };
}

export function nomPropre(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(-80) || "fichier"
  );
}
