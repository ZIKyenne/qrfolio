# Builder QRowg — Plan d'exécution « Référence mondiale »

> **Mandat.** Faire du Builder l'éditeur de page le plus abouti au monde pour son
> usage (page link-in-bio / mini-site pro) : **plus simple que Webflow**, **plus
> précis que Figma**, **plus facile à apprendre que Notion**.
>
> **Nature de ce document.** Un **plan d'exécution** — analyse de l'existant (garder
> l'excellent, remettre en question le reste) puis reconstruction raisonnée, élément
> par élément. **Aucun code.** Chaque décision est justifiée et priorisée.
>
> Statut : **v1.0 (plan)** — fondé sur audit read-only complet du Builder
> (`BuilderV4.tsx` 2432 l · `builderPreview.tsx` 2667 l · `builderPanels.tsx` 1777 l
> · `builderHooks.ts` · `types.ts` 5473 l · `page-templates.ts` · `themes.ts`).

---

## 0. Étoile polaire & recadrage fondateur

### 0.1 Ce qu'on vole à chaque référence (et ce qu'on refuse)

| Référence | Ce qu'on **prend** | Ce qu'on **refuse** |
|---|---|---|
| **Webflow** | La **manipulation directe** (on édite sur le canvas, pas dans un formulaire lointain) ; la barre d'outils contextuelle ; le sens du « pro ». | Sa **courbe d'apprentissage** brutale (box model, position, flex exposés) — hors sujet pour une page en pile. |
| **Figma** | La **précision** (entrées numériques fines, nudge clavier, alignement, tokens, multi-sélection, calques) ; les **raccourcis** ; la **fluidité** (60 fps, jamais de blocage). | Le **canvas libre** (x/y absolus) : inadapté à une page responsive empilée. On garde la *rigueur*, pas la *liberté 2D*. |
| **Notion** | La **facilité d'apprentissage** : le **« / » (slash) pour insérer**, le contenu qui « se remplit tout seul », zéro concept à apprendre avant de produire ; le **drag par poignée** ; la **sobriété**. | Sa **pauvreté visuelle** (Notion n'est pas beau par défaut) — nous devons produire du premium sans effort. |

### 0.2 Le recadrage crucial : ce Builder n'est PAS un canvas libre

Le Builder édite une **pile verticale de blocs** rendus responsive (une page publique),
**pas** un plan 2D à coordonnées absolues (Figma/Webflow-canvas). Cette nature
**redéfinit** plusieurs des 24 éléments demandés :

- **Snap** → non pas « accrochage x/y », mais **rythme d'espacement** (paliers 4/8),
  accrochage aux **rails de section** et aux **largeurs de conteneur** lors du
  redimensionnement d'un bloc/colonne.
- **Guides** → non pas des repères libres, mais des **guides sémantiques** : bord de
  zone sûre, largeur de lecture optimale, alignement des colonnes internes d'un bloc.
- **Grids** → non pas une grille de pixels, mais la **grille d'espacement** (tokens)
  et la **grille de colonnes** interne aux blocs multi-colonnes.
- **Layers** → l'**arborescence de la pile** (et des colonnes/répéteurs), pas un
  z-index 2D.

> Décision de principe : **on n'importe pas la complexité 2D de Figma**. On importe sa
> *précision* et sa *fluidité*, appliquées au modèle « pile de blocs ». C'est ce qui
> nous rend simultanément plus simple que Webflow ET plus précis que le « bête
> formulaire » actuel.

### 0.3 Les 5 lois du nouveau Builder

1. **Manipulation directe d'abord.** Tout ce qui se voit s'édite là où on le voit
   (texte, image, espacement, ordre). Le panneau devient un *complément de précision*,
   pas le lieu principal de l'édition.
2. **Zéro concept prérequis.** On peut créer une belle page sans rien apprendre.
   Insertion au **« / »**, valeurs par défaut superbes, aide contextuelle juste-à-temps.
3. **Toujours réversible, toujours fluide.** Undo/redo total et lisible ; 60 fps
   garantis ; aucune frappe ne doit « ramer ».
4. **Précision sans jargon.** Entrées numériques + nudge clavier + accrochage au
   rythme, mais nommés en langage humain (« Espace au-dessus », pas « margin-top »).
5. **Accessible et responsive par construction.** Clavier complet, focus visible,
   ARIA ; l'édition marche vraiment au doigt sur mobile.

### 0.4 Definition of Done (l'éditeur « référence mondiale »)

- Un débutant produit une page publiable et belle en **< 3 minutes**, sans aide.
- Un pro règle un détail au **pixel/token près** au clavier, sans souris.
- **Aucune** action destructrice non annulable ; historique lisible.
- **60 fps** en édition sur une page de 30 blocs, même sur mobile milieu de gamme.
- **100 %** des interactions atteignables au clavier, focus visible partout.

---

## 1. Méthode d'analyse

Audit read-only en 4 axes parallèles, chacun classant chaque élément en **GARDER
(excellent)** / **RETRAVAILLER** / **REPENSER** / **AJOUTER (manquant)** :

- **A — Couche de commande** : Toolbar, History, Undo/Redo, Raccourcis, Quick Actions,
  Navigation interne, Search.
- **B — Modèle de contenu** : Blocks, Inspector, Templates, Sections, Thèmes, Search de blocs.
- **C — Canvas & manipulation directe** : Preview, Drag & Drop, Multi-sélection, Context
  Menu, Quick Actions bloc, Snap/Guides/Grids, Layers.
