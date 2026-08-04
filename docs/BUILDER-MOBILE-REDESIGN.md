# Builder — Refonte mobile complète (C05, Vague 5)

> Shell mobile dédié derrière `BUILDER_REDESIGN` (défaut OFF). Modèle pur + composants
> harness-vérifiés + intégration en overlay dans BuilderV4. Réutilise C02 (bibliothèque), C03
> (réglages), C04 (canvas/toolbar). Aucune donnée modifiée, aucun renderer public touché, logique de
> sauvegarde/publication inchangée. Commit de départ : `df59bc2c`.

## Audit mobile

| Zone | Actuel | Problème | Réutilisable | Cible |
| --- | --- | --- | --- | --- |
| Bottom bar | 3 onglets (blocks/canvas/panel) | pauvre, pas de publication/aperçu | — | 5 onglets dédiés |
| Sheets | bottom-sheet d'actions de bloc ad-hoc | pas de primitive unique | patron | `MobileBottomSheet` unique (3 snaps) |
| Clavier | aucun ajustement | actions masquées | — | Visual Viewport + nav masquée |
| Safe area | partielle | doublons possibles | — | `safeAreaTargets` (une fois) |
| Paysage | non géré | canvas invisible | — | sheet latérale + nav compacte |
| Publication | desktop-only | absente sur mobile | `handlePublish` | sheet Publier |

## Architecture cible

```text
builderMobile.ts        ← modèle PUR (tabs, sheet+snap, après add/select, clavier, safe area, retour, actions)
MobileBuilderShell.tsx  ← orchestrateur (header + canvas slot + context bar + nav + sheet unique)
MobileBuilderHeader.tsx ← header compact (retour, nom, statut save, undo/redo, menu)
MobileBottomNavigation  ← 5 onglets (Ajouter/Structure/Modifier/Aperçu/Publier)
MobileBottomSheet.tsx   ← primitive UNIQUE (dialog, snaps, drag handle, safe area, Escape, focus)
MobileContextBar.tsx    ← barre du bloc sélectionné (réutilise BlockContextToolbar)
```

Le contenu des sheets réutilise `BlockLibrary` (C02), `BlockSettingsPanel` (C03) — **aucune
duplication**. L'état (blocs, sélection, save/publish) reste celui du Builder desktop.

## Modèle pur (`builderMobile.ts`)

Types `MobileBuilderTab` (add/structure/edit/preview/publish), `MobileSheetState`, `MobileSnap`.
Helpers : `MOBILE_BOTTOM_NAV`, `opensSheet`, `defaultSnap`, `openSheet`/`setSnap`/`snapHeight`,
`editTabIntent`, `afterSelect`, `afterAdd`, `sheetForKeyboard`, `bottomNavVisible`, `usableHeight`,
`safeAreaTargets`, `resolveBackAction` (hiérarchie §20), `mobileChrome` (paysage/tablette),
`publishTabBadge`, `publishSummary`, `mobileContextActions`, `restoreSheet`. **Déterministe, testé.**

## Header

Compact : retour (hiérarchie de fermeture), nom tronqué, `BuilderStatus` (statut save + retry),
undo/redo, menu. Safe area haute, boutons ≥ 44 px.

## Bottom navigation

5 onglets max, icône + libellé, actif (`aria-selected`), badge d'erreur sur Publier, safe area basse,
variante compacte en paysage, masquée quand le clavier est ouvert.

## Bottom sheet (primitive unique)

`role="dialog"` + `aria-modal`, drag handle, boutons de snap **accessibles** (Réduit/Moyen/Plein),
contenu à scroll unique, Escape, backdrop, restauration du focus, safe area conditionnelle, variante
latérale en paysage. **Une seule primitive** pour tous les onglets ; seul l'onglet actif est monté (perf).

## Snap points

compact 42 % · medium 66 % · expanded 94 % (`snapHeight` borné). add ouvre en expanded, edit/
structure/publish en medium. Boutons de redimensionnement accessibles (le swipe reste optionnel).

## Bibliothèque / Réglages / Structure / Canvas

- **Bibliothèque** : `BlockLibrary mobile` dans la sheet expanded ; après ajout → sélection + sheet Modifier.
- **Réglages** : `BlockSettingsPanel mobile` (Simple par défaut, toggle, confirmations, legacy injecté).
- **Structure** : liste des blocs (sélection→réglages, monter/descendre, recherche, états visibles).
- **Canvas** : slot plein largeur (pas de frame téléphone dans un téléphone), tap = sélection → réglages.

