# Print Studio — Review comparée & roadmap de convergence

## Le vrai problème : DEUX Print Studios coexistent

| | **Ancien** (« QR Print Studio · BÊTA ») | **Nouveau** (« Print Studio ») |
|---|---|---|
| Fichier | `qr-codes/PrintStudio.tsx` (**6304 lignes**, monolithe Fabric.js) | `print-studio/` (guidé, modulaire, design-system) |
| Entrée | Depuis un QR → bouton « Print Studio » (plein écran) | Sidebar « Print Studio » (route dédiée) |
| Modèle | **Canvas libre** façon Canva | **Guidé** « objets, pas outils » |
| Accès | **Starter+** (exports pro = Pro) | **Gratuit** |
| QR | Réutilise le QR existant (jamais créé depuis un lien) | Idem (existant ou PNG) |

**C'est ça, la source de confusion** : deux outils, deux routes, deux niveaux de prix, deux systèmes de
modèles. Il faut **un seul** outil. La bonne nouvelle : ils sont **complémentaires**, pas concurrents.

---

## Comparatif — ce que chacun fait le mieux

### L'ancien (éditeur libre) est le POWERHOUSE créatif
- **Liberté totale** : ajouter / déplacer / redimensionner / tourner n'importe quoi.
- **Bibliothèque énorme** : 24 formes, 41 icônes, décos, cadres, filets, badges, CTA, **22 composants métier**
  (Avis Google, Insta/TikTok, Menu, Wifi, Horaires, Maps, Paiement…).
- **~110 modèles** + 41 fonds + 10 thèmes globaux + générateur métier→objectif.
- **Photos réelles** : recherche Unsplash, fond plein cadre, 6 filtres + 4 réglages continus.
- **UX pro** : aimantation/guides, aligner/répartir, **calques**, **annuler/refaire**, zoom/pan, clavier, tactile.
- **Export vraiment pro** : DPI réglable, PDF **fond perdu + traits de coupe**, **planche N-up**, **SVG avec QR
  vectoriel injecté**, **pré-vol CMYK** (compte les couleurs hors gamut), export **CORS-safe**.
- **Habillage QR** : cadres, pastille « Scannez-moi », couleur/points/coins/ECC avec garde-fou de scannabilité.

