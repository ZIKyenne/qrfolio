# QROWG PRODUCT BIBLE — Chapitre 4 : Design System

> **Rôle.** Ce chapitre est le **catalogue opérationnel** du langage visuel de QRowg :
> chaque fondation (tokens, couleur, typo, espacement, rayon, élévation, motion,
> icônes, états) et chaque composant y est décrit tel qu'il existe **dans le code**,
> avec ses variantes, son responsive, ses animations, son accessibilité, ses
> *code smells*, ses anti-patterns et ses optimisations.
>
> Il prolonge le **Ch.2 Design Philosophy** (le *pourquoi*) et le **Ch.3 Motion
> System** (le *mouvement*). Règle de synchronisation de la Bible : **le code et ce
> chapitre ne divergent jamais** — toute évolution d'un token ou d'une primitive met
> ce chapitre à jour dans le même commit.
>
> Statut : **v1.0** — établi par audit complet des composants (analyse read-only).

---

## 0. Carte du système

| Couche | Où | Nature | Autorité |
|---|---|---|---|
| **Tokens web** | `app/globals.css` → `:root` | Variables CSS (runtime) | Source de vérité **dashboard + pages publiques + landing** |
| **Tokens mobile** | `components/mobile/designTokens.ts` (`T`) | Objet TS (compile-time) | Source de vérité **primitives mobiles** (`components/mobile/`) |
| **Motion** | `lib/motion.ts` + `globals.css` (`--mo-*`, `mo-*`, `.mo-*`) | Constantes + CSS | Source unique du mouvement |
| **Primitives** | `components/ui/*` | Composants React | Briques réutilisables du dashboard |
| **Primitives mobiles** | `components/mobile/*` | Composants React | BottomSheet, MobileDock… (chrome sombre) |

> ⚠️ **Constat structurant nº1 — deux systèmes de tokens qui divergent.** Le web
> (`globals.css`) et le mobile (`designTokens.ts`) définissent **des valeurs
> différentes pour les mêmes rôles** (fond, encre, sourdine, succès, alerte,
> danger). Voir §1.1/§1.4. C'est la dette de design nº1 à résorber.
>
> ⚠️ **Constat structurant nº2 — DEUX feuilles de style globales concurrentes.**
> `app/globals.css` (canonique, réellement chargée, Inter self-hostée, tokens
> sémantiques) **et** `app/../styles/globals.css` (legacy, tokens `--color-*`,
> classes `.btn-primary/.btn-ghost/.input/.skeleton`, **sans `--warning`, sans
> accent utilisateur**, avec sa propre règle `:focus-visible` et son propre
> `.skeleton`). Résultat : **deux définitions** de focus et de skeleton, deux jeux
> de couleurs. Selon la classe employée, le rendu diverge. À supprimer/fusionner.

---

## 1. Fondations

### 1.1 Couleurs

**Palette web — `app/globals.css:54-87`** (canonique pour tout sauf `components/mobile/`) :

| Token | Valeur | Rôle |
|---|---|---|
| `--bg` | `#080808` | Fond application |
| `--surface` | `#111009` | Cartes, panneaux |
| `--accent` / `--gold` | `#C9A84C` | **Accent premium — piloté par l'utilisateur** (profil) |
| `--gold-light` | `#E8C96A` | Survol/état lumineux de l'or |
| `--gold-dim` | `rgba(201,168,76,0.12)` | Fond teinté or |
| `--gold-border` | `rgba(201,168,76,0.25)` | Bord teinté or |
| `--ink` | `#F5F0E8` | Texte principal |
| `--muted` | `#8A8478` | Texte secondaire |
| `--faint` | `#4A4640` | Texte/traits tertiaires |
| `--neon` | `#39FF8F` | Accent « vivant » (= succès) |

**Grammaire sémantique — `globals.css:69-86`** (un rôle = une couleur, partout) :

| Rôle | Token | Base | `-bg` | `-border` |
|---|---|---|---|---|
| Action (liens/CTA neutres) | `--action` | `#38BDF8` | `rgba(56,189,248,.10)` | `rgba(56,189,248,.28)` |
| Premium (payant, plan) | `--premium` | `= var(--accent)` | — | — |
| Succès (validé, actif) | `--success` | `#39FF8F` | `rgba(57,255,143,.10)` | `rgba(57,255,143,.28)` |
| Alerte (en attente) | `--warning` | `#FBBF24` | `rgba(251,191,36,.10)` | `rgba(251,191,36,.30)` |
| Danger (suppression) | `--danger` | `#FF6B6B` | `rgba(255,107,107,.10)` | `rgba(255,107,107,.28)` |

- **Description.** Fond quasi-noir, encre crème chaude, accent or **variable** (chaque
  utilisateur choisit son accent ; le layout l'injecte au runtime via
  `document.documentElement.style.setProperty('--accent', …)` — `app/dashboard/layout.tsx:120`).
  Les rôles sémantiques sont fixes.
- **Cas d'usage.** Toujours passer par un token. Fond teinté d'un rôle = `*-bg` ;
  bord = `*-border` ; texte/icône = la base. Pour une teinte à opacité arbitraire,
  `color-mix(in srgb, var(--accent) N%, transparent)`.
- **Accessibilité.** Encre `#F5F0E8` sur `#080808` ≈ ratio 17:1 (AAA). L'or `#C9A84C`
  sur noir ≈ 8:1 (AA large). **Point de vigilance : l'accent étant utilisateur, un
  accent clair choisi par l'utilisateur peut casser le contraste du texte noir sur
  bouton primaire** — aucun garde-fou de contraste n'existe (anti-pattern potentiel).
