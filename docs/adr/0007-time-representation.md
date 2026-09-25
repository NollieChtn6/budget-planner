# ADR-0007 : Représentation du temps

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Les calculs de budget raisonnent en mois et en jours, pas en instants ; les fuseaux horaires ne font qu'introduire des erreurs.

## Décision

Un mois est une valeur `AAAA-MM` ; les dates d'opérations sont des dates calendaires sans heure ni fuseau.

## Conséquences

- Prisma renvoie des `Date` JavaScript : la conversion se fait uniquement dans `packages/db`.
- Le domaine ne manipule jamais d'objet `Date`.
