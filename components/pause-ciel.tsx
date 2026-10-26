"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CLE = "groma-ciel-pause";

// Le ciel animé (nuages, pluie, étoiles) bouge sans fin : ce bouton l'arrête (WCAG 2.2.2).
// Le choix est retenu sur l'appareil.
export function PauseCiel({ sombre }: { sombre: boolean }) {
  const bouton = useRef<HTMLButtonElement>(null);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    let p = false;
    try {
      p = localStorage.getItem(CLE) === "1";
    } catch {}
    bouton.current?.closest("section")?.classList.toggle("ciel-pause", p);
    if (p) setPause(true); // eslint-disable-line react-hooks/set-state-in-effect -- relecture d'un choix enregistré, une fois
  }, []);

  function basculer() {
    const p = !pause;
    setPause(p);
    bouton.current?.closest("section")?.classList.toggle("ciel-pause", p);
    try {
      localStorage.setItem(CLE, p ? "1" : "0");
    } catch {}
  }

  const Icone = pause ? Play : Pause;
  return (
    <button
      ref={bouton}
      type="button"
      onClick={basculer}
      aria-pressed={pause}
      aria-label={pause ? "Relancer l'animation du ciel" : "Arrêter l'animation du ciel"}
      className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-full transition-colors", sombre ? "bg-black/10 hover:bg-black/15" : "bg-white/20 hover:bg-white/30")}
    >
      <Icone className="size-4" aria-hidden />
    </button>
  );
}
