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
| `architecture.md` | Vue d'ensemble technique : paquets, parcours types, responsabilités |
| `../adr/` | Décisions techniques, une par fichier |

Les renvois `R…` pointent vers `rules.md`.

## Parcours utilisateur

L'app a une seule utilisatrice, qui doit s'authentifier pour accéder à ses données (voir `../adr/0008-single-user-authentication.md`).

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
- Elle **enregistre ses versements** vers les provisions, quand elle veut dans le mois ; ils sont prélevés sur le reste à vivre (R37). Un versement supérieur à la cible s'affiche comme une avance, en vert (R19).
- Elle **saisit ses dépenses** : date, lieu, montant, description, catégorie, enveloppe ou provision. Le lieu est autocomplété et propose la catégorie utilisée la dernière fois ; la catégorie propose son enveloppe par défaut.
- Elle **enregistre ses remboursements** (mutuelle…) à leur date de réception : ils s'ajoutent au reste à vivre du mois, sans modifier les budgets (R35). Catégorie obligatoire, dépense d'origine facultative.
- Elle **enregistre ses entrées exceptionnelles** (chèque cadeau…) à leur date de réception : elles s'ajoutent au reste à vivre du mois, non attribuées (R36). Elle peut aussitôt en transférer une partie vers l'épargne ou une provision.
- Elle **transfère de l'argent vers l'épargne** à tout moment du mois : le montant est retiré du reste à vivre (R37).
- Elle **enregistre ses envies converties** : quand elle renonce à un achat, elle met le même montant de côté en indiquant à quoi elle renonce (libellé obligatoire). C'est un transfert vers l'épargne valorisé par l'app (R38).
- Le dashboard affiche pour chaque enveloppe le budget, le consommé, le restant (éventuellement négatif) et un niveau d'alerte coloré accompagné d'un libellé (R16).

### Consommation d'une provision

Quand la dépense prévue arrive (paiement de l'orthodontiste, imprévu), elle est imputée à la provision. Si elle dépasse le solde, l'excédent est affiché comme financé par l'épargne (R22). Une provision à échéance vidée déclenche un choix : clôturer, renouveler ou conserver (R23).

### Clôture du mois

L'utilisatrice clôture le mois : l'app affiche le reliquat de chaque enveloppe variable et le total (R24). Elle le répartit vers l'épargne, des provisions, des enveloppes variables (bonus du mois suivant, R31), ou le laisse sans destination pour qu'il profite au mois suivant (report, R32) (R25). Un reliquat négatif est enregistré comme financé par l'épargne (R30). Le mois est ensuite verrouillé (R26).

En cas d'erreur découverte après coup, elle peut rouvrir le dernier mois clôturé, corriger ses opérations, puis le clôturer à nouveau (R29).

## Écrans V1

- **Connexion**, et gestion des moyens d'authentification.
- **Navigation** : rubriques fixes, sans entrée par mois : Ce mois-ci, Opérations, Provisions, Historique, Statistiques, Paramètres.
- **Ce mois-ci** : toujours le mois actif. Écran d'ouverture s'il n'est pas ouvert ; sinon le dashboard, avec un rappel de clôture quand le mois du calendrier a dépassé le mois actif.
- **Dashboard du mois** : ce qu'il reste ce mois-ci, reste à vivre, remboursements reçus, entrées exceptionnelles, transferts vers l'épargne (lignes distinctes, avec la part des envies converties et leur nombre, R38), marge prévisionnelle, enveloppes variables avec niveau d'alerte, provisions avec progression et statut, pointage.
- **Historique** : mois clôturés groupés par année, avec totaux annuels, dont le total des envies converties (R38) ; chaque mois s'ouvre en lecture seule, et seul le dernier mois clôturé propose la réouverture (R29).
- **Provisions** : une carte par provision, avec versement et dépense directs.
- **Saisie rapide** : dépense, versement, remboursement, entrée exceptionnelle ou transfert vers l'épargne, optimisée pour le mobile.
- **Paramètres** : postes fixes, enveloppes, provisions, catégories.
- **Profil** (`/profile`, depuis l'icône en pied de navigation) : modifier son prénom et son mot de passe ; l'email s'affiche en lecture seule. La gestion du second facteur (codes de secours, réenrôlement) et le changement d'email n'y sont pas proposés.
- **Statistiques** : dépenses nettes par catégorie sur les 3, 6 ou 12 derniers mois, ou tous, avec ou sans le mois en cours (R39). Pour chaque catégorie : montant, part du total et moyenne mensuelle. Lecture seule, sans détail des opérations.
- **Ouverture** et **clôture** du mois.
- **Liste des opérations** d'un mois au choix (mois actif par défaut), avec recherche et filtre par catégorie ; modifiables uniquement pour le mois actif ouvert.

## Périmètre

| Version | Contenu |
|---|---|
| V1 | Tout ce qui précède, statistiques par catégorie (R39), remboursements, entrées exceptionnelles, transferts et envies converties compris (ex-« dépenses évitées » de la V2) |
| V2 | Historique et dashboard multi-mois ; règles automatiques de report des reliquats ; consommation rapportée au temps écoulé dans le mois |
| V3 | Import CSV bancaire ; notifications push ; analyse des tendances par IA |

Hors périmètre : le compte commun (énergie, etc.), géré en dehors de l'app.