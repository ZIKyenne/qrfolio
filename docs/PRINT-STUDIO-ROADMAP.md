# Print Studio — Roadmap produit

Route : `/dashboard/print-studio` · Code : `apps/web/src/app/dashboard/print-studio/`
(distinct de l'ancien `qr-codes/PrintStudio.tsx` Fabric, encore présent).

## Vision

**« Objets, pas outils ».** On ne dessine pas sur une toile vide : on choisit un **support réel**
(sticker, chevalet, carte, affiche…), on **pose un QR qu'on a déjà**, on ajuste quelques réglages
guidés, et on exporte un **fichier prêt imprimeur**. Impossible de produire un fichier raté.

**Principe directeur : simple par défaut, profond au besoin.**
- Un débutant réussit en 3 gestes (support → QR → exporter) sans rien comprendre au print.
- Un utilisateur avancé a des curseurs, des couleurs, des polices, des modèles — mais rien de tout
  ça ne lui est imposé. La complexité est **optionnelle et repliée**.
- **Gratuit** : Print Studio ne crée pas de QR (il réutilise un QR existant ou un PNG importé), donc
  il ne touche pas aux quotas/abonnements.
- **Zéro fake** : ce que le contrôle affiche (« Prêt à imprimer », tailles en mm) correspond au
  fichier réellement exporté.

## État actuel (fait)

- **Bibliothèque** : 16 supports, filtres **26 métiers × 14 objectifs** (fondu de défilement), vignettes = vrai support miniature (faux QR CSS, pas de moteur).
- **Le QR** : réutiliser un **QR existant** (codes liés à une page + QR instantanés → `/q/<code>` ou payload) **ou importer un PNG**. Pastille (carré/cercle/aucune), taille, position verticale.
- **Textes** : nom, titre, sous-titre, bouton — tous libres ; casse, graisse, **12 polices réellement rendues**, alignement.
- **Allure** : 29 coloris d'ambiance, **8 couleurs d'accent** (override), 9 mises en page.
- **Design** : fond (5 finis : uni/dégradé/grain/rayures/quadrillage), cadre (4), **curseurs** taille du titre / air / placement vertical, arrondi, style de bouton (dont **dégradé**), logo de marque sur l'objet. Bouton **Réinitialiser**.
- **Modèles** : 8 modèles « 1 clic » + **modèles personnels** enregistrés (localStorage).
- **Aperçu** : packshot 3D (scène, ombres, reflet) fidèle, **taille du QR pilotée par la physique** (`qrMm`).
- **Export** : **planche PDF taille réelle** (fond perdu + traits de coupe, `window.print`, montée à la demande) ; QR seul PNG/SVG (source « Mes QR »).
- **Contrôle avant export** : 7 vérifs (fond perdu, marges, DPI, taille QR, contrastes, zone franche), honnête pour les PNG importés.
- **Intégration** : fond du site (particules), entrée sidebar, responsive, gating retiré (gratuit).

## Roadmap (produit plus abouti)

Chaque phase garde la règle : **on n'ajoute de la liberté que si elle reste triviale à ignorer.**

### P1 — Fiabilité & fidélité (finir le socle)
- [ ] **Zone franche réelle** : vérifier le quiet-zone effectivement rendu autour du QR (aujourd'hui codé « ok » en dur), et le garantir dans la planche.
- [ ] **Validation d'un PNG importé** : lire la taille/le ratio de l'image, avertir si trop petit / non carré / faible contraste (au lieu d'un simple « à vérifier »).
- [ ] **QA d'impression réelle** : sortir des PDF de test sur chaque forme (rond, carré, A-series, roll-up) et vérifier taille physique + fond perdu + traits de coupe.
- [ ] **Aperçu « test de scan »** : bouton qui agrandit le QR seul pour le scanner tout de suite depuis un autre téléphone.

### P2 — Liberté maîtrisée (le cœur de la demande)
- [x] Curseurs taille du titre / air / placement vertical.
- [x] Plus de polices (12, réellement rendues).
- [x] **Placement fin du QR en X/Y** (curseurs de décalage, en plus de haut/centre/bas).
- [x] **Curseur taille du QR** en complément des 3 paliers (garde-fou ≥ 20 mm honnête, mm affichés).
- [x] **Couleur par élément** (titre / sous-titre / bouton indépendants) — replié derrière « avancé ».
- [x] **Image de fond** : importer une photo comme fond du support (voile de lisibilité auto).
- [ ] **Encore des polices** : self-héberger 3-4 familles display supplémentaires (condensée, manuscrite, géométrique). **Bloqué : nécessite les fichiers de police (woff2)** — à fournir, puis @font-face dans globals.css + entrées TYPOS.

### P3 — Décliner une campagne (fort levier)
- [x] **Dupliquer un support** vers un autre format en gardant tous les réglages (bouton « Décliner »).
- [x] **Planche multi-supports** : bouton « Planche » → une feuille auto-dimensionnée, N formats à leur taille réelle avec repère de découpe. *(QA d'impression réelle à faire.)*
- [ ] **Export SVG vectoriel** de la planche entière (pas seulement le QR), pour les imprimeurs.

### P4 — Marque & modèles (cohérence)
- [ ] **Brand kit** : mémoriser logo + couleurs + police au niveau du **compte** (pas juste localStorage).
- [ ] **Modèles synchronisés** : passer les modèles personnels de localStorage à une table Supabase (retrouvés sur tous les appareils, partagés en équipe).
- [ ] **Appliquer la charte** en 1 clic à n'importe quel support.

### P5 — Sortie pro (qualité imprimeur)
- [ ] **CMYK / profils colorimétriques** pour l'impression offset.
- [ ] **Gabarits imprimeur** (repères, mentions techniques, préréglages par imprimeur courant).
- [ ] **Commande d'impression** intégrée (optionnel, partenaire) : du design au colis sans quitter l'app.

### Dette technique
- [ ] **Unifier** avec l'ancien `PrintStudio.tsx` Fabric (le retirer une fois la parité atteinte).
- [ ] Nettoyer les exports morts de `states.ts` (`VOLETS`/`ECRANS`/… — vestiges de spec) et `mockup.ts` (`darken`).
- [ ] Aligner la doc de `states.ts` (VOLETS) sur l'UI réelle (logo objet/aucun, bouton plein/dégradé/trait/aucun).

## Ordre conseillé

1. **P1** (fiabilité) — un produit « clef en main » doit d'abord ne jamais sortir un fichier raté.
2. **P2** (liberté maîtrisée) — la demande explicite : plus de curseurs, de polices, de placement.
3. **P3** (décliner) — le plus gros gain d'usage réel pour un commerçant qui fait une campagne.
4. **P4/P5** — montée en gamme.

À chaque étape : `tsc` 0, tests catalog verts, build (guard `check-jsx-imports` + next), QA visuelle desktop **et mobile**.
