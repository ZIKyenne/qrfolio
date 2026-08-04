# Builder refondu — Harmonisation visuelle (C07)

> Passe de finition visuelle sur les composants C01-C06, derrière `BUILDER_REDESIGN` (défaut OFF).
> Aucune migration, aucun renderer public touché, aucune nouvelle police/dépendance, aucune logique
> métier modifiée. Commit de départ : `8632733e`.

## A. Audit — inventaire des littéraux (avant)

Relevé réel sur les 15 composants C01-C06 :

| Rôle | Littéraux trouvés | Occurrences | Incohérence |
| --- | --- | --- | --- |
| Gris « muted » | `#8A8478` (via `const MUTED` par fichier) | 11 fichiers | **dupliqué 11×** (même valeur, 11 sources) |
| Encre (texte) | `var(--ink, #F5F0E8)` / `#F5F0E8` | 26 | globalement cohérent (CSS var) |
| Accent | `var(--accent)` | 39 | cohérent (CSS var) |
| Surfaces sombres | `#080808 #0A0A0A #0C0C0C #0D0D0D #111 #141210 #161616` | ~20 | **7 nuances proches, non nommées** |
| Rayons | `borderRadius: 4/6/7/8/9/10/11/12/999` | ~43 | 8 et 9 quasi-synonymes ; 10/11/12 mêlés |
| Bordures | `rgba(255,255,255,0.06/0.08/0.14)` + `color-mix(accent …)` | nombreux | cohérent mais non nommé |

## B. Matrice visuelle (extrait)

| Élément | État actuel | Incohérence | Cible (token) | Priorité |
| --- | --- | --- | --- | --- |
| Gris muted | `const MUTED="#8A8478"` ×11 | 11 sources | `BUILDER_UI.text.muted` | **P1 (fait)** |
| Surfaces | 7 littéraux | non nommées | `BUILDER_UI.surface.*` (app/base/panel/chrome/header/sheet/field) | P1 |
| Rayons | 8/9/10/11/12 | flou sm/md | `radius.sm=8 / md=12 / lg=16 / pill / sheet` | P2 |
| Bordures | 3 alphas + color-mix | non nommées | `border.faint/subtle/strong/accentSoft/accent` | P2 |
| Espacement | valeurs inline variées | pas de grille | `space.xs..xl` | P2 |
| Typo | tailles éparses | pas d'échelle | `font.heading..badge` | P2 |
| Motion | transitions inline | durées variées | `motion.fast/base/easing` + reduced-motion | P1 (couvert) |

## C. Tokens (`builderUi.ts`)

Source **unique** et **testée** (`builderUi.test.ts`) : `surface`, `border`, `text`, `accentBg`,
`radius`, `space`, `tap`, `tone` (+`toneColor`), `font`, `motion`. **Valeurs alignées sur l'existant
dominant** → adoption *value-preserving* (aucun changement de rendu), le doré passe par des mélanges
transparents (jamais de surface dorée pleine).

## D. Palette

Identité noir & or conservée. Doré réservé à : action principale, sélection, focus, statut important,
badge premium. Aucune surface dorée pleine (tokens `accentBg.*` = `color-mix … transparent`).

## E-F. Typographie / Espacements

