# Builder refondu — Activation progressive (C06)

> Comment activer le nouveau Builder (C01-C05) en toute sécurité, par navigateur, en dev ou en
> staging, sans jamais l'imposer à tous les utilisateurs. Défaut **production = OFF**.

## Résolution du flag

`resolveBuilderRedesignEnabled({ envEnabled, localOverride, queryOverride, isProduction })`
(`builderFlags.ts`, pur + testé). Priorité :

1. **Override local explicite** `localStorage["qrowg_builder_redesign"]` = `"1"` (ON) / `"0"` (OFF) — gagne toujours (rollback par navigateur).
2. **ENV** `NEXT_PUBLIC_BUILDER_REDESIGN=1` — active (staging / canary serveur), y compris en production.
3. **Query param** `?builderRedesign=1` — **uniquement hors production**.
4. Sinon **OFF**.

Aucun secret, aucun email codé en dur. SSR-safe : le rendu serveur et le 1er rendu client utilisent
la valeur ENV ; l'override canary s'applique **après montage** (`useBuilderRedesign()`) → pas de
mismatch d'hydratation.

## Activer localement (le plus simple)

**Option A — variable d'env** (`apps/web/.env.local`) :
```env
NEXT_PUBLIC_BUILDER_REDESIGN=1
```
puis `cd apps/web && npx next dev`. Le nouveau Builder est actif partout en local.

**Option B — override navigateur** (sans toucher aux fichiers), dans la console DevTools :
```js
localStorage.setItem("qrowg_builder_redesign", "1"); location.reload()
// désactiver :
localStorage.setItem("qrowg_builder_redesign", "0"); location.reload()
// revenir au défaut ENV :
localStorage.removeItem("qrowg_builder_redesign"); location.reload()
```

**Option C — query param en dev** : ouvrir le Builder avec `?builderRedesign=1` (ignoré en prod).

## Activer en staging / preview

1. Déployer la branche en **preview/staging** (Vercel preview ou équivalent).
2. Définir `NEXT_PUBLIC_BUILDER_REDESIGN=1` **uniquement sur cet environnement**.
3. Se connecter avec un **compte de test** dédié (jamais la prod).
4. Dérouler la QA authentifiée : création → ajout → réglages → canvas → sauvegarde → publication → page publique, desktop **et** mobile.
5. Collecter les erreurs (console/réseau/Sentry si présent).
6. **Rollback** immédiat = retirer la variable d'env (ou `localStorage["qrowg_builder_redesign"]="0"` côté navigateur).

## Rollback

- Global : retirer `NEXT_PUBLIC_BUILDER_REDESIGN`.
- Par navigateur : `localStorage["qrowg_builder_redesign"]="0"`.
- Le chemin OFF rend la coquille historique **à l'identique** (aucune donnée touchée).

## Critères d'activation par défaut (production ON)

À ne faire que si **tous** ces points sont vérifiés (C06 §26) :

- [ ] Aucune régression P0/P1.
- [ ] Sauvegarde réelle vérifiée (compte de test, Supabase joignable).
- [ ] Publication réelle vérifiée.
- [ ] Desktop utilisable ; mobile utilisable ; tablette correcte.
- [ ] Fallback legacy fiable (aucune perte de réglage).
- [ ] DnD fiable (zoom 75/100/125 %).
- [ ] Undo/redo, raccourcis OK.
- [ ] Tests verts (Vitest + Playwright harness) + build vert.
- [ ] **QA authentifiée réelle effectuée sur une machine où Supabase est joignable.**

Tant que la QA authentifiée réelle n'a pas été réalisée (impossible dans le sandbox de l'agent —
Supabase injoignable), **le défaut reste OFF** et l'activation se fait en **canary** (ENV staging /
override navigateur). Voir `BUILDER-REDESIGN-INTEGRATION-QA.md`.

## Décision C06

**Canary** : flag OFF par défaut, activable par ENV (staging) ou override navigateur (dev/QA).
Pas d'activation production par défaut tant que la QA authentifiée réelle n'est pas faite.

## Mise à jour C08 (QA staging & décision)

Le runbook de déploiement staging + la QA authentifiée complète sont dans
`BUILDER-STAGING-QA-REPORT.md`. Portes locales toutes vertes. La QA **authentifiée** (Supabase réel)
n'a **pas** pu être exécutée par l'agent (sandbox sans accès Supabase) → **décision inchangée : canary,
flag OFF par défaut.** Procédure staging = définir `NEXT_PUBLIC_BUILDER_REDESIGN=1` sur le **Preview
Vercel uniquement**, dérouler le runbook, puis décider. Rollback = retirer la variable (aucune migration).

## Mise à jour C07 (harmonisation visuelle)

Le style est désormais centralisé (`builderUi.ts`) et des snapshots visuels de référence existent
(`e2e/builder-visual.spec.ts`, gatés `VISUAL=1`). **Prêt pour staging** (flag OFF par défaut). Lors de
l'activation staging, dérouler en plus la QA visuelle : `VISUAL=1 pnpm test:e2e e2e/builder-visual.spec.ts`
après avoir régénéré les références sur l'environnement cible. La décision d'activation par défaut
reste inchangée (QA authentifiée réelle requise).
