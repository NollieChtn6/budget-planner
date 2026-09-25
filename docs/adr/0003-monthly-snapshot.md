# ADR-0003 : Instantané mensuel

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Modifier le paramétrage ne doit pas réécrire les mois passés.

## Décision

L'ouverture d'un mois copie le paramétrage en vigueur dans les lignes d'instantané du mois (voir [`model.md`](../domain/model.md)). Elles sont la seule source des calculs du mois. Tant que le mois est ouvert, une modification qui prend effet au mois en cours met à jour ces lignes ([R7](../domain/rules.md)) ; à la clôture, elles sont figées.

## Conséquences

- Un peu de duplication de données, en échange de mois clôturés immuables.
