# QROWG PRODUCT BIBLE — Chapitre 3 : Motion System

> **Statut :** référence absolue · **Version :** 1.0 (fondation posée, migration en cours)
> Le Motion System est le troisième pilier, aux côtés du **Color System** et du **Spacing System** ([Ch.2](02-DESIGN-PHILOSOPHY.md)). Il applique la **Loi 3** (*chaque animation explique quelque chose — jamais décorer seul*), la **Loi 8** (*les performances font partie du design*) et la **Règle 5** du Master System (*toute animation appartient au Motion System*).
>
> **Sources de vérité :** `apps/web/src/lib/motion.ts` (durées, easings, helpers) + section `MOTION SYSTEM` de `apps/web/src/app/globals.css` (variables `--mo-*`, keyframes `mo-*`, classes `.mo-*`). Côté mobile : `components/mobile/designTokens.ts` (`T.motion` / `T.ease`), aligné.

---

## 1. Pourquoi un système (le constat)

Audit du dépôt (août 2026) avant le système :

- `@keyframes spin` défini **28 fois**, `pulse` **9×**, `fadeUp` **8×** — la même animation recodée sur **46 fichiers**.
- **~90** keyframes distincts, **~20** courbes d'easing différentes (dont la même courbe écrite de 4 façons).
- **255** `animation:` et **390** `transition:` en dur, dispersés.
- Garde `prefers-reduced-motion` dans **15 fichiers** seulement.
- **Bug latent :** les `@keyframes` CSS sont **globaux au document** ; deux `@keyframes pulse` différents injectés via `<style>` **se court-circuitent** (le dernier monté gagne partout).

Un système supprime la duplication, garantit la cohérence perçue et ferme ce bug de collision.

---

## 2. Les durées (`DURATION` / `--mo-*`)

| Rôle | Token JS | Variable CSS | Valeur | Usage |
|---|---|---|---|---|
| Instant | `DURATION.instant` | `--mo-instant` | 80 ms | micro-retour tactile (`:active`) |
| Fast | `DURATION.fast` | `--mo-fast` | 120 ms | hover, petits changements d'état |
| Base | `DURATION.base` | `--mo-base` | 250 ms | transitions d'état standard |
| Sheet | `DURATION.sheet` | `--mo-sheet` | 300 ms | feuilles montantes / overlays |
| Slow | `DURATION.slow` | `--mo-slow` | 400 ms | entrées marquées, séquences |

`fast` / `base` / `sheet` sont **identiques** à `T.motion` (mobile) — un seul rythme sur les deux plateformes. Une animation d'UI qui dépasse `slow` (400 ms) est suspecte (*Loi 8*).

---

## 3. Les easings par rôle (`EASE` / `--mo-ease-*`)

Quatre rôles remplacent les ~20 variantes.

| Rôle | Token | Courbe | Quand |
|---|---|---|---|
| **standard** | `EASE.standard` | `cubic-bezier(.2,.8,.2,1)` | défaut, accél/décél doux (le + fréquent) |
| **entrance** | `EASE.entrance` | `cubic-bezier(.16,1,.3,1)` | arrivées : démarre vite, finit très doux |
| **spring** | `EASE.spring` | `cubic-bezier(.34,1.56,.64,1)` | rebond / overshoot : pop, pastilles, badges |
| **emphasized** | `EASE.emphasized` | `cubic-bezier(.4,0,.2,1)` | sorties / mouvements appuyés (Material) |

> Choisir l'easing par **intention**, pas par goût. `spring` attire l'œil (à réserver aux moments qui doivent réjouir — *émotions* du Ch.1) ; `standard` est le défaut discret.

---

## 4. Les keyframes canoniques (`mo-*`)

Définis **une seule fois** dans `globals.css`, namespace `mo-` (zéro collision) :

| Keyframe | Effet | Remplace |
|---|---|---|
| `mo-spin` | rotation 360° | les 28 `spin` |
| `mo-fade-in` | opacité 0→1 | `fadeIn` |
| `mo-fade-up` | opacité + montée 14px | les 8 `fadeUp` |
| `mo-pop-in` | opacité + scale .94→1 | `popIn` |
| `mo-slide-up` | montée 100% (feuille) | `slideUp`/`sheetUp` |
| `mo-pulse` | opacité 1→.5→1 | `pulse` (variante opacité) |
| `mo-ring` | halo « vivant » (néon) | `ring`/`ringPulse` |

