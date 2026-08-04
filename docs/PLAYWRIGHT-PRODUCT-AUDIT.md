# Audit produit Playwright (B11) — exécution réelle

> Résultats d'une **exécution réelle** de Chromium (desktop + mobile) sur QRowg local. Aucun
> résultat inventé. Distinction stricte : **exécuté / réussi / échoué / ignoré (raison) / non couvert**.

## Environnement

| Élément | Valeur |
| --- | --- |
| Playwright | `@playwright/test` 1.62.1 |
| Navigateur | Chromium 151 (headless shell bundled) — **lancement prouvé** |
| Serveur | `next dev` (apps/web) port 3100, démarré/réutilisé par `webServer` |
| Projets | `desktop` (1280×900), `mobile` (390×844 tactile) |
| Env | `apps/web/.env.local` (Supabase présent) ; pas de compte de test → parcours authentifiés ignorés |

## Résultats globaux (réels)

```
6 passed · 8 skipped · 0 failed   (25,4 s, 2 projets)
```

| Spec | Projet | Statut | Détail |
| --- | --- | --- | --- |
| smoke — landing publique | desktop | ✅ passé | HTTP <400, body visible, 0 erreur même-origine |
| smoke — landing publique | mobile | ✅ passé | idem |
| smoke — dashboard anonyme | desktop | ✅ passé | statut <500 (pas de crash) |
| smoke — dashboard anonyme | mobile | ✅ passé | idem |
| shared-blocks — 51 blocs harness | desktop | ✅ passé | 51 blocs rendus, 0 « NO ADAPTER », 0 erreur console/hydratation même-origine, captures ciblées |
| shared-blocks — 51 blocs harness | mobile | ✅ passé | idem (390×844) |
| journey (création→publication) | desktop+mobile | ⏭️ ignoré | **Requiert un compte de test Supabase** (E2E_TEST_EMAIL/PASSWORD) |
| forms contact/quote | desktop+mobile | ⏭️ ignoré | **Requiert page publiée + compte de test** (éviter écriture de leads réels) |
| builder mobile | mobile | ⏭️ ignoré | **Requiert un compte de test** pour ouvrir le Builder |

## G. Smoke tests
Landing publique : **chargée sans erreur critique** (desktop + mobile), capture attachée. Dashboard
anonyme : **ne crashe pas** (statut < 500). Redirection/écran d'auth non asserté finement (compte absent).

## H. Parcours principal
**NON COUVERT (ignoré, prérequis explicite)** : connexion/création/Builder/sauvegarde/publication/
public nécessitent un compte de test Supabase, absent ici. Squelette prêt (`journey.spec.ts`) :
renseigner `.env.e2e` pour l'activer. La logique sous-jacente reste couverte en unités (B02-B04).

## I. Sauvegarde / J. Publication
**NON COUVERT en navigateur** (mêmes prérequis). Fiabilité couverte par tests unitaires antérieurs.

## K. Formulaires (contact / quote)
**NON COUVERT (ignoré)** : soumission réelle = écriture Supabase → nécessite page publiée + compte de
test ; évitée pour ne pas créer de leads réels. Logique testée en unités (`forms.test.tsx`,
`leadForms.test.ts`, B09.13).

## L. Mobile
Harness des 51 blocs + landing exécutés sur le **projet mobile (390×844, tactile)** : **rendu propre,
aucune erreur**. Le **Builder mobile** (bottom bar, panneaux, clavier) reste **non couvert** (auth requise).

## M. Blocs shared (le résultat central)
**Les 51 blocs shared rendent dans un vrai Chromium (desktop ET mobile) sans erreur console,
sans erreur d'hydratation, sans échec réseau même-origine, et tous ont un adapter (0 « NO ADAPTER »).**
C'est exactement la lacune signalée au checkpoint B10, désormais **comblée au niveau rendu+hydratation**.
Captures ciblées (preuves, attachées au rapport) : `timeline, pricing, video_local, audio_player,
spotify_embed, video, google_maps_embed, album_block, discography, product_catalog, image, before_after`.

