# Vos cinq exercices, en cinq semaines

Vous allez construire un seul produit et le faire grandir chaque semaine. Vous choisissez le sujet : un outil de gestion pour un métier que vous connaissez, qui pourrait servir à de vraies personnes. Personne n'est obligé de s'en servir : ce qui compte, c'est qu'il soit en ligne, complet, beau, et que vous puissiez le montrer avec fierté à la fin. Chaque semaine lui ajoute une aile, et chaque vendredi vous le démontrez devant le groupe.

Vous ne lirez pas le code et vous n'en écrirez pas une ligne. L'IA fait tout : elle code, elle teste, elle déploie, elle corrige. Vous, vous apprenez à la manier : dire ce que vous voulez, découper, vérifier que ça marche en utilisant le produit, garder la main sur les versions, les clés et l'argent, et savoir expliquer avec des mots comment votre produit est organisé.

Vos utilisateurs, ce sont les autres participants. Chaque vendredi, quelqu'un d'autre prend votre produit en main, sans vous, et vous dit ce qui bloque. Vos données, c'est un jeu de données fictif mais réaliste que vous faites générer le premier jour (cinquante dossiers, dix personnes, des cas normaux et des cas tordus) : jamais de données de vraies personnes.

En cinq semaines, vous aurez construit et mis en ligne un produit avec des comptes et des rôles, une interface propre, une base de données, une API externe, une machine qui travaille la nuit, de l'IA dedans, une recherche qui cite ses sources, un agent qui agit sous votre contrôle, un serveur MCP pour le piloter depuis Claude, et vous aurez repris le produit d'un autre.

## Comment utiliser cette fiche

Elle est écrite pour vous et pour votre IA. Le premier jour, donnez-la à Claude Code et faites-la copier dans le fichier de conventions de votre projet. Chaque lundi, demandez-lui le plan de la semaine à partir de la section correspondante, corrigez-le, puis suivez la boucle décrite plus bas. Chaque fois qu'une exigence vous semble floue, demandez à l'IA de vous l'expliquer avec un exemple avant de la faire.

## Les règles, du premier jour au dernier

- Vous ne touchez pas au code : vous le faites produire par Claude Code. Vous cadrez, vous pilotez, vous vérifiez, vous gardez la main.
- Le produit est en ligne dès le premier soir, et il le reste. On ne travaille jamais sur une version qui n'est pas déployée quelque part.
- Une demande à la fois, avec le contexte utile et ce qu'il ne faut pas toucher. Une fonctionnalité par branche, une prévisualisation par branche, la production sur la branche principale. On ne teste jamais sur la production.
- Avant chaque génération, vous faites enregistrer une version (un commit) avec un message qui dit pourquoi. Après, vous faites raconter à l'IA ce qu'elle a changé, en français, et vous vérifiez en utilisant le produit sur la prévisualisation.
- Les tests, écrits par l'IA, sont rejoués à chaque push. Un test vert ne prouve que ce qu'il teste : vous demandez à l'IA ce que ses tests vérifient.
- Aucun secret dans le dépôt, dans le navigateur ni dans le chat. Les clés vivent dans les variables d'environnement de l'hébergeur. Aucune donnée de vraie personne nulle part.
- À tout moment, vous devez pouvoir expliquer avec des mots, sans l'IA, comment votre produit est organisé et ce que fait chaque partie. Quand vous ne pouvez plus, vous cessez d'ajouter et vous vous le faites réexpliquer.
- Quand l'IA tourne en rond (trois correctifs sans progrès), vous vous arrêtez, vous revenez à la dernière version qui marchait, vous redécoupez la demande.
- Chaque session se termine par un état de reprise, écrit par l'IA et relu par vous : fait, reste, cassé.
- Quarante-huit heures avant chaque séance, vous envoyez à Netaniel le lien de votre produit en ligne et celui de votre dépôt. Pas de lien, pas de démo.
- Chaque vendredi, démonstration de vingt minutes devant le groupe, sur le produit en ligne, sans slides. Le groupe est le jury.

## La boucle, pour chaque fonctionnalité

