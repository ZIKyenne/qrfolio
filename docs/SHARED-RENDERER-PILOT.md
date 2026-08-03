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

## Explicitement hors pilotes

Formulaires (`contact_form`…), embeds/médias, `qr_code_block`, et tout bloc listé dans
`KNOWN_DIVERGENCES` / `KNOWN_ORPHAN_FIELDS` (`blockContracts.ts`) — migrés dans des vagues
dédiées après correction éventuelle.
