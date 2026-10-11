# groma · spécification produit

Suivi de chantiers de rénovation pour les entreprises du BTP.
Version du 11 octobre 2026 · Kerguelenn (Tovim Studio) · séminaire « Usage de l'IA », 5 semaines.

En ligne : https://gromaa.vercel.app

---

## 1. Le problème

Une entreprise de rénovation coordonne, sur chaque chantier, une équipe interne et une série d'intervenants extérieurs : le client, l'architecte, le bureau d'études, le syndic de copropriété, les fournisseurs et les sous-traitants. Aujourd'hui, cette coordination passe par WhatsApp, les courriels et le téléphone :

- le client voit tout ou rien ;
- les preuves (photos, plans, devis) se perdent dans les conversations ;
- les réserves de fin de chantier traînent, et le solde n'est pas payé ;
- les papiers obligatoires (PV de réception, attestations des sous-traitants) sont mal suivis, et leur absence coûte cher.

## 2. La cible et le positionnement

**Cible :** l'entreprise générale de rénovation de 5 à 50 personnes, qui coordonne des sous-traitants, des clients particuliers et des syndics. Ni l'artisan seul, ni le grand groupe.

**Positionnement :** « Vos chantiers sans WhatsApp, vos réceptions sans litige, vos sous-traitants en règle. »

**Le marché, en bref :**

- Le suivi de chantier seul est un marché occupé (Archipad, Finalcad, Fieldwire, Procore pour les grands comptes).
- La gestion complète des petites entreprises du bâtiment l'est aussi (Obat, Tolteck, Batappli, Extrabat, Graneet).
- Ce qu'un patron du BTP achète d'abord, dans l'ordre : être payé, avoir ses papiers obligatoires en règle, puis suivre ses chantiers.

groma se différencie donc par la coordination fine avec les externes et par les obligations légales de fin de chantier et de sous-traitance. Il ne cherche pas à refaire la facturation.

Les noms de concurrents et les ordres de grandeur sont à vérifier avant d'en faire un argument commercial. Prochaine étape conseillée : cinq entretiens avec des patrons du BTP, un conducteur de travaux et un syndic.

## 3. Les rôles

| Rôle | Qui | Ce qu'il peut faire |
| --- | --- | --- |
| Gérant | le patron | tout ; invitations, réglages, machine de nuit, export de facturation |
| Équipe | les chefs d'équipe | toutes les étapes, sur les chantiers où ils participent |
| Externe | client, architecte, ingénieur, syndic, fournisseur, sous-traitant | ses seuls chantiers, et seulement ce qu'on lui partage ; ne change jamais une étape |

- On n'entre que **sur invitation** : il n'y a pas d'inscription libre. Les liens d'invitation sont à usage unique et valent 7 jours.
- La **qualité** d'un externe (client, syndic…) est un libellé, jamais un droit ni une condition dans le code.
- Les droits sont **vérifiés par le serveur** à chaque demande. Un bouton masqué n'est pas un droit.

## 4. Le cycle de vie du chantier

`devis → signé → planifié → en cours → réception → clos`, ou `annulé` (avant le démarrage, avec un motif).

| Passage | Condition |
| --- | --- |
| devis → signé | le devis est joint au fil |
| signé → planifié | une date de début et au moins un lot |
| planifié → en cours | la date de début est atteinte |
| en cours → réception | tous les lots sont finis |
| réception → clos | **PV de réception signé**, aucun signalement à qualifier, aucune réserve ouverte |

**Les lots** (carrelage, électricité…) passent par `à commander → commandé → livré → posé → fini`. Il n'y a pas de pose sans livraison. Un lot est en retard quand une date prévue est dépassée : groma le calcule, personne n'a à le déclarer.

**Le fil** est unique pour chaque chantier. Il reçoit des messages, des demandes avec échéance, des disponibilités, des documents avec pièce jointe et des signalements. Tout y est **interne par défaut**. La fenêtre « Qui voit ça ? » permet de partager chaque élément, externe par externe. Un signalement est qualifié en réserve ou écarté avec un motif, et une réserve se lève.

## 5. Les fonctions

### Livré, en production

**Semaine 1, le socle**

- Comptes, invitations par courriel, mot de passe oublié, trois rôles.
- Liste des chantiers filtrable par étape, avec un onglet « À traiter » ; fiche chantier ; formulaire de création validé.
- Chaque écran a ses quatre états : vide, chargement, données, erreur.
- La règle de clôture, testée sur un cas normal, un cas vide et un cas piégé.
- La météo à trois jours sur chaque chantier, avec des alertes gel, pluie et vent (OpenWeatherMap). L'adresse est géolocalisée par l'API Adresse.
- Pièces jointes et photos de chantier, privées, servies seulement après vérification des droits.
- Un jeu de données fictif rejouable : 50 chantiers, 10 personnes.
- Une interface noir et blanc, prévue pour accueillir des images ; une fiche en cartes et un accueil de type magazine.

**Semaine 2, la machine de nuit**

