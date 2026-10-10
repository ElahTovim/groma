import type { NextConfig } from "next";

// Les en-têtes de sécurité envoyés au navigateur avec chaque page.
const ENTETES = [
  // Le site ne s'affiche jamais dans le cadre d'un autre site (vol de clics).
  { key: "X-Frame-Options", value: "DENY" },
  // Le navigateur ne devine pas le type d'un fichier : un faux PDF reste un fichier inerte.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // L'adresse complète d'une page (avec un jeton d'invitation, par exemple) ne part pas vers d'autres sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Ni caméra, ni micro, ni localisation : le site n'en a pas besoin.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

// La politique de contenu : le navigateur ne charge que ce qui vient du site, plus
// l'API Adresse pour les suggestions. Seulement en production, car les
// prévisualisations Vercel injectent leur propre barre d'outils.
const POLITIQUE_DE_CONTENU = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api-adresse.data.gouv.fr",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // Les pièces jointes passent par les actions serveur : 4 Mo de fichier au plus
    // (lib/fichiers.ts), sous la limite de 4,5 Mo d'une fonction Vercel.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
  async headers() {
    const enProduction = process.env.VERCEL_ENV === "production";
    return [
      {
        source: "/:chemin*",
        headers: enProduction ? [...ENTETES, { key: "Content-Security-Policy", value: POLITIQUE_DE_CONTENU }] : ENTETES,
      },
    ];
  },
};

export default nextConfig;
