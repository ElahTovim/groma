# Audit de l'interface

10 octobre 2026 · audit fait par l'IA sur une prévisualisation remplie du jeu de données, écran par écran, sur ordinateur (1 280 px) et sur téléphone (390 px), en gérant et en externe (Claire Morel). Captures dans `docs/audit/`.

**Lecture du brief.** Un outil de travail de terrain, utilisé par des chefs d'équipe sur téléphone, dehors, parfois avec des gants, et par un gérant au bureau. Le langage visuel doit être sobre et robuste, plus proche d'un instrument que d'une application grand public. Réglages : peu de variation de mise en page (2 sur 10), presque pas d'animation (2 sur 10), densité moyenne (6 sur 10 sur ordinateur, 4 sur 10 sur téléphone).

**Ce qui marche déjà.** Les règles se voient : la clôture refusée dit précisément ce qui bloque ; le bouton de l'étape suivante est bien fixé sous le pouce ; l'externe ne voit ni montant ni lots ; les états vides ont un texte utile ; les montants et les dates sont alignés.

## P0 : défauts à corriger avant tout

| # | Constat | Pourquoi c'est grave | Correction |
| --- | --- | --- | --- |
| 1 | **Tout le site est en Times New Roman.** Dans `app/globals.css`, `--font-sans: var(--font-sans)` se désigne lui-même ; le navigateur se rabat sur sa police par défaut. | C'est ce qui donne l'air « document Word » à tous les écrans. | Une ligne : `--font-sans: var(--font-geist-sans)`. |
| 2 | **Dans la liste, un nom long déborde** sur les colonnes Client et Ville (ligne CH-2026-F003, `d-liste.png`). | Texte illisible, impression de bogue. | Tronquer à deux lignes, nom complet au survol. |
| 3 | **Le bouton propose une étape impossible.** « Déclarer la réception » s'affiche en grand alors que deux lots ne sont pas finis (`m-fiche-ecran1.png`) ; on ne l'apprend qu'après le clic, et le refus s'affiche **deux fois**, dans l'encadré et dans le message flottant (`d-fiche-cloture-refusee.png`). | On invite le chef d'équipe à échouer. | Calculer le verdict avant le clic : bouton grisé et, juste au-dessus, la liste de ce qui manque (« Pour déclarer la réception : finir Démolition, Peinture »), chaque point cliquable. Un seul message de refus. |
| 4 | **Cibles trop petites pour un doigt ganté.** « Qui voit ça ? », « Écarter… », les boutons d'étape des lots font environ 28 px de haut. | Le brief impose de gros boutons ; la norme est 44 px. | 44 px minimum sur téléphone pour tout ce qui se touche. |

## P1 : la structure des écrans

