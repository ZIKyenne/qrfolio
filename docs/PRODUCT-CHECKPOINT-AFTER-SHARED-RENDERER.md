# Checkpoint produit après la reconstruction du renderer (B10)

> **Avertissement d'honnêteté (déterminant).** Cette mission demande une validation en **vrai
> navigateur** (parcours interactifs, mobile, console runtime, performance, captures). L'agent qui
> a exécuté B10 est un **agent CLI sans automatisation de navigateur** : ni Playwright ni Puppeteer
> installés (et la mission interdit de les ajouter pour l'occasion), aucun outil de pilotage/capture
> de navigateur, **aucune vision de l'écran**. Chrome est installé mais ne peut être ni piloté, ni
> observé, ni inspecté (console/réseau/perf) par cet agent.
>
> Conformément à la règle anti-fake du projet et à la consigne répétée de la mission
> (« Ne déclare pas cette QA effectuée sans navigateur réel »), **aucun résultat de navigateur n'est
> inventé**. Les sections interactives sont marquées **`NON EXÉCUTÉ`** avec la raison. Ce document
> livre : (1) les signaux **automatisés réels**, (2) un audit **fondé sur le code**, (3) une
> procédure de QA navigateur prête à exécuter par un humain / une CI, (4) une roadmap fondée
> uniquement sur des constats réels. **La QA navigateur reste requise avant de poursuivre les
> migrations.**

## A. Environnement réel

| Élément | Valeur |
| --- | --- |
| OS | Windows 11 (agent CLI) |
| Commit | `79ef4d20` (HEAD, arbre propre) |
| Navigateur pilotable | **aucun** (Chrome installé mais non pilotable par l'agent) |
| Playwright / Puppeteer | **absents** (non ajoutés — interdit par la mission) |
| Outil de capture/console navigateur | **aucun** |
| Env Supabase | `apps/web/.env.local` présent (non ouvert — données potentiellement réelles, non touchées) |
| Serveur dev lancé | **non** (aucune interaction possible ⇒ inutile et risque données prod) |
| Signaux exécutables réellement | `vitest run`, `tsc --noEmit`, `next build`, greps statiques |

## B. Résumé exécutif (≤10 points)

1. **Signaux automatisés au vert** : 1392 tests, typecheck 0 erreur, build 84/84.
2. **51 blocs shared** confirmés dans `SHARED_RENDERER_BLOCKS` ; chacun a une **parité structurelle**
   testée (`renderToStaticMarkup`, waves 1-8 + renderParity/models).
3. **Aucune QA navigateur exécutée** (environnement sans navigateur pilotable) : la parité **pixel/
   runtime, le mobile, la console runtime et la performance NE SONT PAS vérifiés**.
4. **Aucun P0/P1 détecté par les moyens disponibles** — mais l'absence de QA navigateur signifie que
   des P0/P1 **visuels/runtime** pourraient exister et ne pas être vus.
5. **Risque principal = dette de vérification** : 51 blocs migrés sans validation visuelle, +
   déviations volontaires (autoplay éditeur retiré, itinéraire maps neutralisé, covers album/catalog
   passées en SmartImage, URLs embed non reconnues désormais masquées).
6. Scan statique **propre** : aucun `Date.now`/`Math.random`/`new Date`/`typeof window` en rendu
   partagé (pas de nondéterminisme d'hydratation), aucun `dangerouslySetInnerHTML`.
7. Divergences **connues et non résolues** (code) : `latest_release`/`playlist_block`/`presave`
   (cta_label §7), `reservation_form.phone` (orphelin), `embed_block`/`media_before_after` (bloqués).
8. Formulaires : infrastructure prête (B09.13) mais **non testée en soumission réelle** ici.
9. **Décision renderer : RALENTIR** — pas de nouvelle migration tant qu'une QA navigateur réelle
   (humaine ou CI Playwright) n'a pas validé les 51 blocs actifs.
10. **Décision formulaires : REPORTER B09.14** (Option C) jusqu'à la QA navigateur.

## C. Parcours critiques

| Parcours | Méthode dispo | Statut | Note |
| --- | --- | --- | --- |
| Connexion (5.1) | navigateur requis | **NON EXÉCUTÉ** | auth Supabase interactive, non pilotable |
| Création de page (5.2) | navigateur requis | **NON EXÉCUTÉ** | — |
| Édition (5.3) | navigateur requis | **NON EXÉCUTÉ** | logique testée en unités (builderSearch, saveController, etc.) |
| Sauvegarde (5.4) | navigateur requis | **NON EXÉCUTÉ** | single-flight/atomicité couverts par tests unitaires (B02-B04) |
| Publication (5.5) | navigateur requis | **NON EXÉCUTÉ** | publish/revalidate couverts par tests unitaires |
| Page publique (5.6) | navigateur requis | **NON EXÉCUTÉ** | rendu SSR non observé |

## D. 51 blocs shared — synthèse

| Classe | Nombre | Base de la classification |
| --- | ---: | --- |
| VALIDÉ (parité **structurelle** uniquement) | 51 | parité `renderToStaticMarkup` verte (waves 1-8) |
| ÉCART MINEUR (documenté, non visuel) | 5 | déviations volontaires (voir §E) |
| RÉGRESSION prouvée | 0 | aucune détectée par tests/greps |
| BLOQUANT | 0 | aucun détecté par les moyens dispo |
| **NON TESTÉ (visuel/mobile/runtime)** | **51** | **aucune QA navigateur exécutée** |

> Traduction honnête : les 51 blocs sont **structurellement** conformes (HTML/styles/attrs comparés
> au legacy en tests), mais **aucun** n'a été vu dans un navigateur. « VALIDÉ » ici = structurel,
> pas visuel.

## E. Écarts / déviations shared (constats CODE, non visuels)

| Bloc / helper | Déviation volontaire (mission) | Origine | Gravité estimée | À vérifier en navigateur |
| --- | --- | --- | --- | --- |
| video_local | autoplay **retiré en éditeur** (jamais en public si absent) | B09.10 §8/§15 | P3 | l'éditeur ne lance plus la vidéo (voulu) |
| google_maps_embed | itinéraire **neutralisé en éditeur** (live en public) | B09.12 | P3 | lien non cliquable au canvas (voulu) |
| album_block / product_catalog | cover **`<img>` → SmartImage** en public | B09.12 | P2 | parité visuelle des covers (optim Supabase) |
| video / google_maps_embed | URL non allowlistée → **plus d'iframe** (avant : iframe brute) | B09.11/12 | **P2** | régression possible pour URLs non standard collées |
| spotify_embed / video / maps | dépend d'iframes tierces (consentement/adblock) | — | P2 | comportement visiteur réel |
| tous | `key={i}` sur répéteurs (hérité legacy) | legacy | P4 | réordonnancement (pré-existant, legacy identique) |

## F. Blocs legacy critiques (constats CODE)

| Bloc | État | Constat |
| --- | --- | --- |
| contact_form / quote_form / booking_request | legacy, sain | via `LeadFormPublic` (fiable, testé) ; **pilotes** B09.14 prêts |
| reservation_form | legacy | champ `phone` **orphelin** (panel, non rendu/envoyé) — non bloquant |
| event_register / rsvp | legacy | composants dédiés (data FR / choix) — patterns distincts |
| latest_release / playlist_block / presave | legacy **bloqués** | `cta_label` rendu éditeur jamais public (§7) — correction requise avant migration |
| embed_block | legacy **bloqué** | iframe d'URL arbitraire (aucun provider) |
| media_before_after | legacy **bloqué** | slider accessible non conçu |
| payment_button / qr_code_block / cover_banner / about / add_to_calendar / countdown / gallery / image_carousel / tabs_block / accordion_block / instagram_feed / tiktok_feed | legacy | **NON TESTÉS en navigateur** ; divergences connues consignées dans la matrice |

## G. Formulaires

**NON EXÉCUTÉ** (soumission réelle impossible sans navigateur + éviter les données prod). Couverture
disponible : `LeadFormPublic`/`submitLead`/`contactFormFields` testés en unités ; machine d'états +
payload purs testés (B09.13). Notification propriétaire / accusé visiteur / honeypot / anti-double :
**logique** testée, **runtime** non vérifié.

## H. Sauvegarde / I. Publication

**NON EXÉCUTÉ en navigateur.** Fiabilité couverte par tests unitaires antérieurs (single-flight
`saveController`, publication atomique + revalidation, taxonomie d'erreurs — B02/B03/B04). Le
comportement réseau réel (latence, coupure, retry, double-clic) n'a **pas** été observé ici.

## J. Mobile / K. Templates / L. Thèmes / M. Console-réseau / N. Performance / O. Accessibilité

**NON EXÉCUTÉ** — tous requièrent un navigateur pilotable (viewports, DevTools, mesures, focus,
lecteur d'écran). Aucune donnée inventée. Procédure prête ci-dessous (§ Procédure QA).

## P. P0 — `Aucun` détecté par les moyens disponibles (QA navigateur non exécutée).
## Q. P1 — `Aucun` détecté par les moyens disponibles (QA navigateur non exécutée).

## R. P2 (priorisés, à confirmer en navigateur)

1. Parité **visuelle** des 51 blocs shared vs legacy (jamais observée) — risque cumulé.
2. Régression possible : URLs vidéo/carte **non standard** ne s'affichent plus (durcissement B09.11/12).
3. Covers album/product en SmartImage (format/dimension) — parité visuelle.
4. Comportement iframes tierces (Spotify/YouTube/Maps) côté visiteur (consentement/adblock).
5. Mobile des panneaux du Builder (non vérifié depuis la refonte) — historiquement critique (mémoire projet).

## S. P3 / P4

- P3 : déviations éditeur volontaires (autoplay video_local, itinéraire maps) — à confirmer acceptables.
- P4 : `key={i}` sur répéteurs (hérité legacy, identique des deux côtés) ; nettoyage `reservation_form.phone`.

## T. Corrections réalisées — `Aucune`
Aucun P0/P1 prouvé ⇒ aucune correction de code (mission §22/§26 : diff documentaire uniquement).

## U. Rollbacks shared — `Aucun`
Aucune régression shared prouvée ⇒ aucun retrait du flag.

## V. Décision renderer shared : **RALENTIR**

- Les 51 blocs sont **structurellement** stables (parité testée) mais **non validés visuellement**.
- **Ne pas** poursuivre les migrations (ni B09.14, ni vagues suivantes) tant qu'une **QA navigateur
  réelle** (humaine ou CI Playwright) n'a pas couvert les 51 blocs actifs + les déviations §E.
- Gain de l'architecture : **réel au niveau code** (source unique, isolation de bundle, sécurité URL
  renforcée, tests de parité) mais **non prouvé côté rendu** faute d'observation.
- Blocs à ne jamais partager complètement (confirmés) : `embed_block` (iframe arbitraire),
  `media_before_after` (slider) tant que non conçus/sécurisés.

## W. Décision formulaires : **REPORTER (Option C)**

Ne pas lancer B09.14 à l'aveugle. Priorité : obtenir la QA navigateur du socle actuel (51 blocs +
formulaires legacy). Ensuite seulement, migrer `contact_form` puis `quote_form` (pilotes prêts).

## X. Nouvelle roadmap (fondée sur les constats réels)

### Niveau 1 — Bloquants
| Priorité | Tâche | Impact | Effort | Risque | Dépendance |
| --- | --- | --- | --- | --- | --- |
| P1-infra | **Mettre en place une QA navigateur** (Playwright en CI OU passe humaine documentée) | débloque toute validation produit | moyen | faible | — |

### Niveau 2 — Expérience essentielle (après QA navigateur)
| Priorité | Tâche | Impact | Effort | Risque |
| --- | --- | --- | --- | --- |
| P2 | Vérifier parité **visuelle** des 51 blocs (desktop+mobile) | fiabilité rendu | moyen | faible |
| P2 | Vérifier le durcissement URLs vidéo/carte (pas de régression utilisateur) | évite pages cassées | faible | moyen |
| P2 | Auditer le **mobile du Builder** (panneaux/bottom bar) | usage mobile | moyen | faible |

### Niveau 3 — Valeur produit visible
| Priorité | Tâche | Impact |
| --- | --- | --- |
| P3 | Onboarding / templates / QR Studio / analytics d'engagement | acquisition/rétention |

### Niveau 4 — Dette technique
| Priorité | Tâche |
| --- | --- |
| P4 | Corriger cta_label §7 (latest_release/playlist_block/presave) puis migrer |
| P4 | Reprendre B09.14 (formulaires) une fois la QA navigateur en place |
| P4 | Nettoyer `reservation_form.phone` (orphelin), concevoir slider accessible (media_before_after) |

## Procédure QA navigateur (prête à exécuter par un humain / CI)

Parcours : `connexion → création → ajout blocs → sauvegarde → publication → page publique → retour Builder`.
Page de test contenant les **51 blocs** (liste dans `SHARED_RENDERER_BLOCKS`), variantes vide/minimal/
complet/long. Viewports : 320/360/375/390/430 + 844×390 paysage. Contrôler à chaque écran : console
(erreurs/warnings/hydration/clés/réseau 4xx-5xx), parité éditeur↔public, mobile (bottom bar, safe
areas, clavier, overflow, scroll H), formulaires (soumission test, honeypot, double-clic, retry),
médias (image cassée/lente, iframe refusée), performance (10/30/50/100 blocs), zoom 200 %, focus clavier.

## Signaux automatisés (réels, exécutés)

| Commande | Résultat |
| --- | --- |
| `npx vitest run` | **1392/1392 verts** (69 fichiers) |
| `pnpm type-check` | **0 erreur** |
| `pnpm build` | **Compiled successfully, 84/84** |
| grep hydratation (Date.now/Math.random/new Date/typeof window en rendu shared) | **aucun** |
| grep `dangerouslySetInnerHTML` (shared) | **aucun** |
