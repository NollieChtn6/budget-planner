# Pécule : fichiers de marque

## Contenu

| Fichier | Usage |
|---|---|
| `logo/pecule-logo.svg` | Logo complet (symbole et nom) sur fond clair |
| `logo/pecule-logo-sombre.svg` | Logo complet sur fond sombre |
| `logo/pecule-symbole.svg` | Symbole seul, laiton (fond clair) |
| `logo/pecule-symbole-sombre.svg` | Symbole seul, laiton clair (fond sombre) |
| `logo/pecule-symbole-encre.svg` | Symbole seul, encre (impression, monochrome) |
| `favicon/favicon.ico` | Favicon 16, 32 et 48 px |
| `favicon/icon.svg` | Favicon vectoriel, s'adapte au thème clair ou sombre du navigateur |
| `pwa/icon-192.png`, `pwa/icon-512.png` | Icônes de l'application installée |
| `pwa/icon-maskable-512.png` | Icône Android adaptative : symbole dans la zone de sécurité de 80 % |
| `pwa/apple-touch-icon.png` | Icône d'écran d'accueil iOS (180 px, sans transparence) |
| `manifest.ts` | Manifeste de la PWA pour Next.js |

## Où les placer dans le projet

```
apps/web/app/favicon.ico          ← favicon/favicon.ico
apps/web/app/icon.svg             ← favicon/icon.svg
apps/web/app/apple-icon.png       ← pwa/apple-touch-icon.png
apps/web/app/manifest.ts          ← manifest.ts
apps/web/public/icons/            ← pwa/icon-192.png, icon-512.png, icon-maskable-512.png
apps/web/public/brand/            ← logo/*.svg
```

Avec l'App Router, Next.js détecte `favicon.ico`, `icon.svg`, `apple-icon.png` et `manifest.ts` dans `app/` et génère lui-même les balises `<link>` : rien à ajouter dans le `<head>`.

## Le nom dans le logo

Les deux logos complets écrivent « Pécule » en texte, avec la police Source Serif 4 chargée depuis Google Fonts. Ils s'affichent correctement ouverts dans un navigateur ou intégrés directement dans une page, mais pas toujours dans un éditeur graphique ou via une balise `<img>`, qui bloquent le chargement de la police.

Pour une version définitive, ouvre le fichier dans Figma ou Inkscape avec Source Serif 4 installée, et convertis le texte en tracés (Inkscape : Chemin > Objet en chemin ; Figma : Aplatir). Dans l'application, le nom s'écrit de toute façon en HTML avec la police web, comme dans les maquettes.

Le symbole, le favicon et les icônes de PWA sont entièrement vectoriels ou rastérisés : ils ne dépendent d'aucune police.
