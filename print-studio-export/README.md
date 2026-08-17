# Print Studio — dossier complet à donner à Claude design

Outil QRowg `/dashboard/print-studio` : génère des **supports imprimables** (sticker, chevalet,
carte, affiche…) autour du **QR** de l'utilisateur. **But :** refaire à fond les **aperçus**
(rendus qui « ne veulent rien dire ») et la **bibliothèque** (trop petite). Voir `BRIEF.md`.

## Par où commencer
1. **`BRIEF.md`** — le prompt : les 2 problèmes, les objectifs, les contraintes, le livrable attendu.
2. **`RENDER-layer.tsx`** — ⭐ la **couche de rendu** (la partie à refaire) : `SupportVisual`
   (compo d'un support), `Packshot` (mise en scène), `MiniSupport` (vignette de la biblio),
   `FauxQR`, `FlatEditor`. Petit fichier, ne se tronque pas.
3. **`catalog.ts`** — les 16 supports (`ITEMS`), palettes (`STYLES`), mises en page (`LAYOUTS`).
4. **`mockup.ts`** — scènes packshot + `paletteFromStyle`.
5. **`tokens.ts`** — jetons couleur/rayon.

## Le reste (contexte complet)
- `templates.ts` — modèles prêts-à-l'emploi (panneau « Modèles »).
- `states.ts` — états d'écran + contrôles pré-vol.
- `page.tsx` — page serveur (auth).
- `PrintStudioClient.tsx` — **le client entier** (2274 lignes) si besoin de tout le contexte.
  `RENDER-layer.tsx` en est déjà l'extrait « fin de fichier ».

## Repères de rendu (dans RENDER-layer.tsx / PrintStudioClient.tsx)
- **Vignette biblio** = `MiniSupport` → `SupportVisual` en réduit.
- **Grand aperçu** = `Packshot` → `SupportVisual` + décor `sceneLayers`.
- **Forme** de chaque support = `LAYOUTS` + `item.layout` + `item.ratio` (catalog).
- **Couleurs** = `STYLES` → `paletteFromStyle` (mockup).

## Modèle de données
`Item` : `{ id, name, support, size, ratio, shape('round'|'rect'), layout, pal, qrMm, kicker,
title, cta, place, scene, plain, bleed, margin, dpi, hMm }`. `Style` = palette nommée.

## Contraintes
- Palette DA dorée : or `#e8c877`→`#c9a24d`, fond `#0d0b09`, cartes `#141210`, chaud `#17140f`.
  (Dans le code, l'or = `var(--accent)`.)
- **Ne pas inventer de données produit** (livraison, matière, « le plus scanné », prix, avis).
- QR généré séparément (image réelle) → laisser une **zone QR** propre, ne pas dessiner un faux QR final.
- Responsive + accessibilité + `prefers-reduced-motion`.

## Round-trip
C'est du **React/TSX (styles inline)**, pas du `.dc.html`. Livrable attendu : soit une **maquette
`.dc.html`** des nouveaux aperçus + biblio (je la porte en TSX), soit les composants TSX réécrits.
Je réintègre sans régression, câblage réel conservé.

## Dépendances NON incluses (infra générique, hors design)
`../qr-codes/QRCanvas` · `qrRender` (image QR) · `printPreflight` (contrôle export) ·
`@/components/Particles` · `ui/Modal` · `ui/Button`.