- **D — Transversal** : Performance, Responsive, Mobile, Animations, Accessibilité,
  Architecture.

_(Constats détaillés intégrés en §2 après consolidation des 4 axes.)_

---

## 2. Analyse par élément — GARDER / REPENSER

> Grille par élément : **État actuel · Verdict (garder/retravailler/repenser/ajouter)
> · Vision cible · Justification.**

### Couche de commande

#### 2.1 Toolbar — **RETRAVAILLER**
- **État actuel.** Topbar 50px dense mais organisée (`BuilderV4.tsx:927-1134`) : nom
  de page inline, feedback de sauvegarde riche (saving/saved/dirty/erreur+retry),
  Undo/Redo, Modèles, Focus, aide « ? », Aperçu, Thème, QR, Voir en direct, Publier.
  Toolbar contextuelle **multi-sélection** flottante (`:1593-1682`, dès 2 blocs) :
  calcul d'état agrégé (`allVisible/allLocked`), ignore les verrouillés à la
  suppression — de bon niveau. Overlay par bloc au survol (`:1739-1745`) = seulement
  Monter/Descendre/« … ».
- **Verdict.** Le feedback de sauvegarde et la toolbar multi-sélection sont **excellents
  (garder)**. Mais **il manque une vraie toolbar contextuelle pour un bloc unique** :
  aujourd'hui éditer un bloc force l'aller-retour vers le panneau droit.
- **Vision cible.** Barre contextuelle **attachée au bloc sélectionné** (façon
  Figma/Webflow) : actions les plus fréquentes du bloc (style rapide, alignement,
  dupliquer, monter/descendre, « … ») directement sur le canvas. Topbar tokenisée
  (hauteur, couleurs), moins de boutons visibles simultanément (regroupement dans un
  menu « Plus »). Nom de page avec affordance d'édition claire.
- **Justification.** La manipulation directe (Loi 1) exige des commandes **près de
  l'objet**, pas dans un panneau lointain.

#### 2.2 History — **REPENSER (fondation)**
- **État actuel.** `useUndoRedo` (`builderHooks.ts:1-61`) : pile linéaire `Block[][]`,
  `MAX_HISTORY=50`, deep-clone JSON à chaque push, troncature du futur, `reset()` au
  chargement (garde anti-réinjection des blocs de démo — bien vu). **Ne capture que
  `blocks`** : thème, nom de page, sélection **hors historique**.
- **Verdict.** Robuste sur la mécanique, mais **le périmètre et la granularité sont à
  repenser** (voir 2.3).
- **Vision cible.** Un **journal de commandes** (command stack) qui capture **toute**
  mutation du document (blocs *et* thème *et* réglages de page), avec entrées
  **transactionnelles** nommées (« Ajouter Galerie », « Changer le thème »).
- **Justification.** « Toujours réversible » (Loi 3) doit couvrir *tout* ce que
  l'utilisateur change, pas seulement les blocs.

#### 2.3 Undo / Redo — **REPENSER (priorité nº1)**
- **État actuel.** `updateBlock` (`:751-753`) pousse dans l'historique **à chaque
  frappe** (pas de `skipHistory`). Un preset qui ajoute N blocs crée **N entrées**.
- **Verdict.** **Faiblesse la plus sérieuse de tout l'éditeur.** Taper ~50 caractères
  **sature les 50 entrées et efface tout l'historique structurel** (ajouts/suppressions/
  déplacements). Non transactionnel.
- **Vision cible.** **Coalescing** des frappes consécutives (par inactivité ~400 ms et
  par bloc/champ) en une seule étape ; **transactions** pour les actions composées
  (un preset = 1 undo) ; indicateur de position d'historique exposé (les méthodes
  `size()/pos()` existent déjà, inutilisées) ; profondeur portée bien au-delà de 50
  une fois le bruit de frappe éliminé.
- **Justification.** Sans coalescing, l'undo est *contre-productif* — c'est la
  première chose qui disqualifie l'éditeur face à Notion/Figma.

#### 2.4 Keyboard Shortcuts — **RETRAVAILLER + AJOUTER**
- **État actuel.** Un seul listener global (`:204-328`), lecture d'état via **refs
  synchronisées** (évite les closures périmées — très propre), garde `isEditing`.
  Couvre Ctrl+Z/Y, Ctrl+B/E/P/F, Escape, Ctrl+A, Delete, ↑/↓, Alt+↑/↓, « f ».
- **Verdict.** Le **mécanisme est excellent (garder)** ; la **découvrabilité est quasi
  nulle** (l'aide « ? » ne documente que 4 raccourcis sur ~12) et il **manque** Ctrl+S,
  Ctrl+D, Ctrl+C/V de bloc, et surtout **Cmd/Ctrl+K**.
- **Vision cible.** Une **feuille de raccourcis complète** (panneau dédié listant tout),
  ajout de Ctrl+S/Ctrl+D/Ctrl+C-V, et une **palette de commandes Cmd+K** (voir 2.7).
  À terme : raccourcis affichés en regard de chaque action des menus.
- **Justification.** La précision Figma passe par le clavier ; encore faut-il pouvoir
  **découvrir** les raccourcis (apprentissage Notion).

#### 2.5 Quick Actions — **RETRAVAILLER**
- **État actuel.** Jeu d'actions complet et cohérent (dupliquer, visibilité, verrou,
  **brouillon** [visible en édition, exclu du public : `is_visible: b.visible && !b.draft`],
  reset, supprimer avec `useConfirm`), respect systématique du flag `locked`. Mais
  **dispersé sur 3 emplacements** (overlay = Monter/Descendre/« … » ; bottom sheet =
  dupliquer/visibilité/verrou/brouillon/reset/supprimer ; Avancé = dupliquer/supprimer
  redondants).
