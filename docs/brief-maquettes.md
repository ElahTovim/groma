# Brief maquettes — à coller dans Claude Design

Groma est un outil de suivi de chantiers de rénovation pour une petite entreprise du BTP : de la signature du devis à la levée des réserves, avec la coordination entre l'équipe et les intervenants externes (client, architecte, syndic, fournisseur). Dessine-moi les maquettes des écrans principaux.

**Étape 1 : des wireframes, pas des maquettes finies.** Uniquement en niveaux de gris, sans choix de police ni de couleur. On valide ici ce qu'il y a sur chaque écran, dans quel ordre, et comment on passe de l'un à l'autre. Le style viendra après, une fois la structure validée. La section « Direction visuelle » plus bas sert seulement à l'étape suivante.

## Qui s'en sert

- **Le gérant** (le patron) : il voit tout, au bureau, sur ordinateur.
- **Les chefs d'équipe** : ils sont sur le chantier, **sur téléphone**, souvent dehors, parfois avec des gants. Gros boutons, texte lisible en plein soleil, l'essentiel en haut.
- **Les externes** (client, architecte, syndic, fournisseur) : ils ne voient que leurs chantiers et seulement les documents qu'on leur a partagés. Ils ne changent jamais un statut.

## Le modèle à respecter (ne rien inventer en dehors)

- **Chantier** : statuts `devis → signé → planifié → en cours → réception → clos`, ou `annulé` (avec un motif, impossible une fois en cours). Il a une adresse, un client, des dates et la météo des 3 prochains jours.
- **Lot** (carrelage, électricité, menuiseries…) : statuts `à commander → commandé → livré → posé → fini`. Il a une date de livraison prévue et une date de fin prévue. **En retard** quand une date prévue est dépassée : le produit le calcule, il faut que ça se voie.
- **Fil** : un seul fil par chantier, comme une conversation. Chaque message a un auteur et un type : demande (avec un destinataire et une date), réponse, disponibilité, document (interne ou partagé avec des participants choisis), signalement.
- **Signalement** : `à qualifier → réserve ouverte → levée`, ou `écarté` avec un motif.
- **Règle phare** : on ne peut pas clore un chantier tant qu'un signalement est à qualifier ou qu'une réserve est ouverte. L'écran doit dire clairement pourquoi c'est refusé et ce qui bloque.

## Les écrans

1. **Connexion** : courriel, mot de passe oublié.
2. **Liste des chantiers** : filtres par statut et « en retard », recherche. Desktop et mobile.
3. **Fiche chantier** : en-tête avec le statut et le bouton de l'étape suivante, la météo des 3 jours, les lots avec leur avancement et leurs retards, le fil. C'est l'écran le plus important : version mobile soignée.
4. **Nouveau chantier** : formulaire validé (client et adresse obligatoires, adresse avec autocomplétion).
5. **Inviter un participant** : courriel, qualité (client, architecte, syndic, fournisseur…). Pour un fournisseur, le SIRET remplit la fiche automatiquement.
6. **Le chantier vu par un externe** : la même fiche, réduite à ce qui lui est partagé, sans aucun bouton de statut.
7. **Clôture refusée** : la fiche au moment où on tente de clore avec une réserve ouverte.

## Pour chaque écran, les quatre états

**vide** (aucun chantier encore), **chargement**, **données**, **erreur**. Et un retour visible après chaque action (« Chantier passé en planifié »).

Cas particuliers à montrer :
- météo indisponible : la fiche reste utilisable ;
- SIRET introuvable : la saisie à la main reste possible ;
- fournisseur fermé selon Sirene : invitation refusée, avec le motif.

## Contraintes

- L'interface sera codée avec **shadcn/ui** (Tailwind) : composants standards (cartes, badges, tableaux, onglets, formulaires, boîtes de dialogue). Pas d'effets impossibles à reproduire.
- Interface en français.
- Données fictives mais réalistes : des chantiers à Paris et en proche banlieue, des noms inventés, des montants plausibles. Aucune vraie personne.
- Direction visuelle : un outil de travail sobre et robuste, pas une app « startup ». Les statuts doivent se distinguer par leur couleur au premier coup d'œil, et les retards et les réserves doivent sauter aux yeux. Je ne veux ni dégradés violets ni emojis.

## Hors périmètre

Récapitulatif du matin, relances automatiques, lecture des courriers, échéancier des paiements, agent IA. Ces écrans viendront les semaines suivantes : ne pas les dessiner.