Les animations réellement **spécifiques** (chorégraphie du hero, séquence de l'intro `pi-*`, dessin du QR, Print Studio `ps-*`) restent scopées à leur feature : le système fournit le **vocabulaire commun**, il n'aplatit pas les moments signatures.

---

## 5. Comment animer (ordre de préférence)

1. **Classe utilitaire** (recommandé) — `.mo-spin`, `.mo-fade-in`, `.mo-fade-up`, `.mo-pop-in`, `.mo-pulse`, `.mo-ring`. Reduced-motion géré automatiquement.
   ```tsx
   <div className="mo-fade-up">…</div>
   <Loader className="mo-spin" />
   ```
2. **Variables CSS** dans un `<style>` de feature — `animation: mo-fade-up var(--mo-base) var(--mo-ease-entrance) backwards;`
3. **Helpers JS** pour le style inline — `import { anim, transition } from "@/lib/motion"`
   ```tsx
   style={{ animation: anim("mo-pop-in", "slow", "spring") }}
   style={{ transition: transition(["transform","opacity"], "fast") }}
   ```

**Ne jamais** : écrire une durée en ms ou une `cubic-bezier(...)` en dur hors du système.

---

## 6. Accessibilité (obligatoire)

- Les classes `.mo-*` **coupent** l'animation sous `@media (prefers-reduced-motion: reduce)` et posent l'état final (opacité 1, pas de transform) — rien ne « saute ».
- Toute animation hors classes utilitaires **doit** fournir son fallback reduced-motion dans le même bloc.
- Une animation ne doit jamais être le **seul** vecteur d'une information (cf. Ch.2 §11).

---

## 7. Do / Don't

- ✅ `className="mo-fade-up"` pour l'entrée d'une carte.
- ✅ `anim("mo-spin", "fast", "standard", "infinite")` pour un loader inline.
- ✅ `spring` sur un badge « premium » qui doit réjouir ; `standard` partout ailleurs.
- ❌ Redéfinir `@keyframes spin` dans un composant (utiliser `mo-spin`).
- ❌ `transition: all .3s ease` générique (passer par `transition()` + rôle).
- ❌ Animation > 400 ms sur de l'UII, ou animation purement décorative (*Loi 3*).
- ❌ Deux `@keyframes` homonymes divergents (collision globale).

---

## 8. État de la migration

**Nuance importante (portée réelle des collisions) :** sous Next App Router, les
`<style>` par page sont montés/démontés **par route** (exclusifs). Les keyframes
homonymes de deux pages différentes ne co-existent donc quasiment jamais dans le
DOM au même instant — le « bug de collision » est surtout **latent**. Il ne mord
vraiment qu'entre composants **co-montés sur une même vue**, ou face à un keyframe
**global** (ex. `shimmer` du `.skeleton` dans `globals.css`). On corrige donc en
priorité ces cas-là, et on **ne normalise jamais un corps d'animation à l'aveugle**
(un `fadeUp` de 20px vs 14px = ressenti différent → changement visible → QA requis).

- ✅ **Phase 1 (faite)** — fondation additive : `lib/motion.ts` (+ test), section
  `globals.css`, ce chapitre. Zéro régression (rien ne référençait encore `mo-*`).
- ✅ **Phase 2a (faite)** — hygiène sûre, iso-comportement :
  - `fadeIn` renommé `profileFadeIn` / `tplFadeIn` (deux corps radicalement
    différents : translateY vs scale) ;
  - `shimmer` local de la landing renommé `heroShimmer` (translateX) pour ne plus
    masquer le `shimmer` **global** du skeleton (background-position) ;
  - `fadeUp` **au corps identique** au canonique (14px) migré vers `mo-fade-up`
    (Dashboard, Analytics) — première adoption réelle du système.
- 🔎 **Phase 2b (par écran, avec QA visuel)** — adopter `mo-*` / classes `.mo-*`
  sur les écrans **quand on les retouche** (ou lors d'une passe QA), en normalisant
  alors les corps divergents (fadeUp 10/16/20px, variantes de `pulse`) vers le
  canonique. Jamais en masse à l'aveugle.
- 🔎 **Phase 3 (avec QA visuel)** — remplacer les ~20 easings par les 4 rôles ;
  c'est un **changement de ressenti**, donc validé à l'œil, pas en aveugle.

**Règle d'or de cette migration :** un renommage (déf + tous les usages du même
fichier, via remplacement complet) est iso-comportement et sûr ; **normaliser un
corps** (distance, opacité, easing) est un changement visible → il passe par une
vérification visuelle.

> Règle de synchro (Ch. commun) : toute évolution de `motion.ts`/`globals.css` met
> ce chapitre à jour dans le même commit. La Bible et le code ne divergent jamais.
