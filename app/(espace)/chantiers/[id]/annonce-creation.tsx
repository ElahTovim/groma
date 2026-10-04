"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Le retour visible après la création.
export function AnnonceCreation() {
  useEffect(() => {
    toast.success("Chantier créé.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return null;
}