- **Verdict.** Le **modèle d'actions est excellent (garder)** ; leur **agencement est à
  unifier**. Code mort à retirer : `dayMode` (mode Jour/Nuit rendu mais **aucun bouton
  ne l'active**, `:142/869/1910`).
- **Vision cible.** **Un seul** point d'accès cohérent : barre contextuelle du bloc
  (2.1) + menu « … » complet identique partout (voir 2.16). Duplication qui insère
  **à côté de chaque original** en multi-sélection.
- **Justification.** Cohérence = apprentissage (Notion) ; un même geste, un même
  résultat, où qu'on soit.

#### 2.6 Navigation — **RETRAVAILLER (garder beaucoup)**
- **État actuel.** **Excellences à préserver** : progressive disclosure **Simple/Expert**
  (`expertMode`, persistée ; Simple = « Contenu » seul, Expert = Contenu/Style/Mise en
  page/Avancé) ; **auto-save debouncé 800 ms** + « Enregistrer maintenant » + garde
  `beforeunload` + upsert **conservant les UUID** (préserve l'historique de clics) ;
  Mode Focus + collapse/resize de panneaux persistés ; sélection multiple Ctrl/Shift ;
  Publier riche (statut/URL/stats). **Faiblesse :** onglets droits mélangent *édition*
  (Éditer/Thème) et *prévisualisation* (Aperçu) ; la multi-sélection **ne s'édite pas**.
- **Verdict.** Colonne vertébrale saine — **garder l'essentiel**, clarifier la
  séparation édition/aperçu.
- **Vision cible.** Aperçu comme **surface centrale permanente** (pas un onglet), les
  panneaux latéraux dédiés à l'édition ; édition de propriétés communes en
  multi-sélection.
- **Justification.** Manipulation directe (Loi 1) : l'aperçu n'est pas « un onglet »,
  c'est *la page*.

#### 2.7 Search — **AJOUTER (généraliser)**
- **État actuel.** Recherche de **blocs à ajouter** vraiment aboutie (`:775-860`) :
  dictionnaire de **synonymes FR**, scoring pondéré, groupement par catégorie,
  surlignage, compteurs, état vide soigné. **Mais mono-cible** : rien pour chercher un
  bloc *présent* sur la page, une commande, ou une option de thème.
- **Verdict.** Le **moteur de recherche de blocs est excellent (garder et réutiliser)** ;
  la **portée est à étendre**.
- **Vision cible.** **Palette de commandes Cmd/Ctrl+K** multi-cible (insérer un bloc ·
  exécuter une commande · sauter à un bloc de la page · changer un réglage), réutilisant
  le moteur existant (synonymes/scoring). Insertion aussi via **« / » (slash)** dans le
  canvas (voir 2.14). Raccourci direct vers la recherche de blocs.
- **Justification.** Cmd+K et « / » sont *le* standard d'apprentissage/vitesse
  (Notion/Figma/Linear) — et on a déjà 80 % du moteur.

### Modèle de contenu

#### 2.8 Blocks — **GARDER le catalogue · REPENSER le modèle de données**
- **État actuel.** **~141 types** sur **10 catégories métier** (`types.ts:3156+`).
  Instance `Block { id, type, content, visible, draft?, locked? }` ; **`content =
  Record<string,string>` PLAT** : pas d'objets/tableaux, les listes sont simulées par
  **clés numérotées** (`p1_name, p2_price…`) avec **plafond `MAX=50` en dur**, renderers
  publics bouclant `1..50`, suppression = **décalage manuel** de toutes les clés.
- **Verdict.** Catalogue riche et `defaultContent` systématique = **excellent à
  garder**. Mais **le contenu plat à clés numérotées est LA dette centrale** ; et 141
  blocs (avec doublons proches : `product`/`product_catalog`/`popular_products`/`merch`,
  4 formulaires de contact…) = **surcharge cognitive** vs la sobriété Notion/Framer.
- **Vision cible.** **Modèle typé avec vraies listes** (`items: []` au lieu de
  `p1_*…p50_*`) — supprime le plafond, simplifie renderers et suppression. **Rationaliser
  le catalogue** : moins de blocs, plus **paramétrables** (fusionner les variantes).
  **Registre de blocs typé** découpé par domaine (au lieu d'un `BLOCK_DEFS` géant
  mono-fichier de ~1700 l).
- **Justification.** « Peu de blocs très puissants » = plus simple que Webflow ET plus
  facile à apprendre que 141 choix ; le vrai modèle de liste débloque tout le reste
  (répéteurs, sections, undo propre).

#### 2.9 Inspector — **GARDER les briques · REPENSER en déclaratif**
- **État actuel.** **Trois régimes concurrents** : ~45 **éditeurs manuels** +
  cascade de `if (block.type===…)` ; **`RepeaterEditor` générique** (~35 blocs-listes) ;
  **fallback `fields[]`** déclaratif. Le fallback est **remarquable** : `Segmented`
  (pastilles ≤5 options), champs conditionnels `showIf`, **accordéons auto-dérivés du
  label** (`" — "`), **validation live** (URL/email/tél + « Tester ↗ »), **scores de
  longueur**, **suggestions curées tappables**, **copier/coller de style** + presets
  d'apparence.
- **Verdict.** `RepeaterEditor`, accordéons auto, micro-guidage, copier/coller de style
  = **excellences rares à garder**. Mais **la cascade `if(block.type)` non déclarative**
  et les **3 régimes** créent incohérences d'UX et coût de maintenance (chaque nouveau
  bloc-liste = du code).
- **Vision cible.** **Inspecteur 100 % généré depuis le schéma** du bloc (groupes/
  sections déclaratifs, répéteurs déclarés dans le schéma, plus de cascade). Tokens
  partagés pour l'inspecteur (fin des `inputStyle` dupliqués). **Highlight bloc↔champ**
  dans l'aperçu au focus d'un champ (façon Webflow/Framer).
- **Justification.** Un schéma unique = cohérence totale + extensibilité + moins de
  bugs ; c'est ce qui fait la régularité d'apprentissage de Notion.

#### 2.10 Templates — **RETRAVAILLER + AJOUTER**
- **État actuel.** `page-templates.ts` : modèles complets **par métier** (thème + blocs
  pré-remplis), application **réversible** avec confirmation, galerie à mini-aperçu.
  **Mais fragmentation** : 4 mécanismes distincts (PAGE_TEMPLATES, presets de blocs,
  ambiances IA, galerie `dashboard/templates` sur **un 2e système de thème**) ; **merge
  de thème partiel** (effets résiduels possibles) ; aperçu = **squelette abstrait** (pas
  le vrai rendu) ; **aucun template utilisateur** (« enregistrer ma page comme modèle »).
- **Verdict.** Bon onboarding à garder ; sources à **unifier** et à enrichir.
- **Vision cible.** **Une source unique** de modèles (rendus par le moteur unique →
  aperçu = vrai rendu), remplacement de thème **total et propre**, et **templates
  utilisateur** (enregistrer/partager une page comme modèle).
- **Justification.** Un modèle doit montrer *exactement* ce qu'on obtiendra ; pouvoir
  partir de son propre design est un multiplicateur.

#### 2.11 Sections — **AJOUTER (imbrication légère)**
- **État actuel.** **Aucune notion de section/conteneur.** Page = **liste plate**
  `Block[]` sans `children` ; les blocs `layout` (`two_columns`, `grid_section`…) **ne
  contiennent pas** d'autres blocs (ils stockent leur contenu en clés plates
  `col1_*`). Pas d'imbrication, pas de « dupliquer une section », pas de réglages de
  section (fond pleine largeur, padding).
