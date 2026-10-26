import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { SCRIPT_OUVERTURE } from "@/components/ouverture";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// La police des titres, des noms de chantier et des grands chiffres : grasse,
// un peu artisanale. Le texte courant reste en Geist, plus sobre.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"], // la largeur sert au logo, resserré
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Chaque page donne son titre : « Chantiers · groma ».
  title: { default: "groma", template: "%s · groma" },
  description: "Suivi de chantiers de rénovation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : le script d'ouverture peut ajouter une classe à <html> avant React.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${bricolage.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_OUVERTURE }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
