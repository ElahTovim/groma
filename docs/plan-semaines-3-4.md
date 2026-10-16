# Plan des semaines 3 et 4 : qui fait quoi, en parallèle

16 octobre 2026 · la session-mère pilote, des sessions-filles construisent, Kerguelenn décide des fusions.

## La règle du jeu

1. **La session-mère pose le socle seule, avant toute fille.** Tout ce que plusieurs pistes toucheraient en même temps passe par elle : le schéma de la base et ses migrations, la couche « opérations » (la porte unique, appelable par l'écran comme par l'agent), le client du modèle, le compteur des coûts.
2. **Chaque fille a sa branche, sa copie de la base et sa liste de fichiers.** Elle ne touche que ses fichiers. Elle ne crée pas de migration : si elle a besoin d'une colonne, elle la demande à la mère.
3. **La mère intègre** : elle relit chaque branche, la remet à jour sur `main`, vérifie sa prévisualisation. Kerguelenn essaie, puis décide de la fusion.
4. **Au plus 4 branches ouvertes à la fois**, plus `main`. Chaque branche crée une copie de la base, et Neon en accepte 10 au plus.

## Avant de lancer (bloquant)

| Quoi | Qui |
| --- | --- |
| Fusionner `reception` (avec `sirene`) et `ui-mobile` dans `main` | Kerguelenn décide, la mère exécute |
| Clé de l'API Anthropic dans Vercel (production et prévisualisations) | Kerguelenn |
| Fournisseur des embeddings (le modèle d'Anthropic n'en fait pas) : Voyage AI, recommandé par Anthropic, clé gratuite | Kerguelenn décide |
| Activer `pgvector` sur Neon (une migration du socle) | la mère |
| Semaine 2, à finir : sondes UptimeRobot et capture d'une vraie alerte | Kerguelenn |

## Phase 0 · le socle (session-mère, une branche `socle-ia`)

- **Couche opérations.** Les actions serveur d'aujourd'hui deviennent des fonctions `lib/operations/*.ts` qui reçoivent l'appelant en paramètre. L'écran les appelle avec la session, l'agent de la semaine 4 avec son compte et ses droits. Même porte, même ordre : appelant, accès, droit, forme, règle, écriture, journal.
- **Le modèle.** `lib/ia.ts` appelle le modèle depuis le serveur seulement. Haiku 4.5 pour lire et classer (rapide et peu cher), Sonnet 5.5 pour répondre et analyser. Chaque appel est enregistré : jetons, coût, compte, fonction.
- **Les plafonds.** Appels par compte et par jour, taille maximale d'une demande, budget mensuel global. Au-delà, l'IA se met en pause, et le reste du produit fonctionne.
- **Le schéma** de toute la semaine 3 : `courriers`, `documents`, `morceaux` (avec un vecteur pgvector et l'empreinte du texte), `appels_ia`, `analyses_nuit`. Les colonnes des distances aussi (piste D).

## Phase 1 · quatre filles en parallèle

| Piste | Ce qu'elle livre | Ses fichiers |
| --- | --- | --- |
| **A. Courriers** | Les 10 courriers du flux lus par le modèle : expéditeur, société, référence du chantier, date, catégorie, montant. Sortie validée ; un champ absent reste vide. Classement, résumé, brouillon de réponse. Un écran de relecture : rien n'est appliqué sans validation. | `app/(espace)/courriers/**`, `lib/courriers*.ts` |
| **B. Documents et questions** | Les 20 documents découpés page par page, indexés une seule fois (empreinte : pas de recalcul la nuit). Une question en langage naturel, une réponse en direct qui cite le document et la page, et ce qui est incertain, signalé. | `app/(espace)/questions/**`, `app/api/questions/**`, `lib/recherche*.ts` |
| **C. Nuit intelligente et coûts** | La machine de nuit fait analyser ses événements par le modèle (tendances, alertes, réclamations répétées sur un même fournisseur), dans le récapitulatif. La page des coûts ajoute l'IA : par appel, par fonction, par mois. | `lib/analyse-nuit*.ts`, `app/(espace)/nuit/**` |
| **D. Distances et livraisons** | Pour le chef de chantier : la distance et le temps de route du fournisseur au chantier, et du dépôt au chantier ; la date limite de commande (délai fournisseur + transport) ; la zone de déplacement du BTP pour les indemnités de trajet. | `lib/distances*.ts`, `app/(espace)/chantiers/[id]/livraisons.tsx` |

En parallèle, l'autre fenêtre continue l'interface, sur ses propres fichiers d'écran.

## Phase 2 · intégration et rendus (session-mère)

- Fusion piste par piste, dans l'ordre où elles sont prêtes. Prévisualisation vérifiée à chaque fois.
- Les rendus de la semaine 3 :
  - la liste des fonctions IA, et ce que voit l'utilisateur quand le modèle se trompe ;
  - le coût par appel et par mois ;
  - le récit d'un moment où l'IA a tourné en rond.
- La répétition de la démo : un document jamais vu, ce qui est juste, faux ou inventé ; une question qui cite la bonne page ; le coût.

## Semaine 4, préparée pendant la semaine 3

- **La mission de l'agent**, rédigée par la mère pendant la phase 1 (un seul document) : déclencheur, outils, périmètre, sortie vérifiable, condition d'arrêt, permissions, budget, validation humaine.
- **L'agent** (SDK d'agents d'Anthropic) n'appelle que la couche opérations : il a les droits de son compte, ni plus ni moins. Chaque action et chaque décision vont au journal. Un budget est fixé par exécution.
- **La validation** : tout envoi, toute suppression, toute signature passe par une file « à valider » dans l'interface.
- **Le serveur MCP** (`/api/mcp`), protégé par un jeton dans l'en-tête, expose les données et trois actions, et se branche dans Claude Code.
- **La consigne cachée du flux** : le message est une donnée, jamais un ordre ; c'est déjà la règle, elle sera éprouvée.
- **20 scénarios rejoués**, journaux lus, une dérive observée, un garde-fou ajouté.
- **Le vendredi** : le bogue caché (enveloppe) et la passation.

Découpage prévu en semaine 4 :
- la mère fait la mission et l'agent ;
- une fille fait le serveur MCP ;
- une fille fait l'interface de validation ;
- une fille fait les 20 scénarios.
