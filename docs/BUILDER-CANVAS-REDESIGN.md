# Builder — Refonte du canvas responsive (C04, Vague 4)

> Canvas responsive derrière `BUILDER_REDESIGN` (défaut OFF). Modèle pur + composants
> harness-vérifiés + intégration contenue dans BuilderV4. Aucune donnée modifiée, aucun renderer
> public touché, DnD/sélection/undo préservés. Commit de départ : `3c078fcc`.

## Audit du canvas

| Élément | Comportement actuel | Problème | Réutilisable | Cible |
| --- | --- | --- | --- | --- |
| Wrapper canvas | `<div maxWidth:640 margin:auto>` (BuilderV4:1786) | pas de device/zoom | oui (point d'ancrage) | cadre + zoom |
| Scroll | 1 scroll `overflowY:auto` | ok | oui | conserver un seul scroll |
| Sélection | boxShadow inset (BuilderV4:1915) | ok | oui | inchangée |
| DnD | `onDragOver`/`onDrop` via `getBoundingClientRect` + `clientY` | **compatible CSS scale** (rects visuels) | oui | inchangé |
| Scroll vers bloc | `querySelector([data-block-id]).scrollIntoView` | ok | oui | centrage |
| Preview | état `preview` plein écran | ne co-existe pas avec l'édition | — | mode aperçu in-canvas |
| Insertion | ajout en fin uniquement | pas d'insertion entre blocs | `resolveInsertIndex` (C02) | `+` entre blocs |
| Toolbar bloc | bottom-sheet / header | pas flottante | `BlockContextToolbar` (C03) | toolbar flottante |

## Architecture cible

```text
builderCanvas.ts        ← modèle PUR (devices, zoom, fit, center, insert, toolbar pos, overflow, raccourcis)
ResponsiveCanvas.tsx    ← viewport (toolbar + cadre + zoom + scroll unique + repères + statut)
CanvasToolbar.tsx       ← contrôles (device/orientation/zoom/ajuster/centrer/aperçu/plein écran)
InsertBetweenBlocks.tsx ← bouton « + » entre blocs (ouvre la bibliothèque à l'index)
FloatingBlockToolbar.tsx← toolbar flottante (resolveFloatingToolbarPosition + BlockContextToolbar)
```

Aucun monolithe > 1000 l ; **aucune duplication de builderPreview**, de la sélection ou du DnD.

## Modèle pur (`builderCanvas.ts`)

Types `CanvasDevice`/`CanvasOrientation`/`CanvasMode`. Helpers : `DEVICE_DIMS`, `deviceFrameWidth`
(paysage échange w/h ; fluid = disponible borné), `deviceLabel`, `orientationApplies`,
`clampZoom`/`stepZoom`/`zoomPercent` (bornés 50–150 %, pas 10 %, sans dérive), `fitZoom`,
`toggleOrientation`, `isOverflowing`, `resolveFloatingToolbarPosition` (top/bottom/inside-top),
`gapInsertIndex` (réutilise `resolveInsertIndex`), `pagePositionLabel`, `resolveCanvasShortcut`
(jamais pendant la saisie sauf Escape), `canvasChrome`. **Déterministe, sans React, testé.**

## Appareils

Mobile ≈ 390 px, Tablette ≈ 768 px, Bureau ≈ 1280 px, Fluide = largeur disponible (bornée 280–900).
La largeur active est affichée (ex. « Mobile · 390 px »). Dimensions **générales** (pas un modèle exact).

## Orientation

Bouton visible seulement pour mobile/tablette. Bascule échange largeur/hauteur de référence,
préserve la sélection, sans rechargement. Réinitialisée à portrait au changement d'appareil.

## Zoom

Plage **50 % → 150 %**, pas 10 %, défaut 100 %, borné, sans valeur infinie/négative. Appliqué en
`transform: scale()` sur un **wrapper stable** (pas les blocs) → n'altère ni les données ni la
sélection ; le DnD reste correct (les rects sont visuels). Raccourcis Ctrl +/−/0.

## Ajuster / Centrer

`Ajuster` = `fitZoom` (zoom optimal borné selon largeur dispo, marges). `Centrer` = scroll vers le
premier bloc / haut de page. `100 %` réinitialise. Purs et testés.

## Device frame

Mobile : coins très arrondis + bordure + ombre légère. Tablette : cadre plus fin. Bureau : surface
encadrée. Fluide : aucune matière (simple surface d'édition). Pas de mockup marketing.

## Mode édition / aperçu

Édition : toolbar, sélection, overlays, inline edit. Aperçu : chrome d'édition masqué, inline edit
désactivé (`editable=false`), bannière + bouton « Éditer ». **Ne remplace pas** l'ouverture de la vraie
page publique.

## Plein écran

`onFullscreen` délégué au parent : dans BuilderV4, réutilise le **mode Focus** existant (masque les
panneaux) ; dans le harness, un focus interne. Escape quitte l'aperçu.

## Ajout entre blocs

`InsertBetweenBlocks` : « + » discret au repos, visible au hover/focus (desktop), ≥ 44 px au tactile.
`onInsert(index)` ouvre la bibliothèque à l'index (`gapInsertIndex`/`resolveInsertIndex`). Anti-double
partagé (`isDuplicateAdd`, C02). Dans le harness : insertion aux index 0..N vérifiée.

## Toolbar flottante

`FloatingBlockToolbar` positionnée par `resolveFloatingToolbarPosition` (au-dessus si place, sinon en
dessous, sinon à l'intérieur), réutilise `BlockContextToolbar`. Masquée en aperçu, jamais rendue côté
public. Actions : réglages, monter/descendre, dupliquer, masquer, verrouiller, supprimer.

## Sélection / page longue / DnD

Sélection : contour clair (inchangé). Page longue : indicateur « Bloc X / N », repère fin de page,
retour en haut. **DnD préservé** (compatible avec le `transform: scale`).

## Desktop / Tablette / Mobile

- **Desktop** : toolbar sticky en tête du canvas, cadre centré, zoom, canvas visible sous le header.
- **Tablette** : formats 768/1024 simulables dans le canvas desktop.
- **Mobile (viewport)** : chrome simplifié (pas de cadre matériel ni zoom fin), plein écran, safe-area,
  **aucun overflow horizontal** (testé portrait 390×844 et paysage 844×390). Refonte complète de la
  bottom bar = Vague 5.

## Accessibilité

Boutons device/zoom/orientation/aperçu nommés + `aria-pressed`, valeur de zoom en `aria-live`,
`role="toolbar"`, bouton « + » nommé, toolbar flottante nommée, Escape quitte l'aperçu, focus visible,
aucun élément uniquement au hover, cibles tactiles ≥ 44 px.

## Performance

Zoom = **un seul** wrapper transformé (pas 100 transforms). `ResizeObserver` uniquement sur la zone de
scroll. `useMemo` sur chrome/frame/label. Harness testé à 10/50/100 blocs légers (pas de rendu réel
lourd). Aucun observer par bloc, aucun recalcul de rectangle par frame, aucun deep clone.

## Feature flag & rollback

OFF = canvas historique inchangé (wrapper 640, pas de toolbar). ON
(`NEXT_PUBLIC_BUILDER_REDESIGN=1`) = toolbar + device + zoom + cadre + aperçu, **défauts neutres**
(fluid/100 % ≈ existant). Rollback = OFF.

## Harness & tests

- `/e2e-harness/builder-canvas` (**404 prod**), N blocs, sans Supabase.
- Unitaires `builderCanvas.test.ts` : **28** (devices, orientation, zoom borné/pas, fit, overflow,
  toolbar pos ×3, insertion, page longue, raccourcis, chrome).
- Playwright `e2e/builder-canvas.spec.ts` : **9 tests desktop+mobile** (rendu, device/orientation/
  largeur, zoom/ajuster, aperçu, sélection+toolbar flottante, insertion, 100 blocs, plein écran,
  no-overflow). Captures attachées.

## Risques résiduels (canvas)

- Intégration BuilderV4 = toolbar + cadre/zoom + aperçu (contenue) ; l'`InsertBetweenBlocks` et la
  `FloatingBlockToolbar` **pixel-positionnée** sont prouvées dans le harness et prêtes à câbler dans le
  vrai canvas (hook par bloc) — non montées dans BuilderV4 pour éviter un risque non vérifiable.
- Chemin flag ON dans le Builder authentifié non observé en navigateur (Supabase injoignable ici) —
  mitigé : flag OFF par défaut (défauts neutres) + composants prouvés via harness.
- `fitZoom` dans BuilderV4 utilise une largeur estimée (900) ; le harness mesure précisément.

## Prochaine vague

Vague 5 — Builder mobile (bottom bar, bottom sheets, clavier, safe areas).
