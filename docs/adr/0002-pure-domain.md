# ADR-0002 : Domaine pur

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Les règles métier sont le cœur de l'app et doivent pouvoir être testées isolément.

## Décision

`packages/domain` ne dépend ni de l'UI, ni du stockage, ni du framework : il reçoit des données et renvoie des résultats. Isolé dans son propre paquet ([ADR-0010](0010-stack-and-monorepo.md)), il ne peut pas importer Next.js, React ni Prisma.

## Conséquences

- Chaque règle de [`rules.md`](../domain/rules.md) est testable sans infrastructure ; ses exemples deviennent des tests unitaires.