## Barre contextuelle

À la sélection (hors sheet/aperçu) : actions principales (Modifier/Dupliquer/Monter/Descendre) + « Plus ».

## Ajout entre blocs

Réutilise l'infrastructure C04 (`InsertBetweenBlocks`/`resolveInsertIndex`) — prouvée en harness ;
dans la bibliothèque mobile, l'ajout sélectionne et ouvre Modifier (anti-double partagé).

## Clavier virtuel

Visual Viewport API : clavier ouvert → sheet en expanded, bottom nav masquée, `usableHeight` calcule
l'espace utile. La saisie n'est jamais perdue, la sheet ne se ferme pas. (Override de test disponible.)

## Safe areas

`safeAreaTargets` applique la safe area basse **une seule fois** : à la nav si visible, sinon à la
sheet. Header en safe area haute. Paysage géré.

## Portrait / Paysage / Tablette

- **Portrait** (390×844, 360×800) : header + canvas + nav + sheet, aucun overflow horizontal.
- **Paysage** (844×390) : nav compacte, **sheet latérale** (canvas visible), aucun overflow.
- **Tablette** (≥ 700 px, `TABLET_MIN_WIDTH`) : `mobileChrome.useTabletRail` = ne pas forcer l'UI téléphone.

## Aperçu / Publication / Sauvegarde

- **Aperçu** : onglet Aperçu masque header/nav, bannière + « Éditer ». Ne remplace pas la vraie page publique.
- **Publication** : sheet avec état, `publishSummary` (nb blocs, vides masqués, avertissements),
  bouton Publier/Mettre à jour (**désactivé si erreur de sauvegarde**), lien Ouvrir. Réutilise `handlePublish`.
- **Sauvegarde** : statut visible dans le header (`BuilderStatus`), badge d'erreur sur Publier, retry, aucune fausse réussite.

## Retour arrière (hiérarchie §20)

`resolveBackAction` : menu > sous-vue > sheet > aperçu > quitter. Le bouton retour du header et Escape
suivent cette hiérarchie (ne quitte pas le Builder accidentellement). Limite : l'intégration du bouton
retour **navigateur/Android** (popstate) n'est pas branchée dans cette vague (documentée).

## Accessibilité

Nav `role=tablist`/`aria-selected`, sheet `role=dialog`/`aria-modal`/titre/focus/restauration,
cibles ≥ 44 px, statut save en `aria-live`, actions destructrices nommées, aucune action uniquement
gestuelle (alternatives visibles).

## Performance

Seule la sheet active est montée ; canvas en slot ; `useMemo` sur chrome/résumé/structure ; testé à
10/50/100 blocs. Visual Viewport listener nettoyé.

## Feature flag & rollback

OFF ou desktop = interface mobile historique inchangée. ON + viewport mobile
(`NEXT_PUBLIC_BUILDER_REDESIGN=1`) = shell mobile complet en overlay. Rollback = OFF.

## Harness & tests

- `/e2e-harness/builder-mobile` (**404 prod**), état + clavier + save-error simulés, sans Supabase.
- Unitaires `builderMobile.test.ts` : **26** (nav, sheet/snap, après add/select, clavier, safe area,
  retour, paysage/tablette, save/publish, actions, restauration).
- Playwright `e2e/builder-mobile-shell.spec.ts` : **13 tests** (rendu, ajout, structure, sélection,
  snaps, clavier, aperçu, publication, fermeture, portrait 360, paysage 844, tablette 768, 100 blocs).
  Captures attachées.

## Risques résiduels (mobile)

- Le bouton retour **navigateur/Android** (popstate) n'est pas branché (hiérarchie prête côté modèle).
- Le canvas mobile utilise un slot d'aperçu (tap = sélection → réglages) ; l'édition inline se fait
  dans la sheet Réglages (choix mobile délibéré), pas sur le canvas.
- Chemin flag ON authentifié non observé en navigateur (Supabase injoignable ici) — mitigé : flag OFF
  par défaut + shell prouvé via harness public.
- Artefact DEV : l'indicateur Next (`nextjs-portal`) recouvre le coin bas-gauche en dev ; neutralisé
  dans les tests (absent en prod).

## Prochaine vague

Vague 6 — Outline / productivité (outline docké + DnD, palette enrichie, presets), ou activation
progressive du nouveau Builder.
