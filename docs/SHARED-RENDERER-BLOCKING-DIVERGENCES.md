# Divergences bloquantes — corrections de fondation (B09.11)

Mission de **correction** (aucune migration de bloc). État inchangé : **45 blocs shared actifs /
97 legacy**. Quatre chantiers traités pour débloquer les prochaines vagues. Tous les `case`
legacy conservés ; aucun format de données modifié ; aucune dépendance ajoutée.

## Audit initial des divergences

| Bloc / helper | Éditeur actuel | Public actuel | Risque | Cause | Correction |
| --- | --- | --- | --- | --- | --- |
| `embedVideoUrl` | placeholder (video) | iframe `embedVideoUrl(c.url)` | **iframe arbitraire** | repli `return u` sur URL brute + regex non ancrée | frontière d'hôte + `return ""` |
| `video` | placeholder ▶️ | iframe (via helper) | élevé | dépend du helper ci-dessus | débloqué par le helper (non migré) |
| `mapEmbedUrl` | iframe (google_maps_embed / event_access) | idem | **iframe arbitraire** | `if (/^https?:/) return custom` (tout http) | allowlist domaine Google Maps |
| `google_maps_embed` | iframe | iframe | élevé | dépend de `mapEmbedUrl` | débloqué (non migré) |
| `embed_block` | iframe `c.url` | iframe `c.url` | **élevé** | iframe d'URL totalement arbitraire, aucun provider | **reste bloqué** (hors périmètre) |
| `latest_release` | `<img>` cover | **SmartImage** cover | moyen | composant image divergent | contrat `SharedImageModel` (aligné, non migré) |
| `discography` | `<img>` | **SmartImage** | moyen | idem | contrat image |
| `playlist_block` | `<img>` | **SmartImage** | moyen | idem | contrat image |
| `presave` | `<img>` | **SmartImage** | moyen | idem | contrat image |
| `podcast_links` | `<img>` | **SmartImage** | moyen | idem | contrat image |
| `product_catalog` | `<img>` | **SmartImage** | moyen | idem | contrat image |
| `album_block` | CTA `cta_label` (div) si aucune plateforme | **rien** | moyen | champ éditable non rendu en public (§7) | parité via `albumBlockCtaModel` (public patché) |
| `before_after` | grille statique (déjà shared v7) | grille statique | — | aucune | inchangé ; contrat commun ajouté |
| `media_before_after` | grille | **slider** `BeforeAfterPublic` si `mode==="slider"` | élevé | interaction slider absente en éditeur | **reste bloqué** (slider accessible à concevoir) |

## Chantier A — embeds strictement allowlistés

**`embedVideoUrl`** : providers reconnus = **YouTube** (watch / youtu.be / shorts / live / embed /
nocookie), **Vimeo** (vimeo.com / player.vimeo.com), **Dailymotion** (déjà supporté). Chaque
format extrait un **identifiant borné** (`[\w-]+` ou `\d+`) et reconstruit une **URL canonique de
confiance** (`youtube-nocookie.com/embed/…`, `player.vimeo.com/video/…`,
`dailymotion.com/embed/video/…`). Deux durcissements :
1. **frontière d'hôte** `(?:^|\/\/|\.)` devant chaque domaine → refuse `evil-youtube.com`,
   `youtube.com.evil.com`, `youtu.be.evil.com`, `notvimeo.com`… ;
2. **suppression du repli brut** (`return u` → `return ""`) → une URL non reconnue ne produit
   plus jamais d'iframe.

**`mapEmbedUrl`** : un `embed_url` personnalisé n'est accepté **que** s'il provient d'un domaine
Google Maps (`https://(www.|maps.)?google.<tld>/maps…`). Toute autre URL (site quelconque, faux
domaine `google.com.evil.com`, schéma dangereux) est **ignorée** → repli sur la construction
canonique à partir de l'adresse (`maps.google.com/maps?q=…&output=embed`), ou `""`. Aucune clé
API dans le contenu, aucun `srcdoc`, aucun HTML iframe collé.