| # | Écran | Constat | Proposition |
| --- | --- | --- | --- |
| 5 | Liste | **Rien ne signale ce qui demande de l'attention.** Ni retard, ni réserve, ni signalement à qualifier n'apparaît dans la liste ; le tri suit la date de création. Le brief demandait que les retards et les réserves « sautent aux yeux ». | Une colonne « À traiter » (« 1 lot en retard », « 2 à qualifier ») et un tri par défaut sur ce qui demande de l'attention. Un filtre « En retard ». |
| 6 | Liste | **50 lignes à plat**, et sur téléphone une colonne de cartes interminable (`m-liste.png`). | Des onglets par statut avec leur compteur (Devis 9, En cours 13, Réception 5…), qui remplacent la liste déroulante. Sur téléphone, « Mes chantiers en cours » d'abord. |
| 7 | Fiche, téléphone | **L'ordre ne suit pas le terrain.** On trouve d'abord le client et le montant, puis la météo, les lots, les participants ; le fil n'arrive qu'après quatre blocs (`m-fiche-en-cours.png`). | Pour le chef d'équipe : ce qui bloque et l'étape suivante, puis les lots et leurs retards, puis le fil ; la météo en une ligne ; les informations et les participants repliés en bas. |
| 8 | En-tête, téléphone | La barre tient sur **deux lignes** (navigation, nom, déconnexion). | Une seule ligne : groma, Chantiers, et un menu « compte » qui contient le nom, Réglages et la déconnexion. |
| 9 | Fil | **Choisir un type dans une liste déroulante** avant d'écrire est lent, surtout sur téléphone. | Des boutons d'action directs : « Écrire », « Signaler un problème », « Joindre un document », « Demander à… ». Le formulaire s'adapte au bouton choisi. |
| 10 | Fil | **La confidentialité est en petit gris** (« Vu par : équipe seulement »). C'est pourtant le cœur de « Qui voit ça ? ». | Une étiquette nette sur chaque élément : « Interne » ou « Partagé avec Claire Morel », et le bouton « Qui voit ça ? » à côté. |
| 11 | Fiche, externe | **L'externe ne sait pas quoi faire** : un fil vide et un formulaire générique (`d-externe-fiche.png`). | Deux gestes mis en avant pour lui : « Signaler un problème » et « Donner mes disponibilités ». |
| 12 | Nouveau chantier | **Pas d'autocomplétion de l'adresse**, prévue par le brief ; la date s'affiche au format américain (« dd/mm/yyyy ») selon le navigateur (`d-nouveau.png`). | Suggestions de l'API Adresse pendant la frappe, qui remplissent code postal et ville. |

## P2 : la finition

| # | Constat | Proposition |
| --- | --- | --- |
| 13 | **Des cartes partout** : cinq blocs encadrés empilés sur la fiche. | Des sections séparées par l'espace et un filet ; garder le cadre pour les éléments du fil. |
| 14 | **« En cours » (ambre) et « Réception » (orange) se confondent** ; « Annulé » barré se lit mal. | Une palette de statuts plus écartée ; « Annulé » en gris plein, sans barre. |
| 15 | **La météo n'a pas de pictogramme**, l'alerte est le seul repère. | Un pictogramme par jour ; l'alerte reste en rouge. |
| 16 | **La connexion n'a aucune identité** : un petit cadre au milieu d'une page blanche (`d-connexion.png`). | Le nom groma en grand, une phrase sur l'outil ; rester sobre. |
| 17 | **Pas de couleur d'accent** : tout est noir, gris et blanc. | Un seul accent, réservé aux actions et à la navigation. Éviter l'orange « chantier », trop attendu. Piste : un bleu de travail profond. Rouge réservé aux retards et réserves, ambre à « à traiter », vert à « clos ». |

## Direction visuelle proposée (à valider avant les maquettes)

- **Thème clair**, pensé pour la lecture en plein soleil : texte presque noir sur blanc cassé, contraste d'au moins 7 pour 1 pour le texte courant sur téléphone.
- **Une seule famille de caractères**, Geist (déjà chargée), en plusieurs graisses, avec des chiffres tabulaires ; Geist Mono pour les références.
- **Un accent unique**, bleu de travail, et trois couleurs de sens (rouge, ambre, vert) qui ne servent qu'à dire un état.
- **Peu de cartes, beaucoup de lignes** : l'information se lit comme un tableau de bord de chantier, pas comme un empilement de boîtes.
- **Aucune animation décorative** ; seulement des retours courts (bouton pressé, message de confirmation).

## La suite : les wireframes Figma

Les wireframes existants (« Groma — Wireframes », sections 00 à 08) datent d'avant cet audit. À y reporter avant l'import :

1. Les trois retouches déjà notées : le type « message », le fil chronologique, le débordement de « Vu par ».
2. Les points 3, 5, 6, 7, 8, 9, 10 et 11 ci-dessus, qui changent la structure des écrans.
3. Puis l'étape style, selon la direction visuelle validée.

L'import dans le code se fera à partir des cadres Figma : soit dans une session qui a accès à Figma, soit à partir d'exports en images déposés dans `IA/help/`.
