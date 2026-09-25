# ADR-0009 : PostgreSQL et Prisma

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

Données financières structurées, fortes contraintes d'intégrité, requêtes historiques prévues en V2 (évolution d'un budget sur plusieurs mois).

## Décision

PostgreSQL avec Prisma ORM, schéma et migrations dans `packages/db`, selon ces règles :
- un modèle Prisma par entité de [`model.md`](../domain/model.md), en `PascalCase`, mappé vers des tables et colonnes en `snake_case` (`@@map`, `@map`) ;
- versions et lignes d'instantané dans des modèles dédiés, avec clé primaire composite (`@@id`) et relations vers le mois et l'élément paramétré ; pas de tableaux JSON pour ces données ;
- montants en `Int` (centimes, [ADR-0001](0001-money-in-cents.md)), soit un plafond d'environ 21 millions d'euros ; `BigInt` est écarté car il complique la sérialisation et les calculs côté JavaScript ;
- mois stockés en `DateTime @db.Date` au premier jour du mois ([ADR-0007](0007-time-representation.md)) ;
- énumérations en enums Prisma, qui génèrent les types TypeScript ;
- source d'une dépense : deux relations optionnelles `envelopeId` et `provisionId` ;
- contraintes non exprimables dans le schéma Prisma ajoutées en SQL dans les migrations (`prisma migrate dev --create-only`, puis édition) : montants positifs, premier jour du mois, exactement une source par dépense ;
- schéma modifié uniquement par migration Prisma ; jamais de `prisma db push` hors développement jetable.

## Conséquences

- L'intégrité est garantie par la base autant que par le domaine.
- Les contraintes SQL ajoutées à la main doivent être vérifiées à chaque nouvelle migration.