C'est la même boucle du premier jour au dernier, et c'est elle que vous emportez en partant. Pour chaque fonctionnalité : (1) vous écrivez ce que vous voulez en dix lignes, avec les cas limites et ce qui est hors périmètre ; (2) vous dessinez l'écran et ses états (vide, chargement, données, erreur), sur papier ou avec l'IA ; (3) vous demandez à l'IA un plan en tranches vérifiables, vous le corrigez ; (4) une tranche à la fois, sur une branche, version enregistrée avant ; (5) chaque tranche apporte sa preuve : un test qui passe, une prévisualisation où vous faites le geste vous-même ; (6) vous faites raconter à l'IA ce qu'elle a changé et pourquoi, et vous refusez ce qui dépasse la demande ; (7) vous fusionnez, vous vérifiez en production ; (8) vous laissez l'état de reprise. Le premier jour, vous faites créer un fichier de conventions (AGENTS.md) que l'IA lit à chaque session : c'est là que vous faites écrire ce que vous avez décidé pour que l'IA ne le redemande plus.

## La stack commune, tout en gratuit

Pour que les semaines s'empilent, tout le monde a la même stack, et c'est vous qui la montez le premier jour, en la faisant faire par l'IA : personne ne vous donne un projet tout prêt, savoir en faire naître un est le premier apprentissage. Next.js sur Vercel (offre Hobby) relié à GitHub, Postgres géré sur Neon (offre gratuite), authentification par bibliothèque (Auth.js) avec rôles, courriels par Resend, fichiers sur Vercel Blob, interface par composants (shadcn/ui), tests et vérification à chaque push, sonde par UptimeRobot, suivi des erreurs par Sentry, modèles Claude par l'API Anthropic à partir de la semaine 3 (les crédits sont à votre charge : quelques euros suffisent si vous plafonnez), SDK d'agents à la semaine 4. Votre adresse est celle que Vercel vous donne, en `.vercel.app`. Sans domaine à vous, Resend n'envoie de courriel qu'à l'adresse de votre propre compte : pour inviter un autre participant, vous lui transmettez le lien d'invitation à la main. Un nom de domaine à soi, avec des courriels qui partent vers n'importe qui, est un badge.

Le premier jour, dans l'ordre : vous créez vos comptes (GitHub, Vercel, Neon, Resend, UptimeRobot, Sentry) ; vous demandez à Claude Code de créer le projet avec cette stack, de le pousser sur GitHub et de le relier à Vercel ; vous branchez chaque service, clé par clé, dans les variables d'environnement de Vercel ; vous faites écrire le fichier de conventions et le script qui génère votre jeu de données. Le soir, la page de connexion répond à votre adresse `.vercel.app`. Savoir faire naître un projet, brancher un service et ranger sa clé, c'est le premier geste du métier.

## Ce que la formation vous fournit

Vous montez le projet vous-même, mais vous ne cherchez jamais la donnée : elle est fournie, pour que chaque semaine démarre avec sa matière et que vous passiez votre temps à construire.

- **Le flux de nuit**, à https://flux-de-nuit.vercel.app : la source externe de la semaine 2. Chaque nuit, il produit pour votre sujet une dizaine d'événements (créations, changements de statut, messages). Vous prenez votre clé vous-même sur sa page d'accueil, en tapant votre prénom. Il se comporte comme une vraie source : il envoie des doublons, il tombe en panne quand le formateur le décide, il met parfois trop longtemps à répondre, il renvoie parfois des données mal formées. Mode d'emploi à la même adresse.
- **Les documents et les courriers de la semaine 3**, servis par le flux : vingt documents par sujet (procédures, contrats, comptes rendus), découpés en pages, pour la recherche qui cite ses sources ; dix courriers à faire lire par le modèle, dont un sans montant et un sans date précise, pour compter ce qu'il invente.
- **Le document piégé de la semaine 4**, glissé par le flux dans un message entrant : une consigne cachée que votre agent ne doit pas suivre.
- **Un catalogue d'API publiques** (document joint) pour l'API externe de la semaine 1 et pour ceux qui veulent une seconde source : sans clé (adresse et géo de data.gouv, recherche d'entreprises, Open-Meteo, Frankfurter pour les taux de change, jours fériés, flux RSS) ou à clé gratuite (OpenWeatherMap, Sirene de l'INSEE, Stripe en mode test).

## Semaine 1 : le socle, un vrai produit en ligne

