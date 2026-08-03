# Definition of Done — migration d'un bloc vers le renderer partagé

Filet de sécurité posé par la mission B08 (`test(builder)`). Avant de migrer un bloc
vers le futur renderer unifié (éditeur ↔ public), il doit cocher **toute** cette liste.
Objectif : refactoriser sans régression, divergences visibles et figées.

## Sources de vérité (ne pas dupliquer)
- **Champs / defaultContent / catégorie** : `BLOCK_DEFS` (`types.ts`).
- **Thème** : `normalizePageTheme` + `DEFAULT_PAGE_THEME` (`types.ts`).
- **État vide** : `hasPublishableContent` (`blockEmptyState.ts`).
- **Sécurité des liens** : `extHref` (`types.ts`).
- **Divergences connues** : `blockContracts.ts` (`KNOWN_PUBLIC_NULL_BLOCKS`,
  `KNOWN_DIVERGENCES`, `KNOWN_ORPHAN_FIELDS`).
- **Fixtures** : `blockFixtures.ts`.

## Checklist par bloc
- [ ] **Fixture vide** dans `blockFixtures.ts` (`empty`).
- [ ] **Fixture complète** (`complete`) + partielle/limite si répéteur.
- [ ] **View model pur** extrait si le rendu a une logique de filtre/visibilité/URL
      (ex. `pricingCtaModel`, `contactFormFields`). Testé isolément.
- [ ] **Test de visibilité** : quand le bloc s'affiche vs renvoie `null`.
- [ ] **Test des items** (répéteur) : 0 / 1 / limite / au-delà / items partiels.
- [ ] **Test URL** : liens via `extHref` (matrice `linkSecurity.test.ts`), `javascript:`
      neutralisé, éditeur non navigable.
- [ ] **Test de parité sémantique** : mêmes champs consommés, même limite, même condition
      d'affichage entre éditeur et public.
- [ ] **Test d'état vide** : `emptyHint` + mention « invisible en ligne » si `hides-when-empty`.
- [ ] **Accessibilité critique** : bouton natif / label / `aria-*` / focus ; pas de lien vide.
- [ ] **Aucun champ orphelin non documenté** : tout champ éditable non rendu (ou l'inverse)
      figure dans `KNOWN_ORPHAN_FIELDS`.
- [ ] **Divergence** : si le comportement éditeur ≠ public est volontaire, elle est
      déclarée dans `blockContracts.ts` (sinon un test échoue).

## Tests transverses à garder verts
- `builderCharacterization.test.ts` — inventaire 142 blocs, présence, allowlist de divergences.
- `linkSecurity.test.ts` — sanitizer de liens.
- `persistenceRoundTrip.test.ts` — IDs / ordre / visibilité conservés.
- `themeFormat.test.ts` — thème normalisé/round-trip.
- `blockEmptyState.*`, `pricingCta.test.ts`, `savePage`, `saveController`, `publish`.

## Règle d'or
Toute NOUVELLE divergence éditeur/public non déclarée dans `blockContracts.ts` **doit
faire échouer** un test. On fige d'abord le comportement, on refactore ensuite.