- **Code smell.** Beaucoup de hex **codés en dur** subsistent dans les écrans
  (`#F5F0E8`, `#A8A190`, `#8A8478`, `rgba(201,168,76,…)`) au lieu des tokens ;
  `#A8A190` (une sourdine plus claire) est utilisé en parallèle de `--muted`
  (`#8A8478`) → **deux gris sourds concurrents**.
- **Anti-pattern.** Réécrire `#C9A84C` en dur là où `var(--accent)` devrait suivre
  l'utilisateur (fige l'accent). *Exception documentée* : canvas/fabric (QR/Print),
  e-mails, Satori/OG, logo — là où `var(--*)` ne résout pas (voir mémoire codemod accent).
- **Optimisation.** Codemod progressif hex→token dans les écrans dashboard ;
  unifier `#A8A190`/`#8A8478` sur `--muted` ; ajouter un garde-fou de contraste sur
  l'accent utilisateur (forcer texte clair si accent trop lumineux).

### 1.2 Tokens

- **Web (`globals.css :root`).** Variables CSS → **thémables au runtime**, cascade
  naturelle, `color-mix()` natif. C'est ce qui permet l'accent utilisateur.
- **Mobile (`designTokens.ts`).** Objet `T` gelé (`as const`) → **typé, testable**
  (`designTokens.test.ts`), helpers `clampTap()`, `elevation()`, `tokensCss()`.
  Contient `space`, `radius`, `tap`, `z` (z-index unifié), `motion`, `ease`, `color`,
  `elevation`.
- **Cas d'usage.** CSS/écran dashboard → variables `--*`. Composant `components/mobile/`
  → `T.*`. Motion → toujours `lib/motion.ts` ou `--mo-*`.
- **Code smell / anti-pattern.** **Aucun token web pour l'espacement, le rayon, la
  typo, l'élévation** — ils n'existent qu'en mobile (`T`) et sont réinventés en px
  inline partout ailleurs. Le mobile a un `z` unifié ; le web empile des z-index
  arbitraires (90, 3000, 3500, 4000, 4200, 4300…).
- **Optimisation.** Faire de `T` (ou d'un dérivé CSS via `tokensCss()`) la **source
  unique**, et exposer espacement/rayon/élévation/z en variables `--*` côté web pour
  réconcilier les deux mondes.

### 1.3 Typographie

- **Police unique réelle : Inter** (variable, self-hostée — `globals.css:10-15`).
  **`Fraunces` et `DM Sans` sont des alias @font-face qui pointent vers les fichiers
  Inter** (`globals.css:16-27`) : les ~450 références inline `font-family:"Fraunces"`
  / `"DM Sans"` rendent donc **toutes Inter**. `JetBrains Mono` est la seule police
  distincte (mono, sélecteurs QR/Print).
- **Hiérarchie = poids + taille, pas famille.** Poids courants : 400 (corps), 600
  (labels/meta), 700 (titres de carte), 800 (titres forts, valeurs KPI). Les titres
  de primitives utilisent `fontFamily:"Fraunces, serif"` (= Inter) à 700.
- **Échelle de taille (observée, non tokenisée).** 10 (labels majuscules), 11–13
  (meta/corps dense), 14–16 (corps, champs à 16 anti-zoom iOS), 15–19 (titres),
  24+ (héros).
- **Accessibilité.** Corps ≥ 14, champs à **16px** (empêche le zoom auto iOS —
  `.ui-input`, règles `builder-root`/`ps-root` à `globals.css:412-427`).
- **Code smell.** L'aliasing Fraunces/DM Sans→Inter est un **choix documenté** mais
  déroutant : le code prétend une hiérarchie sérif/sans qui n'existe pas au rendu.
  Aucune **échelle typographique tokenisée** (tailles en px magiques partout).
- **Anti-pattern.** Introduire une nouvelle taille arbitraire au lieu de réutiliser
  un palier existant.
- **Optimisation.** Tokeniser une échelle (`--text-xs…--text-2xl`) ; à terme,
  supprimer les alias et n'employer que `Inter`/`JetBrains Mono` explicitement.

### 1.4 Espacement · Rayon · Élévation

**Espacement.** Mobile : `T.space` = `xs4 · sm8 · md12 · lg16 · xl20 · xxl24 · xxxl32`
(base 4, rythme 8). Web : **aucun token** — px inline (6/8/10/12/14/18/22/24…).

**Rayon.**

| Source | Échelle |
|---|---|
| `T.radius` (mobile) | `sm10 · md14 · lg20 · xl26 · pill999` |
| Primitives (réel) | Button/Input/Select/ActionRow **12** · Card **16** · Modal **18** · icon-box **8** · Badge/Switch **999** |

→ **Les rayons réels des primitives (8/12/16/18) ne suivent pas l'échelle mobile
(10/14/20/26).** Incohérence à tokeniser.

**Élévation.** `T.elevation` (mobile) : `[none, "0 4px 14px rgba(0,0,0,.25)",
"0 12px 34px rgba(0,0,0,.45)", "0 -20px 60px rgba(0,0,0,.5)"]`.
- `Card` : niveau 1 (repos) / niveau 2 (`elevated`) — aligné.
- `Modal` : `0 24px 70px rgba(0,0,0,.6)` — **hors échelle**.
- `Button primary` : ombre **colorée** (glow accent) + liseré interne — élévation
  « lumineuse » propre, hors échelle d'ombres neutres.

- **Cas d'usage.** Repos = niveau 1 ; survol/flottant = niveau 2 ; feuille montante
  = niveau 3 ; overlay/modale = ombre profonde dédiée.
- **Code smell / anti-pattern.** Ombres codées en dur hors `T.elevation` ;
  espacement/rayon non tokenisés côté web → dérive silencieuse.
- **Optimisation.** Exposer `--space-*`, `--radius-*`, `--elev-*` en CSS depuis `T`
  et migrer les primitives dessus (le rayon 12 devient `--radius-md`, etc.).

### 1.5 Icônes

- **`lucide-react`** exclusivement, stroke régulier. **Pas d'icônes de marque**
  (lucide 1.17 n'en fournit pas) → double protection au build (`tsc` +
  `check-jsx-imports.mjs`) pour éviter un import d'icône inexistante (voir mémoire
  *Lucide icons gotcha*).
