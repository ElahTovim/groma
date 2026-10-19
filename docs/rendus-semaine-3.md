# Semaine 3 · les rendus

groma · Kerguelenn · octobre 2026

## 1. Les fonctions IA, et ce que voit l'utilisateur quand le modèle se trompe

Règle commune : **rien de ce que dit le modèle n'est appliqué sans un clic humain.** Le modèle est appelé depuis le serveur seulement (`lib/ia.ts`), sa réponse doit entrer dans un format fixé, et tout ce qu'on lui donne à lire est encadré comme une donnée, jamais comme une consigne.

| Fonction | Ce que fait le modèle | Quand il se trompe, l'utilisateur voit… |
| --- | --- | --- |
| **Lire un courrier** (flux ou déposé) | remplit expéditeur, société, référence du chantier, date, catégorie, montant | chaque champ marqué « proposé par l'IA » ; un champ qu'il a inventé, ou qui est impossible (date improbable, montant en lettres, référence absente du texte), est **vidé par groma** avec la raison dans l'encadré « à relire » ; un champ absent du courrier s'affiche « absent du courrier ». La personne corrige avant de valider. |
| **Classer** | choisit une catégorie dans une liste fermée | une catégorie hors liste est refusée ; la catégorie reste modifiable. |
| **Résumer** | résume le courrier en quelques lignes | le résumé est à côté du texte d'origine : l'écart se voit, le résumé se corrige. |
| **Proposer un brouillon** | rédige une réponse | le brouillon n'est **jamais envoyé** : on le relit, on le copie. |
| **Repérer une consigne cachée** | signale un texte qui donne des ordres à un assistant | l'encadré « consigne adressée à un assistant » cite le passage ; le courrier reste à relire. Si le modèle ne l'a pas vue, groma la repère aussi de son côté. |
| **Répondre à une question sur les documents** | répond en citant [document, p. N] | chaque citation est vérifiée contre les passages réellement fournis : une source inventée est marquée **« source introuvable : à vérifier »** ; la section **« À vérifier »** liste l'incertain ; un lien ouvre le document à la page citée. Si rien n'est pertinent, groma répond « Je ne trouve pas cela dans les documents » sans appeler le modèle. |
| **Analyser la nuit** *(piste C, en cours)* | relève tendances et anomalies dans les événements de la nuit | une référence de chantier inventée est retirée et signalée ; une consigne glissée dans le flux est signalée comme anomalie, jamais suivie ; l'analyse est une lecture, elle ne déclenche rien. |

Et si le modèle ne répond pas (panne, plafond atteint) : l'écran le dit (« L'IA ne répond pas pour l'instant », « plafond atteint »), le courrier reste à relire sans champs, et tout le reste de groma fonctionne.

**Le bilan juste, corrigé, inventé** *(piste A2, en cours)* : pour chaque courrier validé, groma compare la proposition du modèle à la version validée et compte les champs justes, corrigés, inventés, manqués. C'est le compte de la démo.

## 2. Le coût par appel et par mois

*(À compléter avec les chiffres réels de la production, une fois la piste C en ligne : page Machine de nuit, section « Ce que l'IA a coûté ».)*

Ce qui est déjà mesuré : chaque appel est inscrit dans `appels_ia` (jetons d'entrée, de sortie, en cache, coût en euros, durée, réussi ou non). Premiers chiffres relevés sur la prévisualisation :

| Appel | Modèle | Coût observé |
| --- | --- | --- |
| Indexer les 20 documents (52 passages) | voyage-3.5 | 0,03 centime, une seule fois (puis 0 : rien n'est recalculé) |
| Vectoriser une question | voyage-3.5 | moins d'un millième de centime |
| Rédiger une réponse citée | claude-sonnet-5-5 | 0,8 centime |

Plafonds : 100 appels par personne et par jour, 20 000 caractères par demande, 10 € par mois au total (réglable). Au-delà, l'IA se met en pause, le reste fonctionne. Tarifs indicatifs dans `lib/ia-regles.ts`, à vérifier sur les pages de prix.

## 3. Le moment où l'IA a tourné en rond

**La prévisualisation qui refusait de se construire.**

Pour essayer chaque nouvelle fonction, chaque branche du projet reçoit sa propre prévisualisation, avec sa propre copie de la base de données. Un soir, une prévisualisation a échoué avec un message laconique : « Resource provisioning failed ». Pas une ligne de code en cause, pas de journal de construction : elle échouait avant même de commencer.

L'IA a d'abord fait ce qu'elle sait faire : relancer, relire le code, vérifier la configuration de Vercel. Même erreur. Elle a tenté de se connecter à Neon pour regarder de plus près : l'autorisation expirait au bout d'une minute, puis la base n'apparaissait pas dans le compte Neon, parce qu'elle avait été créée par Vercel, dans un espace à part. Trois tours sans progrès.

La sortie est venue en changeant de question : non plus « qu'est-ce qui est cassé dans le code ? », mais « qu'est-ce qui a changé depuis la dernière prévisualisation réussie ? ». Réponse : le nombre de branches. Chaque branche crée une copie de la base chez Neon, et l'offre gratuite en accepte dix. Nous en avions douze. Supprimer les copies des branches déjà fusionnées a suffi.

La leçon, appliquée depuis :
- Quand une erreur ne dit rien, compter ce qui a changé plutôt que relire le code.
- Au plus quatre branches ouvertes à la fois.
- Le ménage des copies Neon après chaque fusion.
- La règle de `AGENTS.md` : trois correctifs sans progrès, on s'arrête et on redécoupe.

Le problème est revenu une seconde fois, quand quatre sessions travaillaient en parallèle : il a été reconnu en une minute.
