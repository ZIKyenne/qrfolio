# QRowg — Moteur de templates (métier × style × layout) — Cartographie & plan

> Mission de **cartographie + plan, sans code** (décision produit). Objectif : passer de « N templates
> figés » à un **moteur de composition** `structure(métier) × style × layout`, sans ajouter un énième
> système. Stratégie images retenue : **placeholders + petit set bundlé licence-safe** (zéro dépendance
> distante). Aucune donnée/Supabase/renderer public touché par cette phase.

## A. Cartographie réelle des systèmes de templates

| Système | Emplacement | Forme | Consommé par | Statut |
| --- | --- | --- | --- | --- |
| **Templates de page (code)** | `dashboard/builder/page-templates.ts` | `PageTemplate = { key, group (métier), label (variante), emoji, desc, theme: PageTheme, blocks: {type,content}[] }` — **20 templates / 10 métiers**, **14 thèmes `T` factorisés** | Galerie + Builder | **SOURCE ACTUELLE** ✅ |
| Galerie templates | `dashboard/templates/page.tsx` | lit `PAGE_TEMPLATES` (`SHARED_META/BLOCKS/THEMES`) | utilisateurs | **aligné** (plus divergent) |
| API « utiliser » | `api/templates/use/route.ts` | POST `{theme, blocks, slug}` → crée la page (`BLOCK_DEFS` + `normalizePageTheme` + quota) | galerie | **OK** |
| Table DB `page_templates` | `supabase/seed/001_templates.sql` | JSON `default_blocks`/`default_theme` | *(plus personne — la galerie lit le code)* | **LEGACY orphelin** → à retirer/marquer mort |
| Galerie QR | `qr-codes/templateGallery.ts` | designs de **QR**, pas de pages | QR Studio | **hors périmètre** |
| Avatars | `avatar/templates.ts` | presets d'avatar | profil | **hors périmètre** |

**Constat clé** : `page-templates.ts` sépare déjà `theme` (style) de `blocks` (structure) et groupe par
métier. Le moteur **généralise** ce fichier — il ne le remplace pas par un 5ᵉ système. La seule vraie
dette : la table DB `page_templates` (legacy) qu'il faut acter comme morte.

## B. Ce qui manque (le delta)

1. **Découpler** : aujourd'hui chaque `PageTemplate` fige `structure + 1 thème`. On veut
   `structure` réutilisable avec **n'importe quel** style et layout.
2. **`composeTemplate(structure, style, layout)`** pur → `{ blocks, theme }` (alimente
   `applyPageTemplate` déjà en place dans le Builder).
3. **Axe layout** (densité / ordre / colonnes / espacement) — inexistant aujourd'hui.
4. **Sélecteur de style/layout** dans la galerie + preview (un template = plusieurs déclinaisons).

## C. Architecture cible

```text
TemplateStructure (métier)   { key, group, blocks: {type, content}[] }   ← SANS thème
        ×
TemplateStyle                PageTheme preset (palette/typo/effets/motion) ← les T actuels, étendus
        ×
TemplateLayout               modifieurs purs (densité, ordre, colonnes, espacement)
        ↓
composeTemplate(structure, style, layout) → { blocks, theme }
        ↓
applyPageTemplate()  (existant, Builder)  →  /api/templates/use (existant)
```

- **Pur & testable** (aucun React/Supabase) → vérifiable par tests + preview harness + captures (comme C09).
- **Rétrocompatible** : chaque `PageTemplate` actuel devient `composeTemplate(structure, sonThème, layoutDéfaut)` → la galerie ne casse pas.
- **`PageTheme` canonique** (`normalizePageTheme`) = l'axe style, déjà unifié. Rien à réinventer.

## D. Stratégie de consolidation (pas de 5ᵉ système)

1. `page-templates.ts` évolue en 3 exports : `TEMPLATE_STRUCTURES`, `TEMPLATE_STYLES` (les `T`), `TEMPLATE_LAYOUTS` + `composeTemplate`. `PAGE_TEMPLATES` reste exporté (dérivé) pour la galerie tant qu'elle n'a pas de sélecteur.
2. **Acter la mort** de la table DB `page_templates` (seed 001) : ne plus l'alimenter, la documenter legacy (aucune migration nécessaire, personne ne la lit).
3. Galerie : à terme, afficher `structure × style` (sélecteur de style/layout) au lieu d'un combo figé.

## E. Images — placeholders + petit set bundlé (décision)

- **Aucun hotlink** distant (licence + CSP pages publiques + perf ; cohérent avec le plan QR Studio).
- Blocs image des templates : **clé vide → placeholder élégant** (gradient/typo du thème) rendu par le
  renderer, **+ un petit set d'images bundlées licence-safe** (`public/templates/…`, optimisées) pour
  les héros/galeries clés.