- Chaque matin à 6 h, groma importe les événements de la nuit (créations, mises à jour, messages) depuis le flux du séminaire.
  - **Sans doublon** : relancer une nuit ne double rien.
  - Un événement mal formé (montant en texte, date impossible, champ manquant, statut inconnu) est **mis de côté avec son motif**.
- Un message du flux est une donnée, jamais un ordre.
- **En cas de panne** : trois tentatives espacées, l'échec noté, la nuit rattrapée au passage suivant, et une alerte au gérant par courriel et dans Sentry.
- À 7 h, le **récapitulatif du matin** : au gérant pour tous les chantiers, à chaque chef d'équipe pour les siens. Il part une seule fois par jour et par personne.
- La page **Machine de nuit** : chaque exécution, les événements mis de côté, le coût du mois (0 € réel, et une estimation au-delà des offres gratuites).
- Deux sondes de santé, pour UptimeRobot : `/api/sante` (le site) et `/api/sante/nuit` (la nuit).

### Prêt, en prévisualisation (branche `reception`, à fusionner)

**La vérification des entreprises (registre Sirene)**

- Sur la fiche, « Vérifier l'entreprise » pour le client et pour chaque externe : on cherche par nom, SIREN ou SIRET.
- groma garde le nom officiel, l'adresse, l'activité et un badge **En activité** ou **Fermée**.
- Une faute de frappe dans un numéro est repérée avant tout appel, grâce à sa clé de contrôle.
- Le serveur relit toujours la fiche dans le registre : il ne fait jamais confiance au navigateur.
- On ne peut pas inviter sur un nouveau chantier un externe dont l'entreprise est fermée.
- La machine de nuit revérifie chaque semaine les entreprises enregistrées et prévient le gérant d'une fermeture.
- Source : l'API Recherche d'entreprises de data.gouv. Ce sont les mêmes données que l'INSEE, gratuites et sans clé.

**Le PV de réception**

- **La préparation.** Une fois la réception déclarée, l'équipe prépare le PV : la date, le signataire (le maître d'ouvrage, choisi parmi les externes) et les réserves ouvertes, recopiées. On ne peut pas le préparer tant qu'un signalement n'est pas qualifié.
- **La signature.** Le signataire reçoit un courriel et signe depuis son compte : il tape son nom et coche une confirmation. Personne ne peut signer à sa place.
- **Après la signature.** Le PV est **figé** : son contenu exact est conservé, avec une empreinte SHA-256 imprimée sur le PDF. Il fait partir les garanties (parfait achèvement 1 an, biennale 2 ans, décennale 10 ans), affichées sur la fiche. Le gérant est prévenu que la facture de solde peut partir.
- Pas de clôture sans PV signé.

**Les attestations de vigilance URSSAF**

- La règle : pour un sous-traitant dont le contrat atteint 5 000 € HT, l'attestation est obligatoire tous les 6 mois. Sans elle, le donneur d'ordre est solidaire de ses dettes sociales.
- **L'exigence.** L'équipe coche « attestation exigée » sur l'externe.
- **Le dépôt.** L'attestation (PDF, date de délivrance, code de sécurité facultatif) se rattache à son entreprise vérifiée. **Le sous-traitant peut la déposer lui-même.**
- **Le suivi.** Elle est à jour, expire bientôt, a expiré ou manque.
- **Les relances.** La machine de nuit relance le sous-traitant une fois par étape, et le récapitulatif du matin liste les attestations à obtenir.
- Le seuil, la durée de validité et le préavis sont des réglages.

**La préparation de la facturation**

- groma ne facture pas : il dit **quand** facturer et **à qui**.
- **Les jalons, calculés pour chaque chantier :**
  - acompte à la signature ;
  - situations de travaux pendant le chantier ;
  - solde au PV signé ;
  - libération de la retenue de garantie un an après.
- **Un export pour le gérant**, dans Réglages : un fichier par chantier, importable dans un outil de facturation, avec le client et son SIREN, l'adresse des travaux, le montant HT, la réception et le prochain jalon.
- **Trois temps pour le branchement :**
  - maintenant, l'import du fichier ;
  - ensuite, la création automatique du brouillon de facture dans l'outil choisi ;
  - la facture électronique reste à l'outil de facturation, qui passe par une plateforme agréée.

  Le détail est dans `docs/branchement-facturation.md`.

### Validé sur le principe, à construire après la fusion : l'espace « Dossier »

Un espace par chantier, sous la météo et les participants, pour les documents juridiques et techniques.

- **Les pièces attendues, proposées à l'invitation** selon la qualité de la personne, puis ajustées librement par l'équipe :

  | Intervenant | Pièces proposées |
  | --- | --- |
  | Client | autorisation d'urbanisme, assurance dommages-ouvrage |
  | Syndic | autorisation des travaux votée en assemblée générale, règlement de copropriété |
  | Architecte | plans, CCTP, attestation d'assurance |
  | Bureau d'études | notes de calcul, plans d'exécution |
  | Sous-traitant | attestation décennale, attestation de vigilance, extrait Kbis |

  Ces suggestions sont un réglage, jamais une condition dans le code.
