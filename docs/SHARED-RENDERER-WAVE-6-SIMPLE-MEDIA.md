# Vague 6 — blocs média simples (B09.9)

Six blocs migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 39 : 3 pilotes + 6×vagues 1-5 +
6 vague 6). Cases legacy **conservés**, rollback immédiat, données inchangées. Cette vague valide :
images simples (`<img>`, jamais de crop interactif), miniatures, textes alternatifs, ratios
déterministes, liens média sûrs, placeholders éditeur non trompeurs, lazy loading public,
liens neutralisés en édition / actifs en public — **sans galerie, carrousel, lightbox, upload,
player, iframe, média privé ni URL signée**.

## Candidats analysés (24)

| Bloc | Sous-famille | Média | URL | Alt | Lien | Lecteur | Crop | Upload | Divergence | Risque | Éligible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| image | image statique | img | c.src | alt‖caption | c.link (public) | non | objectFit cover | non | éditeur non-lien / public lien (neutralisation) | faible | ✅ |
| portfolio_work | portfolio | img | work{i}_img | "" décoratif | cta_url | non | cover | non | non | faible | ✅ |
| favorite_links | média avec lien | — | — | — | link_{i}_url | non | non | non | non | faible | ✅ |
| concerts | musique/dates | — | — | — | c{i}_url | non | non | non | non | faible | ✅ |
| merch | carte visuelle | img | img{n} | "" décoratif | cta_url | non | cover | non | non | faible | ✅ |
| app_download | téléchargement app | — | — | — | ios/android_url | non | non | non | non | faible | ✅ |
| gallery | galerie | img×12 | img{n} | — | non | non | grille | non | **carrousel/masonry** | — | ❌ (exclu §4) |
| image_carousel | carrousel | img×12 | — | — | non | non | — | non | **carrousel autoplay** | — | ❌ |
| logo_wall | logo | img | logo{i} | name | non | contain | non | non | **8 logos « démo » si vide (éditeur)** | — | ❌ (placeholder trompeur) |
| documents | document | — | — | — | d{i}_url | non | non | non | **dépend `dayMode` (éditeur)** | — | ❌ (dayMode) |
| certifications | logo/badge | — | — | — | non | non | non | non | **icône `<Check>` éditeur absente public** | — | ❌ |
| latest_release | musique carte | img | cover | — | plateformes | non | cover | non | **`SmartImage` public vs `<img>` éditeur** | — | ❌ |
| discography | musique répéteur | img | a{i}_cover | — | a{i}_url | non | cover | non | **`SmartImage` public vs `<img>` éditeur** | — | ❌ |
| album_block | musique carte | img | cover | — | plateformes | non | cover | non | **cta_label rendu éditeur, jamais public (§7)** | — | ❌ |
| playlist_block | musique carte | img | cover | — | plateformes | non | cover | non | **SmartImage** | — | ❌ |
| presave | musique carte | img | cover | — | plateformes | non | cover | non | **SmartImage** | — | ❌ |
| podcast_links | podcast | img | cover_url | — | plateformes | non | cover | non | **SmartImage** | — | ❌ |
| product_catalog | commerce média | img | p{i}_img | — | p{i}_url | non | cover | non | **SmartImage** | — | ❌ |
| featured_product | commerce média | img | image | — | cta_url | non | cover | non | prix défaut « 99€ » + stockStatus | moyen | ⏸️ |
| product | commerce média | img | image | — | cta_url | non | cover | non | stockStatus + « Produit »/crop | moyen | ⏸️ |
| before_after | comparaison | img×2 | before/after_img | — | non | non | **slider comparaison** | non | interactif | — | ❌ |
| team | équipe | photo | m{i}_photo | — | contacts | non | cover | non | **SmartImage / photos** | — | ⏸️ |
| hero_banner | couverture | img | image | — | cta | non | cover | non | à revérifier | moyen | ⏸️ |
| multi_cta | média avec lien | — | — | — | btn{i}_url | non | non | non | non | faible | ⏸️ (report, 6 atteints) |

## Six blocs migrés