- **Verdict.** La liste plate est **adaptée et simple** pour le link-in-bio — mais c'est
  le **plafond de verre** si l'ambition vise le « mini-site » riche.
- **Vision cible.** **Imbrication *légère*** : une **Section** (fond pleine largeur +
  padding + colonnes) pouvant **contenir des blocs**, sans importer la complexité d'un
  arbre Webflow complet. Réglages de section, duplication de section, responsive par
  section. Rester **optionnel** (le débutant ne voit que la pile).
- **Justification.** Débloque les mises en page riches (colonnes réelles) tout en
  préservant la simplicité par défaut — le juste milieu Webflow↔Notion.

#### 2.12 Thèmes — **REPENSER (unifier) + AJOUTER (contraste)**
- **État actuel.** **DEUX systèmes divergents.** *Actif* : `types.ts` `PageTheme` riche
  (couleurs, typo, fonds mesh/gradient/vignette/glow, **`blockStyle` hérité par tous les
  blocs** = bonne cascade, intro Pro), **~152 thèmes / 12 catégories**, ThemePanel 6
  onglets. *Mort/trompeur* : `themes.ts` (nommage incompatible `background`/`bg_mode`,
  12 presets, **helpers WCAG `readableText` propres et testés**) — importé seulement par
  `[pageId]/BuilderClient.tsx` **(code mort, non monté)**.
- **Verdict.** Système A = **garder et enrichir** (blockStyle hérité est excellent) ;
  système B = **supprimer** mais **récupérer son calcul de contraste WCAG** ; 152 thèmes
  = **surcharge** (quasi-doublons) ; **aucun garde-fou de lisibilité** dans le système A.
- **Vision cible.** **Un seul système de thème**, **moins de presets + personnalisation
  guidée**, **garde-fou de contraste WCAG** intégré à l'onglet Couleurs (avertir/corriger
  une combinaison illisible — d'autant plus que l'**accent est utilisateur**).
- **Justification.** Un thème unique élimine la dérive ; le garde-fou de contraste est
  un impératif d'accessibilité (et rejoint la dette Design System). Nettoyer le code
  mort (`BuilderClient.tsx`, `themes.ts`) réduit la confusion.

### Canvas & manipulation directe

> **Confirmé par l'audit :** le canvas est une **liste verticale de blocs empilés**
> (`BuilderV4.tsx:1710` `blocks.map`, conteneur `maxWidth:640, margin:auto`), la
> position = **l'index dans le tableau**. Aucune coordonnée x/y. Le recadrage §0.2
> tient : Snap/Guides/Grids **spatiaux sont hors modèle** — on les réinterprète.

