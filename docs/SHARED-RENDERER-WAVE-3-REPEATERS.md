# Vague 3 — répétiteurs simples (B09.6)

Six répétiteurs migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 21 : 3 pilotes + 6 vague 1
+ 6 vague 2 + 6 vague 3). Cases legacy **conservés**, rollback immédiat, données inchangées.

## Candidats analysés (16)

| Bloc | Items | Limite | État vide | Liens | Divergence | Éligible |
| --- | --- | --- | --- | --- | --- | --- |
| process_steps | `s{i}_title/icon/desc` | 50 | emptyHint / null | non | non | ✅ |
| on_site_services | `s{i}_icon/label` | 50 | emptyHint / null | non | non | ✅ |
| engagements | `e{1..6}` | 6 | emptyHint / null | non | non | ✅ |
| trust_badge | `b{i}_icon/label` | 50 | emptyHint / null | non | non | ✅ |
| stats_block | `s{i}_icon/value/label` | 50 | emptyHint / null | non | non | ✅ |
| event_program | `s{i}_time/title/desc` | 50 | emptyHint / null | non | non | ✅ |
| info_table | `r{i}_label/value` | 50 | emptyHint / null | non | dépend `dayMode` (éditeur) | ⏸️ reporté |
| event_guests | `g{i}_*` | 50 | emptyHint / null | non | grille, à vérifier | ⏸️ |
| lineup | `a{i}_*` | 50 | emptyHint / null | non | headliner styling | ⏸️ |
| business_certifications | `c{i}_name` | 50 | emptyHint / null | non | **oui** (icône `<Check>` éditeur) | ❌ |
| timeline | `e{i}_*` | 50 | emptyHint | non | InlineEditable dense | ⏸️ |
| team | `m{i}_*` | 50 | emptyHint / null | contacts | média (photos) | ⏸️ |
| testimonials | `name{i}/text{i}` | 3 | — | non | à vérifier | ⏸️ |
| documents | `d{i}_*` | 50 | emptyHint / null | url | liens multiples | ⏸️ |
| faq | `q{i}/a{i}` | 8 | emptyHint | liens FAQ | interactif (accordéon) | ⏸️ |
| services_list | — | — | — | — | à vérifier | ⏸️ |

## Six blocs migrés

| Bloc | Structure | Limite | État vide | Niveau | Risque |
| --- | --- | --- | --- | --- | --- |
| process_steps | liste numérotée (InlineEditable) | 50 | emptyHint / null | 2 | faible |
| on_site_services | grille 2 col | 50 | emptyHint / null | 2 | faible |
| engagements | liste (e1..e6) | 6 | emptyHint / null | 2 | faible |
| trust_badge | badges flex-wrap | 50 | emptyHint / null | 2 | faible |
| stats_block | grille 2/3 col | 50 | emptyHint / null | 2 | faible |
| event_program | timeline horaires | 50 | emptyHint / null | 2 | faible |

## Architecture

`content → extractIndexed (pur, filtre métier explicite) → view model (visible =
hasPublishableContent, items, title) → adapter`. **Une seule source de vérité pour le vide** :
`hasPublishableContent` (B05) → `viewModel.visible === hasPublishableContent(type, content)`
(testé). Éditeur : `!visible → BlockEmptyState` (+ « Invisible en ligne tant qu'il est vide »)
sinon items ; public : `items.length===0 → null` sinon items (gates fidèles au legacy).
process_steps conserve `InlineEditable`. Modèles sans React/Supabase/tracking ; registres
séparés (aucun import éditeur côté public).

## Limites

Identiques éditeur/public/shared : engagements = 6 (`e1..e6`), les 5 autres = 50 (`Array.from
{length:50}`). Testé (parité + plafond).

## États vides & fallbacks

Comportement B05 reproduit à l'identique : éditeur `emptyHint`, public `null`. Fallbacks par
item conservés (ex. process_steps numéro `pos+1` si pas d'icône). Aucun item créé depuis un
fallback.

## Registres et flags

Précédemment actifs : 15. Nouveaux : 6. **Total : 21 blocs shared actifs.** 121 blocs legacy.

## Rollback

Retirer le(s) type(s) de `SHARED_RENDERER_BLOCKS` → `resolve*Block` → null → `case` legacy.
Aucune donnée touchée. Testé.

## Tests

`wave3.test.tsx` (21) : modèles (vide/visible=hasPublishableContent/mixte/ordre/limite/
non-mutation), parité éditeur (emptyHint role=note / cartes), parité public (null / items /
compte / styles), **parité de limite** (engagements 6/6). `bundleBoundary` étendu.
Suite : 1105 → 1140 verts. Typecheck 0. Build 84/84.

## QA humaine restante

Parité **pixel navigateur** des 6 répétiteurs (viewports, éditeur/public, 0/1/plusieurs/
limite items, texte long, item partiel, suppression du dernier, ajout via panneau, clavier,
zoom 200 %). Structure/HTML prouvée identique (`renderToStaticMarkup`) ; rendu runtime à
confirmer. Rollback prêt.

## Risques résiduels

- Parité pixel/police navigateur non observée.
- info_table reporté (dépend de `dayMode` éditeur, non exposé au contexte partagé) — à
  traiter en ajoutant `dayMode` au contexte dans une vague ultérieure.
