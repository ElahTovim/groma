"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUALITES_SUGGEREES } from "@/lib/invitation";
import { inviter } from "./actions";

export function Inviter({ chantierId }: { chantierId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [lien, setLien] = useState("");

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) {
          setErreur("");
          setLien("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="lg" className="w-full" />}>+ Inviter un participant</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter sur ce chantier</DialogTitle>
          <DialogDescription>La personne ne verra que ce chantier, et dans le fil seulement ce qu&apos;on lui partage.</DialogDescription>
        </DialogHeader>

        {lien ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">Voici le lien d&apos;invitation, valable 7 jours et une seule fois. Transmettez-le à la personne :</p>
            <Input readOnly value={lien} onFocus={(e) => e.currentTarget.select()} aria-label="Lien d'invitation" className="font-mono text-xs" />
            <DialogFooter>
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(lien).then(
                    () => toast.success("Lien copié."),
                    () => toast.error("Copie impossible : sélectionnez le lien à la main."),
                  )
                }
              >
                Copier le lien
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              setErreur("");
              demarrer(async () => {
                const r = await inviter(chantierId, d);
                if (!r.ok) return setErreur(r.erreur);
                toast.success(r.message);
                if (r.lien) setLien(r.lien);
                else setOuvert(false);
              });
            }}
          >
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="inv-email">Adresse courriel</Label>
              <Input id="inv-email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="inv-role">Rôle</Label>
              <select id="inv-role" name="role" defaultValue="externe" className="h-8 rounded-lg border bg-background px-2 text-sm">
                <option value="externe">Externe : ne voit que ce qu&apos;on lui partage</option>
                <option value="equipe">Équipe : travaille sur le chantier</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="inv-qualite">À quel titre ?</Label>
              <Input id="inv-qualite" name="qualite" list="qualites" required placeholder="client, architecte, syndic…" />
              <datalist id="qualites">
                {QUALITES_SUGGEREES.map((q) => (
                  <option key={q} value={q} />
                ))}
              </datalist>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={enCours}>
                {enCours ? "Invitation…" : "Inviter"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