Vendredi soir, vous avez un produit en ligne avec une page de connexion, des comptes, deux rôles, des écrans propres, des données, une règle métier qui tient, une API externe qui enrichit vos dossiers, des courriels et des pièces jointes. Pas encore d'IA dedans : l'IA, c'est vous qui l'utilisez pour le construire.

**Votre produit devra** :

- Être en ligne le premier soir, connexion comprise.
- Avoir des comptes, un premier administrateur, des invitations par courriel, une réinitialisation de mot de passe, et deux rôles vérifiés côté serveur (un rôle masqué à l'écran n'est pas un rôle).
- Suivre un objet principal (dossier, demande, matériel, réservation, facture) avec son cycle de vie dessiné avant de coder : ses statuts, ses transitions, qui a le droit de faire quoi à chaque étape.
- Conserver ses données dans trois tables reliées, dont le schéma évolue par migrations (l'IA les écrit et les joue, vous savez ce qu'elles sont).
- Avoir une interface par composants avec, sur chaque écran, ses quatre états (vide, chargement, données, erreur), une liste filtrable, une fiche de détail, un formulaire validé, un retour visible après chaque action.
- Appliquer une règle métier qui compte (quelque chose que le produit calcule, vérifie ou interdit), testée sur un cas normal, un cas vide, un cas piégé.
- Être rempli d'un jeu de données fictif réaliste, généré par un script que l'IA écrit, rejouable.
- Appeler une API externe avec une clé côté serveur qui rapporte des données dans le produit (géocodage, Sirene, taux de change, météo, calendrier, paiement en mode test).
- Envoyer au moins un courriel et accepter des pièces jointes stockées hors du disque de l'application, servies par un lien privé.
- Tenir : tests à chaque push, journaux de production où vous retrouvez une action, revue de sécurité demandée à l'IA et lue, README qui permet de le lancer en dix minutes.

**Vous rendrez** : la spécification d'une page, le cycle de vie de l'objet principal (statuts, transitions, rôles), la maquette des écrans et de leurs états, le schéma du produit (interface, serveur, données, services externes).

**La démo du vendredi** : un participant crée un compte sur invitation, crée un dossier avec une pièce jointe, l'API externe l'enrichit ; un autre rôle essaie de le voir et ne peut pas, et vous retrouvez la tentative dans les journaux ; vous révoquez la clé de l'API, vous la remplacez, vous redéployez ; vous expliquez avec des mots, sur votre schéma, ce qui se passe entre le clic et la base quand on crée un dossier.

