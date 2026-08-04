# Builder — Ultra-audit UX (C01)

> Audit **réel** du Builder de Qrowg, lu ligne à ligne avant toute modification (règle §2 de la
> mission C01). Aucune conclusion inventée : chaque constat renvoie à un fichier/ligne réel.
> État de référence : HEAD `fc805608`, 51 blocs shared, 1392 tests unitaires verts, Playwright installé.

## A. État initial

| Élément | Valeur |
| --- | --- |
| Hash | `fc805608` |
| Composant racine | `apps/web/src/app/dashboard/builder/BuilderV4.tsx` (**2661 lignes**) |
| Panneaux/réglages | `builderPanels.tsx` (**1777 lignes**, tout inline) |
| Rendu des blocs (éditeur) | `builderPreview.tsx` (**2672 lignes**) |
| Source de contenu/thème | `types.ts` (**5621 lignes** : blocs, thème, helpers purs) |
| Modules structurants | `builderHooks.ts` (undo/redo + resize), `CommandPalette.tsx`, `OutlinePanel.tsx`, `builderSearch.ts` (moteur pur), `saveController.ts`, `savePage.ts`, `publish.ts`, `builderErrors.ts` |

**Constat transversal n°1 : le Builder n'est PAS pauvre en fonctionnalités.** Il possède déjà :
palette Cmd/Ctrl+K, plan (outline), undo/redo avec coalescing, recherche à synonymes, favoris,
récents, catégories, mode expert persistant, panneaux redimensionnables + repliables, mode Focus,
états de sauvegarde avec réessai, popup de publication, barre d'onglets mobile (Blocs/Page/Réglages)
avec safe-area, et une bottom-sheet d'actions de bloc (dupliquer/masquer/verrouiller/brouillon/
réinitialiser/supprimer).

**Constat transversal n°2 : le problème réel est la FORME, pas le fond.** Tout est **inline**,
avec un mélange de tokens (`var(--accent)`, `var(--success)`) et de littéraux bruts
(`#0D0D0D`, `#FBBF24`, `rgba(201,168,76,0.12)`, `#EF4444`, `#8A8478`). Résultat : incohérence
visuelle, jargon interne exposé, densité, a11y partielle, et surtout **impossibilité de faire
évoluer la structure sans toucher un fichier de 2661 lignes non testable à l'aveugle.**

## B. Cartographie actuelle des zones

| Zone | Rôle actuel | Implémentation (réf.) | État local clé | Problèmes observés | Risque modif. |
| --- | --- | --- | --- | --- | --- |
| **Header (topbar)** | logo, nom de page, statut save, undo/redo, Modèles, Focus, QR, Aperçu, Thème, Publier | `BuilderV4.tsx:1090-1300` (inline, 50 px) | `pageName`, `saving/saved/saveError/hasUnsaved`, `rightTab` | 10+ actions en 50 px ; littéraux bruts ; statuts en textes ad-hoc ; jargon (« Mode démo ») | Élevé (interleaved avec popups QR/Publish/Modèles) |
| **Panneau gauche (Ajouter)** | bibliothèque de blocs : recherche, catégories, favoris, récents, grille | `BuilderV4.tsx:1318-1760` | `activeCategory`, `search`, `favorites`, `recents` | grille 2 col desktop / 4 col mobile ; catégories nombreuses ; aperçu textuel faible ; tout inline | Élevé |
| **Canvas** | preview éditable, scroll, sélection, DnD | `BuilderV4.tsx:1767-2005` | `selectedId`, `multiSelection`, `dragIdx`, `dropBefore`, `dayMode` | pas de zoom, pas de cadre appareil clair, `dayMode` peu visible, page longue peu repérable | Élevé |
| **Panneau droit** | onglets `preview / edit / theme` ; réglages du bloc | `BuilderV4.tsx:2007-2400` + `builderPanels.tsx` | `rightTab`, `editTab` (`contenu/style/layout/avance`) | sections existent mais réglages par bloc = inline ad-hoc, densité, peu de reset/résumé | Très élevé (1777 l inline) |
| **Barre d'onglets mobile** | switch `blocks / canvas / panel` | `BuilderV4.tsx:2415-2431` | `mobileTab` | bottom-bar OK + safe-area ; mais « panel » = colonne pleine (pas bottom-sheet) ; pas de paysage dédié | Moyen |
| **Bottom-sheet actions bloc** | dupliquer/masquer/verrouiller/brouillon/reset/supprimer | `BuilderV4.tsx:2434-2460` | `blockMenu` | correcte (safe-area, poignée) ; Supprimer sans confirmation explicite | Faible |
| **Command palette** | Cmd/Ctrl+K : commandes + insertion de bloc | `CommandPalette.tsx` (adossé au primitive Modal) | `q`, `active` | bonne base (clavier, récents) ; peu de commandes exposées | Faible |
| **Outline (plan)** | overlay : liste des blocs, saut, réordonner | `OutlinePanel.tsx` | — | overlay uniquement (pas docké) ; pas de DnD, pas de renommage | Faible |
| **Sauvegarde** | autosave sérialisée + réessai | `saveController.ts`, `savePage.ts` | `saving/saved/saveError/hasUnsaved` | états en **textes libres** dispersés, pas de taxonomie | Faible (logique fiable, ne pas toucher) |
| **Publication** | popup + revalidation ISR | `publish.ts`, `BuilderV4.tsx:1215-1300` | `showPublishPopup`, `publishing`, `publishSuccess` | résumé partiel ; brouillon vs publié vs « modifs non publiées » pas explicite | Faible |
| **Undo/redo** | historique 50, coalescing 600 ms | `builderHooks.ts:49-121` | refs internes | solide et testé — **à préserver tel quel** | — |
| **Modales** | Modèles, QR, Publish, Palette, Outline | inline + primitive Modal | divers | primitives Modal partiellement adoptées | Faible |

