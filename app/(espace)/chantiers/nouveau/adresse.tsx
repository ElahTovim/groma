"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Suggestion = { label: string; rue: string; codePostal: string; ville: string };

// L'adresse avec suggestions de l'API Adresse (publique, sans clé) : choisir une
// suggestion remplit le code postal et la ville. Si l'API ne répond pas, on tape à la main.
export function ChampsAdresse(props: { defauts: { adresse?: string; codePostal?: string; ville?: string } }) {
  const [adresse, setAdresse] = useState(props.defauts.adresse ?? "");
  const [codePostal, setCodePostal] = useState(props.defauts.codePostal ?? "");
  const [ville, setVille] = useState(props.defauts.ville ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  function chercher(q: string) {
    if (minuteur.current) clearTimeout(minuteur.current);
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
        setOuvert(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

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
          aria-expanded={ouvert && suggestions.length > 0}
          aria-controls="suggestions-adresse"
          onChange={(e) => {
            setAdresse(e.target.value);
            chercher(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          placeholder="12 rue Oberkampf, Paris"
        />
        {ouvert && suggestions.length > 0 && (
          <ul id="suggestions-adresse" role="listbox" className="absolute top-full z-10 mt-1 w-full border bg-background shadow-sm">
            {suggestions.map((s) => (
              <li key={s.label} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAdresse(s.rue);
                    setCodePostal(s.codePostal);
                    setVille(s.ville);
                    setOuvert(false);
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
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