> Portée exacte : validé = **rendu réel + hydratation + absence d'erreur** avec fixtures déterministes.
> La **comparaison pixel fine shared vs legacy** et la **parité éditeur↔public visuelle** ne sont pas
> encore des gates automatiques (voir § Snapshots du guide) — prochaine étape possible.

## N. Shared contre legacy
**NON COUVERT automatiquement** : le harness rend le public shared ; une comparaison legacy nécessite
un second harness renderer=legacy (préparable). Non fait ici (périmètre).

## O. Médias et iframes
Les blocs `video` (YouTube), `spotify_embed`, `google_maps_embed` **rendent leur conteneur iframe**
avec l'URL canonique (attributs vérifiés via le harness), mais **le chargement du tiers échoue** en
environnement réseau restreint (`ERR_HTTP2_PROTOCOL_ERROR`) — **attendu**, exclu du gate (§20).
`video_local`/`audio_player` : éléments natifs présents (source `exemple.com` non chargée, attendu).

## P. Console (observé)
| Message | Page | Fréquence | Gravité | Cause |
| --- | --- | --- | --- | --- |
| `Failed to load resource: ERR_HTTP2_PROTOCOL_ERROR` | harness | par embed tiers | **ignoré** | iframe tierce non joignable (réseau restreint) — pas un bug produit |
| `Download the React DevTools…` | toutes | 1× | ignoré | message dev standard |
| *(aucune erreur même-origine)* | — | — | — | — |

## Q. Réseau (observé)
Aucune réponse **4xx/5xx même origine** ; aucun `requestfailed` même origine. Échecs uniquement sur
hôtes tiers (spotify/youtube/google), exclus. Aucune 5xx sur landing ni dashboard anonyme.

## R. Accessibilité
Non audité en profondeur ici (pas d'Axe ajouté). Le harness confirme la présence structurelle des
blocs ; l'a11y fine (Tab/focus/labels réels) reste à couvrir dans les parcours authentifiés.

## S. Performance
Observations réelles (dev, à froid) : landing ≈ 2,3–2,6 s (compile dev incluse) ; harness 51 blocs
rendu < 5 s. Non représentatif d'un build de prod ; pas de métrique inventée.

## T. Bugs détectés
| ID | Gravité | Reproduction | Attendu | Observé | Origine |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | **Aucun P0/P1** détecté sur le périmètre exécuté (public + harness) | — |

## U. Corrections effectuées
**Aucune** correction produit (aucun P0/P1 trouvé sur le périmètre couvert). Seul ajustement : le
collecteur E2E filtre les échecs de ressources **tierces** (comportement de test, pas produit).

## V. Tests Playwright
**6 passés, 8 ignorés (raisons explicites), 0 échoué** — exécution réelle Chromium desktop + mobile.

## W. Tests Vitest
**1392 passés** (69 fichiers) — aucune régression.

## X. Typecheck & build
Typecheck **0 erreur**. Build **Compiled successfully, 84/84 pages statiques** (harness = route
dynamique `ƒ`, gatée 404 en prod, hors compte statique).

## Y. CI
Job `e2e` **manuel** ajouté (`workflow_dispatch`, périmètre public). Prérequis documentés
(secrets Supabase publics ; compte de test pour l'authentifié). Non branché sur chaque push.

## Décisions

### Renderer shared : **POURSUIVRE (prudemment)**
Le rendu + l'hydratation des 51 blocs shared sont **prouvés dans un vrai navigateur** (desktop +
mobile), sans erreur. Le risque résiduel se limite à la **parité pixel fine** (non encore gate) et
aux **parcours authentifiés** (non couverts). ⇒ La migration peut reprendre, en ajoutant
progressivement des comparaisons visuelles et en obtenant un compte de test pour les flux Builder.

### Formulaires : **REPORTER B09.14 jusqu'au compte de test**
La soumission réelle (contact/quote) n'a pas pu être testée en navigateur (compte de test absent,
écriture de leads à éviter). Fournir un compte de test Supabase, activer `forms.spec.ts`/
`journey.spec.ts`, PUIS lancer B09.14. La logique est prête et unit-testée.

