# Builder — Refonte des réglages de bloc (C03, Vague 3)

> Nouvelle coquille de réglages Simple / Avancé, derrière `BUILDER_REDESIGN` (défaut OFF). Réutilise
> l'éditeur legacy (`EditPanel`) par injection — **aucune valeur perdue, aucune logique dupliquée,
> aucune donnée modifiée**. Commit de départ : `91a85cac`.

## Audit des réglages

`builderPanels.tsx` (1777 l) expose `EditPanel({ block, onChange, only })` :
- `only="content"` → éditeur de contenu par bloc (dont éditeurs custom : `CUSTOM_EDITOR_TYPES`) ;
- `only="layout"` → contrôles universels de style/disposition (largeur, espacement, rayon, ombre,
  animations, …), rendus sous clés `__*`.

| Famille | Champs | Fichier | Problème | Simple | Avancé | Section |
| --- | --- | --- | --- | --- | --- | --- |
| Contenu métier | `def.fields` (text/textarea/url/select/image) | builderPanels | tout empilé, pas de hiérarchie | sous-ensemble curaté (pilotes) | tout | content |
| Style/disposition | clés `__*` universelles | builderPanels (only=layout) | dense, technique | masqué | montré | design/layout/… |
| Actions | dup/masquer/verrouiller/brouillon/reset/supprimer | BuilderV4 | dispersées (overlay + bottom-sheet + header) | header | zone dangereuse | — |

## Architecture cible

```text
BlockSettingsPanel        ← coquille (header, toggle, nav sections, corps, zone dangereuse, état vide)
├── SimpleAdvancedToggle  (intégré au header)
├── BlockContextToolbar   ← actions (modèle pur blockContextActions)
├── SettingsFieldRenderer ← rendu générique du contenu (mode simple des pilotes)
└── (injection) EditPanel ← legacy pour design/disposition + blocs non pilotes
builderSettings.ts        ← modèle PUR (sections, classification, mode, changedCount, reset, états)
```

Aucun composant > 1000 l (max : BlockSettingsPanel ≈ 230 l).

## Modèle pur (`builderSettings.ts`)

- `resolveSettingsMode` / `SETTINGS_MODE_KEY = "qrowg_builder_settings_mode"` / `toUxMode` (pont vers builderUx `simple|expert`).
- `PILOT_BLOCKS` (10) + `PILOT_SIMPLE_FIELDS` (champs essentiels curatés).
- `contentFieldsFor(type, mode)` : simple = sous-ensemble curaté ; avancé/non-pilote = tous les champs.
- `fieldMeta` (classification section/minimumMode/priorité).
- `contentChangedKeys` / `universalChangedKeys` → **diff vs `BLOCK_DEFS.defaultContent`** (défaut connu seulement).
- `blockSettingsSections(block, mode)` : sections visibles (via `settingsSectionsForMode`) + `changedCount`.
- `resolveActiveSection` (conserve la section si visible dans le mode, sinon première).
- `resetContentFields` / `resetSectionContent` / `resetBlockContent` (purs, non mutants).
- `blockStateBadges` (priorisés, limités) + `isBlockEmpty`.

**Ne modifie jamais le contenu ni le format de stockage** — la classification est purement UI.

## Mode simple (réel)

Pour les 10 pilotes, le mode simple n'affiche que les champs essentiels (ex. `pricing` : titres,
prix, CTA — pas les `old_price*`/`desc*`), plus les états. Sections avancées (Interactions,
Mobile, Avancé) **masquées** (jamais supprimées). Aide de section en une phrase simple.

## Mode avancé (réel)

Toutes les sections (`settingsSectionsForMode("expert")`) : Contenu (tous les champs), Design,
Disposition, Interactions, Mobile, Avancé — le design/disposition réutilise `EditPanel only="layout"`.
Le type technique du bloc est visible dans le sous-titre en mode avancé uniquement.

## Classification — couverture des 10 pilotes

`heading, bio, values, pricing, image, video, contact_form, product_catalog, timeline,
google_maps_embed`. Tous leurs champs sont des types de base (même les blocs à répétiteurs utilisent
des champs plats `e1_date`, `v1_label`, `p1_name`) → rendus par `SettingsFieldRenderer`. Les autres
blocs utilisent le **fallback legacy** (`EditPanel`), sans perte.

## Header

