import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les pièces jointes passent par les actions serveur : 4 Mo de fichier au plus
    // (lib/fichiers.ts), sous la limite de 4,5 Mo d'une fonction Vercel.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
