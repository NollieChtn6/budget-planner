# ADR-0010 : Stack et structure du monorepo

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

L'app doit rester simple à héberger et à faire évoluer, tout en isolant strictement le domaine.

## Décision

- **Monorepo pnpm workspaces** :
  - `apps/web` : Next.js (App Router, React, TypeScript strict), UI, Server Components, Server Actions, Route Handlers, authentification ;
  - `packages/domain` : logique métier pure ([ADR-0002](0002-pure-domain.md)) ;
  - `packages/db` : schéma Prisma, migrations, client, conversions de types.
- **Pas de backend séparé** sans besoin identifié. Lecture de données par Server Components, mutations par Server Actions, Route Handlers seulement quand une API HTTP explicite est nécessaire.
- **Zod** : toute donnée venant du client est validée côté serveur, à l'entrée de chaque Server Action et Route Handler.
- **UI** : Tailwind CSS et shadcn/ui.
- **Tests** : Vitest, en priorité sur `packages/domain`, puis sur les comportements importants de `apps/web`.
- **Qualité** : Biome (lint et format), Husky et lint-staged en pre-commit.
- **CI GitHub Actions** sur chaque pull request : installation (`pnpm install --frozen-lockfile`), `prisma generate`, lint, typecheck, tests.

## Conséquences

- La frontière du domaine est garantie par la structure des paquets.
- Les tests du domaine n'ont pas besoin de base ; des tests d'intégration exigeront un service PostgreSQL dans la CI.