- L'utilisateur remplace en 1 clic via **« Ma bibliothèque »** (picker déjà existant, bucket `page-assets`).

## F. Contrainte anti-fake (ferme)

- **Aucun faux avis / fausse note / faux chiffre.** Les blocs `testimonials`/`stats` des templates
  portent des exemples **explicitement marqués « exemple »** (jamais de fausses notes Google réelles).
- Logos/coordonnées fictifs = OK s'ils sont manifestement des placeholders.

## G. Combinatoire & qualité (garde-fou)

- Le moteur rend la **génération** gratuite, mais chaque combo doit rester beau. → **Set vitrine curé**
  (~20-30 combos « featured », QA visuelle) **+ moteur pour la longue traîne** (`30 structures × 10 styles
  × 3 layouts` disponibles à la demande, pas tous pré-générés/QA).
- **Les « 4 niveaux »** (Simple/Pro/Premium/Ultra) sont mieux modélisés comme **des structures de
  densité différente** (nb de blocs) + intensité de style/motion, **pas** comme un 4ᵉ axe multiplicatif
  (sinon explosion combinatoire ingérable).
- **IA (dormante, attend `ANTHROPIC_API_KEY`)** = **accélérateur optionnel plus tard** : générer des
  variantes de structure/contenu à partir d'une structure de base. Le moteur pur est le prérequis ; l'IA
  n'est jamais bloquante.

## H. Roadmap chiffrée (vagues, faisables par l'agent sans Supabase)

