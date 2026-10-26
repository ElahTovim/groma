import type { Metadata } from "next";
import { FormulaireOubli } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOublie() {
  return <FormulaireOubli />;
}
