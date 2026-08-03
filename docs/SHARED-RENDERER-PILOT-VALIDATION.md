# Validation des blocs pilotes — legacy ↔ shared (B09.3)

Statut : **3 pilotes activés** (`heading`, `values`, `pricing`) dans `SHARED_RENDERER_BLOCKS`.
Les `case` legacy sont **conservés** (rollback immédiat).

## Méthode de validation (honnête)

L'assistant n'a **pas** de vision d'un rendu navigateur. La validation repose donc sur une
comparaison **objective et déterministe**, plus fiable qu'un « eyeballing » pour la parité
structurelle :

1. **Parité de rendu HTML** (`renderParity.test.tsx`) : les adapters shared sont rendus en
   HTML statique via `react-dom/server` (sans jsdom, sans dépendance ajoutée). Les valeurs
   asserées (padding, border-radius, font-size, couleurs, texte, `href`, `aria-disabled`,
   `null` si vide) sont lues **indépendamment** dans le source legacy → un écart de copie
   adapter↔legacy fait échouer un test.
2. **Parité de modèle** (`models.test.ts`) : les modèles purs produisent les mêmes données
   que la logique legacy (filtres, visibilité, CTA, limites, non-mutation).
3. **Isolation de bundle** (`bundleBoundary.test.ts`) : aucun symbole éditeur côté public,
   modèles sans React/Supabase.
4. **Build + suite complète** : 84/84 pages, 1032 tests verts, typecheck 0 erreur.

## Ce qui EST prouvé (déterministe)

| Axe | heading | values | pricing |
| --- | --- | --- | --- |
| Structure HTML (tags, hiérarchie) | ✅ | ✅ | ✅ |
| Styles (padding/radius/taille/couleur) = legacy | ✅ | ✅ | ✅ |
| Textes / fallback | ✅ (« Titre ») | ✅ | ✅ |
| Échelle éditeur (canvas) vs public | ✅ (20 vs 24) | ✅ | ✅ |
| État vide | — (jamais vide) | ✅ (emptyHint / null) | ✅ (null public) |
| CTA éditeur non navigable (`aria-disabled`, pas de `<a>`) | — | — | ✅ |
| CTA public `<a>` + `href` sûr (extHref) + `javascript:` neutralisé | — | — | ✅ |
| Tracking public injecté / jamais en éditeur | — | — | ✅ |
| Édition inline préservée (éditeur) | ✅ (InlineEditable) | ✅ | — |

## Ce qui RESTE à valider humainement (non bloquant pour l'activation)

La parité **pixel navigateur** n'a pas pu être observée par l'assistant. Restent à vérifier
par un humain dans un vrai navigateur (tolérances §8 : antialiasing, sous-pixel, rendu de
police) :

- viewports desktop (1440/1280/1024), tablette (768/1024), mobile (390/375/360/320) et
  paysage — la grille responsive est identique par construction (mêmes styles inline), mais
  le rendu runtime doit être confirmé ;
- édition inline en conditions réelles (focus, curseur, reflow) ;
- tracking public réel (un seul événement, mêmes pageId/blockId/URL) ;
- zoom 200 %, navigation clavier.

Ces points ne modifient pas la structure/HTML (déjà prouvée identique) ; en cas d'anomalie,
le **rollback** est immédiat.

## Rollback (testé)

```
Retirer le type de SHARED_RENDERER_BLOCKS (shared-renderer/architecture.ts)
→ resolve*Block renvoie null → `case` legacy exécuté → rendu legacy restauré
→ aucun build de données, aucune migration, aucune perte
```
Vérifié par `registry.test.ts` / `architecture.test.ts` (bascule via set vide/custom).

## Différences trouvées / corrections

Aucune divergence détectée entre les adapters shared et le legacy : les 16 assertions de
parité de rendu passent du premier coup (les adapters avaient été écrits comme reproductions
littérales en B09.2). Aucune correction de style n'a été nécessaire.

## Risques résiduels

- Parité pixel/police non observée (voir ci-dessus) → QA humaine recommandée, rollback prêt.
- Rendu React réel non testé unitairement au-delà du HTML statique (pas de jsdom).