#### 2.13 Preview — **RETRAVAILLER + REPENSER (fidélité)**
- **État actuel.** Rendu **live et réel** (chaque bloc = son vrai composant React) avec
  overlays d'effets, décorations, mode jour/nuit, **error boundary par bloc**
  (isolation d'un bloc défaillant), `memo(BlockPreview)`. Trois aperçus coexistent :
  canvas central, mockup iPhone (panneau droit), Aperçu plein écran.
- **Verdict / faiblesse majeure.** **Le renderer est dupliqué 3×** : `builderPreview.tsx`
  (édition), `[slug]/PublicPageClient.tsx` (public), `TemplatePreviewModal.tsx:130`
  (modèles). La parité n'est testée que **structurellement** (`rendererParity.test.ts`
  vérifie qu'un `case` existe des deux côtés) → **dérive visuelle** documentée
  (« renderer-public-drift »). **Pas d'édition inline** (tout passe par le panneau) ;
  pas de zoom/pan.
- **Vision cible.** **Moteur de rendu UNIQUE** partagé édition ↔ public ↔ modèles
  (un seul chemin, paramétré « mode édition »). **Édition de texte in-situ** (clic pour
  écrire là où on lit). Aperçu = surface centrale permanente (cf. 2.6).
- **Justification.** La fidélité WYSIWYG *garantie* (un seul moteur) est un prérequis
  « référence mondiale » ; l'édition inline est le cœur de la manipulation directe.

#### 2.14 Drag & Drop — **AJOUTER (table stakes manquant)**
- **État actuel.** **Aucun DnD** (ni `dnd-kit`/`react-dnd`, ni `draggable`). Réordre par
  chevrons ↑/↓ (un cran) ou Alt+↑/↓. **Poignée « grab » factice** (`:1733`, `cursor:grab`
  mais **aucun handler**) → **affordance trompeuse**. Ajout depuis le picker = **clic
  seul** (`addBlock` pousse en fin de liste), sans ligne d'insertion.
- **Verdict.** Manque le plus visible de l'éditeur ; la fausse poignée aggrave (promet
  ce qui n'existe pas).
- **Vision cible.** **Glisser-déposer complet** : réordonner par la poignée avec **ligne
  d'insertion animée** ; glisser un bloc du picker **à un emplacement précis** ;
  auto-scroll aux bords ; annulable (transaction). Conserver les chevrons/Alt+flèches
  (a11y clavier). Accrochage au **rythme d'espacement** lors du dépôt (cf. 2.18).
- **Justification.** Notion/Webflow/Linktree/Carrd l'ont tous ; c'est *le* geste de
  manipulation directe d'une pile.

#### 2.15 Multi Selection — **GARDER (le plus mature)**
- **État actuel.** `Ctrl/Cmd+clic` (toggle), `Shift+clic` (plage), `Ctrl+A`, `Échap`,
  clic-fond désélectionne ; **barre d'actions groupées** riche (masquer/verrou/
  dupliquer/supprimer) gérant finement les blocs verrouillés ; retour visuel (liseré
  doré `inset 3px`).
- **Verdict.** **Point le plus abouti de la manipulation directe — garder.** Manque :
  pas de lasso vertical, pas de vrai « groupe » persistant, la multi-sélection ne
  s'édite pas (propriétés communes).
- **Vision cible.** Ajouter **lasso vertical** (glisser sur le fond), **déplacement
  groupé** par drag (une fois 2.14 en place), et **édition de propriétés communes** en
  multi-sélection.
- **Justification.** Base excellente ; on complète sans casser.

#### 2.16 Context Menu — **REPENSER (desktop)**
- **État actuel.** **Pas de clic-droit.** Accès secondaire par « … » ouvrant un
  **bottom sheet** (`:2241-2267`), **utilisé aussi sur desktop** (`position:fixed;
  align-items:flex-end`) — sous-optimal souris. Pas de copier/coller de bloc, pas de
  raccourcis affichés.
- **Verdict.** À repenser pour le desktop.
- **Vision cible.** Une **primitive `Menu` adaptative** (cf. Design System §3.4) :
  clic-droit **et** « … » → menu **ancré au curseur sur desktop**, bottom sheet sur
  mobile ; mêmes actions partout (cf. 2.5), raccourcis affichés, copier/coller de bloc,
  `role=menu` + clavier.
- **Justification.** Cohérence + ergonomie desktop = précision Figma sans jargon.

#### 2.17 Quick Actions (bloc) — **GARDER (agencer)**
- **État actuel.** Overlay volontairement **minimal** (Monter/Descendre/« … »),
  désencombrement assumé ; étiquette du bloc + badges d'état (brouillon/verrouillé/
  clics analytics **sur le bloc**) ; cibles mobile 40px.
- **Verdict.** Bon parti-pris — **garder** ; à réconcilier avec la barre contextuelle
  (2.1) et le menu (2.16) pour un modèle d'actions unique.
- **Vision cible.** Poignée qui **déplace réellement** (2.14) ; barre contextuelle
  ancrée pour les actions fréquentes ; badges d'état conservés.
- **Justification.** Garder la sobriété tout en rendant la poignée honnête.

#### 2.18 Snap — **REPENSER (sémantique, pas spatial)**
- **État actuel.** Aucun accrochage (cohérent avec la pile).
- **Verdict.** Ne **pas** importer le snap x/y de Figma (hors modèle).
- **Vision cible.** **Accrochage au rythme d'espacement** (paliers 4/8 issus des tokens)
  lors du réglage de l'espace au-dessus/au-dessous d'un bloc et lors du dépôt DnD ;
  accrochage aux **largeurs de conteneur** pour les blocs/colonnes redimensionnables.
