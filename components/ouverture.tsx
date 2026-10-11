"use client";

import { useEffect, useRef } from "react";

// Ce petit script tourne avant l'affichage : si l'ouverture a déjà été vue dans cette
// session, ou si l'appareil demande moins d'animations, elle est masquée d'emblée.
export const SCRIPT_OUVERTURE = `try{if(sessionStorage.getItem("groma-ouverture")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("sans-ouverture")}catch(e){document.documentElement.classList.add("sans-ouverture")}`;

const DUREE_MS = 1400;

// L'ouverture : « groma » naît au trait fin et prend du poids, lettre après lettre,
// puis glisse jusqu'au logo de l'en-tête. Une fois par session ; un clic ou une
// touche la passe. La page charge dessous pendant ce temps : rien n'est retardé.
export function Ouverture() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const voile = ref.current;
    const html = document.documentElement;
    if (!voile || html.classList.contains("sans-ouverture")) return;
    try {
      sessionStorage.setItem("groma-ouverture", "vue");
    } catch {}

    let fini = false;
    let masquer = 0;
    const finir = () => {
      if (fini) return;
      fini = true;
      const mot = voile.querySelector<HTMLElement>("[data-mot]");
      const cible = document.getElementById("logo-groma");
      if (mot && cible) {
        const a = mot.getBoundingClientRect();
        const b = cible.getBoundingClientRect();
        mot.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`;
      } else if (mot) {
        mot.style.opacity = "0"; // pas d'en-tête (page de connexion) : le mot s'efface sur place
      }
      voile.classList.add("ouverture-part");
      masquer = window.setTimeout(() => html.classList.add("sans-ouverture"), 650);
    };

    const minuteur = window.setTimeout(finir, DUREE_MS);
    voile.addEventListener("click", finir);
    window.addEventListener("keydown", finir);
    return () => {
      window.clearTimeout(minuteur);
      window.clearTimeout(masquer);
      voile.removeEventListener("click", finir);
      window.removeEventListener("keydown", finir);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="ouverture fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <span data-mot className="logo-groma flex origin-top-left text-[clamp(5rem,18vw,10rem)] leading-none">
        {"groma".split("").map((l, i) => (
          <span key={i} className="ouverture-lettre" style={{ ["--i" as string]: i }}>
            {l}
          </span>
        ))}
      </span>
    </div>
  );
}
