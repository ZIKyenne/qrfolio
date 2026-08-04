# Builder — Refonte de la bibliothèque de blocs (C02, Vague 2)

> Reconception du panneau d'ajout de blocs. Modèle pur + composants présentationnels, derrière le
> flag `BUILDER_REDESIGN` (défaut OFF). Zéro migration de données, aucun nouveau bloc shared, aucune
> logique de quotas modifiée. Commit de départ : `d87aed2b`.

## Audit de l'existant

Le Builder possédait **déjà** l'essentiel — la refonte réutilise, elle ne reconstruit pas.

| Fonction | Implémentation actuelle | Problème | Réutilisé |
| --- | --- | --- | --- |
| Favoris | `BuilderV4` state + `localStorage["qrfolio_fav_blocks"]` (`toggleFav`/`isFav`) | inline, carte = bouton dans un bouton (a11y) | **Oui** (mêmes clés) |
| Récents | state + `localStorage["qrfolio_recent_blocks"]`, `pushRecent` (borne 8) | inline | **Oui** (mêmes clés, borne 8) |
| Catégories | `BLOCK_CATEGORIES` (10) + `activeCategory` | icônes/desc ok mais grille dense | **Oui** |
| Recherche | `builderSearch.scoreBlock` (synonymes) | pas de normalisation d'accents ni multi-mots | **Étendu** |
| Premium | *aucun gating par bloc dans le repo* | aucune distinction visible | **Ajouté (affichage)** |
| Ajout | `addBlock(type)` (append + select + pushRecent) | pas d'anti-double, pas d'index d'insertion | **Réutilisé + gardé** |

142 blocs, 10 catégories, **aucun orphelin** (test `orphanBlockTypes`).

## Architecture cible

```text
builderLibrary.ts        ← modèle PUR (aucun React/Supabase) : items, recherche, catégories,
                            favoris/récents (ops pures), recommandations, premium, insertion
BlockLibrary.tsx         ← orchestrateur présentational (header, recherche, onglets, grille, détail)
BlockLibraryCard.tsx     ← carte (a11y : boutons frères, jamais imbriqués)
e2e-harness/block-library ← route de test publique (404 en prod), état favoris/récents en mémoire
```

## Modèle de bibliothèque (`builderLibrary.ts`)

`BlockLibraryItem` dérivé de `BLOCK_DEFS` : `type, title (override clair), rawLabel, description,
category, categoryLabel, icon, color, keywords, useCases, isPremium, isFavorite, isRecent,
isRecommended`. **Pur, testable, ne modifie jamais `BLOCK_DEFS`.**

## Recherche

`scoreLibraryItem` : normalisation NFD (accents), insensible à la casse, **multi-mots en ET**
(chaque terme doit matcher). Barème : titre exact 120 · préfixe 90 · inclus 80 · ancien label 70 ·
description 55 · cas d'usage 50 · mot-clé/synonyme/métier 45 · catégorie 30. Overlay `LIBRARY_KEYWORDS`
+ groupes `BLOCK_SYNONYMS` existants. Exemples validés (tests) : `réserver`→réservation/booking/table ·
`Instagram`→feed/réseaux · `prix`→Tarifs · `CV`→compétences/expérience/documents · `restaurant`→
menu/horaires/réservation · `musique`→albums/concerts/spotify/audio. Résultat **déterministe**.

## Catégories

Les 10 catégories réelles (`BLOCK_CATEGORIES`) conservées, avec compte réel par catégorie.
`orphanBlockTypes` garantit qu'aucun bloc n'est hors catégorie (test). « Essentiels » est rendu via
l'accès rapide **Recommandés** (curaté), pas par un ré-étiquetage des blocs.

## Favoris & Récents

Ops **pures** (`toggleFavorite`, `pushRecentType`, `sanitizeRecents`) réutilisant les **mêmes clés
localStorage** que la coquille. Dans le Builder, l'état reste détenu par `BuilderV4` et passé en
props → **aucune double logique**. Récents bornés à 8, dernier en premier, sans doublon, types
disparus ignorés.

## Recommandations

`recommendedForContext(context)` déterministe (aucune IA, aucun réseau) : `default/pro/creator/
restaurant/event/commerce/music` → listes curées, filtrées aux blocs existants. Testé.

## Premium (affichage uniquement)