**Contrat d'iframe sûr** : `models/embed.ts` → `SafeEmbedModel` + `videoEmbedModel` /
`mapEmbedModel` (purs). La `src` provient exclusivement des helpers ci-dessus **et** est
re-vérifiée contre les domaines canoniques (`providerOf`). Attributs par provider : `title`,
`allow` minimal (vidéo : lecture/plein écran ; carte : aucun), `allowFullScreen`, `loading="lazy"`,
`referrerPolicy`. Prêt pour la migration de `video` / `google_maps_embed` (non activée ici).

### Providers refusés (documentés)
`embed_block` (iframe totalement arbitraire) ; tout domaine non YouTube/Vimeo/Dailymotion pour la
vidéo ; tout domaine non Google Maps pour la carte ; `javascript:` / `vbscript:` / `data:text/html`
/ `file:` / `blob:` ; URL vide, objet, tableau, URL sans identifiant.

## Chantier B — contrat d'image partagé

`models/sharedImage.ts` → `SharedImageModel` + `sharedImageModel(rawSrc, opts)` (pur). Aligne le
comportement **données** entre `<img>` (éditeur) et `SmartImage` (public) sans imposer le même
composant :
- `src` via `safeMediaSrc` (jamais d'URL dangereuse) ;
- `visible` = une image sûre existe (sinon appliquer `fallback`) ;
- `alt` informatif (jamais une URL/nom de fichier) ou `""` si `decorative` ;
- `objectFit` (`cover`/`contain`), `aspectRatio`, `fallback` (`hide`/`placeholder`/`icon`).

Le **composant** concret reste libre : éditeur `<img>` simple, public `SmartImage` (repli `<img>`
natif identique pour tout ce qui n'est pas une image Supabase uploadée). Le contrat rend les blocs
image musique/commerce **migrables** en réutilisant ce modèle côté éditeur ET public.

### Blocs image caractérisés (à migrer en B09.12, non migrés ici)

| Bloc | src | alt | ratio / fit | fallback | état |
| --- | --- | --- | --- | --- | --- |
| latest_release | `cover` | décoratif (`""`) | 84×84 cover | icône 🎵 | prêt |
| discography | `a{i}_cover` | décoratif | 54×54 cover | icône 💿 | prêt |
| playlist_block | `cover` | décoratif | 62×62 cover | icône 📋 | prêt |
| presave | `cover` | décoratif | 110×110 cover | icône 💾 | prêt |
| podcast_links | `cover_url` | décoratif | 54×54 cover | icône 🎙️ | prêt |
| product_catalog | `p{i}_img` | décoratif | 84×84 cover | icône 🛍️ | prêt |
| team | `m{i}_photo` | nom du membre (informatif) | rond cover | initiale | à confirmer (contacts) |
| event_guests | `g{i}_photo` | décoratif | rond cover | initiale | à confirmer |

## Chantier C — parité CTA `album_block`

**Constat produit** (BLOCK_DEFS) : `album_block` a un champ `cta_label` (défaut « Écouter
l'album ») mais **aucun champ `cta_url`**. Le CTA n'a donc **pas de destination** — c'est un
libellé. L'éditeur l'affichait (div non navigable) uniquement quand aucune plateforme
(spotify/apple/deezer) n'est renseignée ; le public ne l'affichait pas → **champ éditable non
rendu (§7)**.

**Décision** : rétablir la **parité** en rendant le même libellé non navigable côté public
(`albumBlockCtaModel` : `visible = aucune plateforme && cta_label`). **Pas de faux `<a>`** (aucune
URL à cibler), **aucun changement de données**. Ajouter un vrai lien nécessiterait un champ
`cta_url` (modification de format → hors périmètre) : documenté comme évolution future. Correction
appliquée au **public legacy** (`PublicPageClient` case `album_block`) ; l'éditeur legacy est déjà
correct. Le reste du bloc (titre/artiste/couverture/plateformes/année) est inchangé.

## Chantier D — contrat avant/après

`models/beforeAfterShared.ts` → `BeforeAfterModel` (pur) : deux images sécurisées
(`SharedImageModel`), labels, `mode: "static" | "slider"`, `initialPosition` **borné [0..100]**.
- **Statique** : deux images côte à côte → correspond à `before_after` (déjà shared en vague 7,
  **inchangé** — ce modèle ne le remplace pas).
- **Slider** : `media_before_after` — **reste legacy**. Le composant slider n'est pas créé ici.

### Exigences avant de migrer le slider (`media_before_after`)
Composant slider **accessible** (clavier ← →, Home/End, focus visible, valeur annoncée
`aria-valuenow`), gestion **tactile** (pointeur/touch), parité éditeur/public, tests DOM
(Playwright/jsdom) — aucun de ces éléments n'est disponible dans le pipeline de test actuel
(`renderToStaticMarkup`, sans jsdom). Tant que ce n'est pas réuni : legacy.

## Blocs débloqués (prêts pour B09.12)

- `video`, `google_maps_embed` — helpers d'embed désormais stricts + `SafeEmbedModel`.
- `album_block` — parité CTA rétablie.
- `latest_release`, `discography`, `playlist_block`, `presave`, `podcast_links`,
  `product_catalog` — contrat d'image partagé (alignement `<img>`/`SmartImage`).

## Blocs toujours bloqués

- `embed_block` — iframe d'URL arbitraire par nature (aucun provider) → nécessiterait un vrai
  système d'allowlist multi-provider (hors périmètre).
- `media_before_after` — slider accessible non conçu.
- Tout bloc à média privé / URL signée temporaire.

## Registres et flags

**Aucune activation.** `SHARED_RENDERER_BLOCKS` reste à **45** (test dédié). Aucun registre
enrichi. `before_after` (v7) reste actif.

## Sécurité

Aucune iframe arbitraire ; aucun domaine ressemblant accepté (frontière d'hôte) ; aucun schéma
dangereux dans `src`/`href`/`iframe.src` ; aucune clé API/secret/`srcdoc` ; aucune URL privée
convertie en publique. En cas de doute → `null`/`""`, jamais de rendu.

## Accessibilité

- **Embeds** : `title` obligatoire, permissions minimales, `loading="lazy"`, plein écran vidéo
  seulement. **Images** : alt informatif ou `decorative` explicite, fallback non trompeur.
  **Album CTA** : libellé non navigable (pas de faux bouton interactif — pas d'URL). **Slider**
  avant/après : exigences clavier/tactile documentées, **non implémentées** (bloc legacy).

## Tests

- `blockingDivergences.test.ts` : embeds (≈24 : YouTube/Vimeo/Dailymotion valides, domaines
  ressemblants/arbitraires/schémas dangereux → vide, Google Maps allowlist, `SafeEmbedModel`),
  images (12), album CTA (10), avant/après (10), **méta** (45 shared inchangés, blocs corrigés
  restent legacy, `before_after` actif).
- `types.test.ts` : `embedVideoUrl("lien inconnu") → ""` mis à jour ; Google Maps custom conservé.
- `bundleBoundary.test` : 4 nouveaux modèles purs (sans React/Supabase/tracking).
- Suite : **1328 verts**. Typecheck 0. Build 84/84.

## Risques résiduels

- **Changement de comportement (voulu, sécurité)** : une vidéo/carte dont l'URL n'est pas
  reconnue par les providers autorisés ne s'affiche plus (avant : iframe brute). Idem `mapEmbedUrl`
  pour un `embed_url` non-Google. Régression possible pour des utilisateurs ayant collé une URL
  non standard — à vérifier en QA ; conforme à l'exigence de sécurité.
- `album_block` : le libellé CTA public est un `<div>` stylé (non navigable) faute de `cta_url` —
  UX à surveiller ; un vrai lien nécessite un champ de données (future évolution).
- Contrat d'image : modèle prêt, mais la migration effective des 6-8 blocs image reste à faire
  (B09.12) avec vérification pixel.
- Parité pixel navigateur non observée (limite structurelle).

## Prochaine action

`B09.12 — migrer la vague de blocs précédemment bloqués désormais sécurisés`.