**Vous ferez attention à** : ne pas perdre la première journée en configuration ; choisir un sujet qui pourra grandir (des données à aller chercher la nuit, des actions qu'un agent pourrait faire) ; ne jamais laisser l'IA écrire l'authentification à la main ; ne pas demander tout d'un coup ; ne pas laisser « ça marche en local » vous suffire ; ne pas confondre un écran joli avec un écran qui a ses quatre états.

## Semaine 2 : la machine qui travaille la nuit

Chaque nuit, votre produit va chercher des données ailleurs, les nettoie, se met à jour, et chaque matin envoie à qui de droit ce qui mérite attention. Il est surveillé, et il vous prévient quand il tombe.

**Votre produit devra** :

- Lancer une tâche planifiée chaque nuit.
- Aller chercher les événements de la nuit sur le flux de nuit, avec votre clé côté serveur, erreurs gérées et relances.
- Rester sans effet si une étape se rejoue deux fois (c'est ce qu'on appelle idempotent : relancer ne double rien).
- Écrire une ligne de journal par exécution et afficher un tableau de bord des exécutions.
- Envoyer chaque matin un récapitulatif à qui de droit.
- Être surveillé par une sonde externe et une alerte que vous avez déclenchées en vrai, plus un suivi des erreurs.
- Afficher ce que la nuit a coûté.

**Vous rendrez** : le tableau de bord des exécutions, la capture de l'alerte reçue.

**La démo du vendredi** : le récapitulatif de la nuit est arrivé ; vous relancez l'exécution à la main, rien n'est envoyé deux fois ; le formateur met le flux en panne, l'alerte part, le reste du produit tourne.

**Vous ferez attention à** : le cron qui envoie deux fois ; la tâche qui dure plus que ce qu'une fonction Vercel accepte (faites-la découper en étapes) ; l'alerte jamais testée, qui n'existe pas ; le récapitulatif qui part à minuit à tout le monde.

## Semaine 3 : le produit devient intelligent

On dépose un document, ses champs se remplissent seuls. Un dossier se classe seul. Un résumé et un brouillon de réponse apparaissent. On pose une question en langage naturel sur ses propres données et ses documents, et le produit répond en streaming, en citant la bonne page. Et la machine de nuit ne se contente plus de ranger : elle analyse ce qu'elle rapporte.

**Votre produit devra** :

- Appeler un modèle depuis une route serveur, clé en variable d'environnement, jamais depuis le navigateur.
- Lire un courrier déposé (les dix courriers du flux) et en remplir les champs, avec une sortie structurée validée (le modèle répond dans un format fixé, et le produit refuse ce qui n'y entre pas).
- Classer, résumer ou proposer un brouillon (au moins deux de ces trois).
- Indexer les vingt documents du flux (découpage, embeddings, pgvector) et répondre à une question en citant la bonne page.
- Afficher la réponse en streaming, montrer ce qui se passe pendant l'appel et ce qui, après, est incertain et doit être relu.
- Ne jamais déclencher une action automatique sur une réponse du modèle : l'utilisateur valide.
- Faire analyser par le modèle ce que la machine de nuit rapporte.
- Limiter la taille et le nombre d'appels par utilisateur, plafonner la dépense, et ajouter le coût de l'IA à la page de coûts.

**Vous rendrez** : la liste de vos fonctions IA avec, pour chacune, ce que voit l'utilisateur quand le modèle se trompe ; le coût par appel et par mois ; le récit d'un moment où l'IA a tourné en rond et comment vous en êtes sorti.

**La démo du vendredi** : un participant dépose un document que vous n'avez jamais vu ; on compte ensemble ce qui est juste, faux, inventé ; il pose une question sur les documents, la réponse cite la bonne page ; vous montrez le coût.

**Vous ferez attention à** : le modèle qui invente un champ absent du document ; le modèle qui invente une source ; la clé côté navigateur, qui est la clé de tout le monde ; la facture surprise ; les embeddings recalculés chaque nuit pour rien.

## Semaine 4 : l'agent qui agit dans le produit

On parle à son produit et il agit : il lit les dossiers, appelle les services externes, prépare des courriels, crée des tâches, et s'arrête pour demander votre validation avant tout ce qui est irréversible. Et depuis Claude Code, vous pilotez votre propre produit, parce qu'il est devenu un serveur MCP.

**Votre produit devra** :

- Avoir une mission d'agent écrite en un seul document avant toute ligne de code : déclencheur, outils, périmètre, sortie vérifiable, condition d'arrêt, permissions, budget, validation humaine sur l'irréversible.
- Faire agir un agent construit avec le SDK d'agents d'Anthropic, avec des outils de lecture et d'action soumis aux rôles, un journal de chaque action et de chaque décision, un budget par exécution.
- Demander validation avant tout envoi, toute suppression, tout paiement, dans une interface de validation.
- S'exposer comme serveur MCP protégé par un jeton (envoyé dans l'en-tête de chaque requête), exposant vos données et trois actions, branché dans Claude Code.
- Le brancher aussi dans Claude Desktop est un bonus, pas une exigence.
- Avoir été soumis à la consigne cachée que le flux glisse dans un message entrant, et ne pas l'avoir suivie.
- Avoir tourné sur vingt scénarios rejoués, journaux lus, au moins une dérive observée et un garde-fou ajouté.

**Le vendredi, avant de rendre votre produit** : vous y cachez un bogue (une règle métier discrètement cassée, notée dans une enveloppe remise au formateur) et vous faites écrire la passation : README, conventions, inventaire des clés, comment lancer en dix minutes.

**Vous rendrez** : la mission, les journaux des scénarios, la dérive et le garde-fou ajouté, le coût, l'enveloppe du bogue, la passation.

**La démo du vendredi** : un participant pilote votre agent depuis Claude Code ; il demande une action bénigne, elle est faite ; il demande une action irréversible, l'agent s'arrête et demande validation ; il glisse une consigne cachée dans un document, l'agent ne la suit pas et le journal le montre.

**Vous ferez attention à** : l'agent sans condition d'arrêt ni budget, qui boucle jusqu'à la facture ; l'outil d'envoi sans validation ; le serveur MCP sans jeton, qui ouvre le produit à tous ; les journaux que personne ne lit ; deux agents sur le même dossier.

## Semaine 5 : reprendre le produit d'un autre, puis finir le vôtre

Lundi, vous recevez le produit complet d'un autre participant, avec sa passation et un bogue caché. Mercredi soir, vous vous l'êtes fait cartographier, vous l'avez réparé, et vous lui avez ouvert une porte pour les autres systèmes. Vendredi, votre propre produit revient chez vous, fini, avec une page de présentation, et vous le montrez au grand jury.

**Du lundi au mercredi, sur le produit reçu, vous devrez** :

- Le faire tourner chez vous en suivant la passation, et noter tout ce qui y manque.
- Vous le faire cartographier par l'IA (les parties, les tables, les services branchés, les tâches de nuit, l'agent) et expliquer cette carte à l'auteur, qui confirme.
- Trouver et corriger le bogue caché, sur une branche, avec le test qui l'aurait attrapé.
- Ajouter, sur une seconde branche, une API en lecture avec clé et quota, pour qu'un autre système puisse lire les données.
- Faire relire vos deux branches par l'auteur avant fusion.
- Faire lire à l'IA la documentation officielle avant de la croire.
- Dire « je ne comprends pas » à l'auteur plutôt que contourner.

