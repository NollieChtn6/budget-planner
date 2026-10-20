# ADR-0008 : Mono-utilisatrice, authentification obligatoire

- **Statut** : acceptée
- **Date** : 2026-09-24

## Contexte

L'app n'a qu'une utilisatrice, mais elle contient des données financières et est hébergée.

## Décision

- **Un seul compte**, sans inscription publique : pas de route `/sign-up`, inscription désactivée dans Better Auth (`disableSignUp: true`). Le compte est créé par l'un des deux mécanismes suivants, tous deux via l'API interne de Better Auth plutôt que son endpoint de sign-up, et tous deux refusant la création si un compte existe déjà (quel que soit l'email, pas seulement en cas de doublon) :
  - `scripts/create-user.ts`, exécuté côté serveur, pour les hébergements avec accès shell. Invite le mot de passe en saisie masquée (jamais en variable d'environnement ni en argument).
  - `/setup`, pour les hébergements sans accès shell (ex. plateformes serverless). Protégée par un jeton `SETUP_TOKEN` (variable d'environnement distincte du mot de passe du compte, générée par l'opérateur avec une entropie suffisante, ex. `openssl rand -hex 32`), transmis en paramètre d'URL (`/setup?token=...`) puis revalidé côté Server Action à la soumission — la page affichée n'est jamais considérée comme une preuve suffisante de possession du jeton. Fail-closed : `SETUP_TOKEN` absent, jeton invalide, ou compte déjà existant → `notFound()`, sans message distinctif qui confirmerait l'existence de la route. Pas de rate-limiting dédié sur les tentatives de jeton invalide : la protection repose sur l'entropie du jeton et sur la désactivation définitive de la route une fois le compte créé.

  Dans les deux cas, `emailVerified` est marqué à `true` (aucun flux de vérification par e-mail n'existe). Seules les routes `/sign-in` et `/setup` sont exposées publiquement ; `/setup` ne reste fonctionnelle que tant qu'aucun compte n'existe.
- **Better Auth**, email et mot de passe. Aucune implémentation maison de la cryptographie ou des sessions. Le schéma Prisma suit le modèle standard de Better Auth : `User` (profil — `name`, `email`, `emailVerified`, `twoFactorEnabled`…), `Account` (identifiants de connexion, dont le mot de passe haché), `Session`, `Verification`, `TwoFactor`. Le mot de passe n'est donc jamais stocké sur `User`. Le champ `name` sert de prénom ; pas de champ dédié.
- **Identifiants en UUID** pour les tables d'authentification uniquement (`advanced.database.generateId: "uuid"` côté Better Auth, qui génère l'UUID côté serveur Node via `crypto.randomUUID()` ; `@id @default(dbgenerated("gen_random_uuid()"))` côté Prisma pour les insertions faites hors de Better Auth) ; ce choix ne s'étend pas aux entités du domaine, qui restent hors de ce périmètre.
- Schéma Prisma écrit à la main (le générateur `@better-auth/cli` s'est révélé incompatible avec la version de `better-auth` utilisée), en suivant exactement les définitions de champs et index du paquet installé, puis migré selon le flux habituel de [ADR-0009](0009-postgresql-and-prisma.md) (`prisma migrate dev --create-only`, revue, application).
- **Mot de passe haché en Argon2id**, via les fonctions de hachage et de vérification personnalisées de Better Auth (bibliothèque `@node-rs/argon2`) ; le hachage par défaut n'est pas utilisé.
- **Second facteur obligatoire** : plugin two-factor de Better Auth (TOTP), avec codes de secours servant de procédure de récupération. L'enrôlement n'a pas lieu à la création du compte (peu adapté à un script terminal, qui ne peut pas afficher de QR code exploitable) mais à la première connexion : tant que `twoFactorEnabled` est faux, `proxy.ts` redirige vers un écran d'enrôlement forcé (`/enroll-2fa`) plutôt que vers le tableau de bord. Aux connexions suivantes, Better Auth suspend la session le temps de la vérification du second facteur (elle n'existe qu'après un code valide) : l'écran `/verify-2fa` gère ce défi via le cookie temporaire dédié de Better Auth, sans session, et accepte aussi un code de secours.
- **Profil** (`/profile`) : le prénom (`User.name`) et le mot de passe se modifient depuis l'application, via `auth.api.updateUser` et `auth.api.changePassword` appelés par des Server Actions (session résolue côté serveur). Le changement de mot de passe exige le mot de passe actuel, impose un nouveau mot de passe différent (8 à 128 caractères, schéma partagé avec `/setup`) et révoque les autres sessions. L'email n'est pas modifiable (aucun flux de vérification) et le second facteur n'est pas géré depuis cet écran.
- **Récupération en cas de perte totale** (mot de passe et second facteur) : `scripts/reset-2fa.ts`, exécuté manuellement côté serveur, supprime la ligne `TwoFactor` et repasse `twoFactorEnabled` à faux pour forcer un nouvel enrôlement à la prochaine connexion. Pas de flux « mot de passe oublié » par e-mail pour l'instant ; une perte du mot de passe seul se traite par accès direct au serveur.
- **Sessions** dans des cookies `HttpOnly`, `Secure`, `SameSite`, avec expiration et révocation ; durées et règles par défaut de Better Auth, non modifiées.
- **Protection CSRF** sur les requêtes qui modifient des données : couverte par la vérification d'origine intégrée aux Server Actions Next.js et par `trustedOrigins` de Better Auth, sans code supplémentaire. **Limitation des tentatives** de connexion : limiteur intégré de Better Auth, valeurs par défaut non modifiées.
- **HTTPS uniquement** ; secrets dans des variables d'environnement, jamais dans le dépôt. `BETTER_AUTH_URL` doit être fixé en production (domaine réel) ; en local, le laisser non défini pour que Better Auth déduise l'origine de confiance de chaque requête plutôt que de dépendre d'un port fixe.
- L'authentification reste **hors du domaine** : `packages/domain` n'a pas de notion d'utilisateur.

## Conséquences

- Un peu de complexité dès la V1, mais l'app peut être hébergée sans exposer les données.
- Passer à plusieurs comptes resterait possible sans toucher au domaine.
- Trois mécanismes de provisioning/récupération à maintenir : `scripts/create-user.ts`, `/setup` (avec son jeton `SETUP_TOKEN`), `scripts/reset-2fa.ts`.
- Un secret `SETUP_TOKEN` supplémentaire à configurer avant le premier déploiement sans accès shell ; sans impact une fois le compte créé, la route se désactivant alors définitivement.
