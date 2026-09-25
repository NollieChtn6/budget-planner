# CLAUDE.md

## 1. Projet

**Nom technique :** `budget-planner`  
**Nom produit :** à définir

Application de budgétisation personnelle basée sur un système d'enveloppes pour gérer les dépenses fixes, variables et les provisions.

La documentation produit et métier est disponible dans `docs/`.

### Documentation

- `docs/SPEC.md` : périmètre fonctionnel et comportements attendus
- `docs/domain/glossary.md` : vocabulaire ; utiliser les noms de la colonne Code.
- `docs/domain/rules.md` : règles R1 à R30 et exemples E1 à E16. Fait foi.
- `docs/domain/model.md` : entités, relations, cycles de vie.
- `docs/domain/architecture.md` : architecture et décisions techniques.
- `docs/adr/` : décisions techniques, une par fichier ; index dans `docs/adr/README.md`.

Lire uniquement les documents utiles à la tâche. En cas de doute sur une règle, demander plutôt que supposer.

En cas de contradiction ou d'ambiguïté, ne pas supposer. Identifier la source concernée et demander une clarification si nécessaire.

---

## 2. Principes de développement

### Priorités

Toujours privilégier, dans cet ordre :

1. Simplicité
2. Maintenabilité
3. Qualité du code
4. Expérience utilisateur
5. Livraison progressive

Éviter :

- la sur-ingénierie ;
- les abstractions prématurées ;
- les dépendances inutiles ;
- les fonctionnalités non demandées ;
- les optimisations prématurées.

### Règle de périmètre

Ne jamais implémenter une fonctionnalité du backlog futur sans demande explicite.

Le backlog peut contenir des idées ou fonctionnalités potentielles, mais celles-ci ne font pas partie du périmètre courant.

Ne pas implémenter manuellement de la cryptographie ou une gestion de session : utiliser la bibliothèque retenue (ADR-008).

Ne jamais écrire un secret en clair dans le code ou le dépôt.

---

## 3. Stack technique

### Monorepo

- pnpm workspaces

### Application

- Next.js
- App Router
- React
- TypeScript strict

### UI

- Tailwind CSS
- shadcn/ui

Les formulaires doivent utiliser les composants shadcn/ui.

Éviter l'utilisation directe des éléments HTML `input`, `select`, `button`, etc. lorsqu'un composant shadcn/ui équivalent existe.

Les interfaces doivent rester cohérentes sur Firefox, Safari et Chromium.

### Backend

Backend intégré à Next.js.

Privilégier :

- Server Components pour la lecture de données lorsque pertinent ;
- Server Actions pour les mutations lorsque pertinent ;
- Route Handlers lorsqu'une API HTTP explicite est nécessaire.

Ne pas créer de backend séparé sans besoin identifié.

### Base de données

- PostgreSQL
- Prisma ORM

### Authentification

- Better Auth
- Email + mot de passe
- Argon2 pour le hash des mots de passe

Route principale :

- `/sign-in` — connexion

Pas d'inscription pour le moment.

### Validation

- Zod

Toute donnée provenant du client doit être validée côté serveur.

### Tests

- Vitest

Ajouter des tests pour la logique métier et les comportements importants.

### Qualité

- Biome
- Husky
- lint-staged

### CI

GitHub Actions doit au minimum exécuter :

1. installation des dépendances ;
2. lint ;
3. typecheck ;
4. tests.

---

## 4. Architecture et sécurité

L'application est conçue comme une application multi-utilisateurs.

Toute donnée métier appartenant à un utilisateur doit être explicitement liée à cet utilisateur.

Aucune donnée métier ne doit être globale sans justification.

### Identité utilisateur

Le `userId` ne doit jamais être fourni ou considéré comme fiable lorsqu'il provient du client.

Ne jamais utiliser comme source d'identité :

- un champ de formulaire caché ;
- une prop React ;
- un paramètre d'URL ;
- une valeur fournie dans le body d'une requête ;
- toute autre donnée contrôlable par le client.

L'utilisateur courant doit toujours être résolu côté serveur à partir de la session Better Auth.

Les opérations de lecture et d'écriture doivent vérifier que les ressources manipulées appartiennent bien à l'utilisateur courant.

---

## 5. Organisation du code

Respecter les responsabilités définies par l'architecture existante.

Avant de créer une nouvelle abstraction :

1. rechercher une abstraction existante ;
2. vérifier si elle peut être réutilisée ;
3. vérifier si une nouvelle abstraction est réellement nécessaire.

Privilégier des modules petits et cohérents plutôt que des fichiers ou services génériques regroupant plusieurs responsabilités.

### TypeScript

Toujours utiliser TypeScript strict.

Éviter `any`.

Préférer :

- des types explicites ;
- des unions discriminées ;
- `unknown` lorsque le type est réellement inconnu ;
- la validation runtime avec Zod pour les données externes.

### Fonctions

Privilégier des fonctions courtes, avec une responsabilité claire.

Les noms doivent être explicites.

Documenter les choix complexes ou les comportements non évidents.

Ne pas ajouter de commentaires pour expliquer du code évident.

---

## 6. Workflow de développement

Avant d'implémenter une fonctionnalité :

1. Comprendre le besoin utilisateur.
2. Lire la documentation concernée dans `docs/`.
3. Vérifier l'impact sur le modèle de données.
4. Vérifier les règles métier concernées.
5. Rechercher les implémentations existantes pouvant être réutilisées.
6. Proposer une approche lorsque plusieurs solutions raisonnables existent.
7. Identifier les principaux fichiers impactés.
8. Implémenter.
9. Ajouter ou modifier les tests.
10. Mettre à jour la documentation si nécessaire.
11. Vérifier lint, typecheck et tests.

