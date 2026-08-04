# Vague 8 — blocs précédemment bloqués, désormais sécurisés (B09.12)

Six blocs migrés et **activés** grâce aux fondations de B09.11 (`SHARED_RENDERER_BLOCKS` = 51 :
3 pilotes + 6×vagues 1-7 + 6 vague 8). Cases legacy **conservés**, rollback immédiat, données
inchangées, aucune dépendance ajoutée.

## Neuf candidats audités

| Bloc | Famille | Embed | Image | Liste | CTA | Tracking | Limite | Divergence restante | Risque | Éligible |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| video | media | YouTube/Vimeo/Dailymotion | — | non | non | non | 1 | aucune (helper sécurisé) | modéré | ✅ |
| google_maps_embed | business | Google Maps | — | non | itinéraire | clic | 1 | aucune (helper sécurisé) | modéré | ✅ |
| album_block | music | — | cover | non | cta_label (non-nav) | plateformes | 1 | résolue (B09.11) | moyen | ✅ |
| discography | music | — | covers | oui | non | par album | 50 | aucune | faible | ✅ |
| podcast_links | social | — | cover | plateformes | non | par plateforme | 4 | aucune | faible | ✅ |
| product_catalog | commerce | — | imgs | oui | badge + lien | par produit | 50 | aucune | faible | ✅ |
| latest_release | music | — | cover | non | **cta_label** | plateformes | 1 | **cta_label rendu éditeur, jamais public (§7)** | — | ❌ |
| playlist_block | music | — | cover | non | **cta_label** | plateformes | 1 | **idem §7** | — | ❌ |
| presave | music | — | cover | non | **cta_label** | plateformes | 1 | **idem §7** | — | ❌ |

## Six blocs sélectionnés

| Bloc | Famille | Embed | Image | CTA | Tracking | Limite | Niveau | Risque |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| video | media | SafeEmbedModel (YT/Vimeo/DM) | — | — | — | 1 | 2 | modéré |
| google_maps_embed | business | SafeEmbedModel (Maps) | — | itinéraire | clic | 1 | 2 | modéré |
| album_block | music | — | SharedImageModel | libellé non-nav | plateformes | 1 | 2 | moyen |
| discography | music | — | SharedImageModel | — | lien/album | 50 | 2 | faible |
| podcast_links | social | — | SharedImageModel | — | lien/plateforme | 4 | 2 | faible |
| product_catalog | commerce | — | SharedImageModel | badge | lien/produit | 50 | 2 | faible |

Couverture des exigences §2 : **2 embeds sécurisés** (video, google_maps_embed), **4 blocs
`SharedImageModel`** (album, discography, podcast_links, product_catalog), **album_block migré**,
**répétiteur musique** (discography), **CTA/liens publics** (plusieurs).

## Blocs non sélectionnés

- `latest_release`, `playlist_block`, `presave` : **divergence non résolue** — l'éditeur rend un
  `cta_label` (bouton) que le public n'affiche jamais (§7). B09.11 n'a corrigé que `album_block`.
  Laissés **legacy** ; correction possible ultérieure (même approche que `albumBlockCtaModel`, ou
  ajout d'un champ d'URL). Documenté.
- `embed_block` (iframe arbitraire) et `media_before_after` (slider) : hors périmètre (exclusions).

## Divergences résiduelles

- Aucune sur les 6 migrés. Sur les 3 blocs musique non retenus : `cta_label` éditeur-only (§7),
  à traiter dans une mission dédiée.

## Architecture appliquée

`content → modèle pur (SafeEmbedModel / SharedImageModel / CtaLink / extractIndexed) → adapter
éditeur (placeholder/neutralisation, `<img>` via EditorSharedImage) → adapter public (iframe sûre
/ SmartImage via PublicSharedImage / lien tracké)`. Registres séparés ; primitives image dédiées
(`EditorImage` = `<img>` sans SmartImage ; `PublicImage` = SmartImage) pour centraliser le contrat
et garder next/image hors du bundle éditeur.

## G–L. Détail par bloc

- **video** — `videoEmbedModel` (embedVideoUrl : YouTube/Vimeo/Dailymotion → URL canonique, "" sinon).
  Éditeur : placeholder ▶️ + titre (aucune iframe). Public : iframe 16:9 (`title`, `allow` minimal,
  `allowFullScreen`, `loading=lazy`, `referrerPolicy`) — **null si provider non reconnu** (jamais d'URL
  brute). Tracking : aucun. Parité prouvée ; sécurité : faux domaines → null.
- **google_maps_embed** — `mapEmbedModel` (Google Maps uniquement, sinon repli adresse canonique).
  Éditeur : iframe + itinéraire **neutralisé** (EditorCtaShell). Public : iframe + itinéraire `<a>`
  tracké (« directions »). Placeholder 🗺️ si pas de src. Sécurité : embed arbitraire → placeholder.
- **album_block** — cover `SharedImageModel` (décorative), plateformes spotify/apple/deezer (liens
  durcis extHref, badges bespoke éditeur / uniformes public), CTA via `albumBlockCtaModel` (libellé
  non navigable, faute de cta_url — parité éditeur/public). Public cover = `SmartImage` (contrat).
- **discography** — répétiteur `a{i}` (filtre title, limite 50), cover `SharedImageModel`, lien
  optionnel/album (row `<a>` public si url, sinon div). Éditeur : `emptyHint` (DETECTORS/B05).
- **podcast_links** — carte podcast (cover `SharedImageModel`) + liens plateformes durcis. Public
  visible si (plateforme || podcast_name) ; éditeur placeholder texte si aucune plateforme.