- **Une seule mécanique pour toutes les pièces.** Chaque pièce est attendue, déposée, validée, refusée avec un motif, ou expirée, avec une validité facultative. L'attestation de vigilance devient l'une d'elles, et les relances de nuit servent pour toutes.
- **Trois rubriques :**
  - les pièces des intervenants ;
  - les documents du chantier (devis signé, autorisations, plans de référence) ;
  - la fin de chantier : le PV signé, rangé automatiquement, et le DOE (dossier des ouvrages exécutés) remis au client.
- « Qui voit ça ? » sur chaque document.
- **Des blocages réglables** : la décennale des sous-traitants avant le démarrage ; le PV et le DOE avant la clôture.

## 6. L'architecture

| Couche | Choix |
| --- | --- |
| Interface et serveur | Next.js 16 sur Vercel, composants shadcn/ui |
| Base de données | Postgres sur Neon (créée par Vercel), schéma par migrations Drizzle, jouées à chaque mise en ligne |
| Comptes | Auth.js (jamais d'authentification écrite à la main) |
| Courriels | Resend, domaine `groma.tovimstudio.com` vérifié |
| Fichiers | Vercel Blob, en accès privé |
| Erreurs et sondes | Sentry, UptimeRobot |
| Tâches planifiées | Vercel Cron, 6 h et 7 h (heure de Paris) |
| API externes | OpenWeatherMap (avec clé) ; API Adresse et Recherche d'entreprises (sans clé) ; flux de nuit du séminaire |
| PDF | pdf-lib, fabriqué à la demande par le serveur |

**Les principes**

- **Une seule porte.** Chaque écriture suit le même ordre : qui appelle, accès au chantier, droit, forme, règle métier, écriture, journal. L'écran, la nuit et, plus tard, l'agent passeront tous par là.
- **Une règle qui peut changer est un réglage**, pas une valeur figée dans le code.
- **Une API externe en panne ne bloque rien** : l'écran le dit et reste utilisable.
- **Chaque prévisualisation a sa propre copie de la base** : on ne teste jamais sur la production.
- **Le travail se fait par branches.** Chaque tranche a sa prévisualisation, et la fusion dans `main` se fait sur décision de Kerguelenn.

## 7. La sécurité et les données

- **La base** n'est joignable qu'avec sa clé, rangée dans Vercel. Aucune clé ni aucun mot de passe dans le dépôt, qui est public ; l'historique a été vérifié.
- **Le navigateur ne parle jamais à la base** : tout passe par le serveur. Les requêtes passent par Drizzle, qui sépare les valeurs des requêtes.
- **Les mots de passe** sont hachés (bcrypt, 12 caractères au moins).
- **Les connexions ratées sont limitées** : 5 par adresse et 30 par réseau, en 15 minutes.
- **Les sessions** durent 7 jours et sont révoquées à chaque changement de mot de passe.
- **Les plafonds quotidiens** : invitations, fichiers, recherches d'entreprises.
- **Les fichiers** (pièces jointes, photos, attestations, PV) sont privés et servis après vérification des droits. Un externe qui tente d'ouvrir un chantier où il n'est pas invité reçoit « introuvable », et la tentative est journalisée.
- **Les en-têtes de sécurité** sont actifs : cadres interdits, connexion chiffrée imposée, politique de contenu.
- **Ce qui reste ouvert, sans urgence :**
  - pas de double authentification pour le gérant ;
  - l'application utilise le compte propriétaire de la base, alors qu'un compte aux droits restreints serait mieux ;
  - pas de liste d'adresses autorisées sur Neon (c'est le cas de l'offre gratuite) ;
  - la politique de contenu autorise encore les scripts intégrés aux pages.

Revue complète : `docs/revue-securite.md`.

## 8. Ce qui reste à faire

| Quoi | Qui |
| --- | --- |
| Essayer la prévisualisation `reception`, puis la fusionner dans `main` | Kerguelenn |
| Ajouter la variable `ENTREPRISE_NOM` dans Vercel (le nom imprimé sur les PV) | Kerguelenn |
| En production : Machine de nuit, puis « Importer les nuits manquantes » jusqu'au rattrapage complet | Kerguelenn |
| Créer les deux sondes UptimeRobot, puis provoquer une vraie alerte pour la capture demandée | Kerguelenn |
| Construire l'espace « Dossier » | l'IA, après la fusion |
| Décider de l'outil de facturation et du taux de TVA par chantier | Kerguelenn |
| Cinq entretiens avec des professionnels du BTP | Kerguelenn |
| Semaine 3 : l'API Anthropic ; semaine 4 : l'agent | à venir |

## 9. Les documents de référence

| Document | Contenu |
| --- | --- |
| `docs/cycle-de-vie.md` | rôles, étapes, règles, tables (la référence) |
| `docs/schema-produit.md` | schéma interface, serveur, données, services |
| `docs/spec-fiche-chantier.md` | spécification de la fiche chantier |
| `docs/branchement-facturation.md` | jalons, export, branchement à un outil de facturation |
| `docs/revue-securite.md` | revue de sécurité |
| `docs/reprise.md` | état d'avancement, session par session |
| `AGENTS.md` | conventions de travail |
