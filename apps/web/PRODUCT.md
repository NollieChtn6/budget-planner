# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Une seule personne par instance (compte unique, ADR-0008), qui gère son propre budget mensuel. Elle saisit surtout ses opérations depuis son téléphone, juste après un achat, au fil du mois. La revue et les corrections se font plutôt sur ordinateur.

## Product Purpose

Pécule est une application de budget personnel par enveloppes. Elle suit les postes fixes, les enveloppes variables (Vie quotidienne, Sorties et loisirs, Achats plaisir) et les provisions. Chaque mois est ouvert avec un revenu, puis clôturé : le reliquat est réparti et le mois est figé. Le succès, c'est de savoir à tout moment ce qui reste à vivre, sans effort de saisie.

## Positioning

Chaque euro est imputé à une enveloppe ou à une provision. Le mois est un instantané qui s'ouvre et se clôture. La saisie est manuelle, sans connexion bancaire.

## Operating Context

- Interface en français, tutoiement (« ta recherche »).
- PWA installable, avec raccourcis clavier sur ordinateur (N, V, O, `/`).
- Vocabulaire métier dans `docs/domain/glossary.md`, règles dans `docs/domain/rules.md` (font foi).
- Pas de suppression dure : les postes fixes, enveloppes, provisions et catégories s'archivent.

## Capabilities and Constraints

- Types d'opérations : dépense, versement vers une provision, remboursement, entrée exceptionnelle, transfert d'épargne.
- Un mois clôturé est en lecture seule ; seul le dernier peut être rouvert.
- Montants en centimes (ADR-0001).
- Cohérence attendue sur Firefox, Safari et Chromium ; formulaires en composants shadcn/ui.

## Brand Commitments

Nom produit : Pécule. Charte et maquettes de référence dans `docs/ui/` (charte V01, maquettes v02) ; fichiers de marque dans `docs/ui/pecule-brand/`. Police de titre : Source Serif 4.

## Evidence on Hand

Pas de données d'usage ni de retours utilisateurs. Les maquettes v02 sont la source de vérité visuelle.

## Product Principles

- Saisir une opération doit prendre quelques secondes, au pouce.
- L'imputation (à quelle enveloppe ou provision va l'argent) est l'information centrale de chaque opération.
- Un mois clôturé ne se modifie jamais par accident.
- Rien n'est détruit : on archive, on ne supprime pas ce qui structure le budget.
- La sobriété prime sur l'effet.

## Accessibility & Inclusion

WCAG AA visé partout. Toute action doit être possible au clavier. Le sens ne repose jamais sur la couleur seule.
