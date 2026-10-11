import type { Particule } from "@/lib/ambiance";

// Un nombre pseudo-aléatoire stable (0 à 1) : le serveur et le navigateur dessinent
// les mêmes gouttes, sans tirage au sort à chaque affichage.
function hasard(i: number, graine: number) {
  const x = Math.sin(i * 12.9898 + graine * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const serie = (n: number) => Array.from({ length: n }, (_, i) => i);

// La couche animée derrière une carte météo. Décorative : masquée aux lecteurs
// d'écran, figée si le téléphone demande moins d'animations (voir globals.css).
// `sombre` : fond clair (neige, brouillard de jour), les particules passent en gris foncé.
export function CielAnime({ particules, sombre = false }: { particules: Particule[]; sombre?: boolean }) {
  return (
    <div aria-hidden className="ciel pointer-events-none absolute inset-0 overflow-hidden">
      {particules.includes("soleil") && <span className="ciel-soleil absolute -top-16 -right-16 size-56 rounded-full" />}
      {particules.includes("nuages") &&
        serie(3).map((i) => (
          <span
            key={`n${i}`}
            className="ciel-nuage absolute h-16 rounded-full bg-white/25 blur-xl"
            style={{ top: `${8 + i * 22}%`, width: `${40 + hasard(i, 1) * 30}%`, animationDuration: `${38 + i * 14}s`, animationDelay: `${-i * 11}s` }}
          />
        ))}
      {particules.includes("etoiles") &&
        serie(24).map((i) => (
          <span
            key={`e${i}`}
            className="ciel-etoile absolute size-0.5 rounded-full bg-white"
            style={{ top: `${hasard(i, 2) * 70}%`, left: `${hasard(i, 3) * 100}%`, animationDelay: `${hasard(i, 4) * 4}s` }}
          />
        ))}
      {particules.includes("pluie") &&
        serie(42).map((i) => (
          <span
            key={`p${i}`}
            className={`ciel-goutte absolute top-0 h-5 w-px ${sombre ? "bg-black/30" : "bg-white/45"}`}
            style={{ left: `${hasard(i, 5) * 100}%`, animationDuration: `${0.6 + hasard(i, 6) * 0.5}s`, animationDelay: `${-hasard(i, 7) * 2}s` }}
          />
        ))}
      {particules.includes("neige") &&
        serie(34).map((i) => (
          <span
            key={`f${i}`}
            className={`ciel-flocon absolute top-0 rounded-full ${sombre ? "bg-slate-500" : "bg-white"}`}
            style={{
              left: `${hasard(i, 8) * 100}%`,
              width: `${3 + hasard(i, 9) * 4}px`,
              height: `${3 + hasard(i, 9) * 4}px`,
              opacity: 0.6 + hasard(i, 10) * 0.4,
              animationDuration: `${6 + hasard(i, 11) * 6}s`,
              animationDelay: `${-hasard(i, 12) * 10}s`,
            }}
          />
        ))}
      {particules.includes("vent") &&
        serie(7).map((i) => (
          <span
            key={`v${i}`}
            className={`ciel-rafale absolute left-0 h-px rounded-full ${sombre ? "bg-black/30" : "bg-white/50"}`}
            style={{ top: `${12 + hasard(i, 13) * 76}%`, width: `${20 + hasard(i, 14) * 25}%`, animationDuration: `${1.6 + hasard(i, 15) * 1.4}s`, animationDelay: `${-hasard(i, 16) * 3}s` }}
          />
        ))}
    </div>
  );
}
