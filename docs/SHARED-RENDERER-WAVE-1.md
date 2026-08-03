# Vague 1 — blocs atomiques simples (B09.4)

Six blocs migrés vers le renderer partagé, **activés** dans `SHARED_RENDERER_BLOCKS`
(total : 9 blocs actifs = 3 pilotes + 6 vague 1). Cases legacy **conservés**, rollback
immédiat (retirer du Set).

## Candidats analysés (≥ 12)

| Bloc | Complexité | Interactivité | Liens | Tracking | Divergence | Niveau | Éligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| divider | très faible | non | non | non | non | 3 | ✅ |
| spacer | très faible | non | non | non | non | 3 | ✅ |
| bio | faible | inline edit | non | non | non | 2 | ✅ |
| skills | faible | non | non | non | non | 3 | ✅ |
| languages | faible | non | non | non | non | 2 | ✅ |
| advantages | faible | non | non | non | non | 2 | ✅ |
| rich_text | faible | inline edit | non | non | **oui** (taille ignorée en public) | — | ❌ |
| quote_block | faible | non | non | non | **oui** (fallback démo éditeur) | — | ❌ |
| founder_message | faible | non | non | non | **oui** (fallbacks « Jean Dupont »…) | — | ❌ |
| visit_counter | faible | non | non | non | **oui** (« 1 234 » figé éditeur vs totalViews public) | — | ❌ |
| section_banner | faible | non | non | non | **oui** (déco = primary éditeur vs c.color public) | — | ❌ |
| certifications | faible | non | non | non | **oui** (icône `<Check>` éditeur absente public) | — | ❌ |

## Six blocs migrés

| Bloc | Raison | Niveau | Risque | Comportement vide | Interactions |
| --- | --- | --- | --- | --- | --- |
| divider | statique, style-map pur | 3 | faible | toujours rendu | aucune |
| spacer | statique, size-map pur | 3 | faible | toujours rendu | aucune |
| bio | texte inline (comme heading) | 2 | faible | `<p>` vide | InlineEditable |
| skills | tags depuis chaîne CSV | 3 | faible | conteneur vide (0 chip) | aucune |
| languages | répéteur 3 champs + fallbacks | 2 | faible | hint éditeur / null public | aucune |
| advantages | liste `adv{i}` | 2 | faible | hint éditeur / null public | aucune |

## Blocs exclus (divergence connue → mission dédiée)

`rich_text` (taille ignorée publiquement), `quote_block`/`founder_message` (fallbacks de
démo divergents), `visit_counter` (compteur figé vs runtime), `section_banner` (couleur de
décoration divergente), `certifications` (icône éditeur en trop). Non corrigés ici (§7/§9).

## Architecture appliquée

`content → modèle pur (models/) → adapter éditeur / adapter public`. Modèles sans
React/Supabase ; adapters reproduisant le JSX legacy **à l'identique** (échelle canvas
préservée). Registres séparés (`editorRegistry`/`publicRegistry`) — aucun symbole éditeur
côté public.

## Tests

- `wave1.test.tsx` : modèles (défauts/filtre/non-mutation) + parité de rendu
  `react-dom/server` (éditeur + public + vide + rempli), valeurs lues du legacy.
- `models.test.ts`, `registry.test.ts`, `bundleBoundary.test.ts`, `architecture.test.ts`
  étendus pour l'état à 9 blocs actifs.
- Suite : 1032 → 1068 verts. Typecheck 0. Build 84/84.

## Rollback

```
Retirer le(s) type(s) de SHARED_RENDERER_BLOCKS (shared-renderer/architecture.ts)
→ resolve*Block renvoie null → `case` legacy exécuté → rendu legacy
→ aucune donnée touchée, aucune migration
```

## QA humaine restante (non effectuée par l'assistant)

Parité **pixel navigateur** des 6 blocs (desktop/tablette/mobile/paysage, éditeur + public,
contenu vide/long, styles perso, inline edit bio). La structure/HTML est prouvée identique
(`renderToStaticMarkup`) ; le rendu runtime doit être confirmé humainement. Rollback prêt.

## Risques résiduels

- Parité pixel/police navigateur non observée (voir ci-dessus).
- `languages`/`advantages` : hint d'état vide éditeur bespoke (non `BlockEmptyState`),
  reproduit à l'identique — à harmoniser dans une future passe si souhaité (hors périmètre).