- **product_catalog** — répétiteur `p{i}` (filtre name, limite 50), image `SharedImageModel`, prix
  brut, lien produit/item (public : carte `<a>` ; éditeur : carte non navigable), badge cta_label partagé.

## M. Embeds sécurisés

Providers **allowlistés** : YouTube (nocookie), Vimeo, Dailymotion (vidéo) ; Google Maps (carte).
Toute URL non reconnue / faux domaine / schéma dangereux → `null` (aucune iframe). Attributs iframe
par provider (allow minimal, title, loading lazy, referrerPolicy). Aucun `embed_block` migré.

## N. Contrat image

`SharedImageModel` + primitives `EditorSharedImage` (`<img>`) / `PublicSharedImage` (`SmartImage`)
utilisés par album/discography/podcast_links/product_catalog. Divergence `<img>`/`SmartImage`
supprimée au niveau **contrat de données** ; source sécurisée (`safeMediaSrc`), alt décoratif
(couvertures), placeholder par bloc (💿/🎙️/🛍️). Logique image **non** dupliquée par bloc.

## O. Album CTA

Parité finale : CTA visible ⇔ (aucune plateforme && cta_label), **libellé non navigable des deux
côtés** (album_block n'a pas de champ cta_url). Aucun faux `<a>`, aucun tracking artificiel.

## P. Liens et tracking

`extHref` pour tous les hrefs ; public `<a target=_blank rel>` + `onClick` tracké non bloquant
(try/catch) ; éditeur neutralisé (aucun `<a>`, EditorCtaShell/divs). Un seul événement par lien
(cible = URL brute ou fallback : `directions`, `product`, URL plateforme).

## Q. Limites

| Bloc | Éditeur | Public | Shared | Résultat |
| --- | ---: | ---: | ---: | --- |
| discography | 50 | 50 | 50 | ✅ |
| product_catalog | 50 | 50 | 50 | ✅ |
| podcast_links | 4 | 4 | 4 | ✅ (plateformes fixes) |
| album_block | 3 plateformes | 3 | 3 | ✅ |
| video / google_maps_embed | 1 | 1 | 1 | ✅ |

## R. États vides

- Public `null` : video (provider invalide), discography, podcast_links, product_catalog.
- Conteneur/placeholder : google_maps_embed (placeholder 🗺️ si pas de src, mais bloc visible si
  embed_url||address) ; album_block visible si (title||cover).
- Éditeur : discography `BlockEmptyState` ; podcast_links/product_catalog placeholder texte ;
  video/album/maps placeholders spécifiques.

## S. Registres et flags

Précédemment actifs : 45. Nouveaux : 6. **Total : 51 blocs shared actifs.** 91 legacy.

## T. Legacy et rollback

Tous les `case` legacy conservés. Rollback = retrait du type de `SHARED_RENDERER_BLOCKS` →
`resolve*Block` → null → `case` legacy. Aucune donnée touchée. Testé (registry.test).

## U–X. Fixtures / Tests

`wave8.test.tsx` (20) : modèles (embed valide/invalide, image contrat, filtres/limites,
non-mutation), embeds (parité + sécurité : faux domaines/embed arbitraire → aucune iframe),
contrat image + CTA (album SmartImage/badges/cta non-nav, cover dangereuse → placeholder),
discography/podcast/product (éditeur/public/null/lien), **méta** (51 shared, 6 nouveaux actifs,
blocs exclus legacy). `blockingDivergences.test` (B09.11) mis à jour. `bundleBoundary` étendu à 51.
Suite : **1361 verts**. Typecheck 0. Build 84/84.

## Y. Accessibilité

Embeds : `title`, `loading=lazy`, permissions minimales. Images : alt décoratif explicite,
placeholder non trompeur. Liens : vrais `<a>` publics nommés / éditeur neutralisé. Album CTA :
libellé non interactif (pas de faux bouton). Clavier/zoom/lecteur d'écran = QA manuelle.

## Z. Bundle et imports

`bundleBoundary` (127) : 6 nouveaux modèles purs, 6 publics + `primitives/PublicImage` sans symbole
éditeur. `EditorImage` (`<img>`) importé uniquement côté éditeur → next/image reste hors du bundle
éditeur. Aucun SDK, aucun embed générique, aucune iframe arbitraire.

## AA. Performance

Embed/image normalisés une fois (modèles purs), extraction bornée (50), `loading=lazy`, aucun deep
clone, aucune requête, imports directs, pas de chargement des 142 renderers.

## AB. Validation structurelle

`renderToStaticMarkup` : iframe canonique (video/maps), `<img>`/SmartImage (contrat), liens
`<a>`/neutralisation, null si invisible, cover dangereuse → placeholder — conformes au legacy.

## AC. QA humaine restante (honnête)

**Non effectuée** (pas de navigateur) : lecture vidéo/iframe Maps réelles, consentement/adblock
iframe, image lente/cassée, tracking runtime, responsive & layout shift, hydration, clavier, zoom —
sur Chrome/Safari/Firefox/iOS/Android, viewports 1440→360. Rollback prêt.

## AD. Risques résiduels

- Parité pixel/runtime iframe & image non observée.
- `album_block` / `product_catalog` publics : covers passent désormais par `SmartImage` (next/image
  pour les images Supabase uploadées) — rendu visuellement identique, format potentiellement
  optimisé ; à confirmer visuellement.
- `google_maps_embed` éditeur : lien itinéraire neutralisé (déviation volontaire, éditeur only).
- Dépendance aux iframes tierces (YouTube/Vimeo/Google) côté visiteur (consentement/adblock).
- `latest_release`/`playlist_block`/`presave` restent legacy (cta_label §7) → prochaine correction.

## AE. Prochaine action

`B09.13 — concevoir le renderer partagé des blocs formulaires sans les activer`.