Aucun gating par bloc n'existe dans le produit. `PREMIUM_BLOCK_TYPES` est une **sélection produit
statique** servant au **badge** et à l'explication « bloc avancé, offre Pro ». **L'ajout n'est jamais
bloqué** et **aucune logique de quotas n'est touchée** (§16/§31). La carte affiche le badge ; la fiche
détail explique l'intérêt et l'offre.

## Cartes

`BlockLibraryCard` : icône, titre clair, description (2 lignes), cas d'usage, badge premium, bouton
favori. **A11y** : action « Ajouter » et bouton favori sont des **boutons frères** (jamais imbriqués,
défaut corrigé), `aria-pressed` sur le favori, cibles ≥ 44 px sur mobile. Bouton « ⓘ Détails »
(desktop) ouvre la fiche interne.

## Aperçus

Stratégie légère : icône colorée + libellé + description + cas d'usage (pas de rendu des 142 blocs
complets, pas d'iframe/player/requête distante — §15/§23). Un vrai mini-aperçu par bloc pourra
s'ajouter plus tard, catégorie par catégorie.

## Ajout & anti-double

Flux : clic « Ajouter » → `onAdd(type)` (coquille : insère, sélectionne, ouvre l'éditeur, pousse aux
récents). **Anti-double-ajout** : `isDuplicateAdd` ignore un même bloc déclenché < 350 ms (garde dans
`BlockLibrary`). L'insertion entre blocs (`resolveInsertIndex`, bouton `+`) est **préparée dans le
modèle pur** ; le chemin d'ajout en fin de page est livré et fonctionnel (le `+` inter-blocs sur le
canvas relève de la Vague 4).

## Desktop & Mobile

- **Desktop** : overlay dans la colonne gauche (panneau déplié), scroll interne unique, recherche +
  onglets fixes, Escape ferme la fiche détail. Le canvas reste visible.
- **Mobile** : pleine largeur, header + recherche fixes, onglets en scroll horizontal, safe-area
  (top/bottom), une carte par ligne, cibles tactiles ≥ 44 px. **Aucun overflow horizontal** (testé
  portrait 390×844 **et** paysage 844×390).

## Accessibilité

Recherche `type="search"` labellisée · onglets `role="tab"`/`aria-selected` · favori `aria-pressed`
nommé · badge premium textuel (pas un cadenas ambigu) · **aucun bouton imbriqué** · état vide
`role="status"`/`aria-live` · Escape ferme · grille `role="list"`.

## Performance

`useMemo` sur les items/catégories/liste visible (recalcul seulement si favoris/récents/onglet/
requête changent). Aucun rendu de preview complet, aucune requête distante, aucune virtualisation
(non justifiée à 142 items). Recherche O(n) sur 142 items = instantanée.

## Feature flag & rollback

`BUILDER_REDESIGN` (`builderFlags.ts`). **OFF** = bibliothèque legacy inchangée (l'overlay n'est pas
monté). **ON** (`NEXT_PUBLIC_BUILDER_REDESIGN=1`) = nouvelle bibliothèque en overlay sur la colonne
gauche (panneau déplié). Rollback = repasser le flag à OFF. La logique d'ajout/favoris/récents est
**partagée** avec la coquille (pas de duplication).

## Harness

`/e2e-harness/block-library` — **404 en production** (`process.env.NODE_ENV === "production"`),
`force-dynamic`. Monte `BlockLibrary` avec un état favoris/récents **en mémoire** + un journal
d'ajouts (data-attributes) servant d'oracle Playwright, **sans Supabase**.

## Tests

- **Unitaires** (`builderLibrary.test.ts`, 30) : normalisation, correspondances (nom/ancien nom/
  synonyme/métier/cas d'usage), tri, multi-mots, catégories (couverture, 0 orphelin), favoris,
  récents (borne/sanitize), recommandations (déterministe), premium, insertion, anti-double, état vide.
- **Playwright** (`e2e/block-library.spec.ts`, desktop + mobile) : ouverture, recherche, catégorie,
  favori, ajout, récents, état vide, Escape, détail (desktop), plein écran + no-overflow portrait &
  paysage (mobile). Captures attachées.

## Prochaines vagues

Vague 3 — réglages de bloc (sections Contenu…Avancé + mode simple/expert + toolbar contextuelle),
qui consomme `SETTINGS_SECTIONS`/`settingsSectionsForMode` déjà livrés en C01.
