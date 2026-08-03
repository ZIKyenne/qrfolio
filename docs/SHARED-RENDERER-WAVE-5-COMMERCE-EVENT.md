# Vague 5 — blocs commerce & événement avancés (B09.8)

Six blocs migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 33 : 3 pilotes + 6×vagues 1-4 +
6 vague 5). Cases legacy **conservés**, rollback immédiat, données inchangées. Cette vague
valide : cartes métier riches, plusieurs champs par item, **prix**, **badges/métadonnées
statiques**, **liens optionnels + tracking public**, **dates/horaires en texte statique**,
variantes de mise en page — le tout **sans image, sans dayMode, sans logique temporelle**.

## Candidats analysés (24)

| Bloc | Famille | Structure | Items | Limite | Image | Lien | Tracking | Date/heure | Divergence | Risque | Éligible |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |
| menu_section | commerce | répéteur prix | 50 | 50 | non | non | non | non | non | faible | ✅ |
| services_list | commerce | répéteur | 50 | 50 | non | non | non | non | non | faible | ✅ |
| promo_banner | commerce | carte + CTA | 1 | — | non | cta_url | oui | non | non | faible | ✅ |
| gift_card | commerce | carte + montants + CTA | 3 | 3 | non | cta_url | oui | non | non | faible | ✅ |
| event_info | event | carte + dates + CTA | 4 | — | non | cta_url | oui | statique | non | faible | ✅ |
| event_ticketing | event | carte + prix + CTA | 1 | — | non | url | oui | statique | non | faible | ✅ |
| product | commerce | carte produit | 1 | — | **crop cover** | cta_url | oui | non | stock/crop | moyen | ⏸️ (image crop §11) |
| services_pricing | commerce | répéteur prix | 50 | 50 | non | non | non | non | **dayMode (éditeur)** | moyen | ❌ (dayMode) |
| external_shop | commerce | carte lien | 1 | — | non | url | oui | non | non | faible | ⏸️ (report, 6 atteints) |
| sales_counter | commerce | compteur | 1 | — | non | non | non | non | défaut « 127 » (éditeur) | faible | ⏸️ |
| popular_products | commerce | répéteur | 50 | 50 | **crop cover** | url | à vérifier | non | image crop | moyen | ⏸️ |
| product_catalog | commerce | répéteur | 50 | 50 | image | url | à vérifier | non | image | moyen | ⏸️ |
| featured_product | commerce | carte | 1 | — | image | url | oui | non | image | moyen | ⏸️ |
| offer_comparison | commerce | répéteur | 50 | 50 | non | à vérifier | à vérifier | non | à vérifier | moyen | ⏸️ |
| packs | commerce | répéteur features | 50 | 50 | non | à vérifier | à vérifier | non | à vérifier | moyen | ⏸️ |
| google_reviews_block | commerce | carte + avis | 50 | 50 | non | non | non | non | `StarRow` + moyenne | moyen | ⏸️ |
| visit_counter | info | compteur | 1 | — | non | non | non | non | **`totalViews` serveur ≠ éditeur (« 1 234 »)** | — | ❌ (donnée serveur) |
| opening_hours | business | horaires | 7 | 7 | non | non | non | **statut « ouvert » calculé (live)** | non | **temps réel** | — | ❌ (temporel) |
| event_access | event | plan + transports | 3 | 3 | non | non | non | non | **iframe carte** | — | ❌ (iframe) |
| event_guests | event | répéteur invités | 50 | 50 | **photo (SmartImage/img)** | non | non | non | image + composant divergent | moyen | ❌ (image + divergence) |
| participants_count | event | compteur + barre | 1 | — | non | non | non | non | défauts « 287/500 » (2 côtés) | faible | ⏸️ (anti-fake) |
| tickets_left | event | compteur urgence | 1 | — | non | cta_label | non | non | défaut « 14 » | faible | ⏸️ |
| add_to_calendar | event | boutons agenda | 1 | — | non | calendarLinks | non | non | **génération .ics/agenda** | — | ❌ (calendrier) |
| event_register / rsvp | event | formulaire | — | — | non | — | — | non | **formulaire** | — | ❌ (form) |

