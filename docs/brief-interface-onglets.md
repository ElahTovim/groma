# Brief interface · les onglets du fil et l'onglet Documents

Pour la session « interface ». 19 octobre 2026. Branche de départ : `fil-onglets` (prévisualisation : https://groma-git-fil-onglets-elah-s-projects.vercel.app).

## Ce qui est construit

La logique est faite et testée. Ce brief porte sur **le visuel seulement**.

Sur la fiche d'un chantier, le fil a quatre onglets : **Fil · Documents · Demandes et dispos · Signalements**. Ce sont des filtres sur le même fil : rien n'est copié, et « Qui voit ça ? » s'applique avant.

- **Compteurs** : un chiffre gris pour le nombre d'éléments ; une pastille noire quand une action attend (demande échue, signalement à qualifier, réserve ouverte).
- **Documents** : quatre rubriques. Documents du chantier, Courriers reçus, Attestations de vigilance, Fin de chantier (PV).
- **Demandes et dispos** : une bande de 7 jours (qui est là chaque jour), puis la liste.
- **Le formulaire d'ajout** ne propose que les gestes de l'onglet ouvert.
- **L'adresse** porte l'onglet : `?onglet=documents`.
- **Sur téléphone**, la barre défile au doigt et reste collée sous l'en-tête (`sticky top-14`).

## Ce qu'on attend du visuel

Une seule direction, celle de groma : **noir et blanc, cartes blanches arrondies sur fond clair, aucune couleur vive** (voir `docs/audit-interface.md` et les maquettes Figma). La hiérarchie passe par la graisse, la taille et le contraste, jamais par une couleur.

1. **La barre d'onglets**
   - L'onglet actif doit se lire au premier coup d'œil, sans couleur (aujourd'hui : pastille noire pleine, texte blanc).
   - Les compteurs : le chiffre gris (rien à faire) et la pastille noire (à traiter) doivent se distinguer nettement, même sur l'onglet actif.
   - Sur téléphone : signaler qu'il y a d'autres onglets à droite (fondu en bord, ou dernier onglet coupé) ; cibles de 44 px au moins.
   - Accessibilité : `role="tablist"` et `aria-selected` sont en place. Ajouter la navigation au clavier (flèches gauche et droite) si elle manque à l'écran.
2. **L'onglet Documents**, le plus important
   - Les quatre rubriques : titres discrets en petites capitales, lignes avec icône, titre, détail, et à droite l'état (Interne, Partagé, Signé, À signer, Expirée).
   - Il doit se lire comme **un dossier rangé**, pas comme une liste de messages.
   - Prévoir la place, **en tête**, d'une future rubrique « Pièces attendues » : une ligne par intervenant, ses pièces cochées ou manquantes, et un avancement « 2 sur 5 » (voir la maquette ci-dessous). Elle viendra à la tranche suivante. Ne pas la coder, seulement ne pas la rendre impossible.
   - L'état vide de chaque rubrique : une phrase qui dit quoi faire.
3. **La bande des disponibilités**
   - Sept cases jour : le jour du jour repérable ; un jour avec quelqu'un se distingue d'un jour vide sans couleur (bord, graisse, fond).
   - Sur téléphone : elle défile horizontalement, ou passe en liste verticale si c'est plus lisible. À trancher.
4. **Le formulaire d'ajout** : son titre doit refléter l'onglet (« Déposer un document », « Demander ou proposer une dispo », « Signaler un problème »). Sur téléphone, garder le bouton principal sous le pouce, comme le reste de la fiche.
5. **Les quatre états** de chaque onglet : vide, chargement, données, erreur.

### La maquette de référence (onglet Documents, à terme)

```
 Fil   Documents ③   Demandes et dispos ②   Signalements ①
       ━━━━━━━━━
 PIÈCES ATTENDUES                                   2 sur 5     ← tranche suivante
  Archi Durand · architecte      ✓ Plans  ✓ CCTP  ○ Assurance
  Plomberie Ferrand · s.-traitant ✓ Décennale  ⚠ Vigilance  ○ Kbis
 DOCUMENTS DU CHANTIER                          [ + Déposer ]
  ▣ Devis signé.pdf     12 sept.   Partagé avec Claire Dumas
  ▣ Plans RDC v3.pdf    2 oct.     Interne
 COURRIERS REÇUS
  ▣ Syndic Lumière : demande d'accès…   validé le 8 oct.
 FIN DE CHANTIER
  ▣ PV de réception     9 oct.   2 réserves        [ Signé ]
```

## Où travailler

- `app/(espace)/chantiers/[id]/fil.tsx` : la barre d'onglets, `Documents`, `Rubrique`, `Ligne`, `BandeDispos`, `CarteElement`, `Ecrire`.
- Les composants partagés (`components/`) si besoin.

## Ce qu'il ne faut pas toucher

La logique : `lib/fil-onglets.ts` (quel élément va dans quel onglet, les compteurs, la bande des jours ; testée), la page `page.tsx` (données du dossier), les actions et opérations. Ne pas changer les noms des onglets dans l'adresse (`fil`, `documents`, `demandes`, `signalements`) : des liens s'en serviront. S'il manque une donnée à l'écran, la demander à la session technique plutôt que d'aller la chercher.

## Pour finir

Vérifier sur téléphone (390 px) et sur ordinateur, avec un chantier dont le fil est rempli, un chantier vide, et un compte externe. Tests, lint et construction au vert. Puis une prévisualisation à montrer à Kerguelenn.
