# QR Studio QRowg — Plan « meilleur éditeur QR du monde »

> **Mandat.** Faire du QR Studio (édition d'apparence) + Print Studio (impression) la
> **référence mondiale** : un éditeur capable de remplacer TOUS les concurrents
> (QR Code Monkey, Uniqode/Beaconstac, QR Tiger, Flowcode, Adobe Express) sur les
> trois fronts à la fois — **beauté**, **fiabilité de scan**, **qualité d'impression pro**.
>
> **Nature.** Plan d'exécution : analyse de l'existant (garder l'excellent, repenser le
> reste) puis reconstruction raisonnée, dimension par dimension. **Aucun code.**
>
> Statut : **v1.0 (plan)** — audit read-only complet. Moteurs purs lus directement ;
> monolithes (`QRStudio.tsx` 4135 l · `PrintStudio.tsx` 6174 l) analysés par surveys ciblés.

---

## 0. Étoile polaire & positionnement

### 0.1 La thèse : la seule plateforme qui réunit les trois mondes
Aujourd'hui le marché est fragmenté en trois familles, chacune forte sur un axe et
faible sur les deux autres :

| Famille | Fort sur | Faible sur |
|---|---|---|
| **Générateurs stylés** (QR Monkey, QR Tiger) | Personnalisation visuelle rapide | Fiabilité de scan garantie, impression pro, marque |
| **Plateformes marketing** (Uniqode/Beaconstac, Flowcode) | Dynamique, analytics, gestion de parc | Beauté « design », liberté créative, print vectoriel |
| **Outils créatifs** (Adobe Express, Canva) | Composition/print soignés | QR intelligent (scan-safe, dynamique, batch, verticaux) |

**QRowg gagne en étant le seul à exceller sur les trois** : *beau comme un outil de
créa, sûr comme un outil marketing, imprimable comme un studio pro* — le tout avec le
QR **dynamique** (destination modifiable) et l'**analytics** déjà en place.

### 0.2 Les 3 promesses (et leurs preuves)
1. **« Toujours scannable. »** Chaque design passe une **jauge de scannabilité live**
   (déjà existante) et un **pré-vol impression** (déjà existant) qui *empêchent* de
   publier/imprimer un QR illisible — garde-fou, pas simple avertissement.
2. **« Digne d'une marque. »** Couleurs, modules, coins, logo, cadres, effets et
   **modèles par métier** produisent un rendu premium *par défaut*, cohérent avec un
   kit de marque.
3. **« Prêt pour l'imprimeur. »** Export **vectoriel réel** (SVG **et** PDF vectoriel),
   **EPS**, **CMYK**, **fond perdu + traits de coupe**, planches multi-QR — au niveau
   d'un studio d'impression.

### 0.3 Les 5 lois du QR Studio
1. **La fiabilité n'est jamais optionnelle.** La scannabilité est mesurée en continu et
   bloque les configurations dangereuses (contraste, logo trop grand, marge nulle).
2. **Beau par défaut.** Un utilisateur qui ne touche à rien obtient déjà un QR premium.
3. **Le vecteur est roi pour l'impression.** On ne livre jamais un raster là où un
   imprimeur attend du vectoriel/CMYK.
4. **Un seul QR, tous les supports.** Le même code se décline (écran, sticker, affiche,
   set de table, vitrine) sans le régénérer.
5. **Accessible et testable.** Contrôles clavier/ARIA ; toute la logique critique
   (scan, pré-vol, couleurs, export) reste **pure et testée**.

### 0.4 Definition of Done (« référence mondiale »)
- Un QR **magnifique ET garanti scannable** produit en **< 60 s**, sans connaissance technique.
- Export **vectoriel CMYK prêt imprimeur** (SVG/PDF/EPS) en un clic, avec pré-vol vert.
- **Modèles par métier** (resto/business/luxe/retail/événementiel) qui semblent conçus sur-mesure.
- **Batch** : des dizaines/centaines de QR générés et exportés en une planche.
- **100 %** des contrôles atteignables au clavier ; moteurs critiques couverts par tests.

---

## 1. Fondations techniques (réalité du moteur — établi par lecture directe)

### 1.1 Moteur de rendu : `qr-code-styling` (client) — `qrRender.ts`
- **Modules** (`dotStyle`) : square · rounded · dot · softSquare · pixel · minimal ·
  neon · luxury (mappés sur square/rounded/dots/classy-rounded/classy/extra-rounded).
- **Coins & yeux** (`cornerStyle`) : square · rounded · circle · diamond · luxury ·
  minimal ; **couleur des coins ET des yeux séparée** (`cornerColor`, `eyeColor`).
- **Dégradés** : none · linear · radial · diagonal, appliqués aux **modules ET au fond**
  (2 arrêts : `fg→fg2`, `bg→gradientBg`).
- **Logo** central : URL, taille (**plafonnée à 30 %**), marge, forme, fond ;
  `hideBackgroundDots`.
- **ECC** : L/M/Q/H.
- **Limites structurelles** : la lib ne fait **pas** nativement textures/glass/ombres
  *sur les modules*, ni dégradés multi-arrêts, ni patterns de fond riches. Ces effets,
  s'ils existent, vivent dans le canvas Print Studio (composition), pas dans le QR.

### 1.2 Export actuel — `qrRender.ts` + `exportPlan.ts`
- **Formats** : PNG · WEBP · SVG (natifs lib) + **PDF via jsPDF = image raster** A4
  centrée (titre + url). `exportPlan` ne connaît que **png/jpeg/pdf**.
- **Lacunes pro majeures** (dette nº1 pour « référence mondiale ») :
  - **PDF non vectoriel** (raster embarqué) → perte de netteté à l'échelle.
  - **Pas d'EPS.**
  - **Pas de vrai CMYK** (tout est sRGB) → dérive couleur chez l'imprimeur.
  - Fond perdu / traits de coupe : évoqués comme « PDF Pro » dans `exportPlan` mais le
    moteur `qrRender.buildAndDownloadPdf` ne les produit pas — à vérifier côté Print Studio.

### 1.3 Moteurs de confiance (PURS, testés) — à préserver et amplifier
- **`qrScannability.ts`** : score 0-100 + niveau + conseils FR, basé sur contraste WCAG,
  QR « en négatif », ECC vs logo, modules délicats, marge tranquille. **Jauge live.**
- **`printPreflight.ts`** : pré-vol impression — contraste, **taille physique (mm)**,
  **zone silencieuse (mm)**, **logo %**, **DPI**, **marges de sécurité**, distance de
  lecture (règle 10:1), score/étoiles/grade. Géométrie pure (quiet zone, clearance).
- **`colorTools.ts`** : hex/RGB/HSL, **harmonies** (complémentaire/analogues/triade),
  couleurs récentes.
- **`exportPlan.ts`** : dimensions px, taille physique, qualité par DPI, gating PDF=Pro.
- **`templateGallery.ts`** : favoris/récents/validation d'ids.
- **Verdict** : ces cinq moteurs sont la **meilleure ingénierie du studio** et le socle
  de la promesse « toujours scannable / prêt imprimeur ». On construit **autour** d'eux.

---

## 2. Analyse par dimension — GARDER / REPENSER

> Grille : **État actuel · Verdict · Vision cible · Justification.**

> ⚠️ **Constat transversal (bug) — champs « fantômes ».** Plusieurs réglages sont
> exposés dans l'UI et sauvegardés dans `style_config`, mais **jamais lus par
> `buildOptions()`** → **aucun effet sur le rendu** : `density` (20+ presets le pilotent
> pour rien), et **toute la section logo « forme du conteneur / fond du conteneur »**
> (`logoShape`, `logoBg`, `logoBgColor`). UI trompeuse à réconcilier (implémenter OU retirer).

### Personnalisation de l'apparence (QR)

#### 2.1 Couleurs — **GARDER (contraste) · REPENSER (unifier)**
- **État actuel.** Pickers FG/BG (Saturation/Valeur maison), **10 palettes 1-clic**,
  couleurs **coins & yeux séparées** (réellement appliquées), **contraste WCAG live**
  (badge + ratio), générateur de palette à contraste garanti. **Mais** `ColorPicker.tsx`
  + `colorTools.ts` (pipette EyeDropper, **harmonies**, **brand kit**, récentes) sont
  **codés mais NON branchés** dans QRStudio, qui réimplémente son propre moteur couleur
  inline (duplication).
- **Verdict.** Le contraste live est **excellent (garder)** ; le reste est **fragmenté**
  (2 moteurs couleur, brand kit mort, pas de récentes exposées, pas de CMYK/Pantone).
- **Vision cible.** **Un seul moteur couleur** (brancher `ColorPicker`/`colorTools`) :
  pipette, harmonies, **couleurs de marque persistées** (Brand Kit), récentes, +
  saisie/aperçu CMYK (lié au §2.27).
- **Justification.** Le Brand Kit réutilisé partout est le standard Uniqode/Flowcode ; la
  brique existe déjà — il faut la brancher, pas la réécrire.

#### 2.2 Modules — **REPENSER (variété réelle)**
- **État actuel.** 8 libellés (`DOT_STYLES`) → **mais seulement 5 types réels** de la lib
  (`mapDotType`) : « Pixel » = « Classique », « Minimal » = « Dots ». Différenciation
  marketing sans différence visuelle.
- **Verdict.** Couverture **en trompe-l'œil** ; pas de styles réellement distincts
  (barres verticales/horizontales, fluid/connected proposés par Uniqode/QR Tiger).
- **Vision cible.** Catalogue de modules **réellement distincts** (dédupliquer les
  libellés) + styles avancés (barres, connecté/fluide), **prévisualisés en rendu réel**.
- **Justification.** Un éditeur « référence » ne peut pas afficher 8 styles qui n'en font
  que 5 ; la variété réelle est un argument visible.

#### 2.3 Coins / Yeux — **REPENSER (formes réelles + source unique)**
- **État actuel.** 6 libellés → **3 contours réels** ; **« Diamond » ne produit aucun
  losange** (mappé sur square) ; le point interne ne connaît que dot/square. Pire : un
  **3e réglage legacy** (`corner` square/rounded/dot) coexiste avec `cornerStyle` → deux
  sources de vérité.
- **Verdict.** Incomplet et déroutant.
- **Vision cible.** Styliser **cadre externe ET point interne indépendamment** avec de
  **vraies formes** (leaf, cushion, circle, losange réel) ; **supprimer le réglage
  legacy** ; couleur + (option) dégradé sur les yeux.
- **Justification.** Le style des « yeux » est la signature visuelle nº1 d'un QR de marque.

#### 2.4 Patterns — **AJOUTER (absent, avec garde-fou)**
- **État actuel.** **Rien** : le fond ne gère que couleur/dégradé/transparent.
- **Vision cible.** Motifs/**image de fond** derrière les modules, **sous garde-fou de
  scannabilité** (contraste minimal imposé, désactivation auto si risque). Optionnel,
  jamais au détriment du scan (Loi 1).
- **Justification.** Manque total vs certains générateurs ; à n'ouvrir qu'encadré.

#### 2.5 Gradients — **GARDER · ÉTENDRE**
- **État actuel.** Linéaire/radial/diagonal, sur **modules ET fond**, avec **garde-fou de
  contraste** sur la 2ᵉ couleur. **Mais** 2 arrêts seulement, **angle figé** par type,
  **coins/yeux non dégradés**, pas d'aperçu.
- **Verdict.** Fonctionnel et sûr (**garder**) ; sous le marché sur l'angle libre/multi-stop.
- **Vision cible.** **Angle libre**, **multi-arrêts**, dégradé optionnel sur les yeux,
  aperçu live — toujours sous garde-fou de contraste.

#### 2.6 Textures — **AJOUTER (absent)**
- **État actuel.** Aucune texture sur le QR.
- **Vision cible.** Textures subtiles (grain, papier) **sur le support/carte** plutôt que
  sur les modules (préserver le scan) ; à traiter comme effet de composition (Print Studio).

#### 2.7 Effects — **AJOUTER (encadré)**
- **État actuel.** **Aucun effet sur le QR** ; les ombres existantes concernent les
  **cartes/supports**, pas les modules.
- **Vision cible.** Effets **autour** du QR (halo, carte flottante, néon de cadre) sans
  toucher aux modules ; réservés à la composition, sous garde-fou.

#### 2.8 Shadow — **GARDER (support) · encadrer**
- **État actuel.** Ombres appliquées aux **cartes/supports** (rendu imprimable), pas au QR.
- **Vision cible.** Ombre portée **de la carte QR** (profondeur premium), jamais sur les
  modules eux-mêmes ; tokenisée.

#### 2.9 Glass — **AJOUTER (composition)**
- **État actuel.** Aucun effet verre.
- **Vision cible.** Effet « glass » **sur la carte/le cadre** du QR (pas les modules), en
  option premium de composition.

#### 2.10 Logos — **REPENSER (rendre réel + gater + persister)**
- **État actuel.** Upload drag-drop (max 2 Mo → **data URL** stockée dans le JSON, pas
  d'upload serveur), taille 10-30 %, **forçage ECC H auto + avertissement** (excellent),
  alerte > 25 %. **Bugs** : `logoShape`/`logoBg`/`logoBgColor` **non appliqués** (section
  décorative) ; logo en data URL **gonfle la ligne DB** ; **logo NON gaté** alors que
  c'est une feature avancée (Starter+).
- **Verdict.** Le forçage ECC est excellent ; le reste est **partiellement factice**.
- **Vision cible.** **Rendre réels** forme/fond du conteneur (ou les retirer) ; **upload
  persistant** (bucket + redimensionnement) ; **bibliothèque de logos/icônes** ; retrait
  de fond auto ; **gating cohérent**.
- **Justification.** Le logo central est LA demande nº1 des marques ; il doit tenir ses
  promesses UI et ne pas alourdir la base.
#### 2.11 Frames (cadres « Scan me ») — **REPENSER**
- **État actuel.** « Habiller en un tap » (`dressQr` `PrintStudio.tsx:1571`) = cadre or
  + pilule « SCANNEZ-MOI » ; 4 styles de cadre (`setQrFrame` : luxury/corporate/modern/
  neon+glow) ; 3 stickers arrière (rond/badge crénelé/carré) ; étiquette-pilule CTA avec
  contraste auto ; garantie d'**unicité** (un seul cadre à la fois). CTA presets fermés
  (« ★ AVIS GOOGLE, VOIR LE MENU, RÉSERVER, WIFI GRATUIT »).
- **Verdict.** Le concept « habiller en un tap » + contraste auto = **excellent**. Mais
  catalogue **pauvre** (~4 filets géométriques vs 15-30 frames illustrés chez Uniqode/
  QR Tiger), **CTA figé** (pas de saisie libre au poser), **cadre non groupé au QR**
  (déplacer le QR laisse le cadre).
- **Vision cible.** **Bibliothèque de frames vectoriels** riches (banderole, ruban
  incliné, bulle, flèche pointant le QR…) avec **zone CTA éditable** liée à la couleur
  de marque, **multilingue**, et **QR+cadre groupés** (un seul objet déplaçable).
- **Justification.** Les frames CTA sont le premier levier de taux de scan ; c'est un
  différenciateur visible et un retard net aujourd'hui.

### Qualité & confiance

#### 2.12 Scan Quality — **GARDER (le joyau) · unifier**
- **État actuel.** QRStudio recalcule un score **live à chaque changement**
  (`computeScannability` `:659-783`) : 8 familles de contrôles, **carte de score live** +
  **auto-fix ciblé** + **3 thèmes lisibles** + estimation de taille min d'impression.
- **Verdict.** **Le point le plus abouti du studio — au niveau/au-dessus du marché,
  à GARDER.** Réserves : score **heuristique** (ne décode pas un vrai scan) ; **DEUX
  moteurs divergents** — `computeScannability` inline (QRStudio) **et** le moteur pur
  `qrScannability.ts` (PrintStudio) : seuils/grades différents → un même QR noté « bon »
  ici, « moyen » là.
- **Vision cible.** **Unifier** sur le moteur pur (une seule vérité), + **décodage de
  contrôle réel** (re-scan du QR généré) pour passer d'heuristique à garantie ; garder
  auto-fix + thèmes.
- **Justification.** Cœur de la promesse « toujours scannable » : doit être unique, testé,
  idéalement prouvé par un vrai décodage.

#### 2.13 Préflight — **GARDER · étendre (préflight imprimeur)**
- **État actuel.** Moteur pur `printPreflight` (6 contrôles pondérés, distance de lecture,
  géométrie de zone silencieuse) + `PrintCenterPanel` mesurant le design réel.
- **Verdict.** **Excellent socle scannabilité — garder.** Manques d'un vrai préflight
  imprimeur : `logoPct` non mesuré depuis le canvas, **pas d'alerte image basse
  résolution**, **pas de CMYK/gamut**, **fond perdu non vérifié**, pas de police
  manquante/débordante ; déclenché **manuellement** et **non bloquant**.
- **Vision cible.** **Préflight imprimeur** (DPI images, CMYK/hors-gamut, fond perdu réel,
  polices vectorisées, encrage) + **score live** + **blocage réel** sous seuil critique.

#### 2.14 Accessibility — **REPENSER (fort déséquilibre)**
- **État actuel.** **Asymétrie massive** : PrintStudio est correct (34 `aria-label`,
  raccourcis clavier complets + nudge, `aria-pressed`, quelques `prefers-reduced-motion`)
  ; **QRStudio n'a qu'1 `aria-label`** pour 4135 l (pastilles/presets en `div role=button`
  sans libellé). **Pas de focus-trap** dans les modales/sheets, Échap seulement dans le
  canvas Fabric. `prefers-reduced-motion` quasi absent. Contraste de l'UI non audité
  (`#A8A190` sur sombre potentiellement < 4.5:1).
- **Verdict.** Le QR reste scannable (garde-fous), mais **l'accessibilité de l'interface**
  est très en retard côté QRStudio.
- **Vision cible.** Parité a11y : libellés ARIA partout, focus-trap (primitive `Modal`),
  clavier complet, `prefers-reduced-motion` respecté, contraste UI audité.
- **Justification.** Une « référence mondiale » ne peut pas avoir un studio entier
  quasi inutilisable au lecteur d'écran.

### Marque & modèles

> ⚠️ **Constat structurant nº1 — QUATRE systèmes de modèles disjoints.** (1) QRStudio
> `PRESETS` (56 styles de QR, **pas de retail**), (2) QRStudio `SUPP_TPLS` (37 supports
> rendus **canvas maison**), (3) PrintStudio `PRINT_TEMPLATES` (~99 modèles rendus
> **Fabric.js**), (4) `dashboard/templates/page.tsx` (thèmes microsite). **Aucun ID ni
> vocabulaire partagé.** Pire : **QRStudio ignore TOUS les moteurs purs** (scannabilité,
> couleurs, complexité, mobile, favoris…) et les réimplémente inline — seul PrintStudio
> les consomme. C'est la **cause racine** de la plupart des incohérences.

#### 2.15 Branding — **AJOUTER (le Brand Kit, pièce maîtresse)**
- **État actuel.** Briques présentes mais **non fédérées** : logo (upload + ECC H auto),
  **`GLOBAL_STYLES`** (10 chartes **couleur+typo** couplées, appliquées en un clic —
  excellent), `FONT_GROUPS` (~45 Google Fonts), `SWATCHES`. **Mais aucun kit de marque
  réutilisable** : « brand » = juste dessiner le nom, `brand={SWATCHES}` **codé en dur** ;
  le logo **n'alimente ni les couleurs ni la charte** ; couleurs signature QRStudio ≠
  `SWATCHES` PrintStudio (deux listes) ; les **polices n'existent pas côté QRStudio**.
- **Verdict.** `GLOBAL_STYLES` est un vrai moteur de charte (**garder**) ; il manque **le
  Brand Kit unique** qui les relie.
- **Vision cible.** **Un Brand Kit** (logo + couleurs de marque + polices) défini **une
  fois**, propagé **partout** (QR, supports, les deux studios) ; **extraction de la
  couleur dominante du logo** → accent → QR ; sélecteur de police cohérent des deux côtés.
- **Justification.** Le Brand Kit propagé est LE standard (Uniqode/Flowcode/Canva) et le
  liant qui rend l'ensemble « digne d'une marque » (promesse 0.2).

#### 2.16 Presets — **REPENSER (source unique + aperçu réel + presets utilisateur)**
- **État actuel.** 56 presets QR catégorisés + application instantanée + détection auto de
  catégorie (bien). **Mais** miniatures = **faux-QR CSS** (pas le vrai rendu) ; `density`
  des presets **sans effet** ; **pas de presets utilisateur** sauvegardés ; badges de plan
  **re-libellés de façon trompeuse** (interne `pro`→ « STARTER »).
- **Verdict.** Bon volume, **aperçu non fidèle** et pas de « mes styles ».
- **Vision cible.** **Aperçu en rendu réel** (mini-QR généré), **« Enregistrer mon
  style »** (presets utilisateur), badges de plan corrigés, presets **reliés aux modèles
  de support** (voir 2.17).

#### 2.17 Templates — **REPENSER (fusionner les 4 systèmes)**
- **État actuel.** Le triptyque **objectif × style × métier** de PrintStudio + le
  **générateur métier `MObj`** (métier → objectifs avec **titre/sous-titre/CTA FR
  pré-remplis**) = **excellent, état de l'art**. Mais **2 moteurs de rendu imprimable**
  (canvas `renderSupport` de QRStudio **vs** Fabric de PrintStudio) pour le même besoin,
  **2 catalogues**, ID en double (`contact-card` ×2), taxonomie incohérente.
- **Verdict.** Garder le triptyque `MObj` ; **fusionner** les catalogues et **un seul
  moteur de rendu** de support.
- **Vision cible.** **Un système de modèles unifié** (un moteur de rendu, un catalogue
  indexé objectif×style×métier, aperçus réels), relié au Brand Kit et aux presets QR.
- **Justification.** Ajouter un vertical impose aujourd'hui de toucher **4 endroits** non
  synchronisés — insoutenable pour une « référence ».

#### 2.18 Verticaux (Restaurant · Business · Luxury · Retail · Event) — **REPENSER (taxonomie unique)**
- **État actuel.** Couverture **riche mais éclatée** : Restaurant très dense (menu,
  cocktail, happy hour…), Luxury soigné (or/noir), Event (ticket à perforations), Business
  (carte de visite/vitrine). **Retail présent côté imprimable** (`promo-burst`,
  `soldes-mega`, `boutique-studio`) **mais ABSENT des presets QR**. Verticaux bonus
  (immobilier, Airbnb, coach, créateur) uniquement côté PrintStudio. **4 taxonomies
  métier différentes** entre les systèmes.
- **Verdict.** Le contenu vertical est **un vrai atout** ; la **taxonomie fragmentée** le
  gâche (Retail manquant côté QR, vocabulaires divergents).
- **Vision cible.** **Une taxonomie métier unique** (dont **Retail** de bout en bout),
  partagée QR↔supports, chaque vertical livrant *style QR + supports + textes FR* cohérents.
- **Justification.** Les modèles par métier « clés en main » sont le plus fort argument de
  conversion ; ils doivent être complets et cohérents sur les 5 verticaux cibles.

### Intelligence & échelle

#### 2.19 AI — **REPENSER (honnêteté) puis AJOUTER (vraie IA)**
- **État actuel.** Deux boutons badgés `Sparkles` (« Générer un style », « Générer une
  palette ») **SANS aucune IA** : `autoStyle` = détection de **mots-clés** → preset
  existant ; `genPalette` = **`Math.random()`** sur la teinte. **Aucune route IA** pour le
  QR ; **non gatés** par la capacité `ai` (pourtant vendue Pro+). **Sur-promesse.**
- **Verdict.** **Marketing IA sans IA** — à corriger (honnêteté produit) puis à doter
  d'une vraie IA.
- **Vision cible.** Court terme : **relibeller honnêtement** (« Style auto », « Palette
  aléatoire ») ou gater. Cible : **vraie IA** — style/branding suggéré depuis la
  destination + le logo, **QR-art** (fond génératif scan-safe), génération de textes CTA ;
  le tout **gaté `ai`** et **sous garde-fou de scannabilité**.
- **Justification.** L'IA est un axe concurrentiel (QR Tiger/Flowcode/Adobe) — mais une
  fausse IA badgée Sparkles est un risque de crédibilité.

#### 2.20 Batch — **AJOUTER (manque majeur B2B)**
- **État actuel.** **Aucun batch.** Le Print Studio est **mono-QR par conception**
  (un seul `qrDataUrl` injecté). QRStudio duplique un QR un par un (`duplicateQR`), pas
  de série. Pas d'import CSV, pas d'export ZIP.
- **Verdict.** Absence totale = écart majeur face à Uniqode/QR Tiger/Beaconstac
  (bulk CSV/API, milliers de QR, planches de codes uniques : n° de table, billets).
- **Vision cible.** **Génération en lot** (CSV / plage / API) → série de QR uniques
  (chacun sa destination + son étiquette), **appliqués à un même modèle**, **exportés en
  ZIP** ou en **planche imposée** (numéros de table, tickets, stickers).
- **Justification.** Débloque le B2B (restaurants multi-tables, événements, retail
  multi-produits) — un marché que les concurrents monopolisent.

### Export & impression

#### 2.21 Print (canvas d'impression) — **GARDER (socle) + compléter**
- **État actuel.** Canvas **Fabric.js** riche : 20+ formes, texte, icônes SVG
  recolorables, photos, **calques drag-drop** + recherche, **snap multi-cibles + guides
  + tick haptique** (excellent), alignement/distribution (moteur pur `alignDistribute`),
  sélecteur de pile (`stackedObjects`), 6 formats (A4/carré/story/carte/flyer/table tent),
  fonds (uni/dégradé/mesh), poignées bridées en **scale uniforme** (protège la
  scannabilité).
- **Verdict.** **Socle d'édition d'un très bon niveau — garder.** Manques : **pas de
  vrai fond perdu visible**, **formats limités** (pas de custom mm, roll-up, sticker rond,
  A3/A6, US Letter), pas de règles/repères manuels, pas de verrou de calque ni groupes
  persistants. *Dette code* : `distribute` (`:2450`) **duplique** et **dégrade** le
  module pur (`distributeDeltas`) — distribue par centres au lieu des espaces libres.
- **Vision cible.** **Bleed matérialisé et réglable** (mm normalisés) + ligne de coupe à
  l'écran ; **formats personnalisés** (saisie mm/cm/inch) + catalogue élargi ; règles &
  repères ; verrou/groupes de calques ; réutiliser le module pur pour la distribution.
- **Justification.** L'édition est bonne ; il manque le **paramétrage d'impression
  physique** qui sépare un outil « écran » d'un studio d'impression.

#### 2.22 Export (vue d'ensemble) — **REPENSER (pipeline vectoriel)**
- **État actuel.** Deux régimes : le **QR nu** (QRStudio) exporte PNG/PNG-T/WEBP/**SVG**/
  PDF ; **l'affiche composée** (PrintStudio) n'exporte que **PNG/JPG/PDF-raster sRGB**.
  Assistant d'export 3 étapes (moteur pur `exportPlan`). DPI 72/150/300 (plafonné 300).
- **Verdict.** Le QR nu a le vecteur ; **l'affiche n'a aucun vectoriel** (Fabric sait
  pourtant `toSVG` — inexploité). Incohérences : préfixes `qrowg-`/`qrfolio-`, label
  « Impression pro » **trompeur** (300 DPI mais sRGB).
- **Vision cible.** **Pipeline d'export unifié et vectoriel** pour l'affiche (SVG/PDF
  vectoriel), 600 DPI pour petits formats, noms de fichiers cohérents et informatifs.
- **Justification.** Un imprimeur attend du vectoriel ; livrer un raster de composition
  disqualifie l'outil pour la vraie prod.

#### 2.23 SVG — **GARDER (QR nu) · AJOUTER (affiche)**
- Le QR nu exporte du **SVG vectoriel** (natif lib, réservé Pro). **L'affiche composée
  n'a pas de SVG** alors que Fabric le permet. → **Ajouter** `toSVG` pour la composition.

#### 2.24 PNG — **GARDER**
- PNG (+ PNG transparent côté QR nu) natif, DPI configurable. Correct. À conserver ;
  ajouter **600 DPI** pour stickers/petits formats.

#### 2.25 PDF — **REPENSER (vectoriser)**
- **État actuel.** PDF = **image PNG raster** encapsulée (jsPDF `addImage`), A4 centrée ;
  version « Pro » avec bleed 3 % + 4 traits de coupe aux coins.
- **Verdict.** **Non vectoriel** (texte non sélectionnable, poids lourd, pas PDF/X).
- **Vision cible.** **PDF vectoriel / PDF/X** (contenu vecteur + QR vecteur), CMYK,
  bleed et hirondelles normalisés (voir 2.27/2.28).

#### 2.26 EPS — **AJOUTER (absent)**
- **Aucun EPS.** Format attendu par de nombreux imprimeurs/agences. → **Ajouter** l'export
  EPS (vecteur) du QR nu et, idéalement, de la composition.

#### 2.27 CMYK / ICC — **AJOUTER (manque critique nº1 « pro »)**
- **État actuel.** **Tout est sRGB** (zéro occurrence CMYK/ICC dans le code). Export via
  `canvas.toDataURL` → PNG/JPEG sRGB sans profil ; jsPDF embarque ce raster sRGB.
- **Verdict.** **Dérive colorimétrique garantie en offset.** Le label « Impression pro »
  est trompeur. Pas de Pantone/tons directs, pas d'alerte hors-gamut.
- **Vision cible.** **Sortie CMYK** (au moins PDF/X CMYK), **profils ICC** (FOGRA/GRACoL),
  **avertissement hors-gamut**, option **rich black** / tons directs. C'est **le** chantier
  qui débloque la crédibilité « pro ».
- **Justification.** Sans CMYK, l'axe « impression pro » de la thèse (0.1) ne tient pas
  face à Adobe/Beaconstac.

#### 2.28 Packaging (planches, kits, prêt-imprimeur) — **AJOUTER (quasi inexistant)**
- **État actuel.** Bleed = **bordure vide 3 %** (le fond **n'est pas prolongé** → filet
  blanc au massicot) ; 4 traits de coupe basiques ; **PDF seulement**, **Pro**.
- **Verdict.** Ce n'est pas un vrai prêt-imprimeur : pas de fond perdu réel, pas
  d'hirondelles normalisées (mm), pas de repères de registration/gamme de couleur, pas
  de cartouche job. **Aucune imposition / planche** (N-up stickers, feuille de cartes),
  **aucun kit** multi-supports (ex. « pack resto »), pas de ZIP.
- **Vision cible.** **Vrai fond perdu prolongé** (3 mm) + **hirondelles/repères
  normalisés** + **PDF/X** ; **imposition/planches** (N exemplaires ou N QR uniques par
  page, gouttières) ; **kits** (export groupé multi-supports en ZIP).
- **Justification.** Le packaging pro + les planches sont le cœur de l'usage B2B/print et
  totalement absents aujourd'hui.

---

## 3. Architecture cible

Six piliers, chacun résolvant une famille de dettes du §2. On reconstruit **autour** des
excellences (moteurs purs, jauge live, préflight, générateur métier, GLOBAL_STYLES).

### 3.1 Une source de vérité unique (fin des doublons)
QRStudio doit **consommer les moteurs purs** au lieu de les réimplémenter : **un** moteur
de scannabilité (`qrScannability.ts`), **un** système de complexité (`uiComplexity.ts`),
**un** moteur couleur (`colorTools`/`ColorPicker`), **un** service de favoris/récents
(`templateGallery`), **un** moteur de distribution (`alignDistribute`). Élimine les
2 moteurs de scan divergents, les 2 modèles Simple/Expert, la distribution dupliquée.

### 3.2 Un Brand Kit central
Logo + couleurs de marque + polices définis **une fois**, propagés à **tout** (QR nu,
supports, les deux studios). Extraction de la couleur dominante du logo → accent → QR.
`GLOBAL_STYLES` devient l'expression « charte » de ce kit. Fin des 5 copies « or/noir ».

### 3.3 Un moteur de rendu QR enrichi (mais honnête)
Modules/coins **réellement distincts** (dédupliquer les libellés fantômes), formes de
coins/yeux réelles + dégradé optionnel, gradients multi-stop/angle libre, logo **réel**
(forme/fond appliqués ou retirés) — le tout **sous garde-fou de scannabilité** (Loi 1).
Champs « fantômes » (`density`, `logoShape/Bg`) : implémentés ou supprimés.

### 3.4 Un pipeline d'export professionnel
**Vecteur de bout en bout** : SVG + **PDF vectoriel/PDF-X** + **EPS** pour le QR **et**
la composition (Fabric `toSVG`) ; **CMYK + profils ICC** + alerte hors-gamut ; **fond
perdu réel** (prolongé, mm) + **hirondelles/repères normalisés** ; **imposition/planches**
(N-up, QR uniques) ; **kits** multi-supports (ZIP). C'est le chantier qui débloque la
crédibilité « pro ».

### 3.5 Un système de modèles unifié
**Un** moteur de rendu de support (fin du canvas `renderSupport` vs Fabric), **un**
catalogue indexé **objectif × style × métier × vertical** (dont **Retail** de bout en
bout), **aperçus en rendu réel**, relié au Brand Kit et aux presets QR ; le générateur
métier `MObj` (textes FR) en reste le cœur.

### 3.6 Fiabilité prouvée + échelle
Scannabilité unifiée **+ décodage de contrôle réel** (re-scan) ; **préflight imprimeur**
bloquant ; **batch** (CSV/API → série de QR uniques → ZIP/planche imposée).

> Les 6 piliers sont ordonnés : **3.1 (source unique)** est le prérequis de tout le reste ;
> **3.4 (export pro)** est le plus gros différenciateur « référence mondiale ».

---

## 4. Feuille de route d'exécution (phasée)

> Règle absolue : **Loi 10 (zéro régression)**, QA visuelle par écran, `tsc`/build/tests
> verts, commit+push. Les excellences du §5 sont **préservées**.

### Phase 0 — Vérité & honnêteté (quick wins, faible risque)
Corriger les mensonges d'UI et la dette avant de construire :
- **Champs fantômes** : implémenter OU retirer `density`, `logoShape`, `logoBg`,
  `logoBgColor` (UI qui ne rend rien).
- **Libellés en trompe-l'œil** : dédupliquer modules (8→5) et coins (6→3), ou les rendre
  réellement distincts ; « Diamond » doit faire un losange ou disparaître.
- **Fausse IA** : relibeller honnêtement (« Style auto »/« Palette aléatoire ») **ou** gater `ai`.
- **Badges de plan trompeurs** (interne `pro`→ « STARTER »), **logo non gaté**.
- **Dette code** : `id` dupliqué `contact-card` ; `distribute` local → module pur ;
  préfixes `qrowg-`/`qrfolio-` ; commentaires obsolètes ; `logoPct` préflight mesuré depuis le canvas.

### Phase 1 — Source de vérité unique (fondations invisibles)
- QRStudio **consomme** `qrScannability`, `uiComplexity`, `colorTools`/`ColorPicker`,
  `templateGallery`, `alignDistribute` (fin des réimplémentations inline).
- **Un** modèle Simple/Expert, **une** jauge de scannabilité, **un** moteur couleur.

### Phase 2 — Brand Kit central
- Kit unique (logo+couleurs+polices) propagé aux deux studios ; couleur dominante du
  logo → accent → QR ; sélecteur de police côté QRStudio.

### Phase 3 — Export professionnel (le grand différenciateur)
- **Vecteur** composition (SVG/PDF-vector/EPS) ; **CMYK + ICC** + hors-gamut ; **vrai
  fond perdu + hirondelles mm** ; **préflight imprimeur** bloquant ; 600 DPI.

### Phase 4 — Modèles unifiés + verticaux complets
- **Un** moteur de rendu de support + **un** catalogue (objectif×style×métier×vertical) ;
  **Retail** de bout en bout ; aperçus réels ; taxonomie unique ; `MObj` conservé.

### Phase 5 — Batch/échelle + vraie IA
- **Batch** CSV/API → série → ZIP/imposition ; **imposition/planches** ; **kits**.
- **Vraie IA** (QR-art scan-safe, branding/textes suggérés), gatée `ai`.

### Séquencement
Phase 0 (intégrité) → Phase 1 (source unique, prérequis) → puis 2/3/4 en parallèle
possible (Brand Kit, Export pro, Modèles), Export pro (3) étant prioritaire pour la thèse
« pro » → Phase 5 (échelle/IA). L'export CMYK/vectoriel et le batch sont les deux plus
gros chantiers ; les corriger **après** avoir unifié la source de vérité (sinon on double
la dette).

---

## 5. Ce qu'on garde tel quel (préservation)

**Moteurs purs testés (le trésor)** : `qrScannability` (+ auto-fix + thèmes lisibles) ·
`printPreflight` (contraste/taille mm/zone silencieuse/DPI/marges/distance de lecture) ·
`colorTools` (harmonies) · `exportPlan` · `templateGallery` · `alignDistribute` ·
`stackedObjects` · `mobileContextTools` · `touchGestures` · `uiComplexity`.

**Excellences UI/produit** : jauge de scannabilité **live** + « Optimiser
automatiquement » + thèmes prêts · **forçage ECC=H** sous logo · contraste WCAG temps
réel · gradients modules+fond **avec garde-fou** · couleurs coins/yeux séparées · snap
multi-cibles + guides + **tick haptique** · calques **drag-drop** · poignées en **scale
uniforme** (protège le scan) · **générateur métier `MObj`** (textes FR pré-remplis) ·
`GLOBAL_STYLES` (charte couleur+typo) · formats normalisés (CR80/A4/mm) · « habiller en un
tap » du QR · assistant d'export 3 étapes.

---

*Plan QR Studio · v1.0 · établi par audit read-only exhaustif (moteurs purs lus + 3
surveys : apparence, impression/export, verticaux/UX). Ne prescrit aucune modification
immédiate — il cadre le travail à venir. Aucun code produit.*
