"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Suggestion = { label: string; rue: string; codePostal: string; ville: string };

// L'adresse avec suggestions de l'API Adresse (publique, sans clé) : choisir une
// suggestion remplit le code postal et la ville. Si l'API ne répond pas, on tape à la main.
// Au clavier : flèches pour parcourir, Entrée pour choisir, Échap pour fermer.
export function ChampsAdresse(props: { defauts: { adresse?: string; codePostal?: string; ville?: string }}) {
  const [adresse, setAdresse] = useState(props.defauts.adresse ?? "");
  const [codePostal, setCodePostal] = useState(props.defauts.codePostal ?? "");
  const [ville, setVille] = useState(props.defauts.ville ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = useId();
  const idListe = `${base}-suggestions`;
  const visible = ouvert && suggestions.length > 0;

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  function chercher(q: string) {
    if (minuteur.current) clearTimeout(minuteur.current);
    setActif(-1);
    if (q.trim().length < 4) return setSuggestions([]);
    minuteur.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&type=housenumber`);
        const d = await r.json();
        setSuggestions(
          (d.features ?? []).map((f: { properties: { label: string; name: string; postcode: string; city: string } }) => ({
            label: f.properties.label,
            rue: f.properties.name,
            codePostal: f.properties.postcode,
            ville: f.properties.city,
          })),
        );
        setActif(-1);
        setOuvert(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function choisir(s: Suggestion) {
    setAdresse(s.rue);
    setCodePostal(s.codePostal);
    setVille(s.ville);
    setOuvert(false);
    setActif(-1);
  }

  function auClavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOuvert(true);
      setActif((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOuvert(true);
      setActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      // Entrée choisit la suggestion active ; sans suggestion active, le formulaire part normalement.
      if (visible && actif >= 0) {
        e.preventDefault();
        choisir(suggestions[actif]);
      }
    } else if (e.key === "Escape") {
      if (visible) {
        e.preventDefault();
        setOuvert(false);
        setActif(-1);
      }
    }
  }

  const annonce = visible ? `${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""}, flèches pour parcourir.` : "";

  return (
    <>
      <div className="relative flex flex-col gap-2">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          name="adresse"
          required
          autoComplete="off"
          value={adresse}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={visible ? idListe : undefined}
          aria-activedescendant={visible && actif >= 0 ? `${base}-option-${actif}` : undefined}
          onChange={(e) => {
            setAdresse(e.target.value);
            chercher(e.target.value);
          }}
          onKeyDown={auClavier}
          onBlur={() => {
            setOuvert(false);
            setActif(-1);
          }}
          placeholder="12 rue Oberkampf, Paris"
        />
        {visible && (
          <ul id={idListe} role="listbox" aria-label="Suggestions d'adresse" className="absolute top-full z-10 mt-1 w-full border bg-background shadow-sm">
            {suggestions.map((s, i) => (
              // Clic à la souris : on garde le focus dans le champ (preventDefault au mousedown).
              <li
                key={s.label}
                id={`${base}-option-${i}`}
                role="option"
                aria-selected={i === actif}
                className={`flex min-h-11 w-full cursor-pointer items-center px-3 text-left text-sm hover:bg-muted ${i === actif ? "bg-muted" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(s)}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
        <p role="status" className="sr-only">
          {annonce}
        </p>
      </div>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="codePostal">Code postal</Label>
          <Input id="codePostal" name="codePostal" required inputMode="numeric" autoComplete="postal-code" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ville">Ville</Label>
          <Input id="ville" name="ville" required autoComplete="address-level2" value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>
      </div>
    </>
  );
}