Échelles définies dans les tokens (`font`, `space`) comme cible commune. Adoption progressive
(non imposée en masse à l'aveugle — voir §Périmètre & honnêteté).

## G-I. Boutons / Champs / Tabs

Patrons déjà cohérents (issus de C02-C05) : boutons icon-only nommés + `aria-label`, champs avec
`<label htmlFor>`, tabs `role="tab"`/`aria-selected`. Les tons/rayons/tap cibles sont désormais
nommés dans `builderUi.ts` pour converger.

## J-R. Composants

Header, bibliothèque, réglages, canvas, sélection, insertion, toolbar, statuts, bottom sheets :
inchangés fonctionnellement ; le gris muted est centralisé sur le token dans les 11 composants
concernés. Les surfaces/rayons/typo disposent désormais d'une cible unique.

## S. Mobile

Viewports couverts par les tests C05/C06 (360×800, 390×844, 844×390, 768×1024) : aucun overflow
horizontal, cibles ≥ 44 px, safe areas. Snapshots visuels mobile (initial + sheet) créés.

## T. Motion (reduced-motion)

**Déjà couvert globalement** : `globals.css` (règle `@media (prefers-reduced-motion: reduce)` sur
`*` → `transition-duration/animation-duration: 0.01ms`) neutralise les transitions inline du Builder.
Les snapshots activent `reducedMotion: "reduce"` pour la stabilité. Durées cibles 140-220 ms (tokens).

## U-V. États vides / Erreurs

États vides déjà présents (bibliothèque, réglages, structure, publication) avec icône sobre + titre +
phrase + action. Hiérarchie erreurs via tons `warning`/`danger` (tokens `tone.*`), jamais rouge seul
sans texte.

## W. Accessibilité visuelle

Contrastes texte/focus, cibles tactiles ≥ 44 px, reduced-motion respecté, états non uniquement
couleur (icônes/labels). Vérifié via les locators Playwright existants (aucune nouvelle dépendance a11y).

## X. Performance

Aucune image lourde, aucune police ajoutée, `backdrop-filter` limité au chrome (sheets/toolbars),
pas d'ombres complexes par bloc. Tokens = simples valeurs (aucun coût runtime).

## Y. Snapshots visuels

`e2e/builder-visual.spec.ts` — **gaté `VISUAL=1`** (hors `pnpm test:e2e` par défaut → aucune
régression CI due aux polices). 5 références (vues stables, reduced-motion, `maxDiffPixelRatio 0.03`) :
`desktop-complet`, `bibliotheque`, `reglages`, `mobile-initial`, `mobile-sheet`. **Générées et
vérifiées passantes** en sandbox. Les baselines sont **gitignorées** (`e2e/**/*-snapshots/`, décision
B11) car dépendantes de l'environnement (polices/AA) — les régénérer par environnement :
```bash
VISUAL=1 pnpm test:e2e e2e/builder-visual.spec.ts --update-snapshots
VISUAL=1 pnpm test:e2e e2e/builder-visual.spec.ts   # comparer
```

## Z. Avant / après

- **Avant** : gris muted défini 11× ; 7 nuances de surface non nommées ; rayons flous.
- **Après** : source unique `builderUi.ts` ; muted centralisé (0 régression, valeur identique) ;
  cible commune pour surfaces/rayons/espacements/typo/motion ; snapshots de référence.

## AA. Feature flag

Style harmonisé actif **uniquement** quand le nouveau Builder est actif (les composants ne sont montés
que sous `BUILDER_REDESIGN`). Flag OFF = Builder historique inchangé. Renderer public et pages
utilisateurs **non touchés**.

## Périmètre & honnêteté

L'agent ne peut pas rendre le Builder authentifié (Supabase injoignable en sandbox). Cette passe livre
donc : (1) la **source unique de tokens** ; (2) la **centralisation value-preserving** du gris muted
(zéro régression visuelle) ; (3) les **snapshots de référence** (harness public). Les ré-stylages
*visibles* plus fins (unifier surfaces/rayons/typo au-delà du value-preserving) demandent une QA
navigateur réelle et restent **stagés derrière le flag** — à réaliser lors de l'activation staging,
guidés par les tokens et les snapshots ici posés.

## Suite C09 (finition premium)

Au-delà de la centralisation C07, la passe **C09** applique des améliorations visibles vérifiées en
navigateur : grille bibliothèque auto-responsive, canvas plus profond + ombre de page, boutons
d'insertion élégants, zone dangereuse *ghost*, cartes à élévation, micro-transitions (tokens `shadow`
et `transition` ajoutés à `builderUi.ts`). Détails + captures avant/après : `BUILDER-PREMIUM-FINISHING.md`.

## Décision staging

**Prêt pour canary/staging** (flag OFF par défaut). L'activation `ON par défaut` reste conditionnée à
la QA authentifiée réelle (cf. `BUILDER-REDESIGN-ACTIVATION.md`).