## Six blocs migrés

| Bloc | Famille | Structure | Limite | Prix | Image | Lien | Date | Tracking | Niveau | Risque |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| menu_section | commerce | répéteur nom/prix/desc | 50 | oui (brut) | non | non | non | non | 2 | faible |
| services_list | commerce | répéteur icône/nom/desc | 50 | non | non | non | non | non | 2 | faible |
| promo_banner | commerce | carte promo + CTA | 1 | non | non | cta_url | non | oui | 2 | faible |
| gift_card | commerce | carte + montants + CTA | 3 | oui (montants) | non | cta_url | non | oui | 2 | faible |
| event_info | event | carte + dates statiques + CTA | 4 | oui (texte) | non | cta_url | statique | oui | 2 | faible |
| event_ticketing | event | carte billetterie + CTA | 1 | oui (texte) | non | url | statique | oui | 2 | faible |

**4 commerce + 2 événement** (exigence ≥2/≥2 respectée), 6 structures variées (répéteurs prix,
répéteur icône, carte promo, carte montants, carte dates, carte billetterie).

## Prix et devises

Aucun calcul financier : les prix sont conservés **bruts** (chaîne exacte : `12€`, `12,50`,
`0`, `Gratuit`, `1 234 567 €`). Aucun reformatage de locale, aucune conversion. `gift_card`
utilise `filter(Boolean)` sur `amount1..3` (la chaîne `"0"` est conservée, `""` ignorée).
Testé : vide, `0`, entier, décimal, texte, très long.

## Images simples

**Aucun des 6 blocs n'utilise d'image** — choix délibéré pour cette vague, ce qui évite tout
problème de crop (`objectFit: cover`) interdit par §11. `product`, `popular_products`,
`event_guests`, `product_catalog`, `featured_product` (avec images/crop) sont reportés.

## Dates et horaires

`event_info` (date/heure/lieu/prix) et `event_ticketing` (date/lieu) affichent des **chaînes
statiques** telles quelles (icône + texte). Aucune logique temporelle introduite (pas de
compte à rebours, pas de statut « en cours », pas de détection du jour courant). `countdown`,
`opening_hours`, `add_to_calendar` (temps réel/agenda) sont exclus.

## CTA et liens

CTA réutilisant `CtaLink` (modèle) + `PublicCtaLink`/`EditorCtaShell` (primitives B09.5) :

- **Public** : vrai `<a>`, href sécurisé via `extHref` (schéma dangereux préfixé `https://` →
  non exécutable), tracking `onClick` non bloquant (try/catch), navigation préservée si le
  tracking échoue.
- **Éditeur** : `EditorCtaShell` → conteneur `aria-disabled="true"` non navigable, sans href,
  sans tracking (convention établie en B09.5 ; le legacy éditeur avait un `<div>` nu).
- **`target`/`rel`** fidèles : `promo_banner` & `event_info` **sans** `target`/`rel`
  (external=false, comme le legacy) ; `gift_card` & `event_ticketing` `target="_blank"` si
  http(s). *Nuance documentée* : pour une URL **non-http** dans gift_card/event_ticketing, le
  legacy émettait un `rel="noopener noreferrer"` **inerte** (sans `target`) que la version
  partagée omet — aucun effet fonctionnel ni visuel (rel sans _blank ne fait rien).

## Tracking

