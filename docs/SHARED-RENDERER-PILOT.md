# Blocs pilotes du renderer partagé (pour B09.2)

Trois blocs sélectionnés pour valider l'architecture **sans risque** : view models déjà
extraits/testés pour deux d'entre eux (B05/B06), aucun formulaire, aucun appel réseau, aucun
média complexe, aucune divergence connue. Ensemble ils exercent les trois axes les plus
difficiles : coquille + édition inline, état vide + répéteur, et **adapter de lien**.

| Bloc | Justification | Niveau cible | Risque | Critère de succès |
| --- | --- | --- | --- | --- |
| `heading` | Texte simple ; valide la coquille, l'**édition inline** (éditeur) vs texte brut (public) et la variante d'**échelle** canvas (density) | 3 | Faible | Éditeur & public rendent le même texte/sous-titre ; tailles = variante density ; parité sémantique |
| `values` | Répéteur ; view model d'**état vide** déjà pur (`hasPublishableContent`, B05) ; valide filtrage d'items + `emptyHint` (éditeur) vs `null` (public) | 2 | Faible | 0 item → état vide éditeur / `null` public ; ≥1 item → mêmes cartes ; espaces = vide |
| `pricing` | Répéteur + **CTA lien** ; view model `pricingCtaModel` déjà pur (B06) ; valide l'**adapter de lien** (éditeur non navigable vs public `<a>` tracké + `extHref`) | 2 | Standard | CTA visible ssi `cta_label` ; éditeur non navigable ; public href sûr + `trackLinkClick` ; parité |

## Ce que chaque pilote prouve

- **heading** → `SharedView` + `EditorBlockContext` (inline) + `PublicBlockContext` (statique)
  + variante d'échelle (Option A/B) sans changement visuel.
- **values** → view model pur partagé + `BlockEmptyState` contextuel (éditeur) / `null`
  (public) + limites de répéteur.
- **pricing** → capacité `LinkRenderer` (le point le plus délicat) : même vue, comportement
  de lien injecté par l'adapter ; réutilise `pricingCtaModel` (aucune logique dupliquée).

## Contraintes de succès (communes)

1. Statut `pilot` dans le registre, **derrière le flag** `SHARED_RENDERER_BLOCKS` (non activé
   en production en B09.2).
2. Sortie HTML **sémantiquement identique** au legacy (tests de parité verts, validation
   visuelle manuelle).
3. **Rollback** = retirer le type du flag → retour legacy, aucune donnée touchée.
4. Aucun symbole éditeur importé dans le chemin public (test bundle).
5. Le legacy `case` reste présent tant que le pilote n'est pas validé et le legacy retiré
   dans une mission ultérieure.

## État après B09.2 (implémenté)

Infrastructure réelle livrée sous `shared-renderer/` : modèles purs (`models/{heading,values,
pricing}.ts`), adapters éditeur/public par bloc (`blocks/*/`), primitive `BlockEmptyState`,
registres **séparés** `editorRegistry`/`publicRegistry`, flag `SHARED_RENDERER_BLOCKS`.

| Bloc | Infra | Statut | Flag | Tests | Rollback | Legacy |
| --- | --- | --- | --- | --- | --- | --- |
| heading | modèle + 2 adapters | `shared` | **ACTIVÉ (B09.3)** | modèle+registre+bundle+renderParity | retirer du flag | conservé |
| values | modèle + 2 adapters + emptyState | `shared` | **ACTIVÉ (B09.3)** | idem | retirer du flag | conservé |
| pricing | modèle + 2 adapters | `shared` | **ACTIVÉ (B09.3)** | idem + lien/tracking | retirer du flag | conservé |

> **B09.3** : parité prouvée par `renderParity.test.tsx` (HTML statique identique au legacy).
> Flag `SHARED_RENDERER_BLOCKS = {heading, values, pricing}`. Validation pixel navigateur =
> QA humaine restante (voir `docs/SHARED-RENDERER-PILOT-VALIDATION.md`). Rollback immédiat.

- **Câblage** : `builderPreview` appelle `resolveEditorBlock` et `PublicPageClient`
  `resolvePublicBlock` AVANT le switch. `SHARED_RENDERER_BLOCKS` étant **vide**, les deux
  renvoient `null` → les `case` legacy s'exécutent → **zéro changement en production**.
- **Activation (B09.3)** : ajouter `"heading"|"values"|"pricing"` à `SHARED_RENDERER_BLOCKS`,
  APRÈS validation visuelle legacy↔shared. Rollback = retirer le type (aucune donnée touchée).
- **Validation visuelle restante** : NON effectuée (l'assistant ne voit pas le rendu). Les
  adapters reproduisent le JSX legacy à l'identique, mais la parité pixel doit être confirmée
  en navigateur avant activation.
- **Isolation bundle** : `bundleBoundary.test` garantit qu'aucun symbole éditeur
  (`InlineEditable`, adapters éditeur…) n'entre dans le chemin public, et que les modèles sont
  sans React/Supabase.

## Explicitement hors pilotes

Formulaires (`contact_form`…), embeds/médias, `qr_code_block`, et tout bloc listé dans
`KNOWN_DIVERGENCES` / `KNOWN_ORPHAN_FIELDS` (`blockContracts.ts`) — migrés dans des vagues
dédiées après correction éventuelle.
