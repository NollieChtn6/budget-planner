# ADR-0004 : Paramétrage versionné

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Une modification du paramétrage peut s'appliquer au mois en cours ou au mois suivant.

## Décision

Les postes fixes et les enveloppes variables portent des versions datées par `effectiveFrom`.

## Conséquences

- L'historique du paramétrage est conservé.
- La suppression devient un archivage dès qu'il existe un historique.
