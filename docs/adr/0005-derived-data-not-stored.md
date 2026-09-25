# ADR-0005 : Données dérivées non stockées

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Stocker un solde à côté des opérations qui le produisent crée un risque d'incohérence.

## Décision

Soldes, restants et indicateurs sont recalculés à partir des opérations et de l'instantané. Seule exception : la cible du mois, figée à l'ouverture ([ADR-0003](0003-monthly-snapshot.md)).

## Conséquences

- Volumes faibles, donc coût négligeable.
- Mise en cache possible plus tard si besoin.
