# Vague 4 — répétiteurs & blocs métier intermédiaires (B09.7)

Six blocs migrés et **activés** (`SHARED_RENDERER_BLOCKS` = 27 : 3 pilotes + 6 vague 1 + 6
vague 2 + 6 vague 3 + 6 vague 4). Cases legacy **conservés**, rollback immédiat, données
inchangées. Objectif de la vague : sortir des répétiteurs « atomiques » (vague 3) pour des
blocs **métier** couvrant plusieurs familles de rendu.

## Candidats analysés (18)

| Bloc | Famille | Items | Limite | État vide (éditeur/public) | Média/lien | Divergence | Éligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| testimonials | preuve sociale | `name{i}/text{i}/stars{i}` | 3 | conteneur / null | non | non | ✅ |
| business_stats | stats | `stat{i}_icon/value/label` | 50 | conteneur / null | non | non | ✅ |
| brands | clients/marques | `brand{i}_icon/name` | 50 | conteneur / null | non | non | ✅ |
| lineup | event | `a{1..4}_name/stage/time/headliner` | 4 | emptyHint / null | non | non | ✅ |
| reassurance | services/preuve | `g{i}_icon/label/desc` | 50 | conteneur / null | non | non | ✅ |
| timeline | parcours | `e{i}_date/title/desc/icon` | 50 | emptyHint (sans note) / null | non | non | ✅ |
| partners | clients | `logo{i}_img/name` | 50 | **6 « Logo » fantômes** / grid | image | **oui** (démo si vide) | ❌ |
| event_guests | event/personnes | `g{i}_photo/name/role/desc` | 50 | emptyHint / null | **photo (SmartImage)** | média | ⏸️ reporté |
| team | personnes | `m{i}_*` | 50 | emptyHint / null | photos + contacts | média | ⏸️ |
| business_certifications | services | `c{i}_name` | 50 | emptyHint / null | non | **oui** (icône `<Check>` éditeur) | ❌ |
| info_table | info | `r{i}_label/value` | 50 | emptyHint / null | non | **oui** (dépend `dayMode` éditeur) | ⏸️ |
| documents | info | `d{i}_*` | 50 | emptyHint / null | **liens fichiers** | liens multiples | ⏸️ |
| faq | info | `q{i}/a{i}` | 8 | emptyHint | interactif | **accordéon interactif** | ⏸️ |
| two_columns | layout | `col{1,2}_*` | 2 | — / null | non | à revérifier | ⏸️ |
| discography | music | `d{i}_*` | 50 | — | **covers + liens** | média | ⏸️ |
| concerts | music | `c{i}_*` | 50 | — | liens billetterie | liens | ⏸️ |
| multi_contact | business | `c{i}_*` | 50 | — | liens tel/mail | liens | ⏸️ |
| google_reviews_block | commerce | `r{i}_*` + moyenne | 50 | conditionnel (avg) | `StarRow` composant | logique moyenne | ⏸️ |

## Six blocs migrés

| Bloc | Famille | Structure | Limite | État vide | Édition inline | Risque |
| --- | --- | --- | --- | --- | --- | --- |
| testimonials | preuve sociale | cartes avis (nom/étoiles/texte) | 3 | conteneur / null | oui (nom + texte) | faible |
| business_stats | stats | grille 2/3 col (icône/valeur/label) | 50 | conteneur / null | non | faible |
| brands | clients/marques | chips flex-wrap (icône/nom) | 50 | conteneur / null | non | faible |
| lineup | event | liste (nom/scène/heure + HEADLINER) | 4 | emptyHint / null | non | faible |
| reassurance | services | grille 2 col (icône/label/desc) | 50 | conteneur / null | non | faible |
| timeline | parcours | timeline verticale/horizontale | 50 | emptyHint / null | oui (date/titre/desc) | moyen |

**Six familles distinctes** représentées : preuve sociale, stats, clients/marques, event,
services, parcours (≥ 3 exigées).

## Fidélité au legacy — points d'attention

- **État vide asymétrique.** `testimonials`, `business_stats`, `brands`, `reassurance` n'ont
  **pas** d'état vide éditeur en legacy : ils rendent un **conteneur (grille/flex) vide**.
  Reproduit fidèlement (pas de `BlockEmptyState` injecté). Côté public : `null` si vide.
- **`lineup`** est dans `DETECTORS` (B05) → `visible = hasPublishableContent("lineup")`
  (éditeur `emptyHint` + note « Invisible… »), public `null` si aucun artiste.