| Bloc | Sous-famille | Structure | Média | Lien | Tracking | Limite | Niveau | Risque |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| image | image statique | image unique + légende | img (ratio/cercle) | optionnel (public) | 1/clic | 1 | 2 | faible |
| portfolio_work | portfolio | grille 2 col img+titre+desc | img optionnelle | CTA optionnel | 1/CTA | 50 | 2 | faible |
| favorite_links | média avec lien | liste icône+libellé+lien | non | 1 par item | 1/item | 50 | 2 | faible |
| concerts | musique/dates | liste date/ville/lieu + billets | non | 1 billetterie/date | 1/date | 50 | 2 | faible |
| merch | carte visuelle | grille 3 produits + CTA | img optionnelle | CTA optionnel | 1/CTA | 3 | 2 | faible |
| app_download | téléchargement app | badges App Store / Play | non | iOS + Android | 1/store | 2 | 2 | faible |

**6 sous-familles distinctes** (image statique, portfolio, média-avec-lien, musique/dates,
carte visuelle, téléchargement) — aucune paire quasi identique.

## URLs média

Nouveau helper pur `models/mediaUrl.ts` → `safeMediaSrc(url)` (sémantique **média**, distincte
d'un lien) : neutralise `javascript:`/`vbscript:`/`file:`/`data:` non-image (→ `null` → placeholder),
rejette non-chaîne / vide / > 2048 car., autorise http(s), chemin interne, `data:image`, domaine/relatif.
Pour une URL d'image réelle, comportement identique au legacy. Les **liens** (href) utilisent le
helper existant `extHref` (préfixe `https://` aux schémas dangereux) — durcissement documenté
vs le legacy qui passait certains href bruts.

## Alt text

`image` : `alt = c.alt || c.caption || ""` (fidèle legacy). `portfolio_work`/`merch` : `alt=""`
(images décoratives, titre/nom adjacents portent l'information — fidèle legacy). Jamais de nom de
fichier ni d'URL en alt.

## Placeholders éditeur

Fidèles au legacy, **non trompeurs** : `image` → encart pointillé « Aucune image » ; `concerts`/
`merch` → `BlockEmptyState` (role=note + « Invisible en ligne tant qu'il est vide ») ;
`favorite_links`/`app_download` → placeholder **textuel** (« Ajoutez… »). Aucune fausse image/
fausse donnée. `logo_wall` exclu précisément parce que son éditeur affiche 8 faux logos « démo ».

## Responsive et ratios

Conservés à l'identique par côté : `image` ratio déterministe (`RATIO_MAP` square/16:9/9:16/4:3,
cercle → 1) ; hauteurs/rayons/maxHeight propres à chaque renderer (éditeur maxHeight 220 / cercle
170 / rounded 10 ; public maxHeight 320 / cercle 240 / rounded 16 / `height:100%` si ratio). Grilles
`portfolio_work` 2 col, `merch` 3 col, `objectFit: cover` (CSS déterministe, autorisé §9 — pas de
crop interactif).

## Documents ou liens média

Tous les liens : `extHref` + `target="_blank"` + `rel` fidèles, `onClick` de tracking en try/catch
(navigation préservée si le tracking échoue). Éditeur : jamais de `<a>` (liens neutralisés — CTA via
`EditorCtaShell` `aria-disabled`, ou divs, ou icônes `ExternalLink` décoratives). Aucun téléchargement
signé, aucun média privé, aucune preview PDF.

## Tracking

Un événement par lien, cible fidèle : `image` → `c.link` ; `portfolio_work` → `cta_url` ;
`favorite_links` → `url || "link"` (par item) ; `concerts` → `url` (par date) ; `merch` →
`cta_url || "merch"` ; `app_download` → `ios_url` / `android_url`. Injecté via `ctx.trackClick`
(pageId/blockId fournis par l'adapter), jamais dans le modèle, jamais en éditeur.

## Limites

| Bloc | Éditeur | Public | Shared | Résultat |
| --- | ---: | ---: | ---: | --- |
| portfolio_work | 50 | 50 | 50 | ✅ |
| favorite_links | 50 | 50 | 50 | ✅ |
| concerts | 50 | 50 | 50 | ✅ |
| merch | 3 | 3 | 3 | ✅ |
| app_download | 2 (iOS/Android) | 2 | 2 | ✅ |
| image | 1 | 1 | 1 | ✅ |

## États vides

- **Public `null`** : image (pas de src), portfolio_work, favorite_links, concerts, merch, app_download.
- **Éditeur** : image → placeholder « Aucune image » ; concerts/merch → `BlockEmptyState` ;
  favorite_links/app_download → placeholder textuel ; portfolio_work → grille (éventuellement vide, fidèle).
Le modèle distingue `visible` / `hasMedia` (image) pour séparer « invisible » et « visible sans image ».

## Divergences découvertes (documentées, non corrigées)

- `logo_wall` : 8 logos « démo » en éditeur si vide (placeholder trompeur).
- `documents` : rendu éditeur dépend de `dayMode` (contexte non partagé) — cf. `services_pricing`/`info_table`.
- `certifications` : icône `<Check>` (lucide) en éditeur, absente en public.
- `album_block` : `cta_label` rendu en éditeur mais jamais en public (§7 champ éditable non rendu).
- `latest_release`/`discography`/`playlist_block`/`presave`/`podcast_links`/`product_catalog` :
  `SmartImage` (public) vs `<img>` (éditeur).
Chacune bloque la migration du bloc concerné → laissé legacy, mission corrective dédiée à prévoir.

## Registres et flags

Précédemment actifs : 33. Nouveaux : 6. **Total : 39 blocs shared actifs.** 103 legacy.

## Legacy et rollback

Tous les `case` legacy conservés. Rollback = retrait du type de `SHARED_RENDERER_BLOCKS` →
`resolve*Block` → null → `case` legacy. Aucune donnée touchée. Testé (registry.test).

## Fixtures & tests

`wave6.test.tsx` (27) : `safeMediaSrc` (schémas dangereux/type/longueur/valeurs valides) ; modèles
(hasMedia/visible, alt fallback, ratio, filtres, limites 50, image safe, lien durci, cibles de
tracking, non-mutation) ; parité éditeur (placeholder, aucun `<a>`, états vides) ; parité public
(null/média/`loading=lazy`/`<a>`/src dangereux → null/href dangereux neutralisé) ; parité de limite.
`architecture`/`registry`/`bundleBoundary` étendus à 39. Suite : **1265 verts**. Typecheck 0. Build 84/84.

## Bundle et imports

`bundleBoundary` (98) vérifie : 7 nouveaux modèles purs (sans React/Supabase/tracking, dont
`mediaUrl`), 6 nouveaux publics sans symbole éditeur (`InlineEditable`, `BlockEmptyState`, registres,
uploader, panel). `ExternalLink` (lucide) et `PublicCtaLink` restent côté public sûrs. Aucun player,
aucune iframe, aucun crop editor.

## Performance

URL normalisée une fois (modèle pur), aucune requête, aucune signature, aucune transformation image
au rendu, pas de deep clone, limites bornées, imports directs, pas de composant média lourd partagé.

## QA humaine restante (honnête)

**Parité pixel navigateur non effectuée** (limite structurelle de l'agent). À couvrir sur les 6
nouveaux + 39 actifs, viewports 1440/1280/1024/768/390/360/844 : vide, sans média, média valide,
média cassé (onError), image lente, titre/légende longs, URL interne/externe, lien invalide, ratio,
object-fit, limite, éditeur/public, clavier, zoom 200 %, tracking runtime, console, hydration,
layout shift. Rollback prêt.

## Risques résiduels

- Parité pixel/police navigateur non observée ; survol `image` (scale) / `services_list`-like à valider runtime.
- Durcissement d'href (extHref) sur `image.link`/`favorite_links` : change les URLs sans schéma
  (préfixe https) vs legacy brut — sécurité renforcée, à confirmer visuellement sur liens exotiques.
- Nombreux blocs média reportés (SmartImage, crop/stock, dayMode, démo) → vagues média dédiées.
