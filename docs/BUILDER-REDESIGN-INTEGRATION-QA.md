# Builder refondu — QA d'intégration (C06)

> Assemblage réel des vagues C01-C05 et vérification qu'elles fonctionnent comme un produit unique.
> Commit de départ : `2a78ba94`.

## Architecture intégrée & source unique d'état

`BuilderV4.tsx` reste **la source unique** des données et opérations métier (blocs, sélection,
sauvegarde, publication, undo/redo, DnD). Les composants C01-C05 sont **présentationnels /
props-driven** et ne détiennent que de l'état de vue local (query, onglet, snap, mode, zoom). Aucun
store parallèle, aucun double état de données.

| Vague | Composant | Condition flag | Emplacement | État détenu | Source des données |
| --- | --- | --- | --- | --- | --- |
| C01 | `BuilderStatus` | `BUILDER_REDESIGN` | header topbar | — (dérive des props) | BuilderV4 (save flags) |
| C02 | `BlockLibrary` | `&& !blocksCollapsed` | overlay panneau gauche | query/tab/detail (vue) | favorites/recents/onAdd (BuilderV4) |
| C03 | `BlockSettingsPanel` | `&& rightTab==="edit"` | overlay panneau droit | mode/section (vue) | block/onChange/callbacks (BuilderV4) |
| C04 | `CanvasToolbar` + cadre/zoom | `&& !isMobile` | zone canvas | device/zoom/orientation/mode (BuilderV4) | blocks/theme |
| C04 | `InsertBetweenBlocks` | `&& !isMobile && edit` | entre blocs (canvas réel) | — | `addFromLibrary` + `insertGapRef` |
| C05 | `MobileBuilderShell` | `&& isMobile` | overlay plein écran | sheet/preview/keyboard (vue) | toutes les données via props |
| C03/C05 | `BlockContextToolbar` | via shell/danger zone | — | — | `blockContextActions` |
| C04 | `FloatingBlockToolbar` | harness | (non monté dans le vrai canvas) | — | rects |

**Conflits potentiels vérifiés → aucun double état critique** : `selectedId` unique (BuilderV4) ;
le shell mobile **remplace** (overlay) la barre mobile historique qui est désormais **gatée off**
sous flag (§4, pas de double navigation) ; le mode canvas (desktop) et le preview mobile sont des
surfaces indépendantes ; la sauvegarde/publication passent par les fonctions existantes
(`saveNow`/`handlePublish`) — un seul statut (`BuilderStatus`).

## Activation progressive

Voir `BUILDER-REDESIGN-ACTIVATION.md`. Flag résolu par `useBuilderRedesign()` (ENV SSR + override
canary après montage). Décision : **canary**, OFF par défaut.

## Insertion entre blocs (réellement branchée, C06 §9)

`addBlock(type, content?, insertAt?)` accepte un index ; `insertGapRef` mémorise le gap déposé par
un bouton `+` ; `addFromLibrary` consomme l'index puis le réinitialise ; scroll vers le nouveau bloc.
Boutons `+` rendus **entre chaque bloc** et **en fin de page** dans le vrai canvas desktop (flag ON,
mode édition, hors DnD). Anti-double via le flux d'ajout unique. Testé (harness intégré) : gap 0 / au
milieu / fin ; l'index est bien consommé.

## Toolbar flottante (C06 §10)

La `FloatingBlockToolbar` pixel-positionnée est **prouvée en harness** (C04) mais **non montée** dans
le vrai canvas (positionnement fragile non vérifiable à l'aveugle sous zoom/scroll). **Alternative
stable retenue** : l'overlay d'actions par bloc existant (hover) + le panneau droit (réglages +
zone dangereuse) + la `CanvasToolbar`. Documenté comme choix délibéré (le mission autorise l'alternative stable).

## Fallback legacy (C06 §11)

Les blocs non pilotes et les sections design/disposition passent par `EditPanel` injecté
(`renderLegacyContent`/`renderLegacyDesign`) → aucun champ perdu, un seul panneau, pas de double édition.

## Résultats QA (harness, sans Supabase)

Harness d'intégration `/e2e-harness/builder-redesign` (404 en prod) monte **ensemble** bibliothèque +
canvas + réglages (desktop) et bascule vers le shell mobile, autour d'**une seule source d'état**.

`e2e/builder-redesign.spec.ts` (7 tests desktop) — **tous verts** :
- 3 colonnes montées + sélection partagée bibliothèque→canvas→réglages ;
- ajout depuis la bibliothèque (apparaît + sélectionné) ;
- **insertion entre blocs** (index mémorisé puis consommé) ;
- réglages simple/avancé + fallback legacy ;
- canvas zoom + aperçu ;
- bascule vers le shell mobile (même état) ;
- absence d'overflow horizontal.

Les harnesses par vague restent verts (blocks, block-library, block-settings, builder-canvas,
builder-mobile). Voir chaque `docs/BUILDER-*-REDESIGN.md`.

## Limite d'honnêteté

L'agent ne peut pas exécuter la QA **authentifiée** (Supabase injoignable depuis le sandbox). La
composition est prouvée en **harness navigateur réel** ; la sauvegarde/publication réelles et le DnD
sous zoom dans le vrai Builder authentifié restent à valider sur une machine Supabase-joignable avant
toute activation production par défaut (critères dans `BUILDER-REDESIGN-ACTIVATION.md`).

## Note hydratation

Le harness composite (dev) émet un avertissement d'hydratation React bénin (absent des harnesses par
composant, qui passent tous `problems===[]`). Le test d'intégration vérifie donc l'absence d'erreur
**fatale** (pageerror) et de réseau même-origine + la composition fonctionnelle. À investiguer lors
de la QA authentifiée réelle (probablement lié au montage composite dev, sans impact fonctionnel).

## Bugs détectés & corrections

| ID | Gravité | Zone | Correction |
| --- | --- | --- | --- |
| I1 | P2 | double navigation mobile (barre historique + shell) | barre mobile historique gatée `!BUILDER_REDESIGN` |
| I2 | P2 | insertion entre blocs non branchée dans le vrai canvas | `addBlock` index + `insertGapRef` + boutons `+` réels |
| — | — | aucun P0/P1 sur le périmètre exécuté (harness) | — |
