# Vague 7 — blocs média interactifs à risque modéré (B09.10)

Six blocs migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 45 : 3 pilotes + 6×vagues 1-6 +
6 vague 7). Cases legacy **conservés**, rollback immédiat, données inchangées. Cette vague valide
l'architecture partagée sur des **interactions natives navigateur** (`<video>`, `<audio>`), un
**embed strictement allowlisté** (Spotify), un **document à ouverture directe** (PDF sans preview
iframe), une **carte média + ouverture externe** et une **comparaison visuelle statique** — sans
SDK tiers, sans tracking de progression, sans iframe arbitraire, sans upload, sans média privé.

## Candidats analysés (24)

| Bloc | Sous-famille | Source | Player | Iframe | Contrôles | Autoplay | Tracking | Privé | Divergence | Risque | Éligible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| video_local | vidéo native | c.src | `<video>` | non | natifs | opt-in (public) | non | non | non | modéré | ✅ |
| audio_player | audio natif | c.src | `<audio>` | non | natifs | non | download simple | non | éditeur carte / public `<audio>` (neutralisation) | modéré | ✅ |
| pdf_viewer | document interactif | c.url | — | non | liens | non | clic | non | non (public = liens directs) | faible | ✅ |
| spotify_embed | embed strict | spotifyEmbedUrl | — | **oui (Spotify)** | iframe natif | iframe | non | non | non (transform STRICTE) | modéré | ✅ |
| spotify_player | carte média externe | c.url | — | non | lien | non | clic | non | non | faible | ✅ |
| before_after | comparaison visuelle | before/after_img | — | non | — | non | non | non | non (grille statique) | faible | ✅ |
| video | embed vidéo | embedVideoUrl | — | oui | iframe | iframe | non | non | **embedVideoUrl RETOMBE sur URL brute arbitraire dans l'iframe** | — | ❌ (§4/§12) |
| google_maps_embed | embed carte | mapEmbedUrl | — | oui | iframe | non | non | non | **mapEmbedUrl accepte une embed_url http(s) ARBITRAIRE** | — | ❌ (§4/§12) |
| embed_block | embed générique | c.url | — | oui | iframe | ? | non | non | **iframe URL arbitraire** | — | ❌ |
| media_before_after | comparaison | before/after | slider | non | drag | non | non | non | **mode « slider » public (BeforeAfterPublic) absent en éditeur** | — | ❌ (§7/§14) |
| latest_release | musique carte | cover | — | non | liens | non | multi | non | **SmartImage public vs `<img>` éditeur** | — | ❌ |
| discography | musique répéteur | a{i}_cover | — | non | liens | non | par item | non | **SmartImage public vs `<img>` éditeur** | — | ❌ |
| album_block | musique carte | cover | — | non | liens | non | multi | non | **cta_label rendu éditeur, jamais public (§7)** | — | ❌ |
| playlist_block | musique carte | cover | — | non | liens | non | multi | non | **SmartImage** | — | ❌ |
| presave | musique carte | cover | — | non | liens | non | multi | non | **SmartImage** | — | ❌ |
| podcast_links | podcast | cover_url | — | non | liens | non | par plateforme | non | **SmartImage** | — | ❌ |
| youtube_gallery | galerie vidéo | video{i}_url | — | non | vignettes+liens | non | par item | non | **3 vidéos « démo » si vide (éditeur)** | — | ❌ (placeholder trompeur) |
| tiktok_gallery | galerie vidéo | — | — | non | — | non | — | non | **grille démo / embed social** | — | ❌ |
| video_testimonials | témoignages vidéo | — | — | non | — | non | — | non | à auditer (média-liste) | moyen | ⏸️ |
| gallery / image_carousel | galerie/carrousel | — | — | non | carrousel | — | — | non | **carrousel/lightbox** | — | ❌ (§4) |
| calendly | rdv | c.url | — | oui | iframe | non | non | non | iframe planning + logique | — | ⏸️ |
| spotify_player (déjà listé) | — | — | — | — | — | — | — | — | — | — | (voir ci-dessus) |
| ticketing | musique billetterie | — | — | non | lien | non | clic | non | proche event_ticketing (déjà shared) | faible | ⏸️ |
| video (placeholder éditeur) | — | — | — | — | — | — | — | — | (voir ci-dessus) | — | ❌ |

## Six blocs migrés

