# Builder — Roadmap de refonte UX (C01)

> Suite de `BUILDER-UX-ULTRA-AUDIT.md`. Principe directeur : **ne pas reconstruire, extraire puis
> migrer écran par écran derrière un flag**, avec QA. Zéro migration de données, zéro changement
> Supabase, zéro changement de format de bloc, blocs shared **et** legacy préservés.

## 0. Stratégie

Le Builder actuel (`BuilderV4.tsx`, 2661 l inline) est fiable mais monolithique. On introduit une
**couche UX pure** — `builderUx.ts` — qui devient la **source unique** de la navigation, des
sections de réglages, du mode simple/expert, de la sélection, du responsive, des statuts save/
publication, du glossaire anti-jargon et des actions contextuelles de bloc. La coquille consomme
cette couche, migrée **par petits incréments réversibles** derrière `BUILDER_REDESIGN`
(`builderFlags.ts`, défaut **OFF**).

Pourquoi un flag : la refonte de la coquille est **visible** et l'agent ne peut pas la valider en
navigateur (Supabase injoignable depuis le sandbox). Le flag garantit que **la production reste
identique** (OFF) tant que la QA navigateur n'a pas validé le chemin ON. Rollback = un booléen.

## 1. Architecture cible

### Desktop
```text
┌──────────────────────────────────────────────────────────────┐
│ Header : ← QRowg · Nom · [Statut clair] · Undo/Redo · Publier │
├───────────┬──────────────────────────────────┬───────────────┤
│ Rail nav  │            Canvas                │ Panneau droit │
│ Ajouter   │   (preview éditable, zoom,        │ contextuel :  │
│ Structure │    cadre appareil, + entre blocs) │ Contenu /     │
│ Design    │                                   │ Design /      │
│ Modèles   │                                   │ Disposition / │
│ Réglages  │                                   │ Interactions/ │
│           │                                   │ Responsive /  │
│           │                                   │ Avancé        │
└───────────┴──────────────────────────────────┴───────────────┘
```

### Mobile
```text
┌───────────────────────┐
│ Header compact + Statut│
├───────────────────────┤
│                        │
│   Canvas plein écran   │
│                        │
├───────────────────────┤
│ Ajouter Structure ...  │  ← bottom-bar
└───────────────────────┘
   ▲ réglages/design/plan → bottom-sheets (safe-area + clavier)
```

## 2. La couche `builderUx.ts` (livrée en Vague 1)

Source unique, **pure et testée** (aucun React/Supabase). Exporte :