## C. Problèmes critiques (P0 → P4)

| Prio | Problème | Preuve | Impact |
| --- | --- | --- | --- |
| **P0** | Aucune couche d'abstraction UX : structure, nav, statuts, sélection, responsive sont codés inline dans un fichier de 2661 l → **non testable, non évolutif, non vérifiable à l'aveugle** | `BuilderV4.tsx` entier | Bloque toute refonte sûre |
| **P1** | Incohérence visuelle : littéraux bruts (`#0D0D0D`, `#FBBF24`, `rgba(201,168,76,…)`) mêlés aux tokens | `BuilderV4.tsx:1091,1099,1103` | Sensation non premium, dette de design system |
| **P1** | Statuts save/publication en **textes libres dispersés** (pas de taxonomie unique) | `BuilderV4.tsx:1095-1106,1224-1290` | États peu clairs pour l'utilisateur (§20 mission) |
| **P1** | Réglages de bloc = 1777 l inline non hiérarchisées de façon uniforme (les sections `contenu/style/layout/avance` existent mais l'organisation par bloc est ad-hoc) | `builderPanels.tsx` | Densité, options importantes noyées |
| **P2** | Header surchargé : 10+ actions dans 50 px, dégrade fort en mobile | `BuilderV4.tsx:1090-1300` | Découvrabilité faible |
| **P2** | Jargon interne exposé (`layout`, `avance`, « Mode démo ») ; pas de glossaire | `BuilderV4.tsx:143,1106` | Débutants perdus (§19) |
| **P2** | Mobile « Réglages » = colonne pleine, pas bottom-sheet ; pas de mode paysage dédié | `BuilderV4.tsx:2007,2415` | UX mobile perfectible |
| **P3** | Canvas sans zoom ni cadre appareil explicite ; page longue peu repérable | `BuilderV4.tsx:1767` | Édition de longues pages pénible |
| **P3** | Suppression de bloc sans confirmation explicite dans la bottom-sheet | `BuilderV4.tsx:2444` | Risque d'action destructrice |
| **P4** | Outline en overlay seulement (pas docké, pas de DnD/renommage) | `OutlinePanel.tsx` | Productivité avancée limitée |
| **P4** | Peu de commandes dans la palette | `CommandPalette.tsx` | Puissance sous-exploitée |

## D. Parcours utilisateurs (constats réels)

| Parcours | Étapes actuelles | Frictions observées | Cible |
| --- | --- | --- | --- |
| **Débutant** (créer→template→identité→CTA→couleurs→publier) | header → Modèles (popup) → panneau gauche → réglages droite → Publier (popup) | 3 zones + 2 popups à comprendre ; jargon ; statut save peu lisible | Nav guidée « Ajouter/Design/Publier », mode simple, aide contextuelle |
| **Pro** (services→tarifs→formulaire→domaine→publier) | ajout blocs commerce + réglages inline denses | densité des réglages ; domaine hors builder | Sections réglages cohérentes ; résumé avant publication |
| **Créateur** (réseaux→musique→galerie→portfolio→CTA→thème) | catégories + favoris/récents (existants) | catégories nombreuses ; aperçu faible | Bibliothèque à catégories claires + aperçu + recommandés |
| **Commerce** (produits→prix→liens→offre→formulaire) | idem pro | idem | idem |
| **Mobile** (ouvrir→ajouter→modifier→déplacer→sauvegarder→publier) | bottom-bar (Blocs/Page/Réglages) + bottom-sheet actions | « Réglages » = colonne pleine ; publication desktop-only (`BuilderV4.tsx:1215`) ; pas de paysage | Bottom-sheets pour réglages, publication accessible mobile, safe-area/clavier |

## E → K. Constats / cible par domaine

- **E. Architecture cible** : introduire une **couche UX pure** (source unique testable) que la coquille consomme — voir `builderUx.ts`. La coquille (`BuilderV4`) reste, mais délègue nav/statuts/sections/mode/sélection/responsive à des fonctions pures + composants présentationnels tokenisés, adoptés **écran par écran derrière un flag**.
- **F. Desktop cible** : header compact (identité + statut clair + undo/redo + Publier), rail de navigation gauche unifié (Ajouter / Structure / Design / Modèles / Réglages), canvas central, panneau droit contextuel sectionné.
- **G. Mobile cible** : header compact, canvas plein écran, bottom-bar principale, **bottom-sheets** pour tous les panneaux, safe-area + clavier gérés, paysage.
- **H. Ajout de blocs** : la base (recherche/catégories/favoris/récents) existe → cible = aperçu visuel, recommandés, tags métier, distinction gratuit/premium claire, sur une bibliothèque tokenisée.
- **I. Réglages** : formaliser la taxonomie **Contenu / Design / Disposition / Interactions / Responsive / Avancé** (mode simple = 3 premières, expert = toutes), avec reset par section et indication des valeurs modifiées.
- **J. Canvas** : ajouter zoom, cadre appareil explicite, repères de page longue, bouton `+` entre blocs (sans casser le DnD existant).
- **K. Sauvegarde/publication** : **taxonomie unique** d'états (voir `resolveSaveStatus` / `resolvePublishStatus`) + résumé avant publication (nb blocs, blocs vides invisibles, liens manquants). Ne pas toucher la logique fiable (`saveController`/`publish`).

## L. Performance (constats réels, non mesurés en prod)

- `BuilderV4` re-render global sur beaucoup d'états (un seul composant géant). Non prouvé bloquant.
- `builderPreview` (2672 l) rend tous les blocs ; pas de virtualisation. À **mesurer** sur 50-100 blocs avant toute optimisation (règle §21 : n'optimiser que le prouvé).
- Undo/redo : coalescing déjà en place (`builderHooks.ts:32-44`) → historique non saturé par frappe. Bon.
- **Aucune optimisation prématurée dans cette vague** (pas de `memo`/`useCallback` massifs, pas de virtualisation spéculative).

## M. Accessibilité (constats)

- Boutons icône : partiellement labellisés (`OutlinePanel` a `aria-label`, mais des icônes du header s'appuient sur `title` seul).
- Palette et Outline : adossés au primitive Modal (focus trap, Échap, restauration du focus) → bon socle.
- Statuts save : pas de `role="status"`/`aria-live` → non annoncés aux lecteurs d'écran (corrigé dans `BuilderStatus`).
- Cibles tactiles mobiles : bottom-bar 52 px (OK), bottom-sheet items OK.

## Conclusion de l'audit

Le Builder est **mature mais monolithique et inline**. La bonne stratégie n'est pas de reconstruire,
mais d'**extraire une couche UX pure et tokenisée** (testable sans navigateur), puis de faire migrer
la coquille **écran par écran, derrière un flag**, avec QA visuelle. La Vague 1 pose cette fondation
et livre un premier incrément visible **sûr et réversible** (statut save unifié), le reste étant
spécifié dans `BUILDER-REDESIGN-ROADMAP.md`.

> **Contrainte d'environnement (honnêteté)** : l'agent ne peut pas rendre le Builder authentifié
> (hôte Supabase injoignable depuis le sandbox → `ENOTFOUND` ; cf. `PLAYWRIGHT-PRODUCT-AUDIT.md`
> §B11.1). Toute refonte visible de la coquille est donc **gatée par un flag (défaut OFF)** et
> validée par tests purs + `renderToStaticMarkup`, la QA navigateur restant à exécuter sur une
> machine où Supabase est joignable. Aucune amélioration visible n'est déclarée validée à tort.