### Le nouveau (guidé) est la SÉCURITÉ + la cohérence
- **Infaillible** : on part d'un **support réel** (catalogue), impossible de sortir un fichier raté.
- **Aperçu packshot 3D** fidèle (scène, ombres) — l'ancien montre juste le plat.
- **QR réutilisé** (existant/PNG) + **décliner** un design + **planche multi-supports** + **N-up**.
- **Modèles perso + charte** synchronisés **au compte** et **partagés en équipe** (l'ancien ne partage pas).
- **Export PDF vectoriel** (texte + QR) taille réelle, fond perdu + traits de coupe.
- **Aligné au design system** (palette/accent/police/primitives) + **rendu robuste à tous les ratios**.
- **Gratuit**, mobile-first.

---

## Vision cible : UN outil, deux modes (divulgation progressive)

Un seul Print Studio, sur `/dashboard/print-studio`, avec :

1. **Mode Guidé (défaut, gratuit)** = le nouveau flux actuel. La rampe d'accès infaillible : support réel →
   volets bornés → export prêt imprimeur. 90 % des utilisateurs restent là.
2. **Mode Studio libre (avancé)** = le canvas Fabric de l'ancien, mais **contraint au support choisi**
   (dimensions réelles + fond perdu + marges + pré-vol) : on garde la liberté créative SANS jamais produire
   un fichier raté. Ajouter texte/formes/icônes/images/composants, calques, aimantation.

Le passage Guidé → Libre se fait en un clic (« Personnaliser librement »), en **partant du design guidé**
déjà composé (on n'ouvre pas une page blanche).

---

## Le meilleur de chacun — quoi garder, quoi jeter

**À LEVER de l'ancien vers le nouveau :**
- La **bibliothèque d'éléments** (formes, icônes, filets, badges, CTA, **composants métier**).
- Les **moteurs purs déjà extraits et testés** : `printSupports`, `printPreflight`, `alignDistribute`,
  `qrScannability` (réutilisables tels quels).
- Le **pipeline d'export pro** : DPI, fond perdu normalisé + traits de coupe, planche N-up, **SVG QR-vectoriel**,
  pré-vol CMYK/gamut, export CORS-safe.
- L'**habillage QR** (couleur/points/coins/ECC) via le pattern `regenQr`, avec garde-fou scannabilité.
- Les **photos de fond** (upload + Unsplash + filtres) — le nouveau n'a qu'une photo simple.
- **Plus de formats** dans le catalogue guidé (US Letter, Story, etc. présents dans `printSupports`).

**À JETER :**
- Le **monolithe 6304 lignes** (non maintenable) et ses **4 systèmes de modèles divergents**.
- La **liberté « n'importe quoi n'importe où »** non bornée (elle laisse produire des fichiers non imprimables).
- Le **bug de persistance** : l'API `print-design` ne connaît que 6 formats legacy → les 7 nouveaux sont
  **coercés en « a4 »** à la sauvegarde (mauvaises dimensions au rechargement). **Bug réel à corriger.**

---

## Roadmap phasée

### Décisions produit ACTÉES (2026-08-14)
1. **Entrée unique tout de suite** — l'ancien BÊTA est redirigé vers le nouveau guidé maintenant (mode libre revient en Phase 3).
2. **Tout gratuit** — Guidé + Studio libre + tous les exports gratuits (pas de gating Pro).
3. **RGB haute-déf assumé** — pas de CMYK serveur ; le pré-vol AVERTIT sur le hors-gamut sans bloquer.

### Phase 1 — Trancher la duplication ✅ FAIT (commit à suivre)
- [x] **Une seule entrée** : le bouton « Ouvrir QR Print Studio » (depuis un QR) ouvre le **nouveau** guidé,
      pré-chargé via `?qr=<short_code>` (QR présélectionné dans « Mes QR »). L'ancien éditeur Fabric n'est plus atteignable.
- [x] **Gratuit** : plus de gating sur cette entrée.
- [ ] **Bug de format** `/api/print-design` (`ALLOWED_FORMATS` legacy) : moot tant que l'ancien est débranché ;
      à corriger en Phase 2 quand on rebranche la persistance sur le nouveau.

### Phase 2 — Persistance & photos ✅ FAIT (commits b17b5743 + 5a7ad199)
- [x] **Sauvegarder/rouvrir un design** par QR : `captureDesign`/`restoreDesign` (v2) ; bouton « Enregistrer »
      (en-tête, si QR rattaché via `?qr=` ou « Mes QR ») ; restauration à l'ouverture depuis un QR. Route
      `/api/print-design` étendue au `short_code`. Réutilise `qr_codes.print_design` (dégradé gracieux si absent).
- [x] **Photos de fond Unsplash** : recherche (`/api/unsplash`, orientation calée sur le format) + grille + attribution ;
      import local conservé ; voile de lisibilité auto.
- [ ] **Filtres photo** (N&B/duotone/flou) : reporté (nécessite une couche photo dédiée avec `filter:`).
- [ ] Porter la **bibliothèque d'éléments** (formes/icônes/badges/**composants métier**) → **déplacé en Phase 3**
      (elle a besoin du canvas libre ; elle ne rentre pas dans les emplacements bornés du guidé).

### Phase 3 — Mode « Studio libre » borné (le gros morceau, en tranches)
- [x] **Tranche 1 (commit a57b226f)** : bouton « Édition libre » → vue du support **À PLAT** ; **textes libres
      déplaçables à la souris** (positions en fraction → mêmes coordonnées à l'aperçu 3D et à l'impression) ;
      panneau élément (texte/taille/couleur/alignement/graisse/suppression) ; rendus par `SupportVisual` (packshot +
      planche) et **persistés** (`captureDesign` v2). Pas de Fabric : `FreeEl[]` + drag React (léger, robuste).
- [ ] **Éléments** : icônes (biblio de l'ancien), formes, badges, filets — mêmes `FreeEl` déplaçables.
- [ ] **QR** déplaçable/redimensionnable comme un élément (aujourd'hui piloté par position/décalage).
- [ ] **Calques**, **aimantation/guides**, **aligner/répartir** (réutiliser `alignDistribute` de l'ancien), annuler/refaire.
- [ ] (Le canvas Fabric n'est finalement PAS nécessaire pour la 1re valeur : `FreeEl` + drag suffit et reste borné/robuste.)

### Phase 4 — Export pro unifié
- [ ] Fusionner le pipeline d'export : PDF fond perdu + traits de coupe (déjà fait côté guidé), **SVG QR-vectoriel**,
      **planche N-up** (déjà fait), **pré-vol CMYK/gamut** (moteur `printPreflight` existant).
- [ ] Décision **CMYK réel** = brique serveur (Ghostscript/ICC) — hors navigateur (à ne pas simuler).

### Phase 5 — Retrait de l'ancien
- [ ] Une fois la parité atteinte (éléments + libre + export pro), **supprimer** `qr-codes/PrintStudio.tsx`
      (le monolithe) et ses systèmes de modèles divergents.

---

## Décisions produit à trancher (par le propriétaire)

1. **Gating** : Guidé gratuit + Libre/exports-pro en Pro ? (recommandé — reprend l'ancien, monétise la liberté)
2. **Une seule entrée** : on redirige tout de suite l'ancien vers le nouveau, quitte à perdre temporairement
   le mode libre le temps de la Phase 3 ? Ou on garde les deux jusqu'à parité ?
3. **CMYK** : on investit dans une brique serveur, ou on assume RGB haute-déf (suffisant pour la plupart des
   imprimeurs numériques) ?

Ordre conseillé : **Phase 1 (trancher) → Phase 2 (persistance + éléments) → Phase 3 (libre) → Phase 4 (export) → Phase 5 (nettoyage)**.
À chaque étape : `tsc` 0, tests, build, QA desktop + mobile.