- **Justification.** La « précision » utile ici = un espacement cohérent sans effort,
  pas un positionnement 2D.

#### 2.19 Guides — **REPENSER (sémantique)**
- **État actuel.** Aucun.
- **Vision cible.** **Guides sémantiques** apparaissant à l'édition : bord de **zone
  sûre**, **largeur de lecture** optimale, alignement des **colonnes internes** d'un
  bloc multi-colonnes ; repère d'alignement du contenu (l'option `align` left/center/
  right existe déjà — la rendre visible pendant le réglage).
- **Justification.** Aide à « bien faire » sans exposer une grille technique.

#### 2.20 Grids — **REPENSER (sémantique)**
- **État actuel.** « Grid » n'existe qu'en CSS interne aux blocs (galeries/colonnes) et
  comme fond décoratif — **aucune grille d'alignement éditoriale**.
- **Vision cible.** **Grille d'espacement tokenisée** (le rythme 4/8 rendu visible à la
  demande) + **grille de colonnes interne** aux blocs multi-colonnes (choix 1/2/3/4
  colonnes avec gap tokenisé). Pas de grille de pixels.
- **Justification.** Donne de la structure aux blocs riches sans complexité 2D.

#### 2.21 Layers — **AJOUTER (outline de pile)**
- **État actuel.** **Pas de panneau calques.** Le canvas *est* la liste ; le panneau
  gauche est un **picker d'ajout**, pas un arbre des blocs présents. Attributs
  « calque » (œil/cadenas/brouillon) existent mais dispersés ; les **noms internes de
  bloc** (`__name`) existent mais **aucune vue ne les exploite**. Structure **plate**.
- **Verdict.** L'absence est défendable (modèle Notion) mais **coûteuse sur page longue**
  (20+ blocs) : ni vue d'ensemble, ni saut direct, ni réordre depuis une liste.
- **Vision cible.** **Panneau « Plan »** (outline) : liste compacte réordonnable
  (drag), blocs **nommables** (réutiliser `__name`), œil/cadenas en ligne, saut au bloc
  au clic, recherche (cf. 2.7). Imbrication **légère** (sections/colonnes) — voir 2.11.
- **Justification.** Navigation + réordre d'ensemble = productivité Webflow/Figma,
  adaptée à la pile.

### Transversal

#### 2.22 Animations — **REPENSER (appliquer le Motion System)**
- **État actuel.** Le Motion System existe (`lib/motion.ts` + `--mo-*`) et **interdit**
  d'écrire une durée/courbe à la main. **L'éditeur le court-circuite quasi partout** :
  **~368 durées/courbes en dur** dans les fichiers builder (BuilderV4 68, panels 79,
  preview 45…), incohérentes (`.12/.15/.2/.25s`, easings absents), keyframes locaux non
  mutualisés, et **`prefers-reduced-motion` NON géré dans le builder** (spinners,
  popovers, fonds animés ignorent la préférence).
- **Verdict.** Le builder est **le principal contrevenant** au Motion System du projet.
- **Vision cible.** **100 % des transitions via `--mo-*`/`anim()`/`transition()`** ;
  keyframes rapatriés dans le système `mo-*` ; **`prefers-reduced-motion` respecté**
  partout dans l'éditeur.
- **Justification.** Cohérence du mouvement = sensation « premium » ; reduced-motion =
  accessibilité non négociable (Loi 5).

#### 2.23 Performance — **REPENSER (fondation)**
- **État actuel.** **Point fort réel :** `memo(BlockPreview)` + **préservation de
  l'identité des blocs** (`setBlocks(p=>…map…)`) → à la frappe, **seul l'aperçu du bloc
  édité se re-rend**. Autosave débité 800 ms + `saveNow` + `beforeunload` + refs
  anti-écrasement = robuste. **Mais :** chaque champ écrit **directement dans l'état
  global à chaque caractère** → **tout `BuilderV4` (2432 l) se réconcilie à chaque
  frappe** (pas de tampon local, pas de `useDeferredValue`/`useTransition`) ; undo par
  **deep-clone JSON** à chaque push ; ~11 `useMemo/useCallback` seulement ; **pas de
  virtualisation** pour les pages longues.
- **Verdict.** L'architecture d'aperçu est bonne (**garder**) ; **le chemin d'édition
  est à repenser** pour tenir les 60 fps (Loi 3).
- **Vision cible.** **Store d'édition à sélecteurs** (l'aperçu s'abonne au bloc, pas à
  tout l'arbre) ; **tampon d'input local** + commit différé (`useDeferredValue`/
  transition) ; undo par **patch structurel** (pas de clone JSON complet) ; virtualisation
  au-delà de N blocs.
- **Justification.** « 60 fps sur 30 blocs même sur mobile » est dans la Definition of
  Done ; la réconciliation d'un monolithe à chaque frappe l'en empêche.

#### 2.24 Responsive — **RETRAVAILLER + AJOUTER**
- **État actuel.** `useIsMobile(1024)` **SSR-safe** (bon), bascule **mono-panneau
  < 1024** (barre d'onglets `blocs|canvas|réglages`), mais **~56 ternaires `isMobile ?`
  inline**, **breakpoint 1024 dupliqué en JS**, **pas de palier tablette** (768–1024 =
  traitement mobile complet), **pas d'aperçu desktop** (toujours mockup mobile ;
  `hide_desktop` **non prévisualisable**).
- **Verdict.** Le pilotage SSR-safe est bon ; la logique responsive est **trop
  dispersée** et **binaire**.
