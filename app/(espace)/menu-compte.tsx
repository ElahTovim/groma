"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Le menu du compte (un <details> natif) se ferme comme un menu : touche Échap (le focus
// revient sur son bouton), clic en dehors, ou changement de page.
export function MenuCompte({ children }: { children: React.ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const chemin = usePathname();

  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [chemin]);

  useEffect(() => {
    function touche(e: KeyboardEvent) {
      if (e.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }
    function clic(e: PointerEvent) {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.open = false;
    }
    document.addEventListener("keydown", touche);
    document.addEventListener("pointerdown", clic);
    return () => {
      document.removeEventListener("keydown", touche);
      document.removeEventListener("pointerdown", clic);
    };
  }, []);

  return (
    <details ref={menu} className="group relative">
      {children}
    </details>
  );
}
