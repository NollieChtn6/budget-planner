# ADR-0011 : `userId` explicite en paramètre des repositories

- **Statut** : acceptée
- **Date** : 2026-09-29

## Contexte

Toute donnée métier appartient à l'utilisatrice et doit être vérifiée à la lecture comme à l'écriture (CLAUDE.md). Mais [ADR-0008](0008-single-user-authentication.md) garde l'authentification hors du domaine, et `packages/db` ne dépend ni de Next.js ni de Better Auth ([ADR-0002](0002-pure-domain.md), [ADR-0010](0010-stack-and-monorepo.md)) : `requireSession()` (`apps/web/lib/session.ts`) utilise `next/headers`, donc `packages/db` ne peut pas l'appeler lui-même pour résoudre l'identité.

## Décision

- Chaque table métier appartenant à l'utilisatrice porte une colonne `userId` (clé étrangère vers `users.id`, indexée).
- Chaque fonction de repository de `packages/db` qui lit ou écrit une telle ressource prend un `userId` en paramètre obligatoire (premier paramètre, par convention) et l'inclut dans toute clause `WHERE` (lecture, mise à jour, suppression) et toute valeur insérée (création). Le repository ne résout jamais lui-même l'identité et ne l'infère jamais d'une autre valeur.
- `apps/web` est seul responsable de produire ce `userId` : chaque Server Action ou page appelle `requireSession()`, puis transmet `session.user.id` au repository. Un `userId` ne provient jamais d'un formulaire, d'une prop ou d'un paramètre d'URL.

## Conséquences

- Signature un peu plus verbeuse pour chaque fonction de repository, mais aucune ambiguïté sur la provenance de l'identité : un oubli de filtrage devient une erreur de compilation (paramètre manquant) plutôt qu'une fuite silencieuse entre comptes.
- `packages/db` reste indépendant de Next.js et de Better Auth.
- Passer à plusieurs comptes ([ADR-0008](0008-single-user-authentication.md)) ne changerait rien à ce contrat : le filtrage par utilisateur est déjà explicite partout.
