# Glossaire

Langage commun du projet. L'interface parle français, le code utilise les noms de la colonne **Code**. Les formules sont dans `rules.md`, la structure dans `model.md`.

## Natures

| Nature | Convention de code | Rôle |
|---|---|---|
| Entité | `PascalCase` | Objet métier doté d'une identité, stocké. |
| Objet valeur | `PascalCase` | Objet sans identité propre, qui n'existe qu'à l'intérieur d'une entité. |
| Énumération | `PascalCase` | Ensemble fermé de valeurs possibles. |
| Valeur d'énumération | `Type.champ = valeur` | Une des valeurs possibles d'un champ. |
| Attribut | `Type.champ` | Donnée stockée d'une entité ou d'un objet valeur. |
| Valeur dérivée | `camelCase` | Donnée calculée à partir d'autres, jamais stockée (ADR-0005), sauf mention « figée ». |
| Action | `camelCase()` | Opération métier, qui deviendra une fonction du domaine. |

## Temps

| Terme | Code | Nature | Définition |
|---|---|---|---|
| Mois budgétaire | `BudgetMonth` | Entité | Mois calendaire servant d'unité de budget, identifié par `AAAA-MM`. |
| Instantané | `MonthSnapshot` | Objet valeur | Copie, pour un mois, des montants de paramétrage en vigueur. Créé à l'ouverture, mis à jour tant que le mois est ouvert par les modifications qui prennent effet au mois en cours (R7), figé à la clôture. Assemblé à partir des trois types de lignes ci-dessous. |
| Ligne de poste fixe | `SnapshotFixedEntry` | Entité | Montant d'un poste fixe pour un mois, avec son pointage (voir Instantané pour sa mise à jour). |
| Budget d'enveloppe | `SnapshotEnvelopeBudget` | Entité | Budget d'une enveloppe variable pour un mois (voir Instantané pour sa mise à jour). |
| Cible de provision | `SnapshotProvisionTarget` | Entité | Cible figée d'une provision pour un mois. |
| Ouverture | `openMonth()` | Action | Démarre un mois : saisie du revenu et création de l'instantané. |
| Clôture | `closeMonth()` | Action | Répartit le reliquat et verrouille le mois. |
| Réouverture | `reopenMonth()` | Action | Déverrouille le dernier mois clôturé pour corriger ses opérations. |
| Version | `FixedEntryVersion`, `VariableEnvelopeVersion` | Entité | Valeur d'un poste fixe ou d'une enveloppe variable à partir d'un mois donné. |
| Date d'effet | `effectiveFrom` | Attribut | Premier mois auquel s'applique une version. |

## Revenus et postes fixes

| Terme | Code | Nature | Définition |
|---|---|---|---|
| Revenu du mois | `BudgetMonth.income` | Attribut | Salaire affecté à un mois budgétaire. |
| Poste fixe | `FixedEntry` | Entité | Montant récurrent chaque mois, sans saisie de dépense. |
| Charge | `FixedEntry.type = charge` | Valeur d'énumération | Poste fixe de dépense : loyer, abonnements, mutuelle, assurance. |
| Épargne programmée | `FixedEntry.type = scheduledSaving` | Valeur d'énumération | Poste fixe de versement vers l'épargne : assurance vie, livret. |
| Pointage | `SnapshotFixedEntry.status` | Attribut | État d'un poste fixe dans un mois : programmé (`planned`) ou effectué (`done`). Pour une provision, le pointage est dérivé de ses versements (R28). |
| Reste à vivre | `disposableIncome` | Valeur dérivée | Ce qui reste du revenu une fois les postes fixes déduits. |

## Enveloppes variables