| Bloc | Sous-famille | Source | Player | Provider | Contrôles | Autoplay | Tracking | Niveau | Risque |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| video_local | vidéo native | safeAvSrc(c.src) | `<video controls>` | — | natifs | public seulement si `autoplay="yes"` (muté) ; jamais en éditeur | non | 2 | modéré |
| audio_player | audio natif | safeAvSrc(c.src) | `<audio controls preload=none>` | — | natifs | non | clic download opt-in | 2 | modéré |
| pdf_viewer | document | extHref(c.url) | — (liens) | — | liens | non | clic | 2 | faible |
| spotify_embed | embed strict | spotifyEmbedUrl(c.url) | iframe | Spotify | natif iframe | iframe (allow) | non | 2 | modéré |
| spotify_player | carte média externe | extHref(c.url) | — (lien) | — | lien | non | clic | 2 | faible |
| before_after | comparaison statique | safeMediaSrc | — | — | — | non | non | 2 | faible |

**6 sous-familles distinctes** : vidéo native, audio natif, document interactif, embed strict,
carte média externe, comparaison visuelle. Aucune paire identique.

## Sources et providers (allowlist)

- **safeAvSrc** (nouveau, `models/mediaUrl.ts`) : sources `<video>`/`<audio>`. Autorise http(s),
  chemin interne, `data:audio|video` ; **neutralise** `javascript:`/`vbscript:`/`file:`/`blob:`/
  `data:` non-AV ; longueur bornée ; type non-chaîne rejeté.
- **safeMediaSrc** (existant) : posters/couvertures/images (before_after).
- **spotifyEmbedUrl** (existant, `types.ts`) : transformation **STRICTE** — seules
  `open.spotify.com/(track|album|playlist|artist|episode|show)/id` et `spotify:` URI produisent un
  embed `open.spotify.com/embed/…` ; **aucun repli sur URL arbitraire** (`""` sinon). Vérifié :
  faux domaine `open.spotify.com.evil.com/...` et `notspotify.com/...` → aucun embed.
- **extHref** (existant) : liens PDF / Play / téléchargement (durcissement schémas dangereux).
- ❌ **embedVideoUrl** (`video`) et **mapEmbedUrl** (`google_maps_embed`) retombent sur une URL
  **brute arbitraire** dans l'iframe → non strictement bornés → blocs **exclus** (§4/§12).

## Audio (attributs conservés)

`<audio src controls preload="none">` (public) ; couverture optionnelle (SmartImage public,
`<img>` éditeur), titre (défaut « Écouter »), artiste, lien de téléchargement **opt-in**
(`show_download==="yes"`) tracké (« audio-download »). **Aucun** autoplay, waveform, égaliseur,
SDK, playlist ni tracking de progression. Éditeur : carte représentative (barre de progression
**décorative** statique), aucun lecteur réel — fidèle au legacy.

## Vidéo (attributs conservés)

`<video src poster controls playsInline>` + `aspectRatio` (16:9 / 9:16 / 1:1), `loop`, `muted`
(défaut vrai sauf `muted="no"`), vertical → `maxWidth: 280` centré. **Autoplay** : conservé en
**public** uniquement si `autoplay="yes"` (jamais ajouté), et **retiré de l'éditeur** (§8/§15 —
pas de lecture auto au canvas). Aucun HLS/DRM/player tiers/tracking.

## Iframes (sécurité)

Un seul embed migré : **spotify_embed**. `title="Lecteur Spotify"`, `allow="autoplay;
clipboard-write; encrypted-media; fullscreen; picture-in-picture"`, `loading="lazy"`, hauteur
déterministe (sm 80 / md 152 / lg 352). URL **exclusivement** produite par `spotifyEmbedUrl`
(allowlist Spotify, aucune URL arbitraire injectable). `video`/`google_maps_embed`/`embed_block`
exclus car leur transformation autorise une URL d'iframe arbitraire.

## Documents interactifs

**pdf_viewer** = ouverture/téléchargement direct, **aucune preview iframe** (l'éditeur affiche un
encart « Aperçu PDF » statique, le public rend `<a>Consulter</a>` + `<a download>↓ PDF</a>` via
`extHref`, tracké). Fidèle au legacy. Aucun fichier privé, aucune URL signée, aucune génération serveur.

## Autoplay

Décision : **jamais ajouté**. `video_local` public conserve l'autoplay legacy uniquement s'il est
explicitement configuré (`autoplay="yes"`) et reste muté (`muted` par défaut) ; l'**éditeur ne
lance jamais** l'autoplay (attribut retiré). `spotify_embed` : l'`allow="autoplay"` de l'iframe est
conservé (comportement provider, soumis aux règles navigateur). Tout autre bloc à autoplay ambigu
a été exclu.

