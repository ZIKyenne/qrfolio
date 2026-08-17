# Brief design — Refaire les aperçus & la bibliothèque du Print Studio (QRowg)

> **À coller dans Claude (design), avec le fichier `print-studio-export.md`** (tout le code de l'outil).
> Objectif : corriger deux choses qui clochent, en gardant l'identité dorée de la marque et le
> modèle de données réel. Je réintègre ton résultat côté code ensuite (sans régression).

---

## Contexte en 30 secondes
« Print Studio » est un outil qui génère des **supports imprimables réels** (sticker de table,
chevalet, sticker vitrine, carte de visite, panneau Wifi, affiche, marque-page…) **autour du QR
code** de l'utilisateur. Deux écrans :

1. **Bibliothèque** — « Choisissez un support » : filtres métier/objectif + recherche + grille de
   cartes, chaque carte montrant une **vignette** du support (`MiniSupport`).
2. **Studio** — l'éditeur : un grand **aperçu** du support choisi (`Packshot` → `SupportVisual`) +
   panneaux de réglage à droite (Modèles, Le QR, Les textes, L'allure, Le design).

Le tout est en **React/TSX avec styles inline**. Les aperçus sont des **compositions CSS** (pas
des vraies photos) : un fond, un bandeau/kicker, un titre, le QR dans une pastille, un bouton (CTA),
parfois un cadre — disposés selon un **layout** (`LAYOUTS` dans `catalog.ts`) et une **palette**
(`STYLES` → `paletteFromStyle` dans `mockup.ts`), à la bonne **proportion** (`item.ratio` / `item.shape`).

---

## Problème 1 — Les aperçus « ne veulent rien dire »
**Symptômes observés :**
- Le rendu ne **ressemble pas à un objet imprimé crédible** : ça fait « bloc abstrait » plus que
  sticker/chevalet/carte. On ne « reconnaît » pas le support d'un coup d'œil.
- **Hiérarchie faible** : titre + QR + un trait, sans vraie composition (marges, respiration,
  accents) — beaucoup d'aperçus se ressemblent alors que les supports sont très différents.
- Les **proportions et le format** (rond Ø50, carré 50×50, portrait 55×85, paysage 85×55, A4…)
  ne se lisent pas assez ; la matière (papier crème, vinyle, carton) n'est pas suggérée.
- Pas (ou peu) de **contexte** : un sticker devrait « se sentir » collé, un chevalet « posé », une
  carte « tenue en main ».

**Objectif (à concevoir) :**
- Un **packshot crédible par support** : matière papier/vinyle (grain, blanc cassé `#f4efe6`),
  **ombre portée** réaliste, coins/бords cohérents avec le format, proportions exactes.
- Une **vraie hiérarchie** : kicker (sur-titre) → titre → **QR net et scannable** avec zone
  franche (quiet zone) → CTA/bouton — avec des marges et une composition qui varient **par layout**.
- Le **QR reste toujours lisible** (contraste, taille mini, pastille de fond) — c'est le point le
  plus important d'un support scannable.
- Un **décor de scène léger** optionnel (table, vitrine, comptoir, main, mur) pour situer l'objet
  sans surcharger.
- Chaque famille de support doit être **reconnaissable instantanément** (un rond ≠ un chevalet ≠
  une affiche ≠ une carte).

---

## Problème 2 — La bibliothèque est trop petite / trop pauvre
**Symptômes observés :**
- Les **vignettes sont petites et peu lisibles** (`MiniSupport`), on distingue mal le support.
- L'écran manque de **présence** : ça fait « petite grille » au lieu d'une **galerie** engageante.
- Peu de **variété visuelle** entre les cartes ; on a du mal à comparer/choisir.

**Objectif (à concevoir) :**
- Une **galerie riche et grande** : vignettes plus grandes et **réalistes** (le même packshot que
  le studio, en réduit), qui donnent envie et laissent **comparer** les formats d'un coup d'œil.
- Une **grille bien rythmée** (tailles de cartes, ratios d'aperçu, espacements), éventuellement
  des mises en avant (support « recommandé », ruban), et une **lecture format + usage** immédiate.
- Garder les filtres déjà en place (métier, objectif, recherche, tri) — c'est l'**habillage des
  cartes et des aperçus** qui doit monter en gamme, pas la logique de filtre.

---

## Contraintes à respecter
- **Identité dorée (DA)** : or clair `#e8c877` → or profond `#c9a24d` ; fond `#0d0b09` ; cartes
  `#141210` ; chaud `#17140f` ; bordures `#221f1b` / `#26211a` / `#2e281f` ; textes `#e8e3da` /
  `#b8b1a6` / `#8a8177` / `#6b6258`. (Dans le code, l'or est la variable CSS `var(--accent)`.)
- **Modèle de données réel** — ne rien inventer côté données. Un support = `Item` :
  `{ id, name, support, size, ratio, shape ('round'|'rect'), layout, pal, qrMm, kicker, title,
  cta, place, scene, plain }`. Les palettes = `STYLES` ; les mises en page = `LAYOUTS`.
- **Pas de fausses données produit** : pas de « livré en 48 h », « vinyle mat », « le plus scanné »,
  prix, avis… tant qu'il n'y a pas de source réelle. On design la **forme**, pas des promesses.
- **QR généré séparément** (image réelle) — dans l'aperçu, laisse une **zone QR** propre (carré/rond)
  à la bonne taille ; ne redessine pas un faux QR trompeur en sortie finale.
- **Responsive** (desktop + mobile), **accessibilité** (contrastes, focus), et **`prefers-reduced-motion`**
  (couper les animations décoratives).

---

## Livrable attendu (au choix)
1. **Une maquette `.dc.html`** (format Claude design) montrant :
   - le **nouvel aperçu** (`SupportVisual` / packshot) décliné sur **3–4 supports différents**
     (un rond, un chevalet, une carte, une affiche) pour prouver que la composition s'adapte au format ;
   - la **nouvelle grille de bibliothèque** (vignettes + rythme).
   Avec un **README des valeurs exactes** (tailles, couleurs, rayons, ombres, marges) — comme les
   handoffs précédents.
   **OU**
2. **Les composants TSX réécrits** (`SupportVisual`, `MiniSupport`, la grille) directement.

Dans les deux cas : je (Claude Code) **réintègre** dans le vrai code en gardant tout le câblage
(filtres, ouverture d'un support, panneaux, export). Vise « chaque support ressemble à un objet
réussi, prêt à imprimer ».

---

## Où regarder dans le code (`print-studio-export.md`)
- `PrintStudioClient.tsx` → composants **`MiniSupport`** (vignette biblio), **`Packshot`** et
  **`SupportVisual`** (grand aperçu / composition du support), **`FlatEditor`** (édition libre),
  et l'écran **bibliothèque** (branche `if (phase === "library")`).
- `catalog.ts` → **`ITEMS`** (les 16 supports), **`STYLES`** (palettes), **`LAYOUTS`** (mises en page),
  `SIZES`, `MESSAGES`.
- `mockup.ts` → **`sceneLayers`** (décor), **`paletteFromStyle`** (couleurs), échelles.
- `tokens.ts` → jetons de couleur/rayon.