| Terme | Code | Nature | Définition |
|---|---|---|---|
| Enveloppe variable | `VariableEnvelope` | Entité | Budget mensuel consommé par les dépenses : Vie quotidienne, Sorties et loisirs, Achats plaisir. |
| Mode | `VariableEnvelopeVersion.mode` | Attribut | Manière de fixer le budget : montant (`amount`) ou pourcentage (`percentage`). |
| Base de répartition | `allocationBase` | Valeur dérivée | Montant auquel s'appliquent les pourcentages. |
| Non attribué | `unallocated` | Valeur dérivée | Part de la base de répartition non couverte par les pourcentages. |
| Marge prévisionnelle | `forecastMargin` | Valeur dérivée | Indicateur de faisabilité des objectifs du mois. |
| Taux de consommation | `usageRate` | Valeur dérivée | Part du budget d'une enveloppe déjà dépensée. |
| Niveau d'alerte | `AlertLevel` | Énumération | Palier coloré dérivé du taux de consommation : `ok`, `watch`, `caution`, `warning`, `critical`, `exceeded`. |
| Reliquat | `leftover` | Valeur dérivée | Restant d'une enveloppe variable à la clôture. |

## Provisions

| Terme | Code | Nature | Définition |
|---|---|---|---|
| Provision | `Provision` | Entité | Enveloppe alimentée par des versements pour financer une dépense future. |
| Provision à échéance | `Provision.type = deadline` | Valeur d'énumération | Provision à constituer sur une durée donnée, pour une dépense datée. Ex. : orthodontie, vacances. |
| Réserve | `Provision.type = reserve` | Valeur d'énumération | Provision sans échéance, maintenue à un plafond et réalimentée après usage. Ex. : Imprévus, coussin vétérinaire. |
| Objectif | `Provision.target` | Attribut | Montant à atteindre (échéance) ou plafond (réserve). |
| Durée | `Provision.durationMonths` | Attribut | Nombre de mois de constitution d'une provision à échéance. |
| Mensualité | `Provision.monthlyAmount` | Attribut | Montant mensuel choisi pour réalimenter une réserve. |
| Mois d'échéance | `dueMonth` | Valeur dérivée | Dernier mois de constitution, qui est aussi le mois de la dépense prévue. |
| Cible du mois | `monthlyTarget` | Valeur dérivée, figée | Montant à verser sur une provision pendant un mois ; calculée à l'ouverture et conservée dans `SnapshotProvisionTarget.target`. |
| Solde | `balance` | Valeur dérivée | Montant actuellement disponible dans une provision. |
| Avance | `surplus` | Valeur dérivée | Part des versements du mois qui dépasse la cible. |
| En retard | `Provision.status = late` | Valeur d'énumération | Provision à échéance dont le mois d'échéance est passé sans qu'elle soit complète ni consommée. |
| Prolonger | `extend()` | Action | Repousse le mois d'échéance d'une provision. |
| Renouveler | `renew()` | Action | Démarre un nouveau cycle identique à la suite d'une provision consommée. Ex. : orthodontie semestre 4. |

## Opérations

| Terme | Code | Nature | Définition |
|---|---|---|---|
| Dépense | `Expense` | Entité | Sortie d'argent imputée à une enveloppe variable ou à une provision. |
| Lieu | `Expense.place` | Attribut | Commerce ou endroit de la dépense, utilisé pour l'autocomplétion. |
| Catégorie | `Category` | Entité | Axe d'analyse d'une dépense (maison, restaurant, vêtements…), indépendant de l'enveloppe. |
| Enveloppe par défaut | `Category.defaultEnvelopeId` | Attribut | Enveloppe proposée automatiquement pour une catégorie. |
| Versement | `Contribution` | Entité | Somme mise de côté dans une provision. |
| Financé par l'épargne | `Expense.savingsDraw` / `savingsDraw` | Attribut / Valeur dérivée | Part d'une dépense sur provision qui excède son solde (attribut de la dépense), ou reliquat négatif d'un mois à sa clôture (valeur dérivée du mois). |
| Répartition du reliquat | `LeftoverAllocation` | Entité | Affectation du reliquat, à la clôture, vers l'épargne ou une provision. |
| Archiver | `archive()` | Action | Retire un élément du paramétrage sans effacer son historique. |
