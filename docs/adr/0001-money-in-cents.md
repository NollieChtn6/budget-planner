# ADR-0001 : Montants en centimes entiers

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Les nombres à virgule flottante produisent des erreurs d'arrondi incompatibles avec un budget.

## Décision

Tout montant est un entier en centimes, du stockage aux calculs. La conversion en euros n'a lieu qu'à l'affichage et à la saisie.

## Conséquences

- Un type dédié `Money` (ou équivalent) centralise la conversion et l'arrondi.
- En base, un `Int` suffit ([ADR-0009](0009-postgresql-and-prisma.md)).