Icône, nom clair (`LIBRARY_LABEL_OVERRIDES`), catégorie (+ type en avancé), badges d'état, fermeture,
toggle Simple/Avancé. Actions détaillées dans la zone dangereuse.

## Navigation sections

Onglets horizontaux (scroll), `role="tab"`/`aria-selected`, badge de `changedCount` par section,
un seul scroll interne (corps). La section active est conservée au changement de mode si elle reste visible.

## Toolbar contextuelle

`BlockContextToolbar` (modèle pur `blockContextActions`) : `role="toolbar"`, boutons nommés, jamais
imbriqués, actions désactivées si le bloc est verrouillé. Utilisée dans la zone dangereuse.
Sur mobile, chaque action ≥ 44 px avec libellé. La toolbar **flottante sur le canvas** (§17) relève
de la Vague 4 (canvas) ; l'infrastructure (composant + modèle) est livrée.

## Zone dangereuse

En bas du mode avancé : dupliquer / masquer / verrouiller / brouillon / réinitialiser, puis un bouton
**Supprimer séparé** (pleine largeur, ton danger, désactivé si verrouillé). Reset et suppression
passent par une **confirmation** (`confirm` injecté = `useConfirm` de la coquille) et restent
**annulables via Ctrl+Z** (undo inchangé).

## États du bloc

`blockStateBadges` priorise Verrouillé > Masqué > Brouillon > Vide > Premium > Visible, **limité à 3**
(pas de multiplication de badges).

## Fallback legacy

Blocs non pilotes : `renderLegacyContent` = `EditPanel only="content"` ; toutes les sections de style :
`renderLegacyDesign` = `EditPanel only="layout"`. Injection par props → **aucune duplication, aucun
champ perdu, aucune logique modifiée**.

## Desktop / Mobile

- **Desktop** : overlay dans le panneau droit (onglet Édition), header + nav fixes, scroll unique, canvas visible, Escape ferme.
- **Mobile** : plein écran, safe-area (top/bottom), toggle/onglets tactiles ≥ 38-44 px. **Aucun overflow horizontal** (testé portrait 390×844 **et** paysage 844×390).

## Accessibilité

Header sémantique, toggle `aria-pressed` dans un `role="group"`, onglets `role="tab"`/`aria-selected`,
tous les champs ont un `<label htmlFor>` (jamais décrits par le seul placeholder), `role="toolbar"`,
Supprimer nommé, **aucun bouton imbriqué**, Escape ferme, confirmations via la modale accessible.

## Performance

Seuls le bloc sélectionné + la section active sont montés (le legacy design n'est monté que sur les
sections de style). `useMemo` sur sections/section active. Aucun deep clone, aucun recalcul de toute
la navigation à la frappe (le diff `changedCount` est O(champs)).

## Feature flag & rollback

`BUILDER_REDESIGN` OFF = éditeur historique inchangé (overlay non monté). ON
(`NEXT_PUBLIC_BUILDER_REDESIGN=1`) = nouvelle coquille. Rollback = OFF. Mode persistant :
`localStorage["qrowg_builder_settings_mode"]` (lu **après** montage → pas de mismatch d'hydratation).

## Harness & tests

- Harness public `/e2e-harness/block-settings` (**404 en prod**), bloc en mémoire, legacy simulé par
  placeholder → teste **sans Supabase**.
- Unitaires `builderSettings.test.ts` : **23** (mode, pilotes, champs par mode, classification,
  changedCount, sections, reset, états).
- Playwright `e2e/block-settings.spec.ts` : **10 tests desktop + mobile** (état vide, simple/avancé,
  sections, modification sans perte, fallback legacy, verrouillage/visibilité, suppression confirmée,
  Escape, no-overflow portrait & paysage). Captures attachées.

## Couverture & risques

- 10 pilotes en mode simple curaté ; **132 autres blocs** en fallback legacy (aucune perte).
- Le découpage fin des sections de style (design vs disposition vs interactions vs responsive vs
  avancé) réutilise pour l'instant le **panneau universel legacy** commun — découpage par section =
  itération future.
- Toolbar **flottante sur canvas** = Vague 4.
- Chemin flag ON dans le Builder authentifié non observé en navigateur (Supabase injoignable ici) —
  mitigé : flag OFF par défaut + coquille prouvée via harness public.

## Prochaine vague

Vague 4 — canvas responsive (zoom, cadre appareil, `+` entre blocs, toolbar flottante).