Ne pas effectuer de commit automatiquement.

### Fonctionnalités ambiguës

Si la documentation ou la demande ne permet pas de déterminer clairement le comportement attendu :

- ne pas inventer une règle métier ;
- ne pas déduire un comportement uniquement à partir du nom d'une entité ;
- demander une clarification.

---

## 7. Documentation

La documentation doit rester synchronisée avec le comportement réel de l'application.

Mettre à jour la documentation lorsqu'une modification :

- change une règle métier ;
- introduit ou modifie un concept du domaine ;
- change le périmètre fonctionnel ;
- modifie une décision d'architecture importante.

Ne pas dupliquer inutilement une même règle dans plusieurs documents.

Lorsqu'une règle métier change, mettre à jour sa source de vérité plutôt que de créer une nouvelle règle dans `CLAUDE.md`.

---

## 8. Git workflow

### Branches principales

- `main` = production
- `develop` = intégration et environnement de preview

`main` doit toujours être stable et déployable.

`develop` sert à intégrer et valider les fonctionnalités avant leur passage en production.

Ne jamais travailler directement sur `main` ou `develop`.

### Branches de travail

Toute évolution doit être développée dans une branche dédiée créée à partir de la dernière version de `develop`.

Conventions :

```text
feat/<nom-fonctionnalite>
fix/<nom-correction>
refactor/<nom-sujet>
chore/<nom-tache>
```

Exemples :

```text
feat/add-envelope-form
fix/auth-session-expiration
chore/setup-prisma
```

### Workflow

1. Partir de `develop`.
2. Créer une branche de travail.
3. Développer.
4. Vérifier lint, typecheck et tests.
5. Ouvrir une PR vers `develop` en remplissant le template contenu dans `.github/pull_request_template.md`.
6. Attendre une validation manuelle explicite.
7. Merger dans `develop`.
8. Valider l'intégration.
9. La promotion de `develop` vers `main` suit le workflow automatisé décrit ci-dessous.

---

## 9. CI et déploiement

Seule la promotion d'une branche de travail vers `develop` nécessite une validation manuelle explicite.

Le workflow de production est automatisé :

1. Une PR vers `develop` est validée manuellement avant merge.
2. Une PR de `develop` vers `main` est mergée automatiquement lorsque les checks requis passent.
3. Après le merge sur `main`, Release Please calcule la prochaine version à partir des Conventional Commits et ouvre sa PR de release.
4. La PR de release est mergée automatiquement lorsque ses checks passent.
5. Après publication de la release, `main` est synchronisée automatiquement vers `develop`.

Workflows concernés :

```text
.github/workflows/auto-merge-main.yml
.github/workflows/release.yml
```

### Attention aux workflows GitHub Actions

Un merge effectué avec le `GITHUB_TOKEN` par défaut d'une GitHub Action ne déclenche pas les workflows suivants.

Les workflows nécessitant un déclenchement en chaîne utilisent donc le PAT dédié `RELEASE_PLEASE_TOKEN`.

Ne pas remplacer ce token par le `GITHUB_TOKEN` sans comprendre les conséquences sur le workflow d'automatisation.

---

## 10. Conventional Commits

Le projet suit Conventional Commits.

Préfixes courants :

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Exemples :

```text
feat(auth): add login page
feat(envelope): add envelope creation
fix(transaction): validate transaction amount
test(envelope): add budget calculation tests
chore(ci): configure github actions
```

Le scope doit correspondre au domaine ou composant concerné lorsqu'il apporte de la clarté.

Les commits doivent être rédigés en anglais.

---

## 11. Commits

Avant de créer un commit :

1. Vérifier les fichiers modifiés.
2. Vérifier le diff.
3. Vérifier lint, typecheck et tests.
4. Proposer un message Conventional Commit adapté.
5. Attendre la validation explicite de l'utilisateur.

Ne jamais créer un commit sans validation explicite.

### Git authorship

Les commits doivent être attribués à l'utilisateur du repository.

Ne jamais :

- ajouter Claude comme auteur ;
- ajouter de trailer mentionnant Claude ;
- ajouter de signature indiquant l'utilisation d'une IA ;
- ajouter `Co-authored-by: Claude` ou équivalent.

Avant un commit, vérifier l'identité Git configurée.

---

## 12. Règles de modification

Avant de modifier une partie importante du projet :

- lire les fichiers concernés ;
- comprendre leur rôle ;
- rechercher leurs usages ;
- vérifier les tests existants ;
- vérifier les contraintes documentées dans `docs/`.

Éviter les modifications hors périmètre.

Ne pas modifier une architecture existante uniquement pour appliquer une préférence personnelle.

Toute modification architecturale significative doit être documentée dans `docs/architecture.md`.

---

## 13. Checklist de fin de tâche

Avant de considérer une tâche terminée :

- [ ] fonctionnalité implémentée ;
- [ ] règles métier respectées ;
- [ ] sécurité multi-utilisateur vérifiée ;
- [ ] tests ajoutés ou mis à jour ;
- [ ] documentation mise à jour si nécessaire ;
- [ ] lint OK ;
- [ ] typecheck OK ;
- [ ] tests OK ;
- [ ] aucun changement hors périmètre ;
- [ ] aucun commit créé sans validation explicite.