- **Tailles observées** : 11–16 (UI dense), 18–24 (accents/mobile). Couleur héritée
  ou token de rôle.
- **Accessibilité.** Icônes décoratives : `aria-hidden` (ex. spinner Button). Icônes
  **porteuses de sens seules** (bouton icône-only) doivent avoir un `aria-label` —
  **appliqué de façon inégale** dans l'app (code smell).
- **Optimisation.** Convention de tailles tokenisées (`icon-sm 14 / icon-md 16 /
  icon-lg 20`) ; audit des boutons icône-only sans label.

### 1.6 Animations (Motion System)

Résumé opérationnel (détail complet au **Ch.3**) :

- **Durées** (`lib/motion.ts` / `--mo-*`) : `instant 80` · `fast 120` · `base 250` ·
  `sheet 300` · `slow 400`.
- **Easings par rôle** : `standard (.2,.8,.2,1)` · `entrance (.16,1,.3,1)` ·
  `spring (.34,1.56,.64,1)` · `emphasized (.4,0,.2,1)`.
- **Keyframes canoniques** `mo-*` + classes `.mo-spin/.mo-fade-in/.mo-fade-up/
  .mo-pop-in/.mo-pulse/.mo-ring`. Helpers inline `anim()` / `transition()`.
- **Reduced-motion** : respecté par construction (`globals.css:222-225, 433-440`).
- **Anti-pattern.** Écrire une durée/courbe « à la main » ; réintroduire un keyframe
  hors namespace `mo-`.

### 1.7 États transverses

| État | Mécanisme | Emplacement |
|---|---|---|
| **Focus** | `:focus-visible` outline 2px `rgba(201,168,76,.6)` offset 3px ; champs → bord accent + halo | `globals.css:157-173` |
| **Hover** | Vrais `:hover` sur `.ui-*` ; ailleurs **hover en JS inline** (`onMouseEnter/Leave`) très répandu | primitives vs écrans |
| **Pressed** | Global `button:not(:disabled):active { scale(.97) }` ; `.ui-btn` active `translateY(0) scale(.985)` | `globals.css:174-175, 245` |
| **Loading** | Spinner `.mo-spin` ; `Button loading` (aria-busy, masque icônes) ; `.skeleton` (shimmer) | `Button.tsx`, `globals.css:177-184` |
| **Disabled** | `.ui-btn:disabled` opacité .55, `not-allowed`, ombres coupées ; champs/switch idem | `globals.css:243, 314` |
| **Success/Warning/Error** | Tokens de rôle + `Badge`/`ActionRow` tons + `Input error` + Toasts | voir §composants |

- **Code smell majeur.** Le **hover en JavaScript inline** (deux handlers + styles
  dupliqués par élément) est omniprésent hors primitives : verbeux, non thémable,
  pas d'équivalent clavier, et il **ne se déclenche pas au focus**. Les primitives
  `.ui-*` montrent la bonne voie (CSS).
- **Optimisation.** Généraliser les états en CSS (classes/pseudo-classes) ;
  factoriser les rangées/cartes cliquables en primitives.

---

## 2. Composants — primitives (`components/ui/`)

> Grille d'analyse par composant : **Description · Cas d'usage · Variantes ·
> Responsive · Animations · Accessibilité · Code Smell · Anti-Patterns ·
> Optimisations.**

### 2.1 Button — `components/ui/Button.tsx` + `.ui-btn*` (`globals.css:232-282`)

- **Description.** Bouton class-based (vrais `:hover/:active`). Rend
  `ui-btn ui-btn--{variant} ui-btn--{size}`. `forwardRef`.
