# À mettre en file — 05/09/2026 (secteur commerce)

**File Buffer trouvée VIDE (0/10).** Tout tient donc, rien ne part au stock par manque
de place. Mais Buffer refuse une image dont l'URL n'est pas encore accessible : il faut
d'abord lancer **QRowg-Depot.cmd** (il scanne le dossier `outputs` de la session, où les
15 PNG ont été déposés), puis mettre en file.

URLs attendues après dépôt :
`https://yujvstejimbernkolbdu.supabase.co/storage/v1/object/public/page-assets/social/2026-09-05/<slug>.png`

## Ordre de mise en file (mode `addToQueue`, jamais `shareNow`)

### 1. Carrousel Instagram — canal `6a8a1a84ccaf649a67f96977`
6 images `qr-code-stock-disponible-magasin-boutique-01..06.png` · légende IG du HTML.

### 2. Carrousel photo TikTok — canal `6a8a19aeccaf649a67f96740`
6 images **`tiktok-`** (1080×1350, sous la limite TikTok de 2 073 600 px) · légende TikTok.

### 3. Épingles Pinterest — canal `6a8a19cdccaf649a67f9678b`
| # | fichier | tableau | boardServiceId |
|---|---|---|---|
| 1 | qr-code-retours-garantie-ticket-caisse-boutique.png | QR code boutique commerce | `726416683586817655` |
| 2 | qr-code-carte-sandwichs-du-midi-boulangerie.png | QR code food truck | `726416683586817654` |
| 3 | qr-code-carte-bieres-pression-du-moment-bar.png | QR code restaurant | `726416683586817614` |

Titres SEO, descriptions et `metadata.pinterest.url` (lien tracké) : voir le HTML
« Textes du jour ». Texte ≤ 500 caractères.

**Placement volontairement sur les tableaux « QR code X »** : le test de placement
lancé le 03/09 (Productivité au travail / Templates gratuits / témoin QR code
restaurant) se lit le **11/09**. On ne touche pas aux tableaux historiques d'ici là.

## Vidéo — MANUELLE, jamais dans Buffer
`qr-code-stock-disponible-magasin-boutique-reel.mp4` · 32,2 s · muet.
À publier à la main sur Instagram et TikTok, avec un son tendance.
