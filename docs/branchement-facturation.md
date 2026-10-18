# Brancher groma sur un outil de facturation

groma ne facture pas, et ne le fera pas : un outil dédié fait déjà les devis, les factures, la TVA et, depuis septembre 2026, la facture électronique. groma connaît ce que l'outil de facturation ignore : **quand** facturer et **à qui**. Ce document décrit ce qui est prêt, et comment brancher les deux.

## Ce qui est prêt

**1. Un client identifié sans ambiguïté.** « Vérifier l'entreprise » rattache le client à son SIREN dans le registre public. Un outil de facturation crée ou retrouve le client par ce numéro, sans doublon (« Dupont SARL » et « SARL Dupont » donnent la même entreprise). Une facture électronique exige d'ailleurs le SIREN du client professionnel.

**2. Les jalons de facturation**, calculés par groma (`lib/facturation-regles.ts`, testés) :

| Le chantier est… | Prochain jalon |
| --- | --- |
| signé ou planifié | facture d'acompte |
| en cours | situation de travaux, selon l'avancement |
| en réception, PV pas encore signé | solde, en attente du PV |
| en réception, PV signé | **facture de solde**, datée du PV |
| clos, moins d'un an après le PV | libération de la retenue de garantie (date calculée) |
| clos, un an passé, réserves encore ouvertes | retenue de garantie bloquée par les réserves |

**3. L'export** : Réglages, « Exporter pour la facturation (CSV) », gérant seulement. Un fichier par point-virgule, lisible dans Excel et importable dans la plupart des outils.

| Colonne | Contenu |
| --- | --- |
| `reference` | référence groma du chantier (CH-2026-0042), à reporter sur la facture |
| `chantier`, `statut` | nom et étape du chantier |
| `client` | le client tel que saisi |
| `client_raison_sociale`, `client_siren`, `client_siret`, `client_adresse` | le client tel que le registre le connaît (vide si non vérifié) |
| `chantier_adresse`, `chantier_code_postal`, `chantier_ville` | l'adresse des travaux (mention obligatoire sur une facture de travaux) |
| `montant_ht` | le montant du devis, hors taxes |
| `debut_prevu`, `fin_prevue` | les dates prévues |
| `reception_le`, `pv_signe` | la date de réception, et si le PV est signé |
| `reserves_ouvertes` | le nombre de réserves non levées |
| `retenue_liberable_le` | un an après la réception |
| `prochain_jalon`, `prochain_jalon_date` | ce qu'il faut facturer maintenant |

**4. Les courriels qui déclenchent la facture** : à la signature du PV, le gérant reçoit « PV de réception signé : la facture de solde peut partir ».

## Comment brancher, en trois temps

**Maintenant : l'import.** On exporte le CSV et on l'importe dans l'outil (clients, puis chantiers ou affaires). Aucun développement de l'autre côté. C'est ce que permettent la plupart des logiciels du bâtiment.

**Ensuite : l'appel direct.** Quand l'outil est choisi, groma l'appelle lui-même au moment du jalon : à la signature du PV, il crée le brouillon de la facture de solde dans l'outil. Il faut pour cela que l'outil ait une API et une clé, que la clé soit rangée dans Vercel comme les autres, et qu'on écrive une tranche par outil. Le point d'accroche existe déjà : les actions `signerPv` et `avancerChantier`, et la machine de nuit pour la retenue de garantie.

**La facture électronique.** Elle passe obligatoirement par une plateforme agréée par l'administration fiscale. groma ne doit pas en devenir une : c'est l'outil de facturation qui s'en charge. groma lui fournit des données propres (SIREN, adresse des travaux, référence, montant HT).

## Ce qu'il reste à décider

- **L'outil.** Le choix détermine le format d'import et l'API.
- **Le taux de TVA par chantier** : 20 %, 10 % en rénovation d'un logement de plus de deux ans, 5,5 % en rénovation énergétique. groma ne le connaît pas encore. Ce serait un champ du chantier, à poser en même temps que le branchement direct.
- **Les pourcentages** d'acompte et de retenue de garantie (5 % au plus). Ce sont des paramètres de l'outil de facturation, pas de groma.