- **`timeline`** n'est **pas** dans `DETECTORS` → `visible = items.length > 0`. Son `emptyHint`
  legacy **n'a pas** de sous-note « Invisible… » (contrairement à la vague 3) et la marge du
  titre diffère (12 px état vide / 14 px état rempli) : reproduit à l'identique. Deux
  dispositions (`layout === "Horizontale"` sinon verticale) reproduites des deux côtés.
- **Styles éditeur ≠ public** (rayons, paddings, tailles de police) : chaque adapter reproduit
  **son propre** legacy (ex. business_stats radius 12/pad 14×10 en éditeur, 13/16×10 en public).
  Ce n'est pas une divergence de contenu mais l'écart intrinsèque des deux renderers historiques.
- **Fallbacks par item** conservés : étoiles `parseInt(stars||"5")`, icône `✅` (reassurance),
  puce `•` (timeline sans icône), `HEADLINER` si `headliner==="yes"`.

## Exclusions

- **partners** ❌ : affiche 6 cartes « Logo » fantômes quand vide (illusion de démo, contraire à
  B05). Ne pas migrer sans corriger d'abord.
- **business_certifications** ❌ : icône `<Check>` (lucide) en éditeur absente en public.
- **info_table** ⏸️ : le rendu éditeur dépend de `dayMode` (non exposé au contexte partagé).
  À traiter en ajoutant une capacité `dayMode`/`appearanceMode` au contexte dans une vague
  ultérieure — **non** ajoutée ici (un seul bloc concerné → pas assez générique, cf. consigne).
- **event_guests / team / documents / discography / concerts / multi_contact** ⏸️ : médias
  (photos via `SmartImage`) ou liens multiples → réservés aux vagues média/commerce.
- **faq** ⏸️ : accordéon interactif.

## Architecture

`content → extractIndexed (pur, filtre métier explicite) → view model (visible, items, title,
+ horizontal pour timeline) → adapter`. Modèles sans React/Supabase/tracking. Registres séparés
(`editorRegistry`/`publicRegistry`) → aucun symbole éditeur (dont `InlineEditable`) n'entre dans
le bundle public (vérifié par `bundleBoundary.test`). `lineup` importe `hasPublishableContent`
(logique pure) pour aligner son `visible` sur `DETECTORS`.

## Limites

Identiques éditeur/public/shared : testimonials = 3 (`name1..3`), lineup = 4 (`a1..a4`), les 4
autres = 50. Testé (parité de plafond des deux côtés pour testimonials et lineup).

## Registres et flags

Précédemment actifs : 21. Nouveaux : 6. **Total : 27 blocs shared actifs.** 115 blocs legacy.

## Rollback

Retirer le(s) type(s) de `SHARED_RENDERER_BLOCKS` → `resolve*Block` → null → `case` legacy.
Aucune donnée touchée. Testé.

## Tests

`wave4.test.tsx` (30) : modèles (vide/rempli, index `i` conservé, filtres métier, layout
timeline, trim d'icône, limites 3/4/50, non-mutation) ; parité éditeur (état vide lineup avec
note / timeline sans note ; conteneur nu pour les 4 sans état vide ; contenu des 6) ; parité
public (null si vide / items ; étoiles par défaut ; badge HEADLINER ; icône ✅ ; scroll-snap
horizontal) ; parité de limite éditeur/public (testimonials 3, lineup 4). `architecture.test`,
`registry.test`, `bundleBoundary.test` étendus à 27. Suite : 1182 verts. Typecheck 0. Build 84/84.

## QA humaine restante

Parité **pixel navigateur** des 6 blocs (viewports, éditeur/public, 0/1/plusieurs/limite items,
texte long, item partiel, timeline horizontale vs verticale, dernier point « success »,
suppression du dernier item, ajout via panneau, clavier, zoom 200 %). Structure/HTML prouvée
identique (`renderToStaticMarkup`) ; rendu runtime à confirmer. Rollback prêt.

## Risques résiduels

- Parité pixel/police navigateur non observée (limite structurelle de l'agent).
- `timeline` (2 dispositions + `InlineEditable` dense) = le bloc le plus riche de la vague :
  à surveiller en priorité lors de la QA visuelle.
- `info_table` toujours reporté (dépend de `dayMode`) — capacité de contexte à concevoir
  proprement (plusieurs blocs concernés) avant migration.
