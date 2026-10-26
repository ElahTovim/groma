# État de reprise

## 26 octobre 2026, soir (branche `badge-volume`)

**Fait**
- Badge « test à volume réaliste » : copie de la production restaurée dans un projet Neon séparé (`groma-volume`), remplie à 10 000 chantiers (`docs/volume/remplir.sql`), pages chronométrées avant et après (`docs/volume/mesurer.mjs`). Les pages restent rapides : au plus +0,36 s, aucune lecture en base au-delà de 7 ms. Compte rendu : `docs/volume.md`. Badge ajouté sur la page de présentation.

**Reste**
- Kerguelenn : fusionner `badge-volume`.
- Décider de la correction de « À traiter » (voir Cassé).
- Supprimer le projet Neon `groma-volume` une fois le badge présenté (il contient une copie de la production).

**Cassé**
- « À traiter » (onglet de Chantiers) et « À viser » (accueil) ne regardent que les 200 chantiers les plus récents. En production aujourd'hui : 21 chantiers demandent un geste, aucun n'est affiché. Révélé par le test, non corrigé.

## 26 octobre 2026, soir (branche `accessibilite`)

**Fait**
- Audit WCAG 2.2 AA de tout le code (trois relectures : accueil et cadre, fiche chantier, autres pages), puis corrections.
- Contrastes calculés : sous-titres gris passés au gris plein (3,5 → 7,1:1) ; contour des champs à 4,3:1 (`--input` 0.58) ; météo : couleur du texte et voile calculés pour chaque ciel (`lisibilite()` dans `lib/ambiance.ts`, test sur les 24 ciels, ≥ 4,5:1) ; voile plus fort sous le texte des cartes photo.
- Ciel animé : bouton pause (WCAG 2.2.2), choix retenu sur l'appareil.
- Titres : un titre de page par écran (« Chantiers · groma », nom du chantier sur la fiche) ; un h1 par page, y compris erreurs, introuvable et pages de compte ; CardTitle devient un vrai titre.
- Navigation : lien « Aller au contenu », repères nommés, menu du compte qui se ferme (Échap, clic à côté, changement de page), focus visible partout, contenu jamais caché sous l'en-tête ou la barre du bas.
- Lecteurs d'écran : recherche et filtres annoncent leur résultat ; chargements, erreurs et actions longues annoncés sans bavardage (réponse de Questions et compteur de l'assistant n'annoncent plus que l'étape) ; noms explicites des cartes et des boutons répétés ; dialogues en français.
- Clavier : suggestions d'adresse au clavier, onglets de la fiche aux flèches, focus qui ne se perd plus après une action.
- Formulaires : libellés visibles, aides et erreurs reliées aux champs.
- Tableau des lots : plus rien de coupé sur ordinateur.
- 331 tests, lint, types, construction au vert.

