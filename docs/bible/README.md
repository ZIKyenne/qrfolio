# QROWG PRODUCT BIBLE

> Le référentiel de fond de QRowg : **pourquoi** le produit existe, **comment** il doit se comporter et **à quoi** il doit ressembler. La Bible prime sur les préférences individuelles ; en cas de doute, elle tranche.

## Chapitres

| # | Chapitre | Rôle | Statut |
|---|---|---|---|
| 1 | [La Vision](01-VISION.md) | Mission, promesses, 10 lois, émotions, philosophie | ✅ v1.0 |
| 2 | [Design Philosophy](02-DESIGN-PHILOSOPHY.md) | Langage visuel : tokens, couleur, typo, espacement, composants, mobile, a11y, qualité | ✅ v1.0 |
| 3 | [Motion System](03-MOTION-SYSTEM.md) | Mouvement : durées, easings par rôle, keyframes canoniques `mo-*`, helpers, reduced-motion | ✅ v1.0 (fondation) |
| 4 | *(à venir)* | — | — |

## Principe d'usage

- **La Vision** répond au *pourquoi* : chaque fonctionnalité doit passer le **test ultime** (améliore-t-elle le pont physique↔numérique ?) et renforcer une **émotion cible**.
- **Le Design Philosophy** répond au *comment ça se voit* : il s'ancre dans le système réel du code (`app/globals.css`, `components/mobile/designTokens.ts`) et sert de **référence absolue** pour chaque écran (voir sa *Definition of Done*).

## Règle de synchronisation

La Bible et le code ne doivent **jamais** diverger. Quand un token, un breakpoint ou une primitive évolue dans le code, le chapitre concerné est mis à jour dans le même commit.

## Voir aussi

- [État du projet (audit)](../ETAT_DU_PROJET_2026-08.md) — santé technique, inventaire, risques, roadmap.