- **Cas d'usage.** Toute action ; CTA de formulaire, barres d'action, pieds de modale.
- **Variantes.** `variant`: **primary** (dégradé d'accent + liseré interne + glow),
  **secondary** (surface + bord accent), **ghost** (transparent, fond au survol),
  **danger** (rouge sémantique). `size`: **sm 38px / md 46px / lg 54px**. Options :
  `loading`, `fullWidth`, `leftIcon`, `rightIcon`.
- **Responsive.** Cible tactile md = 46px (≥ 44 recommandé). `white-space:nowrap` ;
  `fullWidth` pour l'empilement mobile.
- **Animations.** Hover `translateY(-1px)` + ombre accrue ; active `scale(.985)` ;
  transitions `--mo-fast/--mo-base` ; spinner `.mo-spin`. Reduced-motion : plus de
  transform.
- **Accessibilité.** `disabled` combiné à `loading` ; `aria-busy` en chargement ;
  spinner `aria-hidden` ; focus via règle globale. Cible tactile respectée.
- **Code smell.** Des centaines de `<button>` inline dans les écrans **ne** passent
  **pas** encore par cette primitive (surtout les monolithes QR/Print/Builder).
- **Anti-pattern.** Recoder un bouton en styles inline ; mettre du texte sans
  `aria-label` sur un bouton icône-only.
- **Optimisations.** Poursuivre la propagation écran par écran ; envisager `iconOnly`
  (carré + aria-label obligatoire) et une taille `xs` pour les barres denses.

### 2.2 Card — `components/ui/Card.tsx`

- **Description.** Conteneur surface + bord discret + élévation par tokens ; en-tête
  optionnel (icône accent + titre + slot action).
- **Cas d'usage.** Regrouper un bloc de contenu/réglages ; panneaux de tableau de bord.
- **Variantes.** `elevated` (niveau 2), `padding` (défaut 18), `title/icon/action`,
  `style/className` d'échappement.
- **Responsive.** Fluide (100% de son conteneur) ; s'empile via les grilles `rcols-*`.
- **Animations.** Aucune intrinsèque (statique) — l'entrée est confiée à l'appelant
  (`.mo-fade-up`).
- **Accessibilité.** Titre en `<h3>` (attention à la **hiérarchie de titres** selon
  le contexte). Présentationnel, sans piège.
- **Code smell.** Rayon **16** en dur (hors échelle mobile) ; **quantité de cartes
  encore recodées inline** (même surface/bord/rayon) au lieu de `Card`.
- **Anti-pattern.** Empiler `boxShadow` custom au lieu de `elevated`.
- **Optimisations.** Tokeniser rayon/élévation ; variante `interactive` (hover/kbd)
  pour les cartes cliquables ; prop `as`/niveau de titre configurable.

### 2.3 Badge — `components/ui/Badge.tsx`

- **Description.** Pastille de statut/plan, forme pilule.
- **Cas d'usage.** Statut (actif/en pause), plan, compteur, label court.
- **Variantes.** `tone`: accent · success · warning · danger · neutral (tous ancrés
  tokens `*-bg/-border`).
- **Responsive.** Intrinsèque ; `white-space:nowrap`.
- **Animations.** Aucune (peut recevoir `.mo-pop-in` à l'apparition).
- **Accessibilité.** **Purement visuel** : un statut porté par la seule couleur+texte
  du badge doit rester compréhensible sans couleur (le texte suffit ici). Pas de
  `role=status` (normal, ce n'est pas une alerte live).
- **Code smell.** Des « puces de statut » maison inline coexistent avec `Badge`.
- **Anti-pattern.** Coder un statut uniquement par la couleur sans texte.
- **Optimisations.** Prop `dot` (pastille de tête) ; `size`.

### 2.4 Tabs — `components/ui/Tabs.tsx`

- **Description.** Barre d'onglets contrôlée ; actif = fond accent léger +
  soulignement 3px (motif QR Studio).
- **Cas d'usage.** Basculer des vues d'un même écran.
- **Variantes.** `fill` (largeur égale) ; items `{id,label,icon}`.
- **Responsive.** `flex` ; onglets ≥ 46px de haut. **Pas de défilement horizontal**
  intégré si trop d'onglets (risque de compression sur mobile).
- **Animations.** Transition couleur/fond `--mo-fast`.
- **Accessibilité.** `role="tablist"`/`role="tab"` + `aria-selected`. **Manques :**
  pas de navigation **flèches** (patron WAI-ARIA tabs), pas de liaison
  `aria-controls`/`role="tabpanel"`, `tabIndex` roving absent.
- **Code smell.** De nombreux « segmented controls » inline (périodes 7/30/90j, tri…)
  répètent ce motif **sans** utiliser `Tabs`.
- **Anti-pattern.** Gérer l'état actif par la seule couleur sans `aria-selected`.
- **Optimisations.** Ajouter les flèches + `aria-controls` ; variante *segmented*
  (petits filtres) pour absorber les contrôles inline ; défilement horizontal mobile.

### 2.5 Modal — `components/ui/Modal.tsx`

- **Description.** Dialogue **accessible** : `role=dialog` + `aria-modal`, **piège de
  focus**, fermeture Échap, clic scrim (`mousedown` sur le fond), **verrou du scroll
  body**, **restauration du focus** au déclencheur, animation `.mo-pop-in`.
- **Cas d'usage.** Confirmations, formulaires courts, contenus focalisés.
- **Variantes.** `title`, `footer`, `maxWidth` (défaut 460).
- **Responsive.** `width:100%` + `maxWidth`, `maxHeight:90dvh` + scroll interne,
  padding 20 du scrim.
- **Animations.** Entrée `.mo-pop-in` (spring). (Pas d'animation de sortie — démontage
  direct.)
- **Accessibilité.** Exemplaire (trap + Échap + restauration + `aria-labelledby`).
  `zIndex 3000`.
- **Code smell.** **`zIndex 3000` figé** entre en concurrence avec des overlays
  d'écran (PrintStudio racine = 3000, ses sur-couches 3500–4300) → l'empilement
  repose sur l'ordre DOM (fragile). Ombre modale hors échelle.
- **Anti-pattern.** Recréer une modale maison en `position:fixed` sans piège de focus
  (l'audit a trouvé ce défaut ; c'est précisément ce que `Modal` corrige).
- **Optimisations.** Échelle de z-index tokenisée (modale > tout overlay) ; animation
  de sortie ; tailles nommées (`sm/md/lg`).

### 2.6 Input / Textarea / Select — `components/ui/Input.tsx` + `.ui-input/.ui-textarea/.ui-select`

- **Description.** Champs avec **label associé** (`htmlFor`/`id` via `useId`),
  `hint`/`error` reliés par `aria-describedby`, `aria-invalid`. Classes CSS (16px
  anti-zoom iOS). `Input` a un `rightSlot` (action de fin : œil mot de passe, clear…).
  `Select` stylé (flèche custom, `appearance:none`).
- **Cas d'usage.** Tout formulaire du dashboard.
- **Variantes.** `Input`/`Textarea`/`Select` ; état `error` (bord danger) ;
  `hint`/`label` optionnels ; `rightSlot` (Input).
- **Responsive.** 100% largeur ; hauteur 46 (input/select), textarea `resize:vertical`.
- **Animations.** Transition bord/halo `--mo-fast` ; focus = bord accent + halo
  `color-mix` (règle globale `globals.css:169-173`).
- **Accessibilité.** Label lié, `aria-invalid`, `aria-describedby`, 16px. **Manque :**
  l'erreur n'est pas `aria-live` (le lecteur d'écran n'annonce pas l'apparition
  d'erreur dynamiquement).
- **Code smell.** Beaucoup de `<input>/<select>` inline non migrés subsistent
  (surtout builder/studios) ; deux traitements du focus (global + `.ui-*`).
- **Anti-pattern.** `<input>` sans `<label>` associé (le défaut a11y que cette
  primitive corrige) ; `<select>` inline non stylé.
- **Optimisations.** `aria-live="polite"` sur l'erreur ; migrer les champs inline ;
  variantes taille ; `leftSlot` (icône).

### 2.7 Switch — `components/ui/Switch.tsx` + `.ui-switch`

- **Description.** Interrupteur **accessible** (`role="switch"` + `aria-checked`,
  `<button>` clavier natif). Remplace les toggles `<div onClick>` non sémantiques.
- **Cas d'usage.** Préférence on/off (notifications, options).
- **Variantes.** `label` interne ou `ariaLabel` (label externe) ; `disabled`.
- **Responsive.** Taille fixe 44×26 ; zone de label cliquable.
- **Animations.** Pastille `transform` en `--mo-base` easing **spring** ; fond en
  `--mo-base`. Reduced-motion : pastille sans transition.
- **Accessibilité.** Exemplaire (rôle + état + clavier). Piste 44×26 : la **cible
  tactile** est un peu sous 46px de haut (le `<label>` élargit la zone utile).
- **Code smell.** Des toggles maison subsistent ailleurs.
- **Anti-pattern.** Toggle en `<div onClick>` sans rôle ni clavier.
- **Optimisations.** Hauteur de cible ≥ 46 (padding invisible) ; taille `sm`.

### 2.8 ActionRow — `components/ui/ActionRow.tsx` + `.ui-actionrow`

- **Description.** « Bouton riche » : boîte d'icône colorée + titre + sous-titre +
  slot droit. Capture les rangées d'action (déconnexion, statut, réglage) **sans**
  les aplatir en `Button`. Rendu `<button>`/`<a>`/`<div>` selon l'usage.
- **Cas d'usage.** Listes de réglages, actions secondaires descriptives, statuts
  cliquables.
- **Variantes.** `tone` (accent/success/warning/danger/neutral) ; `tinted` (fond
  teinté du ton) ; `onClick`/`href`/statique ; `disabled` ; `right`.
- **Responsive.** `width:100%` ; icône `flex-shrink:0` ; titre/sous-titre tronquent.
- **Animations.** Fond au survol via `.ui-actionrow--clickable:hover`.
- **Accessibilité.** Bon polymorphisme (button/a/div) ; **le hover n'a pas
  d'équivalent focus visible spécifique** (repose sur `:focus-visible` global).
- **Code smell.** Rangées riches encore recodées inline dans certains écrans.
- **Anti-pattern.** Mettre une `ActionRow` non cliquable qui *paraît* cliquable.
- **Optimisations.** État focng visible dédié ; `loading` ; troncature multi-ligne
  optionnelle.

### 2.9 Confirm (`useConfirm` / `ConfirmProvider`) — `components/ui/Confirm.tsx`

- **Description.** Système de confirmation adossé à `Modal` :
  `if (!(await confirm({...}))) return` remplace `window.confirm(...)` **à
  l'identique**, mais accessible et à la charte. Provider monté une fois dans le
  layout dashboard (dans `ToastProvider`).
- **Cas d'usage.** Toute action destructrice/irréversible (suppression, reset,
  remplacement de contenu). **Tous** les `window.confirm` natifs ont été migrés.
- **Variantes.** `title`, `message` (les `\n` deviennent des sauts de ligne),
  `confirmLabel`, `cancelLabel`, `danger`.
- **Responsive / Animations / A11y.** Hérités de `Modal` (trap, Échap, scrim,
  restauration du focus, `.mo-pop-in`).
- **Code smell.** Le `Modal` sous-jacent hérite du **conflit de z-index** (voir 2.5)
  quand un `confirm` est déclenché depuis un overlay très haut.
- **Anti-pattern.** Revenir à `window.confirm` (natif, non stylé, non accessible).
- **Optimisations.** Résoudre le z-index ; variante « saisir pour confirmer » pour
  les suppressions critiques.

---

## 3. Composants d'assemblage (hors primitives)

> Sections issues de l'audit des zones dispersées (navigation, tables, menus, états
> en conditions réelles). *Complétées après surveys ciblés.*

### 3.1 Sidebar — `app/dashboard/layout.tsx:160-312`

- **Description.** Barre latérale desktop en flex vertical, 3 zones : header (logo +
  toggle), `<nav>` scrollable, section basse (Upgrade + carte utilisateur). Masquée
  sur mobile (remplacée par la barre du bas).
- **Cas d'usage.** Navigation primaire du dashboard.
- **Variantes / états.** **Repliée 72px / dépliée 240px / 0 mobile** (`W`, ligne 148),
  préférence persistée `localStorage("qrfolio_sidebar")`. Item **actif** = fond
  `accent 12%` + bord `accent 30%` + point 4px ; **hover** = fond blanc 4%.
  Tooltips au survol en mode replié (révélés en CSS : `.sidebar-item:hover
  .sidebar-tooltip`).
- **Responsive.** Repli forcé sous **860px** (breakpoint codé en dur, lignes 127/130),
  sans écraser la préférence desktop. Transition largeur `0.25s
  var(--mo-ease-emphasized)`.
- **Animations.** Chevron du toggle `rotate(180deg)` `0.25s` ; items `transition:"all
  0.15s"` (**valeur en dur, hors tokens `--mo-*`**).
- **Accessibilité.** `<nav aria-label>` présent ; tooltips `pointer-events:none`.
  **Manques :** hover en **JS inline** (`onMouseEnter/Leave`, 184/211/254) → pas
  d'équivalent focus clavier ; badge « non lus » en **rouge codé en dur `#EF4444`**
  (≠ `--danger`).
- **Code smell.** `const MUTED = "#A8A190"` (ligne 17) **≠ token `--muted` `#8A8478`**
  → la sidebar utilise un gris différent du reste de l'app ; `DEFAULT_ACCENT`
  redéclare `#C9A84C` (déjà `--accent`) ; `LogOut` importé mais **aucune action de
  déconnexion** (import mort).
- **Anti-pattern.** Styles d'interaction en JS impératif au lieu de classes CSS.
- **Optimisations.** Passer hover/transitions en CSS + tokens ; unifier `MUTED` sur
  `--muted` ; tokeniser le breakpoint 860 ; brancher la déconnexion ou retirer l'import.

### 3.2 Navigation (barre mobile · sheet « Créer » · onglets)

- **Description.** Sur mobile, barre fixe du bas à **5 entrées** (`MOBILE_NAV`) dont un
  **bouton central « Créer »** (débord au-dessus de la barre, dégradé accent) qui
  ouvre un **sheet** de 6 raccourcis (`CREATE_ACTIONS`). Onglets internes = primitive
  `Tabs` (§2.4) — mais peu utilisée (voir plus bas).
- **Cas d'usage.** Navigation primaire mobile + accès rapide à la création.
- **Variantes / états.** Barre : item actif = accent + barre supérieure 26×3 + icône
  plus épaisse. Masquée dans le builder (`hideMobileNav`, ligne 78).
- **Responsive.** `env(safe-area-inset-bottom)` respecté ; cibles ≥ 48px. Sheet aligné
  bas, `role="dialog" aria-modal`.
- **Animations.** Sheet `sheetUp .24s var(--mo-ease-standard)` (keyframe **local**,
  ligne 385, **sans garde `prefers-reduced-motion`**).
- **Accessibilité.** Bon : `aria-label` sur la nav et le bouton Créer, `role=dialog`
  sur le sheet, fermeture Échap. **Manques :** sheet **sans focus-trap ni
  restauration du focus** (contrairement à `Modal`) ; badge « non lus » pointé sur
  `/dashboard` en mobile mais sur `/dashboard/leads` en desktop (**incohérence de
  cible**) ; compensation `main` `84px` ≠ hauteur barre `64px`.
- **Code smell — les onglets réimplémentés.** La primitive `Tabs` **n'a qu'un seul
  usage réel** (`ui-demo`). ≥ 6 barres d'onglets sont recodées à la main avec des
  valeurs divergentes :

  | Emplacement | Soulignement | Divergence |
  |---|---|---|
  | `QRStudio.tsx:3240` | **3px** | fond accent **14%**, emojis en dur |
  | `BuilderV4.tsx:1831` | 2px | `transition:"all 0.15s"` |
  | `builderPanels.tsx:921` | 2px | `fontSize 10.5`, sans transition |
  | `builderPreview.tsx:2587` | 2px | nommage `primary/muted` |
  | `PublicPageClient.tsx:415` (`TabsPublic`) | 2px | a `role=tab`/`aria-selected`/`tabpanel` + `overflowX` |
  | `AvatarStudio.tsx:261` | CSS module | seul cas en CSS module |

  → **soulignement 2px vs 3px**, **fond actif 12% (`Tabs`) vs 14% (QRStudio)**, et
  **aucun onglet inline n'utilise `--mo-*`** (seule la primitive `Tabs` le fait).
- **Anti-pattern.** Recoder une barre d'onglets au lieu d'étendre `Tabs`.
- **Optimisations.** Migrer les onglets métier sur `Tabs` (après ajout des flèches
  ARIA + variante *segmented*) ; focus-trap + `prefers-reduced-motion` sur le sheet ;
  harmoniser cible du badge non-lus ; factoriser le mini-stepper « fil guidé »
  (`QRStudio.tsx:3249`).

### 3.3 Tables & listes de données

- **Description.** **Aucune balise `<table>` dans l'UI dashboard** (les `<table>`
  n'existent que dans les e-mails/landing). Toute donnée est rendue soit en **CSS
  Grid inline** (tableaux analytics), soit en **cartes flex empilées** (QR, messages,
  redirections, équipe), plus **recharts** / `react-simple-maps` pour les graphes.
- **Cas d'usage.** Analytics (classements CTR/clics), listes d'entités.
- **Le pattern « tableau grid » (répété 4×).** En-tête `<div grid gridTemplateColumns>`
  puis lignes au **même** `gridTemplateColumns`, zébrage `i%2`, mini-barre de
  progression en dernière colonne, bascule Tableau/Graphique locale :
  `TopLinksPanel.tsx:282`, `TrafficSourcesPanel.tsx:200`, `GeoPanel.tsx:208`,
  `BlockPerformancePanel.tsx:277`.
- **Les listes en cartes.** `QRStudio` (cartes flex, ligne `role="button"
  tabIndex=0 onKeyDown` — **accessible clavier**, mais hover en JS), `LeadsClient`
  (cartes lu/non-lu), `RedirectsPanel`, `team/page.tsx` (lignes flex), `DomainsPage`
  (grille DNS `60px 1fr 80px 1fr`).
- **Responsive.** **Point faible majeur** : les `gridTemplateColumns` sont en **px
  fixes** (`28px 1fr 90px 80px 80px 120px`) **sans média-query** → compression /
  débordement sur petit écran ; le parent ne repasse pas en 1 colonne (les grilles
  internes ne bénéficient pas de `.rcols-*`/`.dash-2col`). GeoPanel `1fr 1fr` non
  responsive.
- **Accessibilité.** **Les « tableaux » sont des `<div>` sans sémantique** (`role=
  table/row/cell`, `<th scope>`) → invisibles comme tableaux pour un lecteur d'écran.
  Bon point isolé : la colonne CTR de `BlockPerformancePanel` a un `title=` explicatif.
- **Code smell.** `gridTemplateColumns` **dupliqué** (en-tête + lignes) et redéclaré
  dans chaque fichier → **aucune abstraction `DataTable`**, dérive en-tête/lignes
  possible ; couleurs de séries mélangeant tokens et **hex bruts** (`#7B61FF`,
  `#EF4444`, `#F97316`, `#9146FF`, `#EC4899`, `#26A5E4`… dans TopLinks/Leads/Dashboard).
- **Anti-pattern.** Représenter des données tabulaires en `<div>` non sémantiques,
  non responsives.
- **Optimisations.** Créer une primitive **`DataTable`** (colonnes déclaratives, une
  seule source de `gridTemplateColumns`, `role=table` + `scope`, repli carte/scroll
  sur mobile) ; palette de séries tokenisée.

### 3.4 Dropdown & menus contextuels

- **Description.** **Quatre styles de menu concurrents** coexistent, aucun accessible
  au sens ARIA menu.
  1. **Menu absolu ancré** (QRStudio `:2596`) : `MoreVertical` → `position:absolute`,
     `#1A1710`, items conditionnels avec états `disabled` stylés.
  2. **Bottom-sheet mobile `#141210`** — **dupliqué quasi à l'identique 3×** :
     `DashboardClient.tsx:231`, `assets/page.tsx:137`, `BuilderV4.tsx:2241`.
  3. **Bottom-sheet PrintStudio `.ps-msheet` `#17171B`** (radius `18 18 0 0`,
     `psSheetUp`) — un **4e style** de feuille.
  4. **Context-menu desktop** (clic droit canvas, PrintStudio `:6150`) : `position:
     fixed` clampé à l'écran, **fond blanc `#FFFFFF`** au milieu d'une UI sombre.
- **Cas d'usage.** Actions par item (modifier/dupliquer/pause/supprimer…), actions
  canvas.
- **Responsive.** Bottom-sheets = stratégie mobile (`env(safe-area-inset-bottom)`) ;
  le menu QRStudio reste absolu même en mobile.
- **Accessibilité — lacunes systémiques.** Aucun `role="menu"/menuitem`, aucun
  `aria-haspopup`/`aria-expanded` sur les déclencheurs, **pas de fermeture Échap**,
  pas de navigation flèches, pas de focus-trap ni de restitution du focus. (Seul
  `role=menu` du repo = page publique, hors périmètre.)
- **Code smell.** 4 styles pour un même besoin ; bottom-sheet copié-collé 3× ;
  sentinelle magique `"__del__"` (PrintStudio) ; thème clair incohérent.
- **Anti-pattern.** Réimplémenter un menu par écran ; menu sans clavier ni ARIA.
- **Optimisations.** Primitive **`Menu`** unique (déclencheur + items déclaratifs,
  `role=menu`, Échap/flèches, focus-trap, retour focus) avec **rendu adaptatif**
  popover desktop / bottom-sheet mobile ; supprimer les 3–4 implémentations.

### 3.5 États en conditions réelles (feedback)

- **Toasts — `components/Toast.tsx` (le point le plus soigné).** Conteneur
  `aria-live="polite"` ; par toast `role={kind==='error' ? "alert" : "status"}`
  (erreurs annoncées assertif), bouton fermer `aria-label`, icône `aria-hidden`,
  reduced-motion respecté, auto-dismiss 4/6/7s. *Réserves* : `info` réutilise
  `--accent` (pas de token « info » dédié), fonds d'icône en rgba en dur, dismiss 4s
  parfois trop court.
- **Loading.** Spinner canonique `.mo-spin` + `Button loading` (`aria-busy`, spinner
  `aria-hidden`). Skeletons `.skeleton` (shimmer) **définis deux fois** (les deux
  feuilles) ; utilisés dans ~31 fichiers + `dashboard/loading.tsx`. **Lacune :**
  skeletons **muets** (pas de `role="status"`/`aria-busy`) → chargement non annoncé.
- **Disabled.** Propre dans les primitives, mais **opacités disparates** : Button
  `.55`, Switch `.5`, ActionRow `.6` → pas de token unique.
- **Hover.** **~175 handlers `onMouseEnter/Leave` sur 17 fichiers** (BuilderV4 51×,
  landing 38×, PublicPage 21×, QRStudio 8×) mutant `e.currentTarget.style` → **hover
  souris uniquement, jamais au clavier/focus**, couleurs souvent en hex en dur.
  **Bug latent :** `BuilderV4.tsx:1274` `style.background = "var(--action)10"`
  (valeur CSS invalide → hover sans effet).
- **Focus.** `:focus-visible` global existe mais **défini 2–3 fois** (les deux
  feuilles), **outline en or FIXE** (`rgba(201,168,76,.6)`) au lieu de `var(--accent)`
  → incohérent avec l'accent utilisateur ; de nombreux champs du builder **écrasent**
  le focus via `onFocus/onBlur` inline (27 sur 9 fichiers). `Modal` = focus le mieux
  géré (trap + restauration).
- **Pressed.** Global `button:active scale(.97)` + `.ui-btn active scale(.985)` ;
  **scales disparates** (.97/.985/.98), et **rien** pour les `<div>` cliquables.
- **Success / Warning / Error.** Tokens de rôle bien réutilisés (ActionRow, Toast,
  bannières auth `role="alert"` + `--danger-bg/-border`, Input `error`). **Lacune :**
  le message d'erreur de champ (`ui-field-error`) n'a **pas** de `aria-live`/`role=
  alert` → une erreur apparue après soumission n'est pas annoncée (rattachée seulement
  par `aria-describedby`, lue au focus).
- **Optimisations.** Un seul token d'opacité disabled et de scale pressed ; migrer le
  hover-JS en CSS ; `outline` de focus sur `var(--accent)` et défini une seule fois ;
  `role="status"` sur les skeletons ; `aria-live` sur les erreurs de champ ; token
  « info » distinct.

---

## 4. Synthèse — dette de design & feuille de route

### 4.1 Inventaire de l'existant

**Solide (à généraliser).** 10 primitives ancrées tokens + motion (`Button, Card,
Badge, Tabs, Modal, Input/Textarea/Select, Switch, ActionRow, Confirm`) ; Motion
System complet (`lib/motion.ts` + `--mo-*` + reduced-motion) ; grammaire sémantique
de couleur (`--action/--success/--warning/--danger` + `-bg/-border`) ; `Modal` et
`Toast` exemplaires en a11y ; primitive `Select`/`Input` avec label associé.

**Fragmenté (à réconcilier).** 2 feuilles globales, 2 systèmes de tokens, ≥6 barres
d'onglets, 4 styles de menu, 16 `<select>` natifs non migrés, « tableaux » en `<div>`
grid dupliqués, hover en JS massif, focus défini 2–3 fois.

### 4.2 Les 12 dettes, priorisées

| # | Dette | Gravité | Effort |
|---|---|---|---|
| 1 | **2 feuilles globales** concurrentes (`app/globals.css` vs `styles/globals.css`) | 🔴 | Moyen |
| 2 | **2 systèmes de tokens** divergents (web `--*` vs mobile `T`) | 🔴 | Moyen |
| 3 | **Focus** en or fixe (pas `var(--accent)`), défini 2–3×, écrasé par du JS | 🔴 (a11y) | Faible |
| 4 | **Hover en JS** (~175 sites) sans équivalent clavier + bug `"var(--action)10"` | 🔴 (a11y) | Élevé |
| 5 | **Menus** : 4 styles, aucun `role=menu`/Échap/flèches → primitive `Menu` | 🟠 (a11y) | Moyen |
| 6 | **Tables** : `<div>` grid non sémantiques + non responsives → primitive `DataTable` | 🟠 | Moyen |
| 7 | **Fondations non tokenisées côté web** (espacement/rayon/typo/élévation/z) | 🟠 | Moyen |
| 8 | **`Tabs` inutilisée** (1 usage) vs ≥6 réimplémentations divergentes | 🟠 | Moyen |
| 9 | **`<select>` natifs** (16) non migrés vers `.ui-select` | 🟡 | Faible |
| 10 | **Skeletons muets** + **erreurs de champ non `aria-live`** | 🟡 (a11y) | Faible |
| 11 | **Valeurs magiques** : `MUTED #A8A190`≠`--muted`, `#EF4444`≠`--danger`, opacités .5/.55/.6, scales .97/.985/.98, breakpoint 860 | 🟡 | Faible |
| 12 | **Z-index non gouverné** côté web (conflits Modal/overlays 3000–4300) | 🟡 | Faible |

### 4.3 Ordre de bataille recommandé

1. **Quick wins a11y à faible risque** (#3 focus sur `var(--accent)` unique, #10
   `role=status` skeletons + `aria-live` erreurs, #11 unifier MUTED/danger/opacités).
2. **Gouvernance des tokens** (#7, #2, #1) : exposer espacement/rayon/élévation/z en
   `--*` depuis une source unique, puis retirer `styles/globals.css`.
3. **Primitives manquantes** (#5 `Menu`, #6 `DataTable`) puis migrations (#8 `Tabs`,
   #9 `select`).
4. **Chantier de fond** (#4 hover JS→CSS) : le plus lourd, à faire par écran avec QA.

> Chaque migration suit la **Loi 10** (zéro régression) et la règle de propagation
> **écran par écran avec vérification visuelle** (voir [[ui-primitives]] et Ch.2 §
> Composants). Ce chapitre est un **constat** : il ne prescrit aucune modification
> immédiate — il cadre le travail à venir.

---

*Chapitre 4 — Design System · v1.0 · établi par audit read-only exhaustif des
composants (fondations lues dans le code + 3 surveys ciblés navigation/tables/états).*