## Prochaine action recommandée
**Fournir un compte de test Supabase** (`.env.e2e`) pour activer les parcours authentifiés
(journey + forms + builder mobile) déjà squelettés — c'est le seul déblocage manquant pour une QA
navigateur complète et pour B09.14.

---

# B11.1 — QA navigateur AUTHENTIFIÉE (mise à jour)

## Compte de test & chargement d'environnement
- `.env.e2e` (ignoré par Git) contient `E2E_TEST_EMAIL` et `E2E_TEST_PASSWORD` — **présence
  confirmée, valeurs jamais affichées**. Chargé sans dépendance par `playwright.config.ts`.
- Helper de connexion réel `e2e/helpers/auth.ts` : `/auth/login` → `#email`/`#password` →
  bouton « Se connecter » (server action `signIn`) → attente `/dashboard`.

## Parcours authentifiés implémentés (actifs, gatés par le compte)
- `journey.spec.ts` : **connexion → dashboard (CTA « Nouvelle page » visible) → ouverture du
  Builder** (`/dashboard/builder/new`, bouton « Publier » présent) + captures. Sélecteurs
  vérifiés dans le code (LoginForm, DashboardClient, BuilderV4).
- `builder-mobile.spec.ts` : connexion sur le projet **mobile** → Builder → **aucun overflow
  horizontal** (`scrollWidth - clientWidth ≤ 1`) + capture.
- `forms.spec.ts` : `contact_form` sur une page publiée de test (`E2E_CONTACT_PAGE_URL`) — rendu,
  validation email, bouton désactivé tant que requis manquants ; soumission réelle seulement si
  `E2E_ALLOW_LEAD_SUBMIT=1` (compte de test, données factices) pour éviter tout lead/email non voulu.

## Résultat RÉEL de l'exécution (dans ce sandbox)

```
6 passed · 6 skipped · 0 failed
```

- **Tests publics (6) : passés** (smoke + harness 51 blocs, desktop + mobile) — inchangé.
- **Tests authentifiés (6) : IGNORÉS** — et c'est un **blocage d'environnement, pas un bug ni un
  problème de compte** :
  - la tentative de connexion réelle a été exécutée (page login remplie + soumise) ;
  - le server action `signIn` a échoué avec `fetch failed` → redirection `/auth/login?error=fetch` ;
  - diagnostic : l'hôte du projet **Supabase est injoignable depuis ce sandbox** (`ENOTFOUND` —
    DNS de `*.supabase.co` non résolu), alors que l'HTTPS générique fonctionne (`example.com` 200) ;
  - conséquence : login/création/sauvegarde/publication/soumission (tous adossés à Supabase) ne
    peuvent PAS s'exécuter ici → les specs **skippent avec raison explicite** (`loginOrSkip`), sans
    faux succès ni faux échec.

## Portée / honnêteté
Les parcours authentifiés sont **implémentés et prêts** ; ils s'exécuteront tels quels sur **toute
machine où le projet Supabase est joignable** (la machine de l'utilisateur, ou une CI avec accès
Supabase). Ils **n'ont pas pu être observés en succès dans ce sandbox** (réseau/DNS restreint vers
Supabase) — aucune capture de succès authentifié n'est donc produite ici, et rien n'est déclaré
validé à tort. Le déblocage restant est purement **environnemental** (accès réseau à Supabase).

## Décision (mise à jour)
- **Renderer** : poursuivre prudemment (inchangé — rendu des 51 blocs prouvé en navigateur).
- **QA authentifiée** : infrastructure **complète et exécutable** ; lancer `pnpm test:e2e` **sur un
  environnement où Supabase est joignable** pour obtenir les preuves des parcours Builder/publication.
- **B09.14** : reste conditionné à une exécution authentifiée réussie (page + soumission de formulaire).
