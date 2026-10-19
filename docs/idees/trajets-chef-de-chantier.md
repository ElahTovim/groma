# Idée pour la semaine 4 · le trajet raconté au chef de chantier

19 octobre 2026 · demande de Kerguelenn, mise de côté pour la semaine 4 (l'agent).

## Le besoin

Le chef de chantier parle comme sur le terrain :

> « Mon responsable habite à Évreux, le chantier est à Paris 1er, il doit passer au Castorama de Montrouge avant. »

groma doit en déduire le trajet complet, étape par étape, avec les temps, et **dire ce qui compte** : ce qui est du temps de travail, ce qui ouvre droit à une indemnité, ce qui ne compte pas.

## Pourquoi c'est un agent, et pas un formulaire

Il faut comprendre une phrase libre, retrouver des lieux (« le Castorama de Montrouge » n'est pas une adresse), enchaîner plusieurs calculs, puis appliquer des règles. C'est le travail de l'agent de la semaine 4 : il lit, appelle des outils, et propose. Il n'enregistre rien sans validation.

## Ce que l'agent ferait

1. **Comprendre** la demande : le point de départ (domicile d'une personne, dépôt, chantier précédent), les étapes (fournisseur, magasin, autre chantier), l'arrivée, l'heure si elle est donnée.
2. **Retrouver les lieux** :
   - une adresse : API Adresse (sans clé) ;
   - un fournisseur connu : sa fiche Sirene dans groma ;
   - un magasin par son nom et sa ville (« Castorama Montrouge ») : il faut un service de lieux. OpenStreetMap (Nominatim) est gratuit, avec des limites d'usage ; la recherche d'entreprises par nom et commune via le registre Sirene est une autre piste, sans clé. À choisir.
   - En cas de doute (deux Castorama possibles), l'agent **demande** au lieu de deviner.
3. **Calculer l'itinéraire avec ses étapes** : le calcul de l'IGN accepte des points intermédiaires. On obtient des km et des minutes par tronçon, et le total. On peut ajouter un temps d'arrêt par étape, par exemple 20 minutes au magasin, en réglage.
4. **Dire ce qui compte** (règles à vérifier avec un juriste ou la convention collective, et à garder en paramètres) :
   - le trajet domicile → premier lieu de travail n'est en principe pas du temps de travail effectif, mais il ouvre droit aux indemnités de trajet et de transport (zones du BTP) ;
   - un détour imposé par l'employeur, comme le passage chez un fournisseur pour prendre du matériel, compte en principe comme temps de travail ;
   - au-delà d'un seuil, on bascule en grand déplacement.
5. **Proposer, puis faire valider** : afficher le trajet (étapes, horaires, temps qui comptent) ; puis, sur validation seulement, l'enregistrer sur le lot ou le chantier, ou l'envoyer au responsable.

## Les données et la vie privée

- **Le domicile d'une personne est une donnée personnelle.** Deux choix : soit il n'est jamais enregistré, et seulement dit dans la demande ; soit il l'est sur le compte de la personne, visible d'elle et du gérant seulement. À décider. Le premier est le plus simple et le plus sûr.
- Les adresses des magasins et des fournisseurs ne posent pas de problème.

## Ce qui existe déjà et servira

- La carte « Livraisons et trajets » (piste D) : itinéraire IGN, cache des trajets, zones de déplacement, jours ouvrés.
- Le profil de l'entreprise (Réglages) : le dépôt. À compléter par le SIREN de l'entreprise (« Vérifier mon entreprise »), qui remplirait le nom officiel et le siège.
- La couche opérations : l'agent passera par elle, avec les droits du chef de chantier.

## Pour la mission de l'agent (semaine 4)

- **Déclencheur** : une demande du chef de chantier, écrite ou dictée.
- **Outils** : chercher un lieu, calculer un itinéraire à étapes, lire le chantier et ses lots, lire les règles de temps.
- **Sortie vérifiable** : un trajet chiffré, étape par étape, avec ses sources (adresse trouvée, service d'itinéraire).
- **Arrêt** : un lieu introuvable ou ambigu, il demande ; trop d'étapes, il refuse.
- **Validation humaine** : avant tout enregistrement ou tout envoi.