## Tracking

Simple, au clic uniquement : pdf_viewer (consulter/télécharger → `c.url`), spotify_player
(Play → `c.url||"spotify_player"`), audio_player (download → « audio-download »). Injecté via
`ctx.trackClick` (try/catch non bloquant), jamais dans le modèle, jamais en éditeur. **Aucun**
tracking de progression/quartiles/durée/seeking/complétion.

## États d'erreur

Fallbacks legacy reproduits : `onError` masque l'image (poster/cover) ; source AV invalide →
public `null` (pas de balise), éditeur placeholder ; embed non reconnu → `null` ; `<audio/video>`
gèrent nativement l'échec réseau. Aucun retry, aucune boucle, aucune URL sensible exposée.

## Accessibilité

Contrôles **natifs** (`<video controls>`, `<audio controls>`) ; iframe Spotify avec `title` ;
liens PDF/Play = vrais `<a>` nommés ; before_after = `alt="Avant"`/`"Après"`. Éditeur : liens
neutralisés (`EditorCtaShell` `aria-disabled`, ou divs). Clavier/lecture/fullscreen/lecteur
d'écran = QA navigateur (voir plus bas).

## Registres et flags

Précédemment actifs : 39. Nouveaux : 6. **Total : 45 blocs shared actifs.** 97 legacy.

## Legacy et rollback

Tous les `case` legacy conservés. Rollback = retrait du type de `SHARED_RENDERER_BLOCKS` →
`resolve*Block` → null → `case` legacy. Aucune donnée touchée. Testé (registry.test).

## Fixtures & tests

`wave7.test.tsx` (20) : `safeAvSrc` (schémas dangereux dont `blob:`, type, longueur, valides) ;
modèles (visibilité, options, durcissement href, embed strict, non-mutation) ; parité +
interactions (`<video controls>`, `<audio controls>`, **autoplay public/jamais-éditeur**, iframe
`title`/`allow`/`loading`, pdf sans iframe, before_after 2 images) ; sécurité (src/href/iframe :
javascript/blob/faux-provider neutralisés). `architecture`/`registry`/`bundleBoundary` étendus à 45.
Suite : **1297 verts**. Typecheck 0. Build 84/84.

## Tests d'interaction — automatisé vs manuel

Automatisé (structurel) : présence des contrôles (`controls`), absence d'autoplay en éditeur,
`title`/`allow`/`loading` de l'iframe, attributs de sécurité, callback de tracking injecté (try/catch),
absence de callback en éditeur. **Manuel (QA navigateur requise)** : lecture/pause/volume/seeking/
fullscreen réels, autoplay effectif (règles navigateur), clavier, erreur média runtime, responsive,
layout shift, hydration.

## Bundle et imports

`bundleBoundary` (110) : 6 nouveaux modèles purs (sans React/Supabase/tracking), 6 publics sans
symbole éditeur. `SmartImage` (`@/components/SmartImage`, repli `<img>`) utilisé par le public
audio_player = composant public, non-dashboard. Aucun SDK player, aucune lib de montage, aucune
nouvelle dépendance.

## Performance

Sources normalisées une fois (modèles purs), aucune requête, aucune init SDK, `preload="none"`
(audio), `loading="lazy"` (iframe/images), pas de deep clone, imports directs, pas de player lourd.

## QA humaine restante (honnête)

**Non effectuée** (pas de navigateur) : lecture/pause/volume/fullscreen/seeking, autoplay réel,
clavier, source cassée & réseau lent, iframe Spotify refusée/consentement, responsive & layout
shift, hydration, console — sur Chrome/Safari/Firefox/iOS/Android, viewports 1440→360. Rollback prêt.

## Risques résiduels

- Parité pixel/police et comportements runtime des players **non observés**.
- `video_local` : l'éditeur ne reflète plus l'autoplay legacy (déviation **volontaire** §8/§15,
  éditeur uniquement, non publié) — à valider visuellement.
- `spotify_embed` : dépend de l'iframe tierce Spotify (consentement/adblock côté visiteur).
- `audio_player` : couverture via `SmartImage` (public) vs `<img>` (éditeur) — reproduction fidèle
  mais markup légèrement différent (dimensions/lazy).
- Blocs reportés/ exclus (video, google_maps_embed, embed_block = iframe arbitraire ;
  media_before_after = slider ; SmartImage musique ; galeries/carrousels) → vagues dédiées / B09.11.
