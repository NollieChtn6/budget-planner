# Budget par enveloppes : spécification produit

## Objectif

Répartir chaque mois le revenu entre postes fixes, enveloppes variables et provisions, suivre les dépenses au quotidien et être alertée avant de dépasser, afin de ne plus puiser dans l'épargne pour des dépenses prévisibles.

## Documents de référence

Ce document décrit **ce que fait l'app et pour qui**. Le reste est ailleurs :

| Document | Rôle |
|---|---|
| `domain/glossary.md` | Vocabulaire, et nom de chaque concept dans le code |
| `domain/rules.md` | Règles métier, formules et exemples chiffrés (base des tests) |
| `domain/model.md` | Entités, relations et cycles de vie |
| `domain/architecture.md` | Vue d'ensemble technique : paquets, parcours types, responsabilités |
| `adr/` | Décisions techniques, une par fichier |

Les renvois `R…` pointent vers `rules.md`.

## Parcours utilisateur

L'app a une seule utilisatrice, qui doit s'authentifier pour accéder à ses données (voir `adr/0008-single-user-authentication.md`).

### Paramétrage initial

Au premier lancement, le dashboard est vide. L'utilisatrice paramètre :
- ses **postes fixes**, typés charge ou épargne programmée ;
- ses **enveloppes variables**, chacune en montant fixe ou en pourcentage (R10, R12) ;
- ses **provisions**, à échéance ou en réserve (R17 à R21) ;
- ses **catégories**, chacune avec une enveloppe par défaut.

Tout peut être ajouté, modifié ou supprimé à tout moment. Une modification demande sa date d'effet (R7).

### Ouverture du mois

Au premier accès d'un mois non ouvert, l'app propose de l'ouvrir, à condition que le mois précédent soit clôturé (R4). L'utilisatrice saisit le revenu du mois (R4). L'app fige l'instantané du mois (R5) et affiche : reste à vivre, budget de chaque enveloppe variable, cible de chaque provision, marge prévisionnelle (R14), et la liste des postes fixes et provisions à pointer.

### Au fil du mois

- Elle **pointe** les postes fixes quand les prélèvements ou virements sont passés (R27).
- Elle **enregistre ses versements** vers les provisions. Un versement supérieur à la cible s'affiche comme une avance, en vert (R19).
- Elle **saisit ses dépenses** : date, lieu, montant, description, catégorie, enveloppe ou provision. Le lieu est autocomplété et propose la catégorie utilisée la dernière fois ; la catégorie propose son enveloppe par défaut.
- Le dashboard affiche pour chaque enveloppe le budget, le consommé, le restant (éventuellement négatif) et un niveau d'alerte coloré accompagné d'un libellé (R16).

### Consommation d'une provision

Quand la dépense prévue arrive (paiement de l'orthodontiste, imprévu), elle est imputée à la provision. Si elle dépasse le solde, l'excédent est affiché comme financé par l'épargne (R22). Une provision à échéance vidée déclenche un choix : clôturer, renouveler ou conserver (R23).

### Clôture du mois

L'utilisatrice clôture le mois : l'app affiche le reliquat de chaque enveloppe variable et le total (R24). Elle le répartit vers l'épargne ou des provisions (R25). Un reliquat négatif est enregistré comme financé par l'épargne (R30). Le mois est ensuite verrouillé (R26).

En cas d'erreur découverte après coup, elle peut rouvrir le dernier mois clôturé, corriger ses opérations, puis le clôturer à nouveau (R29).

## Écrans V1

- **Connexion**, et gestion des moyens d'authentification.
- **Dashboard du mois** : reste à vivre, marge prévisionnelle, enveloppes variables avec niveau d'alerte, provisions avec progression et statut, pointage.
- **Saisie rapide** : dépense ou versement, optimisée pour le mobile.
- **Paramètres** : postes fixes, enveloppes, provisions, catégories.
- **Ouverture** et **clôture** du mois.
- **Liste des opérations** du mois, modifiables tant que le mois est ouvert.

## Périmètre

| Version | Contenu |
|---|---|
| V1 | Tout ce qui précède |
| V2 | Historique et dashboard multi-mois ; règles automatiques de report des reliquats ; remboursements (mutuelle) ; « dépenses évitées » ; consommation rapportée au temps écoulé dans le mois |
| V3 | Import CSV bancaire ; notifications push ; analyse des tendances par IA |

Hors périmètre : le compte commun (énergie, etc.), géré en dehors de l'app.
