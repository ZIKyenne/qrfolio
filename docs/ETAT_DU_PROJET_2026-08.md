# QRowg — Revue d'état du projet

> **Date :** 2 août 2026
> **Périmètre :** application `apps/web` (Next.js 16 App Router) + base Supabase + intégrations (Stripe, Resend, Upstash, Vercel).
> **Auteur de la revue :** audit automatisé du dépôt (métriques réelles + connaissance projet).
> **Verdict global :** 🟢 **Sain et proche du lancement.** Base technique solide (typage strict, 643 tests, sécurité durcie). Ce qui reste est surtout de la **configuration de production** (Stripe, variables d'env, application des migrations) et de la **dette de structure** (3–4 fichiers monolithes) — pas des bugs de fond.

---

## 1. Résumé exécutif

QRowg est une plateforme française **link‑in‑bio + QR code dynamique + analytics + éditeur no‑code**, en noir/or premium, orientée mobile. Le produit est **fonctionnellement très complet** : builder de pages, studio QR imprimable, analytics d'engagement, messagerie chiffrée, espace équipe multi‑utilisateurs, API publique, domaines personnalisés, animation d'entrée de page, système d'emails.

**Santé technique en un coup d'œil :**

| Indicateur | Valeur | État |
|---|---|---|
| Erreurs TypeScript (`tsc --noEmit`) | 0 | 🟢 |
| `ignoreBuildErrors` | `false` (le build Vercel casse sur toute erreur TS) | 🟢 |
| Tests (Vitest) | 643 passés / 36 fichiers | 🟢 |
| Build de production | OK (82 pages générées) | 🟢 |
| Lignes de code (src) | ~65 340 | — |
| Fichiers TS/TSX | 252 | — |
| Commits | 1 169 | — |
| Migrations SQL | 36 | 🟠 (à vérifier appliquées en prod) |
| Routes API | 47 | 🟢 |
| TODO/FIXME résiduels | 1 | 🟢 |

**Les 3 choses à régler avant d'ouvrir les vannes :**
1. **Stripe** — créer les prix (Starter/Pro/Business, mensuel + annuel) et renseigner les 6 `..._PRICE_ID` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` côté Vercel. **Bloquant paiement.**
2. **Migrations en production** — s'assurer que les 36 migrations sont appliquées sur la base Supabase de prod (notamment `page_events`, `qr_status`, `team_*`, `increment_redirect_hit`).
3. **Variables d'environnement** — Upstash (rate‑limit), Resend (emails), Anthropic (génération IA, optionnelle) : activer ou assumer le repli gracieux.

---

## 2. Stack technique

- **Framework :** Next.js `16.2.6` (App Router), React `18.3.1`, TypeScript.
- **UI :** styles **inline** (pas de Tailwind côté runtime — Tailwind seulement via `prettier-plugin-tailwindcss`), polices auto‑hébergées (Inter + alias Fraunces/DM Sans en `@font-face`), palette sémantique en tokens CSS (`globals.css`).
- **Base de données :** Supabase (Postgres + RLS + Storage), 36 migrations versionnées.
- **Paiement :** Stripe `^22.2.0` (checkout, portail, webhook).
- **Emails :** Resend `^6.12.4` + coquille HTML partagée « bulletproof » (`lib/emailLayout`).
- **Rate‑limit :** Upstash Redis REST (`lib/rateLimit`) avec **repli mémoire gracieux** si non configuré.
- **QR / graphisme :** `qr-code-styling`, `fabric` (canvas Print Studio), `jspdf` (export PDF), `recharts` (analytics), `react-simple-maps` (carte géo).
- **IA :** `@anthropic-ai/sdk` `^0.111.0` (génération de page — **dormante**, attend la clé).
- **Tests :** Vitest (helpers purs), `package.json` **à la racine** du monorepo (pas dans `apps/web`).
- **Qualité :** husky + lint‑staged + commitlint + prettier ; garde‑fou `check-jsx-imports.mjs` (imports lucide inexistants).

---

## 3. Architecture & arborescence

Monorepo (`turbo`) avec une app principale `apps/web`.

**Routes publiques :** `/` (landing), `/features`, `/examples`, `/upgrade`, `/contact`, `/legal`, `/privacy`, `/terms`, `/[slug]` (page publique), `/q/[code]` (résolution QR).

**Espace connecté (`/dashboard`) :** `dashboard`, `analytics`, `assets` (Médias), `avatar`, `builder` (+ `[pageId]`), `domains`, `goals` (Objectifs), `leads` (Messages), `profile`, `qr-codes` (QR Studio + Print Studio), `qr-link` (QR instantané), `redirects`, `settings`, `subdomain`, `team` (+ `team/accept`), `templates`.

**47 routes API**, regroupables en :
- **Contenu :** `pages/create`, `templates/use`, `qr-duplicate`, `qr-status`, `qr-style`, `qr-destination`, `qr-stats/[id]`.
- **Facturation :** `stripe/checkout`, `stripe/portal`, `webhooks/stripe`.
- **Analytics/tracking :** `track`, `goals`, `cron/prune-events`, `cron/quota-alerts`.
- **Messagerie/leads :** `leads`, `emails/*` (welcome, new‑lead, lead‑confirmation, first‑scan, weekly, subscription).
- **Équipe :** `team`, `team/accept`, `team/member`.
- **Domaines :** `domains`, `domains/check`, `domains/resolve`, `domains/routes`, `domains/ssl`, `subdomain`, `subdomain/resolve`.
- **API publique (Business) :** `v1/pages`, `v1/qr-codes`, `v1/qr/[code]/destination`, `keys`.
- **Rapports :** `reports/send`, `reports/subscribe`, `reports/unsubscribe`.
- **Compte/RGPD :** `account/delete`, `account/export`, `contact`.
- **IA/médias :** `generate-page` (dormante), `unsplash`, `print-design`.

**Bibliothèque de helpers purs (`lib/`) — testée, à réutiliser (ne pas réimplémenter) :** `plans`, `quota`, `slug`, `safeUrl`, `escapeHtml`, `jsonLd` / `landingJsonLd`, `domain`, `rateLimit`, `apiAuth`, `team`, `webhookLogic`, `stripePlan`, `detectTrafficSource`, `eventRetention`, `emailLayout`/`emails`, `trackPageView`/`trackEngagement`/`trackLinkClick`, `useIsMobile`/`useAccent`.

---

## 4. Inventaire des fonctionnalités

| Domaine | Fonctionnalité | Statut |
|---|---|---|
| **Éditeur** | BuilderV4 (blocs, thèmes, upsert préservant les IDs) | 🟢 Complet |
| **Éditeur** | Répéteurs dynamiques (24 blocs via `RepeaterEditor`) | 🟠 Renderers publics à valider visuellement (>4 items) |
| **Éditeur** | Bibliothèque « Infos » (FAQ, Documents, Horaires, Équipe, Timeline) | 🟢 |
| **Éditeur** | Animation d'entrée de page (Pro+), 6 styles, anti‑flash | 🟢 |
| **QR** | QR Studio (styles, branding, qualité), éditeur de scannabilité | 🟢 Monolithe (4 123 l) |
| **QR** | Print Studio (canvas fabric, préflight impression, export PDF/SVG) | 🟢 Monolithe (6 156 l) |
| **QR** | QR instantané (Lien/WiFi/Texte/Contact/Appel/Email) — accès barre latérale | 🟢 |
| **QR** | Cycle de vie QR (active/paused/draft/archived) + résolution `/q/[code]` | 🟢 |
| **Quota** | Création jusqu'à 300 pages ; seuls les **QR actifs** comptent pour le plan | 🟢 Récent |
| **Analytics** | Scans, vues, sources, appareils, carte géo | 🟢 |
| **Analytics** | Engagement : profondeur de lecture, impressions de blocs, CTR réel | 🟢 (`page_events`) |
| **Analytics** | Rapports auto par email (hebdo) | 🟠 `reports/send` à aligner sur la coquille email |
| **Messagerie** | Leads + messagerie chiffrée bout‑en‑bout | 🟢 |
| **Équipe** | Multi‑utilisateurs (owner/admin/editor), invitations email, RLS partagé | 🟢 Complet (Phases 1–5) |
| **Domaines** | Sous‑domaine + domaines personnalisés + SSL + routes multi‑marques | 🟢 |
| **API publique** | Clés `qrk_` (SHA‑256), endpoints `v1/*` | 🟢 (Business) |
| **Facturation** | Stripe checkout/portail/webhook, email d'abonnement | 🟠 Prix Stripe à créer |
| **IA** | Génération de page par IA | 🔴 Dormante (attend `ANTHROPIC_API_KEY`, route → 503 propre) |
| **Landing** | Hero refait, JSON‑LD SEO, `llms.txt`, règle anti‑faux‑chiffres | 🟢 |
| **Mobile** | Refonte mobile (primitives `components/mobile/`), désencombrement récent | 🟠 En cours |

---

## 5. Modèle de données (36 migrations)

**Socle :** `20260521_initial_schema` (profiles, pages, blocks, qr_codes, scans…) + `storage`.

**Extensions notables :**
- Analytics : `traffic_sources` (002), `conversion_goals` (005), `page_events` (019) + valeur (020) + tap (021), `analytics_composite_indexes` (163).
- QR : `qr_style_config` (011), `qr_destinations` (012), `qr_status` (013).
- Domaines : `domain_verifications` (006), `domain_routes` (007), `multibrand_domains` (008), `redirections` (009) + `increment_redirect_hit` (163).
- Messagerie : `leads` (016), `leads_status` (017), `leads_user_id` (163).
- Équipe : `team_foundation`, `team_rls`, `team_owner_unique`, `team_invitation_expiry` (163).
- Durcissement : `security_hardening`, `storage_hardening`, `slug_global_unique`, `close_public_analytics_inserts`, `log_activity_search_path`.
- Divers : `avatar`, `affiliation_and_fixes`, `blocks_type_text` (018 — enum de type supprimé), `preferences` (015), `activity_logs` (014).

> ⚠️ **Distinction clé :** les migrations existent **dans le dépôt**. Il faut vérifier qu'elles sont **appliquées sur la base de production**. Historiquement certaines n'ont été appliquées que partiellement (d'où le fix récent de la pause QR qui a supprimé la dépendance à `paused_at`/`archived_at`).

---

## 6. Sécurité & conformité

**Points forts :**
- **RLS partout** avec helpers `SECURITY DEFINER` (`can_read_owner`/`can_write_owner`) pour l'accès équipe.
- **Revue sécurité du 27/07/2026 : 11 findings corrigés** (open‑redirect HIGH, SSRF, gating Équipe, clés API stockées en clair → SHA‑256…).
- **Durcissement DB** : `search_path` figé sur les fonctions, inserts analytics publics fermés, slug unique global, storage durci.
- **Rate‑limit distribué** (Upstash) avec repli mémoire — pas de plantage si non configuré.
- **Sérialisation JSON‑LD anti‑XSS** (`serializeJsonLd`), `escapeHtml`, `safeUrl` (anti open‑redirect) — tous testés.
- **RGPD** : export (`account/export`) et suppression (`account/delete`) de compte, hébergement UE, messages chiffrés.

**À finir / vérifier :**
- Durcissements domaines restants (cf. mémoire revue sécurité).
- Migration `increment_redirect_hit` **appliquée en prod** (évite un compteur de redirection incohérent).
- Secrets **jamais** en clair côté client : `sk_live_`, `VERCEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` restent côté serveur/env Vercel.

---

## 7. Qualité du code & dette technique

**Forces :**
- Typage strict effectif (build cassant sur erreur TS), 643 tests sur les helpers purs.
- Slug centralisé (`lib/slug`), quota centralisé (`lib/quota`), sources de vérité uniques.
- Garde‑fou build contre les imports lucide inexistants (lucide‑react 1.17 sans icônes de marque).

**Dette — fichiers monolithes (priorité de refactor par taille) :**

| Fichier | Lignes | Remarque |
|---|---:|---|
| `qr-codes/PrintStudio.tsx` | 6 156 | Canvas fabric — non refactorable sans validation visuelle |
| `builder/types.ts` | 5 473 | Types + **helpers purs testés** (URLs, fichiers, embeds) — dense mais testé |
| `qr-codes/QRStudio.tsx` | 4 123 | Monolithe QR — nombreux états, non refactorable à l'aveugle |
| `app/page.tsx` (landing) | 3 883 | Landing premium, une seule page |
| `profile/page.tsx` | 3 284 | Beaucoup de sous‑onglets |
| `[slug]/PublicPageClient.tsx` | 3 096 | Rendu public — **drift de rendu** à surveiller |

- **BuilderV4** a déjà été éclaté (6 819 → ~2 397 l à l'origine) en 5 modules (preview/panels/hooks/constants). QRStudio et PrintStudio restent à décomposer **avec un rendu visuel** sous les yeux.
- **Drift de rendu public** : certains blocs pouvaient être invisibles à la publication ; réparation par lots en cours (Event/vCard restants à vérifier).
- **Migration design‑tokens** écran par écran (Messages = référence) — en cours.

---

## 8. Points forts du projet

1. **Complétude fonctionnelle** rare pour un produit à ce stade (équipe, API, domaines, analytics d'engagement, messagerie chiffrée).
2. **Discipline de qualité** : typage strict + tests + garde‑fous build, commits atomiques en français.
3. **Sécurité prise au sérieux** : audit mené, findings corrigés, RLS + durcissements DB.
4. **Repli gracieux** systématique (rate‑limit, IA, emails) : rien ne plante si un service n'est pas configuré.
5. **Cohérence de marque** (noir/or, anti‑faux‑chiffres sur la landing) et **SEO** (JSON‑LD, llms.txt).

---

## 9. Risques & éléments en attente

| # | Élément | Sévérité | Action |
|---|---|---|---|
| R1 | Prix Stripe non créés + `..._PRICE_ID` manquants | 🔴 Bloquant paiement | Créer les 6 prix, renseigner l'env Vercel, tester un checkout de bout en bout |
| R2 | Migrations prod potentiellement partielles | 🔴 Élevé | Auditer l'état réel de la base de prod vs les 36 migrations |
| R3 | Features Business « Bientôt » non construites mais vendues | 🟠 Moyen | Clarifier l'affichage (mention « Bientôt ») ou construire avant de facturer le plan |
| R4 | Renderers publics modifiés à l'aveugle (répéteurs >4 items, Event/vCard) | 🟠 Moyen | Validation visuelle sur des pages réelles |
| R5 | Monolithes QRStudio/PrintStudio | 🟠 Moyen (maintenabilité) | Décomposer progressivement, avec rendu visuel |
| R6 | Génération IA dormante | 🟢 Faible | Activer `ANTHROPIC_API_KEY` quand le budget/UX est prêt (coût nul tant que dormant) |
| R7 | `reports/send` non aligné sur la coquille email | 🟢 Faible | Aligner sur `lib/emailLayout` |
| R8 | Upstash/Resend non configurés | 🟢 Faible | Renseigner l'env (sinon repli mémoire / emails inactifs) |

---

## 10. Roadmap recommandée (priorisée)

**P0 — Avant lancement commercial**
1. Configurer Stripe (prix + webhooks + env) et **tester un cycle complet** (checkout → webhook → email d'abonnement → accès plan).
2. Auditer et appliquer **toutes** les migrations sur la base de prod.
3. Valider visuellement les **renderers publics** (répéteurs, Event, vCard) sur des pages réelles.

**P1 — Consolidation**
4. Décider du sort des features Business « Bientôt » (construire ou étiqueter).
5. Aligner `reports/send` sur la coquille email et vérifier l'envoi hebdo.
6. Finir la migration design‑tokens écran par écran.

**P2 — Dette & scale**
7. Décomposer QRStudio puis PrintStudio (avec rendu visuel).
8. Terminer la refonte mobile (décision chrome sombre en attente).
9. Activer la génération IA quand le moment est venu.

---

## 11. Checklist de mise en production

- [ ] Prix Stripe créés (Starter/Pro/Business × mensuel/annuel) + 6 `..._PRICE_ID` en env Vercel.
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` en env (jamais côté client).
- [ ] Webhook Stripe pointé sur `/api/webhooks/stripe` et testé.
- [ ] 36 migrations appliquées sur la base de prod (vérif `page_events`, `qr_status`, `team_*`, `increment_redirect_hit`).
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` OK.
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` + `CONTACT_EMAIL` (emails).
- [ ] `UPSTASH_REDIS_REST_URL` / `_TOKEN` (rate‑limit) — sinon repli mémoire assumé.
- [ ] `CRON_SECRET` pour `cron/prune-events` et `cron/quota-alerts`.
- [ ] `NEXT_PUBLIC_APP_URL` = domaine de prod.
- [ ] (Optionnel) `ANTHROPIC_API_KEY`, `UNSPLASH_ACCESS_KEY`, `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` (domaines).
- [ ] `tsc` = 0 erreur, `pnpm test` = 643 verts, build OK (vérifiés le 2 août 2026).
- [ ] Test manuel : inscription → création page → publication → scan QR → analytics → pause QR → réactivation.

---

*Document généré à partir de l'état réel du dépôt (branche `main`, commit `1545fb7`). Les mentions « à vérifier en prod » relèvent de la configuration serveur, non visible depuis le code.*