**Reste**
- Vérification au lecteur d'écran (VoiceOver) et au clavier sur la prévisualisation : non faite par l'IA.
- Pièces attendues : le nom de l'intervenant n'est pas encore lu avec les boutons (deux pièces identiques pour deux intervenants se confondent à l'oreille).

**Cassé**
- Rien de connu.

## 26 octobre 2026 (branche `fluidite`)

**Fait**
- Transitions entre pages (React `<ViewTransition>`, `components/transitions.tsx`) : la photo d'un chantier passe de la carte (accueil, Chantiers) au bandeau de la fiche, y compris pendant le chargement (`loading.tsx` affiche déjà la photo) ; la page glisse vers la gauche en entrant dans une fiche, vers la droite au retour (lien « Chantiers ») ; en-tête et barre du bas immobiles ; rien si l'appareil demande moins d'animations.
- « À viser » mène droit à l'onglet Signalements quand un signalement ou une réserve attend ; un lien `?onglet=` ouvre le fil aussi sur téléphone et y descend.
- Ouverture « groma » : jouée à l'accueil (plus sur la connexion), une fois par jour, moins d'une seconde, lettres desserrées en grand.
- Connexion : photo du jeu de données, vrai logo, papier quadrillé.
- Réponses immédiates (`useOptimistic`) : message, document, signalement apparaissent avant la réponse du serveur ; qualification d'un signalement immédiate ; le texte revient si l'envoi échoue.
- Micro-retours : boutons qui s'enfoncent légèrement ; trait qui glisse dans la barre du bas ; cascades d'apparition seulement à la première page de la visite.
- 297 tests, lint, types, construction au vert.

**Reste**
- Transitions non vues par l'IA (navigateur connecté sur une autre machine) : à essayer sur la prévisualisation, sur téléphone et ordinateur.
- Speed Insights de Vercel : à activer si l'on veut mesurer la vitesse réelle.

**Cassé**
- Rien de connu.

## 19 octobre 2026, soir (branche `arpenteur`, et demande n° 24 `photos-nuit`)

**Fait**
- Direction visuelle « Arpenteur », validée par Kerguelenn sur maquettes (canvas « Groma · Arpenteur ») : le langage du plan et de la groma, sur le fond gris actuel.
- Accueil : bande quadrillée très légère avec le bonjour et un seul champ « Un chantier, une question… » (chantiers filtrés pendant la frappe ; « Demander à groma » ouvre Questions avec la question déjà posée ; ⌘K) ; « À viser » marqué du réticule ; « Le terrain » en cartes avec photos (par défaut) ou en liste, choix retenu sur l'appareil ; carrousel qui s'aligne sur téléphone, grille sur ordinateur ; avancement en ligne de cote (`lib/cote.ts`, testé) ; cadre météo animé conservé ; semaine en ligne de temps, derniers messages en lignes. Les grands chiffres de l'accueil et « À la une » sont retirés.
- Navigation : lien de la page ouverte souligné sur ordinateur ; barre d'onglets en bas sur téléphone (absente des pages de détail).
- Fiche : cartouche de plan (client, montant, début, fin, lots, retards) ; frise des étapes en jalon (en cours hachurée) ; trait qui glisse sous l'onglet du fil.
- `photos-nuit` (demande n° 24, vérifications au vert) : un chantier importé la nuit reçoit une photo du jeu de données, stable pour sa référence.
- 292 tests, lint, types et construction au vert.

**Reste**
- Kerguelenn : fusionner n° 24, essayer la prévisualisation `arpenteur` (téléphone et ordinateur), puis fusionner.
- Les chantiers déjà importés n'ont pas de photo (reprise non faite, à décider).
- Pages restantes à passer en Arpenteur : liste des chantiers, courriers, questions, réglages.

**Cassé**
- Rien de connu.

## 19 octobre 2026, nuit (branche `pieces-attendues`)

**Fait**
- En production : onglets du fil (n° 22) et leur visuel (session interface).
- Pièces attendues : migration 0013 (`exigences_pieces`, `pieces`, `relances_pieces`) avec reprise des attestations de vigilance et des exigences cochées. Règles pures `lib/pieces-regles.ts` (types et durées, suggestions par qualité, état, dépôt, blocages, relances), lecture `lib/pieces.ts`, opérations `lib/operations/pieces.ts`, route `/api/pieces/[id]`. Blocages du démarrage et de la clôture dans `lib/regles.ts`. Relances de nuit et récapitulatif (« PIÈCES À OBTENIR ») sur les pièces. Rubrique « Pièces attendues » en tête de l'onglet Documents. Ancien écran et anciens modules de vigilance retirés.

**Reste**
- Kerguelenn : essayer la prévisualisation `pieces-attendues`, puis fusion.
- Dette assumée : `participants.vigilance`, `attestations` et `relances_vigilance` ne sont plus lus ni écrits ; à supprimer par une migration de ménage, une fois la reprise vérifiée en production. La route `/api/attestations/[id]` reste pour les liens déjà envoyés.
- Suggestions à l'invitation : aujourd'hui proposées dans « Demander des pièces » ; les cocher dès la fenêtre d'invitation viendra ensuite.

**Cassé**
- Rien de connu.

## 19 octobre 2026, après-midi (branche `fil-onglets-interface`, partie de `fil-onglets`)

**Fait**
- Visuel des onglets du fil, selon `docs/brief-interface-onglets.md`, dans `fil.tsx` seulement (logique inchangée).
- Barre : onglet ouvert en aplat noir ; chiffre gris ou pastille pleine « à traiter » ; flèches, Début et Fin au clavier ; fondu en bord quand d'autres onglets dépassent ; l'onglet ouvert reste visible dans la barre.
- Documents : une seule carte rangée en rubriques (petites capitales, ligne avec icône, titre, détail, état). Noir plein = un geste attend (à signer, expirée) ; contour coché = en règle. Interne ou partagé en simple texte. Bouton « Déposer » qui mène au formulaire. Place prévue en tête pour « Pièces attendues ».
- Dispos : liste verticale sur téléphone (choix tranché : plus lisible qu'une bande à faire défiler), sept cases sur ordinateur ; jour occupé cerclé, jour vide en pointillé, pastille « Auj. ».
- Formulaire : titre selon l'onglet, choix du geste masqué s'il n'y en a qu'un, bouton nommé selon le geste, pleine largeur sur téléphone.
- 281 tests, lint, types et construction au vert.

**Reste**
- Vérification visuelle sur la prévisualisation (390 px et ordinateur ; chantier rempli, chantier vide, compte externe) : faite par Kerguelenn, l'IA ne se connecte pas.
- Remarque pour la session technique : sur téléphone, un lien `?onglet=documents` ouvre la fiche sur l'onglet Lots (`onglets.tsx`), pas sur le fil.

**Cassé**
- Rien de connu.

## 19 octobre 2026, soir (semaine 3 terminée)

**Fait**
- En production : `socle-2` (n° 17), pistes C (n° 18), A2 (n° 19), D (n° 20). Toutes les exigences de la semaine 3 sont en ligne.
- Rendus : `docs/rendus-semaine-3.md` (fonctions IA et ce que voit l'utilisateur quand le modèle se trompe ; coût par appel et par mois ; deux récits de boucle). Déroulé de la démo : `docs/demo-semaine-3.md`.

**Reste**
- Kerguelenn, en production : Réglages, L'entreprise ; « Courriers, documents et analyse » une première fois ; supprimer `DEPOT_ADRESSE` et `ENTREPRISE_NOM` de Vercel ; ménage Neon.
- Remplacer les coûts estimés par les chiffres réels de la page Machine de nuit après quelques nuits.
- Seuil de pertinence des questions (`RECHERCHE_DISTANCE_MAX`) à ajuster si des « je ne trouve pas » tombent à tort.
- Semaine 4 : la mission de l'agent d'abord. Idée des trajets racontés : branche `idee-trajets-agent`. Espace « Dossier » en attente.

**Cassé**
- Rien de connu.

## 19 octobre 2026 (branche `socle-2` et pistes C, A2, D)

**Fait**
- En production : pistes A (courriers, n° 15) et B (questions, n° 14), `heure-hiver` (n° 16 : récapitulatif à 7 h été comme hiver, alerte à chaque import en échec). Clé du flux de production corrigée (la ligne Preview avait été modifiée à la place). Rendu semaine 2 obtenu : captures Sentry et UptimeRobot d'une vraie panne (`project_rules/`).
- `socle-2` : migration 0011 (courriers déposés : origine, fichier, motif de rejet, erreur de lecture) ; `demanderStructure` lit un PDF ; PDF plafonné à 4 Mo (et non en caractères). `docs/rendus-semaine-3.md` (fonctions IA, premiers coûts, récit de la boucle Neon).
- Piste C (`piste-c-nuit`) : la nuit importe les courriers, indexe les documents, fait analyser la nuit par le modèle (une analyse par nuit, références vérifiées, consignes cachées signalées) ; section « Ce que la nuit dit » du récapitulatif ; coût de l'IA par fonction sur Machine de nuit. Étapes réparties entre les passages de 5 h et 6 h UTC.
- Piste A2 (`piste-a2-depot`) : déposer un courrier (texte ou PDF) ; bilan juste, corrigé, inventé, manqué, par courrier et en total.
- Piste D (`piste-d-distances`) : carte « Livraisons et trajets » (itinéraire IGN, zones de déplacement, délai fournisseur, date limite de commande). Réglage `DEPOT_ADRESSE`.

**Reste**
- Kerguelenn : essayer C, A2, D sur leurs prévisualisations ; `DEPOT_ADRESSE` et `ENTREPRISE_NOM` dans Vercel.
- Fusion dans l'ordre : `socle-2`, puis C, A2, D (aucun conflit entre elles).
- Après fusion : chiffres réels de coût dans `docs/rendus-semaine-3.md` ; régler le seuil de pertinence des questions ; répétition de la démo.
- Semaine 4 : mission de l'agent. Espace « Dossier » en attente.

**Cassé**
- Rien de connu.

## 18 octobre 2026 (branche `socle-ia`, semaine 3, phase 0)

**Fait**
- Fusionnés dans `main` : `reception` (avec `sirene`), n° 10, et `ui-mobile`, n° 11. Production vérifiée.
- Socle de la semaine 3 : migration 0010 (pgvector, courriers, documents, morceaux, appels_ia, analyses_nuit, trajets, coordonnées des entreprises, délai fournisseur). `lib/ia.ts` (sortie structurée, streaming, vecteurs Voyage ; plafonds et coût par appel). `lib/operations/chantier.ts` : la porte unique reçoit l'appelant. Réglages : « Tester l'IA ». `/api/sante` : `ia` et `vecteurs`.
- Prévisualisation `socle-ia` : base migrée, IA et vecteurs branchés (`MY_claude`, `VOYAGE_AI`).
- Pistes A (`piste-a-courriers`, dossier `groma-piste-a`) et B (`piste-b-documents`, dossier `groma-piste-b`) lancées en sessions-filles, depuis `socle-ia`.

**Reste**
- Kerguelenn : « Tester l'IA » sur la prévisualisation `socle-ia`, puis fusion du socle.
- Intégrer A et B, puis lancer C (nuit intelligente et coûts IA) et D (distances et livraisons).
- Branche `ci` (vérifications des migrations et de la construction) : à fusionner.
- `ENTREPRISE_NOM` à ajouter dans Vercel.
- Espace « Dossier » : en attente.

**Cassé**
- Rien de connu.

## 11 octobre 2026, soir (branche `reception`, partie de `sirene`)

**Fait**
- PV de réception : table `pv_reception` (migration 0009). Préparé par l'équipe en étape réception (réserves ouvertes recopiées, signataire externe), signé par le seul signataire (nom + case), figé avec empreinte SHA-256. PDF à la demande (`/api/pv/[chantierId]`, pdf-lib), garanties calculées. Règle : pas de clôture sans PV signé. Courriel au signataire et au gérant.
- Attestations de vigilance : `participants.vigilance`, tables `attestations` et `relances_vigilance`. Dépôt par l'équipe ou par le sous-traitant lui-même, rattaché à son entreprise vérifiée ; état à jour, bientôt, expirée, manquante ; relances de nuit (6 h) une fois par palier ; récapitulatif du matin.
- Facturation : jalons (`lib/facturation-regles.ts`), export CSV gérant (`/api/export/facturation`, Réglages), `docs/branchement-facturation.md`. Variable `ENTREPRISE_NOM` (nom sur le PV).
- 130 tests.

**Reste**
- Prévisualisation bloquée tant que les copies Neon des branches fusionnées ne sont pas supprimées (limite de 10).
- Ordre de fusion : `nuit`, puis `sirene`, puis `reception` (chacune contient la précédente).
- Mettre `ENTREPRISE_NOM` dans Vercel (sinon le PV dit « L'entreprise »).
- Le jeu de données ne contient ni PV ni attestation.
- **Prochaine tranche, validée sur le principe, à lancer après la fusion dans `main` : l'espace « Dossier »** de chaque chantier (sous la météo et les participants).
  - Ajustement 1 : des pièces attendues proposées à l'invitation selon la qualité (architecte : plans, CCTP, assurance ; sous-traitant : décennale, vigilance, Kbis…), modifiables par l'équipe. Les suggestions sont un réglage, jamais une condition dans le code.
  - Ajustement 2 : l'attestation de vigilance devient une pièce attendue avec validité ; une seule mécanique pour toutes les pièces (attendue, déposée, validée, refusée, expirée), relances de nuit communes.
  - Trois rubriques : pièces des intervenants, documents du chantier, fin de chantier (PV signé rangé seul, DOE). « Qui voit ça ? » sur chaque document.
  - Blocages réglables : décennale des sous-traitants avant le démarrage ; PV et DOE avant la clôture.

**Cassé**
- Rien de connu.

## 11 octobre 2026 (branche `sirene`, partie de `nuit`, en prévisualisation)

**Fait**
- Sirene par l'API Recherche d'entreprises (data.gouv, sans clé) : table `entreprises` (migration 0008), reliée au client du chantier (`client_siren`) et au compte d'un externe (`siren`).
- Fiche chantier : « Vérifier l'entreprise » pour le client et pour chaque externe (recherche par nom, SIREN ou SIRET ; faute de frappe repérée par la clé de contrôle). Badge « En activité » ou « Fermée ». Interne seulement.
- Le serveur relit la fiche au registre, il ne garde jamais ce que le navigateur envoie. Quota : 200 recherches par compte et par jour.
- Règle 6 : un externe dont l'entreprise est fermée n'est pas invité sur un autre chantier.
- Machine de nuit, passage de 6 h : 20 entreprises vérifiées depuis plus de 7 jours sont revérifiées ; courriel au gérant si l'une vient de fermer.
- 103 tests.

**Reste**
- Fusionner `nuit` d'abord, puis `sirene` (elle la contient).

**Cassé**
- Rien de connu.

## 11 octobre 2026, soir (branche `ui-fiche`, fusionnée sur demande de Kerguelenn)

**Fait**
- Fiche chantier alignée sur les maquettes Figma (section 03) : frise des étapes, « À traiter » en pastilles, chiffres, lots en cartes (téléphone) ou tableau (ordinateur), onglets Lots / Fil / Infos sur téléphone.
- Interface en cartes d'après les inspirations de Kerguelenn, noir et blanc strict : la couleur ne vient que des photos et de la météo.
- Accueil = tableau de bord façon magazine : bandeau « À traiter » (ligne calme à zéro, pastilles sinon), chantier à la une, météo de Paris (un seul appel), chiffres, mosaïque des autres chantiers, semaine, derniers messages.
- Météo en « fenêtre sur le ciel » : dégradé selon l'heure et le temps, pluie, neige, vent, étoiles (`lib/ambiance.ts`).
- Retours animés : chiffres qui défilent, cartes en cascade, barres qui se remplissent, lot avancé qui s'éclaire. Montants arrondis dans les grands chiffres (845 k €).
- Police Bricolage Grotesque pour les titres, noms et grands chiffres ; logo typographique « groma » et ouverture animée (une fois par session, passable, absente si l'appareil réduit les animations).
- Photos d'intérieur pour les chantiers fictifs (`public/jeu-de-donnees/`, choisies par Kerguelenn, dépôt public), servies via `/api/photos` après vérification des droits.
- 85 tests.

**Reste**
- Rejouer le jeu de données (Réglages) là où l'on veut voir les photos : les chantiers créés avant n'en ont pas.
- Vérification visuelle complète en prévisualisation ou production, ordinateur et téléphone (connexion Vercel puis Groma par Kerguelenn) ; le glissement du logo d'ouverture vers l'en-tête n'a pas été vu en vrai.
- Restyler en cartes les pages restantes : connexion, réglages, nouveau chantier, invitation, mot de passe.
- Figma : quota MCP de l'offre Starter épuisé ; les autres écrans arriveront en exports PNG dans `docs/maquettes/`.
- Onglets de la fiche sur téléphone : choix repris des maquettes, à confirmer par Kerguelenn.
## 10 octobre 2026, nuit (branche `nuit`, semaine 2, en prévisualisation)

**Fait**
- Sécurité fusionnée (demande n° 7).
- Tranche 0 : `/reglages/flux` lit une nuit brute. Constats : trois types (creation, mise_a_jour, message), statuts du flux etude, en_cours, receptionne, clos ; pas de code postal ni de compte pour le chef ; mises à jour et messages visent des chantiers créés dès août.
- Tranches 1 à 3 : tables `executions` et `evenements_flux` ; import idempotent (identifiant de l'événement, une exécution en cours par nuit, référence déjà connue) ; règles testées dans `lib/flux-regles.ts` (mal formés mis de côté avec motif) ; trois tentatives espacées ; rattrapage depuis `FLUX_DEPUIS` (1er août), nuit du jour d'abord ; `/api/nuit` protégée par `CRON_SECRET`, appelée à 6 h et 7 h (heure de Paris, `vercel.json`) ; page `/nuit` (exécutions, mis de côté, relance à la main). Vérifié : relancer une nuit donne 0 appliqué, tout en doublons.
- Tranche 4 : récapitulatif à 7 h, une fois par jour et par personne (`recapitulatifs`), gérant pour tout, équipe pour ses chantiers. Vérifié : second passage, « déjà envoyé ».
- Tranche 5 : alerte courriel au gérant et Sentry quand le flux tombe ; `/api/sante/nuit` (503 si la dernière tentative a échoué ou rien depuis 26 h).
- Tranche 6 : consommation du mois et coût sur `/nuit` (0 € réel, estimation indicative paramétrée dans `lib/couts.ts`).
- 93 tests.

**Reste**
- Kerguelenn : vérifier le récapitulatif reçu, créer les sondes UptimeRobot, déclencher une vraie alerte, puis fusion.
- En production, le premier passage rattrape depuis le 1er août, par paquets de 10 nuits.

**Cassé**
- Rien de connu.

## 10 octobre 2026, soir (branche `securite`, en prévisualisation)

**Fait**
- Interface noir et blanc fusionnée (demande n° 6). Domaine d'envoi `groma.tovimstudio.com` vérifié chez Resend, expéditeur réglé (`COURRIEL_EXPEDITEUR`) ; invitation envoyée par courriel vérifiée.
- Kerguelenn : erreur de test Sentry faite, procédure de remplacement de la clé météo faite.
- Les sept points ouverts de la revue de sécurité traités (`docs/revue-securite.md` à jour) : connexion plafonnée (vérifié sur la prévisualisation : le 6e essai est bloqué), quotas, session révocable de 7 jours, garde sur les adresses fictives, en-têtes et politique de contenu (vérifiée en local sur une construction de production : aucun blocage), règle « un message est une donnée » dans `AGENTS.md`.
- 70 tests.

**Reste**
- Fusion de `securite`.
- Semaine 2 : plan proposé (tranches 0 à 6), en attente du « go » et de deux choix : destinataires du récapitulatif, compte UptimeRobot.

**Cassé**
- Rien de connu.

## 10 octobre 2026 (branche `interface-2`, en prévisualisation)

**Fait**
- Audit de l'interface (`docs/audit-interface.md`, captures dans `docs/audit/`).
- Direction visuelle choisie par Kerguelenn : noir et blanc, sans couleur ; les états se lisent par la forme (plein, contour, pointillé) et le texte. Les images viendront ensuite, de Kerguelenn.
- Les 4 défauts corrigés : police (Geist au lieu de Times), débordement des noms, étape impossible proposée (blocages affichés avant le clic, un seul refus), cibles de 44 px sur téléphone.
- Changements de structure : onglets par statut avec compteurs et onglet « À traiter » ; colonne « À traiter » et tri par urgence ; fiche dans l'ordre du terrain ; en-tête sur une ligne avec menu du compte ; fil à boutons directs ; « Interne » ou « Partagé avec » en clair ; gestes mis en avant pour l'externe ; adresse avec suggestions (API Adresse).
- Place pour les images : photo de chantier privée (bandeau de la fiche, vignette de la liste, `/api/photos/[id]`) ; aperçu des photos jointes dans le fil ; image d'accueil de la connexion (`public/images/accueil.jpg`, voir `public/images/LISEZ-MOI.md`).
- Vérifié par captures sur la prévisualisation, ordinateur et téléphone, gérant et externe, y compris l'envoi d'une photo.

**Reste**
- Kerguelenn essaie, puis fusion.
- Figma : reporter la nouvelle structure dans les wireframes, puis l'import.
- Images : déposer `public/images/accueil.jpg` et les photos des chantiers.

**Cassé**
- Rien de connu.

## 5 octobre 2026, nuit (lot C fusionné : demande n° 5, en production)

**Fait**
- Météo : adresse géolocalisée à la création (API Adresse), ou à la première ouverture de la fiche ; trois jours de prévisions OpenWeatherMap (`OPENWEATHER_GROMAA`), alertes gel, pluie, vent ; panne sans blocage. Vérifié sur la prévisualisation avec la vraie clé.
- Invitations par lien à usage unique (`jetons`, empreinte seulement), courriel Resend quand c'est possible, lien affiché sinon ; page `/invitation/[jeton]`.
- Mot de passe oublié (`/mot-de-passe-oublie`, `/reinitialiser/[jeton]`, une heure).
- Alertes au gérant par courriel : nouveau devis, signé, réception, annulé.
- Pièces jointes privées sur Vercel Blob (`groma-fichiers`, accès privé), servies par `/api/fichiers/[id]` après vérification des droits.
- Sentry côté serveur (`instrumentation.ts`), bouton d'erreur de test dans Réglages, état dans `/api/sante`.
- `docs/revue-securite.md`, README.
- 63 tests.

**Reste**
- Sentry branché en production (DSN corrigé dans `SENTRY_API_KEY`) : faire l'erreur de test depuis Réglages.
- Une prévisualisation relancée à la main depuis le tableau de bord Vercel a utilisé la base de production (empreinte `b2017901`). N'essayer que sur les prévisualisations de branche (`groma-git-<branche>-…`), et vérifier l'empreinte dans `/api/sante`.
- Avant la démo : rejouer le jeu de données en production (Réglages).
- Mis de côté par Kerguelenn : Sirene, UptimeRobot.

**Cassé**
- Rien de connu.

## 5 octobre 2026, nuit (lot B fusionné : demande n° 4, en production)

**Fait**
- Tranche 6 : tables `lots` et `fil` ; étapes du chantier avec refus motivés (`lib/regles.ts`) ; règle de clôture testée sur les trois cas ; pas de pose sans livraison ; retards calculés ; fil chronologique à six types, interne par défaut, partage par « Qui voit ça ? » ; qualification des signalements ; annulation avec motif ; bouton de l'étape suivante fixé sous le pouce sur téléphone.
- Jeu de données enrichi : lots (dont en retard), fil, réceptions bloquées par un signalement.
- Vérifié sur la prévisualisation : rejeu du jeu de données, fiches en réception rendues sans erreur avec lots, fil, signalements et « Qui voit ça ? ». Non vérifié par l'IA : les clics (étapes, partage, qualification), faute de pouvoir appeler les actions depuis le terminal.
- 49 tests.

**Reste**
- Un document du fil n'a pas encore de fichier : il arrive avec la tranche des pièces jointes (Vercel Blob).
- Les alertes au gérant (devis signé, réception, annulation) sont notées dans le journal (`alerte_gerant`) ; le courriel part avec la tranche Resend.
- Clés Resend et OpenWeatherMap : en place en Production et en Preview, sous `RESEND_GROMAA` et `OPENWEATHER_GROMAA`. Prochaines tranches : invitations et alertes (Resend), météo.

**Cassé**
- Rien de connu.

## 4 octobre 2026, nuit (filet et lot A, fusionnés : demande n° 3)

**Fait**
- Tranche 1, le filet : vérifications GitHub à chaque envoi (lecture, types, tests) ; une base Neon distincte par prévisualisation (réglage « Create Database Branch For Deployment : Preview ») ; migrations jouées par Vercel à chaque construction (`vercel.json`) ; page `/api/sante` qui donne l'empreinte de la base utilisée.
- Lot A, en production : tables `chantiers` et `participants` ; règle d'accès unique (`lib/acces.ts`, réglage `EQUIPE_VOIT_TOUT`) ; rôle relu en base à chaque demande ; liste filtrable, fiche, formulaire « Nouveau chantier », états vide, chargement, erreur ; jeu de données fictif rejouable depuis Réglages (50 chantiers, 10 personnes ; le gérant tape le mot de passe des comptes fictifs au moment du rejeu) ; filtres immédiats sur la liste ; `acces_refuse` dans le journal.
- 25 tests.

**Reste**
- En production, la base n'a pas encore de chantiers : rejouer le jeu de données depuis Réglages avant la démo.
- Lot B : invitations (Resend) et mot de passe oublié, lots, fil avec « Qui voit ça ? », étapes du chantier et règle de clôture, pièces jointes.
- Lot C : météo et Sirene, Sentry, UptimeRobot, revue de sécurité, README.
- Figma : type « message », fil chronologique, débordement « Vu par ».

**Cassé**
- Rien.

## 4 octobre 2026, soir (branche `interface`)

**Fait**
- Trois décisions de Kerguelenn reportées dans `docs/cycle-de-vie.md` et `docs/brief-maquettes.md` : montant HT interne sur le chantier ; chaque élément du fil est partagé au cas par cas, coché dans une fenêtre « Qui voit ça ? » ; les lots et leurs retards restent internes.
- Rendus semaine 1 : `docs/spec-fiche-chantier.md` (spécification d'une page) et `docs/schema-produit.md` (schéma du produit, trajet du clic à la base).

- Wireframes Figma mis à jour selon les trois décisions : section 08 « Qui voit ça ? » (7 états), ligne « Vu par : … » et bouton sur chaque élément du fil, vue externe sans lots ni retards ni montant, liste vue par un externe, champ « Montant du devis HT » (interne) au formulaire de création.

- Écarts tranchés par Kerguelenn et reportés dans la spécification, le modèle et le brief : bouton de l'étape suivante en bas sous le pouce sur téléphone, en haut sur ordinateur ; fil chronologique, le plus récent en bas ; nouveau type « message » (texte libre) dans le fil, pour prévenir un externe d'un retard.
- Branche `interface` fusionnée dans `main`.

**Reste**
- Figma (à faire dans une session qui a accès à Figma, ou à la main) : ajouter le type « message » au menu « Ajouter au fil » et à un exemple du fil ; vérifier que le fil est bien chronologique partout ; corriger le débordement des lignes « Vu par » (ci-dessous). Puis l'étape style.
- Libellés « Déclarer la réception » et « Retenir comme réserve » : à confirmer par Kerguelenn selon le vocabulaire du terrain.
- Sur `main` : base distincte par prévisualisation, tests rejoués à chaque push, chantiers et participants.

**Cassé**
- Figma, fiche bureau (section 03) : les deux lignes « Vu par » du fil dépassent à droite de leur carte. Correctif d'une minute à la main : sélectionner les deux calques « Qui voit ça » et régler la largeur sur « Fill container ». La limite d'appels Figma de l'offre Starter a été atteinte avant le correctif.

## 4 octobre 2026, après-midi (branche `interface`)

**Fait**
- Wireframes en niveaux de gris dans Figma, fichier « Groma — Wireframes » : https://www.figma.com/design/pDSXYULaNMPiiM94ldE54c
  Sections 00 (principes UX et accessibilité, parcours, vocabulaire des statuts) puis 01 à 07, un écran du brief par section, chacun avec ses états et des notes « À vérifier ».

## 4 octobre 2026, matin (branche `main`)

**Fait**
- Modèle arrêté : `docs/cycle-de-vie.md`.
- Dépôt public `ElahTovim/groma`, relié à Vercel. Production : https://gromaa.vercel.app.
- Base Neon `groma-db`, créée depuis Vercel ; première migration jouée (table `comptes`).
- Connexion par courriel (Auth.js), page de première installation réservée à `ADMIN_EMAIL`, journalisation des connexions et des refus. Fusionné par la demande n° 1.
- Compte gérant créé par Kerguelenn.
- Huit tests sur la règle d'installation (`npm test`).

**Reste**
- Activer une base distincte par prévisualisation (réglage de l'intégration Neon dans Vercel) : aujourd'hui prévisualisations et production partagent la même base.
- Rejouer les tests à chaque push (GitHub Actions).
- Invitations par courriel (Resend), réinitialisation du mot de passe, rôles équipe et externe.
- Les tables chantiers, lots, participants, fil, et le jeu de données fictif.
- Compte UptimeRobot sur l'adresse de production ; brancher Sentry.

**Cassé**
- Rien.