**Jeudi et vendredi, sur votre produit revenu, vous devrez** :

- Fusionner ce que le repreneur a apporté, après vous l'être fait raconter.
- Corriger votre passation avec ce qui lui a manqué.
- Ajouter une page publique de présentation du produit, avec captures.
- Préparer la démo finale.

**Vous rendrez** : la carte du produit reçu, les deux demandes de fusion acceptées, le test du bogue, la passation corrigée, l'adresse de la page de présentation.

**La démo finale** : vingt minutes sur votre produit complet, de la connexion à l'agent ; l'auteur du produit que vous avez repris confirme que vous l'avez compris ; un tiers appelle votre API avec sa clé depuis un script.

**Vous ferez attention à** : tout faire réécrire parce que vous ne comprenez pas ; croire l'IA sur ce que fait le produit au lieu de l'essayer ; casser une fonctionnalité voisine sans test pour le dire ; l'API ouverte sans quota ; la passation que personne n'a essayée.

## Les badges, pour ceux qui ont de l'avance

Chaque badge est une brique de plus, à prendre quand la semaine est finie, jamais à la place : une seconde source de données pour la machine de nuit ; le serveur MCP branché dans Claude Desktop ; une fonctionnalité qui orchestre plusieurs agents en parallèle, coût et durée mesurés face à un seul agent ; un jeu de vingt cas d'évaluation pour une fonction IA, rejoué à chaque changement de consigne ; une sauvegarde de la base restaurée sur une copie ; un nom de domaine à soi avec son certificat, vérifié chez Resend pour que les courriels partent vers n'importe qui ; un worker en conteneur (Dockerfile écrit par l'IA, construit, déployé) pour ce qui dépasse une fonction Vercel ; un modèle qui tourne en local (Ollama) ; deux machines reliées par un réseau privé (Tailscale) ; un test à volume réaliste (dix mille lignes) ; l'accessibilité vérifiée (clavier, libellés, contrastes) ; une mise à jour majeure de dépendances passée avec audit et tests ; un registre des données personnelles et l'export des données d'une personne.

## Ce que vous aurez manipulé en partant

Un dépôt Git avec branches, prévisualisations et fusions ; un hébergeur relié au dépôt ; six services branchés clé par clé ; une base Postgres gérée avec migrations ; une authentification avec rôles ; des courriels et des fichiers par services tiers ; une interface par composants avec ses états ; une API externe avec sa clé ; des tests rejoués à chaque push ; des journaux de production ; des tâches planifiées idempotentes ; une sonde, une alerte, un suivi d'erreurs ; l'API d'un modèle avec sortie structurée, streaming et coût ; une recherche vectorielle qui cite ses sources ; un agent outillé avec journal, budget et validation humaine ; un serveur MCP ; une API avec clés et quotas ; la reprise du produit d'un autre et sa passation. Et une boucle de travail avec l'IA que vous saurez refaire sur n'importe quel projet, sans jamais avoir lu une ligne de code.