| Vague | Contenu | Livrable vérifiable |
| --- | --- | --- |
| **T1 — Moteur pur** ✅ FAIT (`220cb809`) | `templateEngine.ts` (`TemplateStructure/Style/Layout` + `composeTemplate`) + 12 tests (round-trip rétrocompat + combos croisés) + DB legacy actée | tests verts, `page-templates.ts` inchangé |
| **T2 — Axe layout + preview** ✅ FAIT | 3 layouts (`default`/`compact`/`airy`, densité via `__space` réel) + **harness `/e2e-harness/template-preview`** (rendu RÉEL des blocs, structure×style×layout) + spec + captures **vérifiées visuellement** (Restaurant × gold/slate/compact = pages premium complètes, 0 erreur) | +5 tests, e2e 4 tests, captures lues par l'agent |
| **T3 — Composeur réutilisable** ✅ FAIT (composant) | `components/templates/TemplateComposer.tsx` : composant PRODUIT réutilisable (picker structure×style×layout + aperçu LIVE réel + `onCreate(composed)`). Vérifié via harness (5 e2e) + captures. **Le branchement live dans la galerie reste un pas BINÔME** (voir ci-dessous) | composant + e2e verts |
| **T3.b — Pont galerie** ✅ FAIT (v1 flag) | Moteur : `galleryRestyle`/`isGalleryRestylable`/`nativeStyleKeyFor` (style natif par identité de référence ; **null** pour les curés → legacy conservé). `NamingModal` étendue avec un **sélecteur Style visuel (pastilles) + Disposition**, d'abord gardé par le flag `BUILDER_REDESIGN`, limité aux 20 templates partagés. Vérifié : harness `/e2e-harness/naming-style` + captures | +6 tests moteur, 4 e2e |
| **T3.b+ — Universel (34 cartes, ungated)** ✅ FAIT | Généralisé à **TOUTES les cartes de la galerie** (34 = 20 partagés + 14 signature) via `galleryComposeBlocks(blocks, currentTheme, styleKey, layoutKey)` + `galleryStyleChoices`/`nativeGalleryStyleKey`/`NATIVE_STYLE_KEY` (purs). Les modèles « signature » (thème bespoke hors preset) exposent une option **« original »** (clé `__native`) qui reproduit le look d'origine à l'identique. **Décorrélé du flag et activé partout** : le défaut = style natif ⇒ **zéro régression** si l'utilisateur n'y touche pas ; le POST `/api/templates/use` garde le même contrat `{theme, blocks}` (normalisé serveur). Vérifié : +6 tests moteur (34 total), 4 e2e (dont l'option « original »), **capture lue** (« Neon Creator (original) » + 14 ambiances). **Reste 1 smoke-check binôme** : créer une page restylée en étant connecté (POST authentifié injoignable depuis le sandbox) | +6 tests, e2e, capture |
| **T4 — Images premium** ✅ PLACEHOLDERS (moitié faisable par l'agent) | `templatePlaceholders.ts` : data-URIs SVG **générés** (dégradés sobres + icône + libellé), licence-libres, self-contained, rendus par tout `<img>` (éditeur + public) **sans toucher le renderer**. `placeholderGallery(n)` alimente les blocs `gallery`/`image`/`cover`. Câblé (photographe → portfolio, fleuriste → galerie). L'utilisateur remplace via « Ma bibliothèque ». **Le petit set de VRAIES photos licence-safe reste à fournir par le projet** (l'agent ne source pas d'images) | +5 tests + **capture vérifiée** (photographe : portfolio de 6 tuiles premium, 0 erreur) |
| **T5 — Verticales (data)** ✅ 6 lots | `templateStructures.extra.ts` : **62 nouvelles verticales en DONNÉES** (registre **20 → 82 structures**, ≈ 82 × 14 styles × 3 layouts = **3444 combinaisons**) — lot 6 : food truck, salon de thé, chiropracteur, orthophoniste, esthéticienne, opticien, primeur, illustrateur, streamer, prof de yoga, prof de musique — Artisan/BTP (plombier, électricien, serrurier, paysagiste, menuisier, peintre, pisciniste), Beauté (barbier, institut, ongles, tatoueur, spa), Santé (dentiste, ostéo, psy, nutritionniste, vétérinaire), Commerce (fleuriste, bijouterie, cave, animalerie), Restauration (pizzeria, coffee, boulangerie, cocktail, sushi, traiteur), Immobilier (chasseur, gîte, architecte, décorateur), Créatif (photographe, DJ, développeur), Événementiel (wedding), Coaching, Freelance (avocat, auto-école, nettoyage, déménagement). Galeries via placeholders (T4). Avis « (exemple) » (anti-fake, garde-fou). **Ajouter un métier = ajouter un objet** | tests garde-fous (clés uniques, types valides, anti-fake) + **captures vérifiées** (plombier, barbier, pizzeria, wedding, photographe, tatoueur, développeur = pages premium, 0 erreur) |
| **T6 — (option) IA variantes** | génération de variantes derrière `ANTHROPIC_API_KEY` + garde-fous anti-fake | 503 clair si clé absente |

Estimation honnête : T1 ≈ 1 mission ; T2/T3 ≈ 1 chacune ; T5 = récurrent par lots de métiers (le gros du
volume, mais en **données**, pas en code) ; T4 dépend du sourcing d'images ; T6 optionnel.

## T3 — Branchement galerie : constat & voie binôme

Audit réel de la galerie (`dashboard/templates/page.tsx` + `TemplatePreviewModal.tsx`, **2843 lignes**) :
- flux **authentifié** (Supabase) → `POST /api/templates/use` `{templateId, templateName, slug, theme, blocks}` — **non rendu par l'agent** (Supabase injoignable) ;
- la modale a son **propre** renderer d'aperçu (≠ `builderPreview`) ;
- **divergence de contenu** : `page.tsx` contient un `TEMPLATE_BLOCKS` **inline** qui redéfinit certaines clés (ex. `"restaurant"`, `"createur"`) avec un contenu ≠ `page-templates.ts` (`"resto_bistrot"`…). Les clés galerie ne mappent donc pas toutes 1:1 sur `TEMPLATE_STRUCTURES`.

→ Conclusion (cohérente avec la note mémoire « ne pas refactorer la galerie à l'aveugle ») : **ne pas
blind-wirer** l'engine dans la galerie solo. **T3.b (fait)** applique cette prudence : la réconciliation
des clés est résolue proprement par le moteur (`galleryRestyle` renvoie **null** pour les 14 modèles
curés inline ⇒ leur thème/blocs legacy sont conservés à l'identique ; seuls les 20 templates partagés,
dont les clés SONT des structures, deviennent restylables). Le sélecteur Style/Disposition est câblé
dans la vraie `NamingModal` **derrière le flag `BUILDER_REDESIGN` (OFF en prod)** : galerie strictement
inchangée tant que le flag est OFF, et le chemin ON est vérifié visuellement via le harness
`/e2e-harness/naming-style` (la `NamingModal` réelle y est montée). **Reste binôme** : basculer le flag
ON en préprod et valider la **création authentifiée** (POST `/api/templates/use`) de bout en bout — c'est
le seul maillon que l'agent ne peut pas exécuter (Supabase injoignable depuis le sandbox).

## I. Risques

- **Ajouter un système au lieu de consolider** → interdit : le moteur *est* `page-templates.ts` généralisé.
- **QA visuelle de N combos** → mitigé par le set vitrine curé + harness/captures (l'agent lit les screenshots).
- **Poids images** → mitigé par placeholders + set bundlé optimisé.
- **Sur-modélisation** (4 niveaux × 10 styles × 3 layouts × 30 métiers) → tenir la combinatoire via
  structures de densité + set featured.

## J. Prochaine action recommandée

Démarrer **T1 (moteur pur + migration rétrocompatible + acter la DB legacy)** — 100 % réalisable par
l'agent (pur, testé, sans Supabase), sans changer l'UI ni casser la galerie. C'est la fondation qui rend
tout le reste (layouts, sélecteur, verticales, IA) incrémental et sûr.