- **Vision cible.** **Basculeur d'appareil** sur l'aperçu (mobile/tablette/desktop,
  prévisualisant `hide_*`), breakpoints **tokenisés** (source unique), moins de ternaires
  inline (classes/container queries).
- **Justification.** Un créateur doit **voir** son rendu sur chaque appareil ; c'est un
  standard des builders.

#### 2.25 Mobile — **GARDER (mutualiser)**
- **État actuel.** Édition tactile **réellement utilisable** (rare pour ce type d'outil) :
  barre d'onglets + bottom-sheets, **`env(safe-area-inset-bottom)`**, cibles ≥ 40 px,
  **barre du bas masquée pendant la recherche** (libère la hauteur au clavier), flux
  adaptés (ajout → panneau, modèle → canvas).
- **Verdict.** **Excellent socle à garder.** Faiblesses : **deux implémentations de
  bottom-sheet** (inline vs `components/mobile/BottomSheet.tsx` existant), réordre
  mobile limité aux flèches.
- **Vision cible.** **Réutiliser la primitive `BottomSheet` partagée** ; DnD tactile
  (long-press) une fois 2.14 en place ; conserver toute l'ergonomie actuelle.
- **Justification.** On capitalise sur un vrai point fort en supprimant la duplication.

### Élément transverse — Accessibilité (synthèse)
Confirmé par l'audit : **~51 `onMouseEnter/Leave` dans BuilderV4** (hover 100 % JS,
**sans pendant `:focus`** → invisible au clavier) ; **modales/sheets/popovers sans
`role="dialog"`, sans piège ni restauration du focus, non fermables à Échap** ; onglets
et `Segmented` **sans rôles ARIA** (`tablist`/`radiogroup`). **Points forts :** support
clavier du canvas mûr (navigation ↑/↓, Alt+↑/↓, raccourcis) et `:focus-visible` global.
→ **Cible :** hover en CSS (avec `:focus`), toutes les surprises modales sur la primitive
`Modal`/`Menu`, rôles ARIA sur onglets/segments. *(Rejoint la dette Design System.)*

---

## 3. Architecture cible

Quatre piliers, chacun résolvant une famille de dettes de §2. On **reconstruit
mentalement** l'éditeur autour d'eux — sans jeter ce qui est excellent (memo d'aperçu,
autosave, multi-sélection, RepeaterEditor, micro-guidage, recherche, Simple/Expert).

### 3.1 Un moteur de rendu UNIQUE (source de vérité visuelle)
Un seul module de rendu de bloc, **partagé** par le canvas d'édition, la page publique
et les aperçus de modèles — paramétré par un `mode` (`edit` | `public`). Supprime les
**3 renderers dupliqués** (dérive visuelle), garantit le WYSIWYG, et **héberge
l'édition inline** (le même composant sait afficher *et* éditer son texte). Registre de
blocs **découpé par domaine** (fin du `types.ts` de 5473 l importé en bloc).

### 3.2 Un modèle de document typé (fin des clés plates)
`Document = { page, theme, blocks }` où un bloc porte un **contenu typé avec de vraies
listes** (`items: Item[]`) au lieu de `p1_*…p50_*`. Un **schéma par bloc** décrit champs,
groupes, répéteurs, `showIf`, validations — l'inspecteur en est **entièrement généré**
(fin de la cascade `if(block.type)`). Prépare l'imbrication **légère** en Sections
(conteneurs optionnels). Thème **unifié** (un seul `PageTheme`) avec **garde-fou de
contraste WCAG** intégré.

### 3.3 Une couche de commandes (tout est réversible)
Toute mutation passe par une **commande** nommée et **transactionnelle** (`AddBlock`,
`UpdateField`, `ApplyTheme`, `Reorder`…). Bénéfices en cascade :
- **Undo/redo** avec **coalescing** (frappes regroupées) et **couverture totale**
  (blocs *et* thème *et* page) — corrige la faiblesse nº1.
