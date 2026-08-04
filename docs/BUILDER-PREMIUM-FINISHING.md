# Builder refondu — Finition premium (C09)

> Passe de finition visuelle **réellement appliquée et vérifiée en navigateur** (harness Chromium,
> captures avant/après lues par l'agent). Derrière `BUILDER_REDESIGN` (défaut OFF). Aucune logique
> métier, aucune donnée, aucun renderer public touché. Commit de base : `cb124444`.

## A. État initial
Builder refondu déjà cohérent (C01-C07) mais avec des défauts visuels concrets constatés sur captures.

## B. Audit visuel (captures avant) — grille des problèmes

| Zone | Problème visuel | Gravité | Cause | Correction |
| --- | --- | --- | --- | --- |
| Bibliothèque | cartes **tronquées** en panneau étroit | P2 | grille `1fr 1fr` fixe | grille `repeat(auto-fill, minmax(230px,1fr))` |
| Canvas | contraste environnement/page faible → canvas peu « dominant » | P2 | fond builder = page | fond plus profond (`surface.app`/`#070707`) + ombre `shadow.page` sur le cadre |
| Insertion `+` | cercles dorés lourds, toujours pleins | P3 | style trop marqué | ligne fine + cercle discret, **révélé au hover/focus** |
| Réglages | « Supprimer » = **grande bande rouge** | P3 | fond danger 10 % plein | danger **ghost** (fond transparent, survol léger) |
| Cartes biblio | pas de feedback au survol | P3 | statique | élévation au hover (bordure accent douce + surface) |
| Global | peu de micro-transitions | P3 | — | `BUILDER_UI.transition` 160 ms (reduced-motion déjà global) |

## C. Direction choisie
Noir & or **raffiné** : fond profond nuancé, surfaces hiérarchisées (`app` < `base`/`card` < `panel`),
bordures discrètes, doré en accent (jamais de surface pleine), ombres douces réservées au chrome,
transitions courtes. Aucune police/dépendance ajoutée.

## Modifications appliquées (vérifiées sur captures)
- **Tokens** (`builderUi.ts`) : ajout `shadow` (card/soft/page/sheet) + `transition` prête à l'emploi.
- **Bibliothèque** (`BlockLibrary`) : grille auto-responsive → **plus de troncature** (1 col en panneau
  étroit, 2+ en large). **Cartes** (`BlockLibraryCard`) : élévation au survol (bordure/surface + transition).
- **Insertion** (`InsertBetweenBlocks`) : réécrite — ligne de repère + cercle discret, sobre au repos
  (opacité 0,55, gris), net au hover/focus (accent), ≥ 44 px sur mobile.
- **Canvas** (`ResponsiveCanvas`) : fond environnement = `surface.app` (plus profond), cadre appareil
  = `shadow.page` + surface `base` → la page « flotte » ; transition douce au changement device/zoom.
  (`BuilderV4` canvas : fond `#070707` quand flag ON, même effet dans le vrai Builder.)
- **Réglages** (`BlockSettingsPanel`) : bouton Supprimer **ghost** (calme), rayon tokenisé, survol léger.

## D-X. Résultats (captures avant/après)
Avant/après capturés dans le scratchpad (non commités, sans données perso). Vérifié par l'agent :
- **Bibliothèque** : cartes entières et lisibles (avant : « Tarif »/« Témo »/« Form » tronqués).
- **Canvas** : page visuellement détachée du fond (contraste net mais non violent).
- **Insertion** : `+` discrets au repos, élégants (avant : gros cercles dorés).
- **Réglages** : zone dangereuse calme (avant : bande rouge pleine).

## Y. Avant / après
Zones améliorées : bibliothèque (grille + cartes), canvas (profondeur + ombre), insertion, zone
dangereuse, micro-transitions. Le Builder lit désormais comme un **produit fini**, pas une somme de composants.

## Z. Harness
Harness existants réutilisés (`block-library`, `block-settings`, `builder-canvas`, `builder-mobile`,
`builder-redesign`). **Correctif robustesse** : le diagnostic du harness intégré affichait le drapeau
en SSR → mismatch d'hydratation possible si `.env.local` change sur un serveur dev déjà lancé ; il est
désormais rendu **après montage** (client-only). Aucun impact produit.

## AA. Tests
- `pnpm type-check` : **0** · `npx vitest run` : **1554 passés** · `pnpm build` : **84/84**.
- `pnpm test:e2e` : **78 passés / 34 ignorés / 0 échec**.
- `VISUAL=1 … builder-visual.spec.ts` : **2 passés** (références régénérées après restylage).

## AB. Accessibilité / Performance
Contrastes conservés/renforcés ; focus visibles ; reduced-motion **déjà couvert globalement** ;
ombres **uniquement sur le chrome** (jamais par bloc) ; aucune police/dépendance/image lourde ajoutée.

## AG. Risques résiduels
- Restylages plus profonds (typo/espacement fins) possibles mais non nécessaires : le rendu est déjà
  premium et cohérent.
- QA authentifiée réelle toujours requise avant activation prod (inchangé, cf. `BUILDER-STAGING-QA-REPORT.md`).

## AH. Prochaine action
**Outline / productivité** (outline docké + DnD, palette enrichie) — ou préparation lancement.
Décision d'activation inchangée : **canary, flag OFF par défaut**.