Un seul événement par CTA, cible fidèle au legacy : `promo_banner` → `cta_url || "promo_banner"`,
`event_info` → `cta_url || "event_info"`, `gift_card` → `cta_url || "giftcard"`,
`event_ticketing` → `url || "ticket"`. Le tracking est **injecté** via `ctx.trackClick`
(`pageId`/`blockId` fournis par l'adapter), jamais dans le modèle pur. Aucun tracking en éditeur.

## Apparence (dayMode)

Analyse §21 : parmi les candidats propres, **un seul** (`services_pricing`) dépend de `dayMode`
(couleur de bordure éditeur). Moins de deux blocs éligibles concernés → **capacité NON ajoutée**,
`services_pricing` reporté. À concevoir proprement (`appearanceMode`) quand plusieurs blocs la
partageront (déjà en attente : `info_table` de B09.6).

## Limites

| Bloc | Limite éditeur | Limite public | Limite shared | Résultat |
| --- | ---: | ---: | ---: | --- |
| menu_section | 50 | 50 | 50 | ✅ identique |
| services_list | 50 | 50 | 50 | ✅ identique |
| gift_card (montants) | 3 | 3 | 3 | ✅ identique |
| promo_banner / event_info / event_ticketing | 1 (carte) | 1 | 1 | ✅ identique |

## États vides

- **Publics masqués si vide (`null`)** : `services_list` (aucun service), `gift_card`
  (ni titre ni amount1), `event_ticketing` (ni event_name ni url).
- **Conteneur toujours rendu (fidèle legacy, non harmonisé §17)** : `menu_section`,
  `promo_banner`, `event_info` — le public rend la carte/le conteneur même vide.
- **Éditeur** : aucun `BlockEmptyState` (aucun de ces legacy n'en avait) — conteneurs nus,
  reproduits tels quels.

## Registres et flags

Précédemment actifs : 27. Nouveaux : 6. **Total : 33 blocs shared actifs.** 109 legacy.

## Legacy et rollback

Tous les `case` legacy conservés. Rollback = retirer le type de `SHARED_RENDERER_BLOCKS` →
`resolve*Block` → null → `case` legacy. Aucune donnée touchée. Testé (registry.test).

## Fixtures & tests

`wave5.test.tsx` (31) : modèles (vide/gate, filtres, ordre, montants `0`, composition libellé
plateforme, prix bruts, limite 50, sécurité URL, external http/non-http, cibles de tracking,
non-mutation) ; parité éditeur (contenu + CTA neutralisé `aria-disabled` sans `<a>`) ; parité
public (null/conteneur/contenu, vrai `<a>`, target conditionnel, URL neutralisée) ; parité de
limite éditeur/public (menu_section 50). `architecture`/`registry`/`bundleBoundary` étendus à 33.

## Validation structurelle (`renderToStaticMarkup`)

Rendu HTML comparé indépendamment au legacy : visibilité, nombre de cartes, textes, ordre,
styles clés, prix, CTA (href sûr, target/rel), cibles de tracking. Suite : 1225 verts.
Typecheck 0. Build 84/84.

## QA humaine restante (honnête)

**Parité pixel navigateur non effectuée** (limite structurelle de l'agent). À couvrir sur les
6 nouveaux + 33 actifs, viewports 1440/1280/1024/768/390/360/844 : vide, minimal, complet,
limite, texte/prix long, URL interne/externe, date, mise en page, ajout/suppression/réordre,
éditeur/public, clavier, zoom 200 %, tracking runtime, console, hydration. Rollback prêt.

## Risques résiduels

- Parité pixel/police navigateur non observée.
- `gift_card`/`event_ticketing` : `rel` inerte omis pour URL non-http (documenté, sans effet).
- Effets de survol (`onMouseEnter` translate) reproduits sur `services_list` : à valider au runtime.
- Blocs reportés à traiter en vagues dédiées : images (product, catalog, featured_product,
  popular_products, event_guests), `dayMode` (services_pricing, info_table), compteurs à
  défauts codés (sales_counter, participants_count, tickets_left), `google_reviews_block`
  (StarRow/moyenne), et blocs exclus (formulaires, iframe, calendrier, temps réel).