- **Palette Cmd+K** et **raccourcis** deviennent de simples déclencheurs de commandes.
- **Journal** exploitable (position d'historique, plus tard collaboration/versions).
- Undo par **patch structurel** (plus de deep-clone JSON).

### 3.4 Un store d'édition à sélecteurs (60 fps)
L'état du document vit dans un store à **sélecteurs** : l'aperçu d'un bloc s'abonne à
**ce bloc**, pas à tout l'arbre. **Tampon d'input local** + commit différé
(`useDeferredValue`/transition) → la frappe ne réconcilie plus le monolithe.
Virtualisation au-delà de N blocs. Découpage des monolithes (2432/2667/1777 l) en
sous-composants abonnés.

> Les 4 piliers sont **complémentaires** : le moteur unique (3.1) et le modèle typé
> (3.2) sont les fondations ; la couche de commandes (3.3) et le store (3.4) sont le
> système nerveux. Ensemble ils rendent l'éditeur **fidèle, réversible, fluide et
> extensible** — les 4 qualités qui manquent aujourd'hui.

---

## 4. Feuille de route d'exécution (phasée)

> Règle absolue à chaque étape : **Loi 10 (zéro régression)**, migration **écran par
> écran avec QA visuelle**, `tsc`/build/tests verts, commit+push. On **garde** tout ce
> qui est marqué GARDER en §2.

### Phase 0 — Intégrité immédiate (faible risque, sans architecture)
Gains de confiance sans toucher aux fondations :
- **Supprimer le code mort** : `[pageId]/BuilderClient.tsx` (non monté), `themes.ts`
  (système de thème mort/trompeur), `dayMode` (rendu mais sans bouton).
- **Rendre la poignée honnête** : retirer le `cursor:grab` factice tant que le DnD n'est
  pas là (ne pas promettre une interaction inexistante).
- **Documenter TOUS les raccourcis** (panneau d'aide complet — additif).
- **`prefers-reduced-motion`** respecté dans le builder (CSS additive).

### Phase 1 — Fondations invisibles (transforme fiabilité/fidélité/perf)
*L'UX ne change quasiment pas ; tout devient solide.*
1. **Couche de commandes + undo coalescing/transactionnel** couvrant blocs+thème+page
   (**priorité nº1** — corrige la faiblesse la plus grave).
2. **Moteur de rendu unique** (dé-dupliquer les 3 renderers → module paramétré `mode`)
   + renforcer `rendererParity` (au-delà du simple `case`).
3. **Store d'édition à sélecteurs + tampon d'input** (60 fps ; découpe des monolithes).

### Phase 2 — Le saut de manipulation directe (l'UX « waouh »)
4. **Drag & drop réel** (réordre + ajout depuis le picker + ligne d'insertion +
   auto-scroll), poignée enfin fonctionnelle ; garder chevrons/Alt+flèches (a11y).
5. **Édition inline** sur le canvas (portée par le moteur unique en `mode=edit`).
6. **Barre contextuelle attachée au bloc** + **primitive `Menu`** (clic droit desktop /
   bottom-sheet mobile, `role=menu`, Échap/flèches) → **un modèle d'actions unique**.
7. **Palette Cmd+K** + insertion **« / » (slash)** + réutilisation du moteur de
   recherche (synonymes/scoring, + tolérance aux fautes).
8. **Panneau « Plan » (outline)** réordonnable, blocs **nommables** (réutilise `__name`),
   œil/cadenas en ligne, saut au bloc.

### Phase 3 — Modèle & structure (débloque la richesse, le plus risqué)
9. **Modèle de liste typé** : migration `p1_*→items[]` (script de migration + parité de
   rendu renforcée) — supprime le plafond 50 et simplifie tout.
10. **Inspecteur 100 % déclaratif** depuis le schéma (fin de la cascade `if(block.type)`,
    groupes/sections déclaratifs, tokens d'inspecteur partagés, **highlight bloc↔champ**).
11. **Sections** (imbrication *légère* : conteneur fond+padding+colonnes), optionnelles.
12. **Unifier les thèmes** + **garde-fou de contraste WCAG** ; **rationaliser** le
    catalogue (moins de blocs/thèmes, plus paramétrables).
13. **Templates unifiés** (aperçu = vrai rendu via moteur unique) + **templates
    utilisateur** (« enregistrer comme modèle »).

### Phase 4 — Précision & finition (le niveau « référence mondiale »)
14. **Snap/Guides/Grids sémantiques** (accrochage au rythme d'espacement, guides de
    zone sûre/largeur de lecture, grille de colonnes interne).
15. **Basculeur d'appareil** (mobile/tablette/desktop) + breakpoints tokenisés (fin des
    ~56 ternaires inline).
16. **Motion System appliqué partout** (fin des ~368 durées en dur) ; **hover en CSS**
    (fin des ~51 hover-JS) ; **ARIA complet** (dialogues/onglets/segments).
17. **Multi-sélection avancée** : lasso vertical + édition de propriétés communes.

### Séquencement & dépendances (résumé)
- Phase 1 **avant** Phase 2 (l'inline et le Cmd+K s'appuient sur le moteur unique et la
  couche de commandes).
- L'item **9 (modèle typé)** est le **pivot** de la Phase 3 : à faire tôt dans la phase,
  car 10/11/12/13 en dépendent. C'est aussi **le plus risqué** (migration de données) →
  script + tests de parité + sauvegarde avant.
- Phase 4 = polish : peut démarrer en parallèle dès que les fondations tiennent.

### Definition of Done par phase
Chaque phase n'est « faite » que si : aucune régression constatée en QA, les
excellences de §2 préservées, `tsc`/build/tests verts, et un critère de la Definition
of Done §0.4 progressé (fidélité / réversibilité / fluidité / accessibilité).

---

## 5. Ce qu'on garde tel quel (liste de préservation)

À **ne pas** casser pendant la reconstruction :
`memo(BlockPreview)` + préservation d'identité des blocs · autosave débité + `saveNow`
+ garde `beforeunload` + upsert conservant les UUID · multi-sélection Ctrl/Shift/Ctrl+A
+ barre d'actions groupées gérant le verrouillage · `RepeaterEditor` générique ·
accordéons auto-dérivés du label · micro-guidage (validation live, scores, suggestions
curées) · copier/coller de style + presets d'apparence · `blockStyle` hérité ·
recherche de blocs (synonymes/scoring/surlignage/récents/favoris) · Simple/Expert
(progressive disclosure) · `useIsMobile` SSR-safe · ergonomie tactile (safe-area, cibles
40 px, clavier du canvas ↑/↓ + Alt+↑/↓) · error boundary par bloc · application
réversible des modèles · distinction brouillon/masqué/verrouillé.

---

*Plan d'exécution Builder · v1.0 · établi par audit read-only exhaustif (4 axes :
commande, contenu, canvas, transversal). Ne prescrit aucune modification immédiate —
il cadre le travail à venir. Aucun code produit.*
