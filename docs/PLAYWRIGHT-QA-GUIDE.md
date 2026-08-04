# Guide QA navigateur Playwright (B11)

Capacité **permanente** de tester QRowg dans un vrai Chromium (desktop + mobile).

## Installation

Déjà fait dans le dépôt :
- dépendance dev `@playwright/test` (racine du workspace) ;
- navigateur : `pnpm exec playwright install chromium` (Chromium bundled ; en CI ajouter `--with-deps`).

Pour réinstaller le navigateur sur une nouvelle machine :
```bash
pnpm install
pnpm exec playwright install chromium
```

## Variables d'environnement

- Le serveur Next dev démarré par Playwright lit `apps/web/.env.local` (Supabase/Stripe) — **jamais commité**.
- Copier `.env.e2e.example` → `.env.e2e` (ignoré par Git) pour les parcours **authentifiés** :
  - `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` : compte de **test** Supabase dédié (jamais un compte de prod).
  - `E2E_PORT` : port du serveur (défaut 3100).
- Sans ces variables, seuls les tests **publics** s'exécutent (smoke + harness) ; les parcours
  authentifiés sont **ignorés avec une raison explicite** (aucun faux succès).

## Compte de test

Créer manuellement un compte Supabase de test (via l'UI d'inscription en local) puis renseigner
`.env.e2e`. Ne jamais utiliser de données personnelles réelles ni la production. Nettoyer les pages
créées après les runs authentifiés.

## Lancer

```bash
pnpm test:e2e            # tous les projets (desktop + mobile), headless
pnpm test:e2e:headed     # voir le navigateur travailler
pnpm test:e2e:ui         # mode UI interactif Playwright
pnpm test:e2e:report     # ouvrir le dernier rapport HTML
```

Filtrer :
```bash
pnpm test:e2e --grep "51 blocs"     # uniquement le harness des blocs shared
pnpm test:e2e --project=mobile      # uniquement le viewport mobile
```

Le serveur Next dev est **démarré automatiquement** (config `webServer`, réutilisé s'il tourne déjà
sur le port). Première exécution : la compilation à froid des routes peut prendre quelques secondes.

## Structure

- `playwright.config.ts` (racine) : projets `desktop` (1280×900) et `mobile` (390×844, tactile),
  `webServer` (Next dev, `cwd: apps/web`), trace on-first-retry, screenshot on-failure, workers=1.
- `e2e/helpers/collect.ts` : collecteur d'erreurs (pageerror, console.error, réseau 4xx/5xx +
  requestfailed) filtré **même origine** ; les ressources tierces (Spotify/YouTube/Maps) sont
  exclues (blocage réseau/consentement attendu, §20).
- `e2e/smoke.spec.ts` : landing publique + dashboard anonyme.
- `e2e/shared-blocks.spec.ts` : harness des **51 blocs shared** (rendu + hydratation + captures ciblées).
- `e2e/journey.spec.ts` / `forms.spec.ts` / `builder-mobile.spec.ts` : parcours **authentifiés**
  (squelettes ignorés tant que `.env.e2e` n'est pas fourni).
- `apps/web/src/app/e2e-harness/blocks/` : **route de harness** (page + client + fixtures), **gatée
  404 en production** (`process.env.NODE_ENV === "production" → notFound()`). Jamais exposée aux visiteurs.

## Harness des blocs shared

`/e2e-harness/blocks` (local/dev/test uniquement) rend les 51 adapters **publics** shared avec des
fixtures déterministes (`fixtures.ts`) et un thème fixe. Images = asset local `/icon.png` ;
embeds = URLs providers réelles (vérifie l'URL canonique, pas le chargement tiers).

## Snapshots / captures / traces

- Rapport HTML, traces, vidéos, résultats → `playwright-report/`, `test-results/` (**ignorés par Git**).
- Les captures des blocs risqués sont **attachées** au rapport (preuves), **pas** des baselines
  `toHaveScreenshot` : fonts non embarquées + iframes tierces ⇒ rendu non pixel-stable. Une
  vraie régression visuelle par snapshot demandera d'abord de figer fonts + neutraliser les iframes.

## Nettoyage

Les artefacts sont hors Git. Supprimer `test-results/` et `playwright-report/` si besoin. Pour les
runs authentifiés, supprimer les pages de test créées.

## CI

`.github/workflows/ci-cd.yml` — job `e2e` **manuel** (`workflow_dispatch`, périmètre public
smoke + harness). Prérequis : définir les secrets repo `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Les parcours authentifiés en CI nécessiteraient en plus un compte
de test (`E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`).

## Limitations connues (cet environnement)

- Réseau restreint : les iframes tierces (Spotify/YouTube/Maps) ne se chargent pas → attributs/
  conteneur testés, chargement non observé (documenté, non bloquant).
- Aucun compte de test Supabase disponible ici → parcours authentifiés ignorés (raison explicite).
