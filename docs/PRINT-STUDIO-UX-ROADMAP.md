# Print Studio — Review & roadmap UX / Design

Objectif : que le Print Studio soit **aussi propre et « natif » que le reste du dashboard**.

## Diagnostic (cause racine)

Le contenu (scènes packshot, système de modèles, contrôles pré-vol) est solide. L'impression « pas
assez propre / produit à part » venait presque **entièrement** d'un problème d'architecture : le Print
Studio tournait sur son **propre `tokens.ts`** (gris froid, or figé, police système, styles 100 % inline)
et n'utilisait **aucun** système de l'app (palette near-black chaude, `var(--accent)` piloté par
l'utilisateur, titres Fraunces, primitives `components/ui/`, hover/focus globaux).

## Phase 0 — Alignement design system ✅ FAIT (commit 9cc35f7e)

- [x] **Palette** re-pointée sur l'app : `bg #080808`, surface chaude, texte crème `#F5F0E8` / `#8A8478`.
- [x] **Accent** : `gold → var(--accent)` — le Print Studio suit enfin la couleur choisie par l'utilisateur
      (variantes `goldA22/33/55/88` en `color-mix` pour remplacer les concaténations `${C.gold}55` invalides avec une var).
- [x] **Succès/erreur** → `var(--success)` / `var(--danger)` (+ `--danger-bg/border`).
- [x] **Typo** : corps en **Inter**, titres (H1, panneaux, modales) en **Fraunces**.
- [x] **Rayons** alignés (card 16, control 12) ; fondu des rails corrigé (`#070707 → #080808`).
- [x] **Champs** 48 px / 16 px (cohérence + évite le zoom iOS) ; **squelette fantôme** supprimé.
- [x] **Vignettes** : survol (lift + accent) + faux-QR avec vrais repères de coin.

## Phase 1 — Primitives & hiérarchie (medium)

- [ ] **Modales via `components/ui/Modal`** : les 3 bottom-sheets (contrôle / décliner / planche) sont
      réécrites à la main (pas de focus-trap, pas d'Échap, pas de scroll-lock). Les remplacer par la
      primitive `Modal` (ou lui ajouter un `variant="sheet"` pour garder l'affordance mobile). Gain a11y + cohérence.
- [ ] **CTA principaux via `Button variant="primary"`** : « Vérifier & exporter », « Exporter la planche »,
      etc. sont des boutons or inline → ils ratent le dégradé + glow au survol de l'app. Utiliser la primitive.
- [ ] **Dé-clutter du haut du studio** : « Modèles · 1 clic » + « Mes modèles » + « Ma charte » = 3 rails
      empilés sans conteneur. Les regrouper dans un seul `Panel`/`Card` « Styles rapides ».
- [ ] **Unifier les libellés** : deux systèmes cohabitent (labels MAJUSCULES espacés vs `Field` en casse
      normale). Garder la convention app (`.ui-field-label`, casse normale) ; réserver les MAJUSCULES aux vrais séparateurs.
- [ ] **Pastille de statut** « Prêt à imprimer / Un réglage à corriger » : en faire une vraie pastille
      `--success-bg` / `--danger-bg` (aujourd'hui texte nu).

## Phase 2 — Écrans & polish (medium)

- [ ] **Rails de filtres : wrap sur desktop** (≥ ~720px) au lieu du scroll horizontal (26 métiers) ; garder
      le scroll uniquement en étroit.
- [ ] **Colonne d'aperçu (studio)** : garder le packshot **grand et sticky** pendant qu'on scrolle les
      panneaux (aujourd'hui il rétrécit).
- [ ] **Écran upsell** (si un jour re-gaté) : rebâtir avec `Card` + `Button` (aujourd'hui bespoke system-ui).
- [ ] **Focus-visible & transitions** sur chips/swatches (comme les cards) — passer les styles inline
      concernés en petites classes CSS.

## Phase 3 — Refactor de fond (larger)

- [ ] **Adopter les primitives partagées** (`Card`, `Button`, `Modal`, `Tabs`, `Input`, `Switch`) et réduire
      `tokens.ts` aux seules préoccupations Print-Studio (fond perdu, échelle mm, scènes mockup) → plus de
      duplication couleur/type/espace, donc **impossible de dériver** à nouveau du design system.
- [ ] **Consommer réellement les échelles** `type` / `space` de `tokens.ts` (ou les supprimer) : aujourd'hui
      le code code en dur `13.5 / 12.5 / 11.5…` et des gaps ad hoc → demi-points qui dérivent.

## Ordre conseillé

Phase 0 (fait) enlève ~80 % du ressenti « produit à part ». Ensuite **Phase 1** (modales primitive + CTA
`Button` + dé-clutter) pour le plus gros gain a11y/cohérence, puis Phase 2, et Phase 3 quand on veut
verrouiller définitivement l'alignement.

À chaque étape : `tsc` 0, tests catalog verts, build (guard + next), QA visuelle desktop **et** mobile.
