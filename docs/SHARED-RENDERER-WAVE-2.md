# Vague 2 — CTA & cartes simples (B09.5)

Six blocs CTA migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 15 blocs : 3 pilotes +
6 vague 1 + 6 vague 2). Cases legacy **conservés**, rollback immédiat.

## Candidats analysés (22)

| Bloc | Type | Lien | Tracking | Divergence | Éligible |
| --- | --- | --- | --- | --- | --- |
| whatsapp_button | CTA | waLink | whatsapp | non | ✅ |
| email_button | CTA | mailto | email | non | ✅ |
| download_file | CTA carte | extHref(url) | download | non | ✅ |
| order_online | CTA | extHref(url) | url\|order | non | ✅ |
| donation | CTA | extHref(url) | url | non | ✅ |
| google_review | CTA carte | extHref(url) | url | non | ✅ |
| call_button | CTA | telLink | call | **oui** (`sub` ignoré éditeur) | ❌ |
| directions_button | CTA | directionsLink | directions | **oui** (adresse vs bouton copier) | ❌ |
| booking_button | CTA | extHref(url) | booking | **oui** (`description` éditeur absente public) | ❌ |
| free_gift | carte | extHref(url) | gift | **oui** (fallback label divergent) | ❌ |
| table_booking | CTA | extHref(url) | url | non (candidat de secours) | ⏸️ |
| payment_button | CTA | paymentLink | payment | **exclu** (paiement) | ❌ |
| vcard | carte | buildVCard | — | à vérifier (génération vCard) | ⏸️ |
| app_download | carte | ios/android | — | à vérifier | ⏸️ |
| promo_code / limited_offer / promo_banner | carte | — | — | pas de lien simple / à vérifier | ⏸️ |
| multi_cta | répéteur | oui | — | répéteur (vague ultérieure) | ⏸️ |
| sticky_bar | barre fixe | multiple | oui | complexe (position fixed) | ❌ |
| gift_card / external_shop | carte | — | — | vague ultérieure | ⏸️ |

## Six blocs migrés

| Bloc | Justification | Niveau | Risque | Lien | Tracking |
| --- | --- | --- | --- | --- | --- |
| whatsapp_button | CTA icône+label, target=_blank | 2 | faible | waLink | whatsapp |
| email_button | CTA mailto (sans target) | 2 | faible | mailto | email |
| download_file | carte CTA (icône+label+type) | 2 | faible | extHref | download |
| order_online | CTA toujours visible (href\|#) | 2 | faible | extHref | url\|order |
| donation | CTA couleur plateforme | 2 | faible | extHref | url |
| google_review | carte CTA étoiles dynamiques | 2 | faible | extHref | url |

## Architecture

`content → modèle pur (href sûr + external + trackTarget + visible) → vue → adapter`.
Abstraction de lien centralisée : `primitives/BlockCtaLink.tsx` (`EditorCtaShell` non
navigable `aria-disabled` / `PublicCtaLink` = `<a>` href sûr + target/rel + tracking dans
un `try/catch` non bloquant). Vue interne partagée `views/IconLabelCta.tsx` (whatsapp/email/
order_online/donation). Modèles sans React/Supabase/tracking.

## Sécurité des liens

Tous les href passent par `extHref`/`waLink`/`mailto` — `javascript:`/`data:`/`vbscript:`
neutralisés (testé). Sans URL : legacy reproduit fidèlement (whatsapp/email/download/
donation/google_review → `null` ; order_online → `href="#"`, toujours visible).

## Tracking

`PublicCtaLink` injecte `ctx.trackClick(trackTarget)` (= `trackLinkClick(pageId, blockId,
target)`, mêmes ids que le legacy) ; erreur de tracking non bloquante. Éditeur : jamais de
tracking (élément non navigable).

## Tests

`wave2.test.tsx` (23) : modèles (contenu/lien/sécurité/non-mutation), parité éditeur
(aria-disabled, aucun `<a>`/href), parité public (`<a>` target/rel, `null` si vide,
order toujours `<a>`), sécurité `PublicCtaLink`. `bundleBoundary` étendu (aucun import
éditeur côté public, modèles purs). Suite : 1068 → 1105 verts. Typecheck 0. Build 84/84.

## Rollback

Retirer le(s) type(s) de `SHARED_RENDERER_BLOCKS` → `resolve*Block` → null → `case` legacy.
Aucune donnée touchée.

## QA humaine restante

Parité **pixel navigateur** des 6 CTA (viewports, éditeur/public, contenu long, URL
interne/externe/mailto/tel, clavier, zoom 200 %, **tracking runtime réel** : un seul
événement aux bons ids). Structure/HTML prouvée identique (`renderToStaticMarkup`) ; le
clic runtime et le tracking ne sont pas exécutables sans navigateur → à confirmer.

## Risques résiduels

- Parité pixel/police navigateur non observée.
- Tracking : le déclenchement au clic n'est pas testable sans DOM (onClick absent du HTML
  statique) ; seul `trackTarget` (modèle) et le câblage sont vérifiés → QA runtime requise.
