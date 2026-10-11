"use client";

import { useLayoutEffect, useRef } from "react";
import { euros, eurosCourt } from "@/lib/format";

const DUREE_MS = 900;

function ecrire(n: number, format: "nombre" | "euros") {
  return format === "euros" ? eurosCourt(Math.round(n)) : String(Math.round(n));
}

// Un chiffre qui défile jusqu'à sa valeur : depuis zéro à l'ouverture, depuis
// l'ancienne valeur quand elle change (un lot passe « fini » : 2 → 3).
// Le serveur affiche déjà la valeur finale ; les lecteurs d'écran ne lisent qu'elle.
// Figé si l'appareil demande moins d'animations.
export function Compteur({ valeur, format = "nombre" }: { valeur: number; format?: "nombre" | "euros" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const affiche = useRef(0); // la valeur à l'écran, image après image

  useLayoutEffect(() => {
    const el = ref.current;
    const depart = affiche.current;
    if (!el || depart === valeur || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      affiche.current = valeur;
      return;
    }

    let image = 0;
    const debut = performance.now();
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / DUREE_MS);
      const adouci = 1 - (1 - t) ** 3; // rapide au début, se pose doucement
      affiche.current = depart + (valeur - depart) * adouci;
      el.textContent = ecrire(affiche.current, format);
      if (t < 1) image = requestAnimationFrame(pas);
    };
    el.textContent = ecrire(depart, format);
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [valeur, format]);

  const exact = format === "euros" ? euros(String(valeur)) : String(valeur);
  return (
    <>
      <span ref={ref} aria-hidden title={exact}>
        {ecrire(valeur, format)}
      </span>
      <span className="sr-only">{exact}</span>
    </>
  );
}
