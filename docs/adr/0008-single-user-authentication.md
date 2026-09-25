# ADR-0008 : Mono-utilisatrice, authentification obligatoire

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

L'app n'a qu'une utilisatrice, mais elle contient des données financières et est hébergée.

## Décision

- **Un seul compte**, sans inscription publique : pas de route `/sign-up`, inscription désactivée dans Better Auth. Le compte est créé par un script d'initialisation exécuté côté serveur. Seule la route `/sign-in` est exposée.
- **Better Auth**, email et mot de passe. Aucune implémentation maison de la cryptographie ou des sessions.
- **Mot de passe haché en Argon2id**, via les fonctions de hachage et de vérification personnalisées de Better Auth (bibliothèque `@node-rs/argon2`) ; le hachage par défaut n'est pas utilisé.
- **Second facteur obligatoire** : plugin two-factor de Better Auth (TOTP), avec codes de secours servant de procédure de récupération.
- **Sessions** dans des cookies `HttpOnly`, `Secure`, `SameSite`, avec expiration et révocation.
- **Protection CSRF** sur les requêtes qui modifient des données, et **limitation des tentatives** de connexion.
- **HTTPS uniquement** ; secrets dans des variables d'environnement, jamais dans le dépôt.
- L'authentification reste **hors du domaine** : `packages/domain` n'a pas de notion d'utilisateur.

## Conséquences

- Un peu de complexité dès la V1, mais l'app peut être hébergée sans exposer les données.
- Passer à plusieurs comptes resterait possible sans toucher au domaine.