| Export | Rôle |
| --- | --- |
| `resolveSaveStatus(flags)` | Taxonomie unique save : `idle/creating/unsaved/saving/saved/error` → `{kind,label,shortLabel,tone}` |
| `resolvePublishStatus(flags)` | Taxonomie unique publication : `draft/publishing/published/unpublished/upToDate` |
| `BUILDER_NAV` | Rail de navigation (Ajouter/Structure/Design/Modèles/Réglages) + descriptions en français simple |
| `SETTINGS_SECTIONS` + `settingsSectionsForMode(mode)` | Taxonomie réglages Contenu/Design/Disposition/Interactions/Responsive/Avancé, filtrée par mode |
| `resolveMode(expert)` / `isAdvancedOnly(sectionId)` | Mode simple/expert non destructif |
| `resolveBuilderLayout(width)` | `mobile/desktop` + visibilité des zones (aligné sur `useIsMobile(1024)`) |
| `isSelected` / `toggleMulti` / `selectionCount` | Sélection simple + multi, pure |
| `MOBILE_TABS` | Modèle de la bottom-bar (blocks/canvas/panel) |
| `BUILDER_GLOSSARY` / `plainTerm(term)` | Anti-jargon (CTA→bouton d'action, embed→intégration, slug→adresse…) |
| `blockContextActions(block,opts)` | Actions contextuelles ordonnées (déplacer/dupliquer/masquer/verrouiller/brouillon/reset/style/supprimer) + `danger`/`confirm` |

Cette couche **n'impose rien à l'UI** : elle décrit le modèle. La coquille l'adopte progressivement.

## 3. Roadmap par vagues

| Vague | Périmètre | Consomme `builderUx` | QA requise |
| --- | --- | --- | --- |
| **1 (C01, faite)** | Fondation pure + flag + **1 incrément visible sûr** (statut save unifié `BuilderStatus`, gaté flag) | statuts, +modèle complet | tests purs + `renderToStaticMarkup` ; navigateur au flag ON |
| **2 (C02, faite)** | Bibliothèque de blocs refondue : `builderLibrary.ts` (modèle pur) + `BlockLibrary`/`BlockLibraryCard` + harness Playwright public. Recherche normalisée/multi-mots, catégories, favoris/récents réutilisés, recommandations déterministes, premium (affichage), a11y (boutons frères). Voir `BUILDER-BLOCK-LIBRARY-REDESIGN.md` | nav, glossaire | **navigateur RÉEL via harness** (sans Supabase) ✅ |
| **3 (C03, faite)** | Réglages de bloc Simple/Avancé : `builderSettings.ts` (modèle pur) + `BlockSettingsPanel`/`SettingsFieldRenderer`/`BlockContextToolbar` + harness Playwright public. 10 pilotes en simple curaté, fallback legacy `EditPanel` injecté pour le reste (0 perte). Voir `BUILDER-SETTINGS-REDESIGN.md` | sections, mode, actions | **navigateur RÉEL via harness** ✅ |
| **4 (C04, faite)** | Canvas responsive : `builderCanvas.ts` (modèle pur) + `ResponsiveCanvas`/`CanvasToolbar`/`InsertBetweenBlocks`/`FloatingBlockToolbar` + harness Playwright public. Devices/orientation/zoom/ajuster/centrer/aperçu/plein écran, cadre appareil, `+` entre blocs, toolbar flottante, page longue. Intégration contenue dans BuilderV4 (toolbar + cadre/zoom + aperçu). Voir `BUILDER-CANVAS-REDESIGN.md` | layout | **navigateur RÉEL via harness** ✅ |
| **5 (C05, faite)** | Builder mobile complet : `builderMobile.ts` (modèle pur) + `MobileBuilderShell`/`MobileBottomSheet`/`MobileBottomNavigation`/`MobileBuilderHeader`/`MobileContextBar` + harness Playwright public. 5 onglets, bottom sheet unique (3 snaps), clavier (Visual Viewport), safe areas, paysage/tablette, aperçu, publication. Réutilise C02/C03/C04. Voir `BUILDER-MOBILE-REDESIGN.md` | mobileTabs, layout | **navigateur RÉEL via harness** ✅ |
| **6 (C06, faite)** | **Intégration + activation progressive** : assemblage réel C01-C05, `resolveBuilderRedesignEnabled`/`useBuilderRedesign` (canary : ENV / localStorage / query dev), insertion entre blocs branchée dans le vrai canvas, gate anti double-nav mobile, harness d'intégration `/e2e-harness/builder-redesign`. Décision = **canary, OFF par défaut**. Voir `BUILDER-REDESIGN-ACTIVATION.md` + `BUILDER-REDESIGN-INTEGRATION-QA.md` | flag, tout | **navigateur RÉEL via harness** ✅ ; QA authentifiée = à faire sur machine Supabase |
| **7 (C07, faite)** | **Harmonisation visuelle** : tokens centralisés `builderUi.ts` (surfaces/bordures/rayons/espacements/typo/tons/motion) + centralisation value-preserving du gris muted (11 composants) + snapshots visuels gatés `VISUAL=1`. Reduced-motion déjà couvert (globals.css). Voir `BUILDER-VISUAL-HARMONIZATION.md` | tokens UI | **navigateur RÉEL via harness** ✅ |
| **8 (C08, faite)** | **QA staging & décision production** : portes locales toutes vertes (type-check 0 / vitest 1554 / build 84/84 / e2e / visuel) ; runbook de déploiement + gabarit de QA authentifiée (`BUILDER-STAGING-QA-REPORT.md`). QA authentifiée réelle **non exécutable en sandbox** (Supabase `ENOTFOUND`). **Décision = canary prolongé (flag OFF)** en attendant la QA staging humaine | flag | **staging humain requis** |
| **9 (prochaine)** | Productivité : outline docké + DnD, plus de commandes palette, presets | nav, actions | navigateur |
| **7** | Onboarding léger (checklist, progression, aide contextuelle) | glossaire | navigateur |

Chaque vague : additive, derrière le flag, avec QA navigateur **avant** activation par défaut.
Le flag ne doit **pas** rester indéfiniment (§26) : il est retiré une fois la coquille migrée et QA'd.

## 4. Risques & mitigations

| Risque | Mitigation |
| --- | --- |
| Régression visuelle non détectée (agent sans navigateur) | Flag OFF = prod identique ; QA navigateur obligatoire avant activation |
| Divergence entre couche pure et rendu réel | Tests `renderToStaticMarkup` sur les composants présentationnels |
| Fichier `BuilderV4` fragile | Édits **contenus et réversibles** (ternaire flag), jamais de réécriture massive |
| Perte de fonctionnalités existantes | Inventaire §B de l'audit ; chaque vague préserve l'existant |

## 5. QA

- **Sans navigateur (agent)** : `pnpm type-check`, `npx vitest run`, `pnpm build`, `pnpm test:e2e` (public + harness). Parcours authentifiés **ignorés avec raison** si Supabase injoignable (jamais faux succès).
- **Avec navigateur (machine utilisateur / CI Supabase)** : activer `BUILDER_REDESIGN`, dérouler les parcours §7 de la mission (débutant/pro/créateur/commerce/mobile), vérifier absence d'overflow, publication, sélection, undo/redo.

## 6. Prochaine action recommandée

**Vague 2 — bibliothèque de blocs** (tokenisée, aperçu, recommandés), qui consomme `BUILDER_NAV`
et `BUILDER_GLOSSARY` déjà livrés, et se valide bien en composant isolé (harness Playwright).
