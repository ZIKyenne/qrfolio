# QROWG PRODUCT BIBLE — Chapitre 2 : Design Philosophy

> **Statut :** référence absolue · **Version :** 1.0
> Ce chapitre définit le **langage visuel** de QRowg. Il traduit la [Vision](01-VISION.md) en règles concrètes, ancrées dans le système réel du code (`app/globals.css` pour le web, `components/mobile/designTokens.ts` pour le mobile). **Tout écran et tout composant doivent s'y conformer.**
>
> Règle d'or transverse : **on ne code jamais une valeur arbitraire (couleur, espacement, rayon, durée).** On réutilise un token. Un hex ou un `padding` inventé est un bug de design.

---

## 0. Le principe directeur, traduit en design

> **Invisible quand c'est simple. Infiniment puissant quand c'est nécessaire.**

En pratique :

- **Par défaut, on montre le minimum.** Les réglages avancés existent mais sont repliés (accordéons, modes Simple / Intermédiaire / Expert, panneaux).
- **La complexité est progressive.** Un écran ne dévoile sa puissance qu'à mesure que l'utilisateur la demande.
- **Le vide est un choix, pas un manque.** L'espace négatif porte l'élégance ; on ne le remplit pas « parce qu'il reste de la place ».

Les 10 Lois de la Vision sont rappelées ici quand elles gouvernent une règle : *(Loi n)*.

---

## 1. Fondations — les tokens sont la seule source de vérité

Deux sources, une seule intention :

| Contexte | Fichier | Forme |
|---|---|---|
| Web / desktop | `apps/web/src/app/globals.css` (`:root`) | variables CSS (`var(--…)`) |
| Mobile (primitives) | `apps/web/src/components/mobile/designTokens.ts` (`T`) | objet TS pur + `tokensCss()` |

**Règles :**
- Réutiliser un token existant **avant** d'en créer un nouveau.
- Un nouveau besoin récurrent → on ajoute un token, on ne dissémine pas des hex.
- Les tokens mobile (`T`) sont **testés** (`designTokens.test.ts` : échelle d'espacement croissante, rayons croissants). Ne pas casser ces invariants.
- Contexte particulier où `var()` ne fonctionne pas (canvas `fabric`, `satori`, emails, QR) : on conserve les **hex bruts équivalents** aux tokens (ne pas y injecter `var()`).

---

## 2. Couleur

### 2.1 Palette de base (web — `globals.css`)

| Rôle | Token | Valeur | Usage |
|---|---|---|---|
| Fond | `--bg` | `#080808` | fond global, `<html>`/`<body>` (anti-frame-blanche) |
| Surface | `--surface` | `#111009` | cartes, panneaux, champs |
| Accent / Or | `--gold` = `--accent` | `#C9A84C` | marque, CTA primaire, éléments premium |
| Or clair | `--gold-light` | `#E8C96A` | dégradés, survols, éclats |
| Néon | `--neon` | `#39FF8F` | signal « vivant » (live, en ligne) |
| Encre | `--ink` | `#F5F0E8` | texte principal |
| Atténué | `--muted` | `#8A8478` | texte secondaire, labels |
| Estompé | `--faint` | `#4A4640` | bordures discrètes, désactivé |

> **L'accent est piloté par l'utilisateur** (`--accent`, hook `useAccent`, défini dans le profil ; défaut = or). Tout composant « accent » doit lire `var(--accent)`, **jamais** `#C9A84C` en dur — sinon la personnalisation de marque casse.

### 2.2 Palette sémantique canonique — *un rôle = une couleur, partout*

| Rôle | Token | Valeur | Signifie |
|---|---|---|---|
| Action | `--action` (+`-bg`,`-border`) | `#38BDF8` | liens / CTA secondaires / cliquable neutre |
| Premium | `--premium` | `= --accent` | offres payantes, badges plan, mise en avant |
| Succès | `--success` (+`-bg`,`-border`) | `#39FF8F` | validé, **actif**, en ligne |
| Alerte | `--warning` (+`-bg`,`-border`) | `#FBBF24` | en attente, **en pause**, à activer |
| Danger | `--danger` (+`-bg`,`-border`) | `#FF6B6B` | suppression, erreur, limite atteinte |
| Neutre / contenu | gris (`--muted`/`--faint`) | — | brouillon, non publié |

Cette grammaire est **déjà** celle du produit (ex. statut QR : vert = actif, ambre = en pause, gris/rouge = brouillon). **Ne jamais** utiliser le vert pour autre chose que « ça va / c'est actif », ni le rouge pour un accent décoratif.

**Do / Don't**
- ✅ `background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger)` pour une alerte de suppression.
- ❌ Un bouton « Supprimer » en or (l'or = premium/CTA positif, pas destruction).
- ❌ Trois verts différents sur un écran : il n'y a qu'**un** vert.

### 2.3 Écran = référence

L'écran **Messages** est la référence d'application des tokens sémantiques. La migration token-par-token se fait écran par écran ; tout nouvel écran naît déjà tokenisé.

---

## 3. Typographie

Polices **auto-hébergées** (`@font-face`, `font-display: swap`) — aucune requête CDN (perf + fiabilité, *Loi 8*).

| Rôle | Police | Usage |
|---|---|---|
| Display | **Fraunces** (serif) | titres de section, chiffres héros, moments « waouh » |
| Texte | **Inter** | corps, UI, labels, boutons (police par défaut de `<body>`) |
| Mono | **JetBrains Mono** | codes courts (`/q/xxxx`), valeurs techniques, clés API |
| Legacy | DM Sans | alias historique — ne plus l'introduire dans du neuf |

**Règles :**
- **Un titre = Fraunces.** Le contraste serif/sans-serif porte l'élégance premium.
- Corps toujours Inter, taille ≥ 13 px sur mobile (lisibilité).
- Chiffres alignés (colonnes de stats, tableaux) : `font-variant-numeric: tabular-nums`.
- Titres longs : `text-wrap: balance`. Largeur de lecture confortable (~60–70 caractères) sur les paragraphes.
- Hiérarchie par **taille + poids + couleur**, jamais par soulignement décoratif.

---

## 4. Espacement & grille

Échelle **base 4 / rythme 8** (`T.space`) — source unique :

`xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32`

**Règles :**
- Tout `gap`/`padding`/`margin` sort de cette échelle. Pas de `padding: 13px` ou `7px` inventé (*cohérence, Loi 8*).
- **Le layout porte l'espacement**, pas les marges par élément : `display:flex/grid` + `gap`. On évite les marges qui se cumulent ou s'annulent.
- Conteneur de contenu centré : `max-width: 1100px; margin: 0 auto`. Le contenu ne s'étale jamais sur toute la largeur d'un grand écran.
- **Rien ne déborde horizontalement.** Le corps de page ne scrolle jamais latéralement ; un contenu large (tableau, graphe) scrolle dans **son propre** conteneur (`overflow-x:auto`) ou se réagence en 1 colonne sur mobile.

---

## 5. Rayons, bordures, élévations

**Rayons** (`T.radius`) : `sm 10 · md 14 · lg 20 · xl 26 · pill 999`.
- Champs / petits éléments : `sm`–`md`. Cartes : `md`–`lg`. Feuilles / grands blocs : `lg`–`xl`. Pastilles / badges : `pill`.

**Bordures :** discrètes. `1px solid rgba(255,255,255,0.06–0.09)` (`--qf-line`) sur fond sombre ; bordure d'accent = `var(--gold-border)`.

**Élévations** (`T.elevation`, 4 niveaux) — l'ombre encode la **hauteur**, donc l'importance :
- `0` aucune (éléments à plat) · `1` `0 4px 14px rgba(0,0,0,.25)` (cartes) · `2` `0 12px 34px rgba(0,0,0,.45)` (survol, popovers) · `3` `0 -20px 60px rgba(0,0,0,.5)` (feuilles montantes).
- Une carte au survol monte d'un niveau (`translateY(-3px)` + élévation supérieure) — le retour visuel dit « cliquable » (*Loi 2*).

---

## 6. Hiérarchie & densité de l'information

*(Lois 1, 4, 9 — « montrer moins, tactile plus grand, Simple/Expert séparés ».)*

- **Une action primaire par écran.** Un seul bouton dominant (or plein). Le reste est secondaire (contour) ou tertiaire (texte).
- **Le résumé avant le détail.** On surface d'abord le chiffre qui compte (scans, vues, CTR), le détail vient au scroll ou au clic.
- **Modes de complexité explicites** : *Simple / Intermédiaire / Expert* (déjà dans QR Studio). Le mode Simple ne montre **que** l'essentiel ; l'Expert débloque tout, sans jamais gêner le débutant.
- **Densité mobile réduite volontairement.** Sur téléphone on retire les KPI/ filtres redondants (désencombrement) : montrer moins, cibles plus grandes.
- **Les données conduisent à une décision** (*Loi 9*) : à côté d'un chiffre, proposer l'action (« pic d'activité vers 17 h → publiez vos posts à 17 h »). Un tableau de bord qui informe sans orienter est incomplet.

---

## 7. Mouvement & micro-interactions

*(Loi 3 : chaque animation explique quelque chose — jamais décorer seul.)*

**Durées** (`T.motion`) : `fast 120ms` (feedback tactile, hover), `base 250ms` (transitions d'état), `sheet 300ms` (feuilles). **Ease** unique : `cubic-bezier(.2,.85,.25,1)`.

**Règles :**
- Une animation doit **communiquer** : d'où vient l'élément, ce qui a changé, où regarder.
- Pas d'animation « gratuite » qui rallonge l'attente : la vitesse fait partie du design (*Loi 8*). Une entrée > 300 ms sur un élément d'UI est suspecte.
- `@media (prefers-reduced-motion: reduce)` **obligatoirement** respecté (déjà en place : `seam-beam`, intro… se coupent). Toute nouvelle animation prévoit son fallback réduit.
- L'animation d'entrée de page (feature Pro+) illustre la règle : elle **présente** la marque puis laisse ≥ 1 s de contenu stable, sans frame blanche au scan.

---

## 8. Composants & patterns (réutiliser, ne pas réinventer)

Le produit a déjà ses primitives. On les réutilise.

| Besoin | Composant / pattern | Règle |
|---|---|---|
| Panneau montant mobile | `components/mobile/BottomSheet` | tout choix contextuel mobile passe par une feuille, pas un modal desktop rétréci |
| Navigation mobile | `components/mobile/MobileDock` | 5 entrées max, bouton central « Créer », safe-area |
| Retour d'action | `components/Toast` | succès / erreur ; **toute** action distante donne un toast (*Loi 2*) |
| Image | `components/SmartImage` | jamais un `<img>` nu (perf, placeholder) |
| État vide | encart pédagogique | un écran vide **enseigne** l'étape suivante (ex. Analytics « Bientôt vos données ») — jamais un vide muet |
| Prochaine étape | `NextStepCard` | guide non intrusif vers la complétion du profil |
| Ambiance | `Particles` | discret, derrière le contenu, `prefers-reduced-motion` respecté |

**Anatomie d'une carte standard :** `background: var(--surface)` · bordure `1px` discrète · rayon `md`/`lg` · padding de l'échelle (`lg`/`xxl`) · élévation `1` · titre Fraunces + contenu Inter.

**Onglets / tabs :** état actif = fond `accent 14%` + soulignement `3px` accent + texte accent/gras ; inactif = texte `muted`. (Barre d'onglets du panneau QR Studio = référence.)

---

## 9. Mobile-first & responsive

*(Loi 7 : le mobile est une expérience complète, pas une adaptation.)*

- **Détection :** hook `useIsMobile(bp)` (inline). Breakpoints réels du produit : `1024` (builder mono-panneau), `859` (QR Studio grille empilée), `820`, `760`, `600`… Choisir le breakpoint au comportement, pas au hasard.
- **Cible tactile :** minimum `T.tap = 46px` (> 44 Apple/Google). Utiliser `clampTap()`. Aucun élément interactif sous ce seuil sur mobile.
- **Empilement (z-index) unique** (`T.z`) : `ctx 25 · dock 30 · scrim 40 · sheet 45 · toast 80 · gate 90`. Ne jamais inventer un z-index ; réutiliser l'échelle.
- **Chrome mobile** légèrement plus profond que le web (`--qf-bg #0C0C0E`, `--qf-chrome #141417`) pour l'immersion sombre premium.
- **Safe-area** systématique (`env(safe-area-inset-*)`) sur les barres fixes.
- **Un panneau à la fois** sur petit écran (le builder passe mono-panneau avec barre d'onglets < 1024).
- **Zéro débordement horizontal** : la page ne se « balance » que verticalement.

---

## 10. États & feedback

Tout composant qui charge des données prévoit **quatre** états — jamais seulement le cas nominal :

1. **Chargement** — squelette / spinner discret, jamais un écran figé.
2. **Vide** — encart pédagogique qui explique quoi faire (*Loi 1*).
3. **Erreur** — message clair et **actionnable** (« Modification impossible : mettez un QR en pause pour en activer un autre »), pas de `catch {}` silencieux.
4. **Succès** — confirmation visible immédiate (toast, changement d'état à l'écran) (*Loi 2*).

**Optimistic UI** quand c'est sûr : l'état se met à jour tout de suite, on réconcilie avec le serveur ; en cas d'échec, on revient en arrière **et on prévient**.

---

## 11. Accessibilité (non négociable)

- **Contraste** : texte principal `--ink` sur `--bg`/`--surface` ; ne pas descendre `--muted` sous un ratio lisible pour du texte porteur d'information.
- **Focus visible** sur tout élément clavier (les inputs ont déjà un focus accent ; l'étendre aux boutons/onglets).
- **Cibles** ≥ 46 px sur mobile.
- **Reduced-motion** respecté partout.
- Helpers dédiés dans `lib/a11y.ts` — les utiliser.
- La couleur ne porte jamais **seule** l'information (statut = couleur **+** libellé : « • Actif », « • En pause »).

---

## 12. Performance perçue = design (*Loi 8*)

- **Anti-frame-blanche** : fond sombre posé dès le HTML (`html,body { background:#080808 }`), la page publique surcharge sa couleur avant le 1er paint.
- **Images** via `SmartImage` (placeholder, dimensions, chargement maîtrisé).
- **Polices** auto-hébergées + `swap` (pas de FOIT, pas de dépendance réseau).
- **Réponse immédiate** : toute action importante confirme en < 100 ms perçues (optimistic + toast).
- Budget : une interaction qui « rame » est un défaut visuel, pas seulement technique.

---

## 13. Voix & ton

- **Français, vouvoiement**, ton professionnel et chaleureux (jamais familier ni robotique).
- **Nommer côté utilisateur** : « QR en pause », pas « status=paused ».
- **Verbes d'action** sur les boutons ; le libellé dit exactement ce qui va se passer, le toast confirme au passé (« Publié »).
- **Messages d'erreur** : ce qui a échoué + comment corriger. Ni excuse vague, ni jargon.
- **Règle anti-faux** absolue : **aucun** chiffre, avis ou note inventés (landing incluse). La confiance est un actif (*Loi 6*).

---

## 14. Definition of Done — checklist par écran

Un écran n'est « fini » que si :

- [ ] Couleurs = tokens (`var(--…)` / `T.color`), zéro hex arbitraire ; accent lu via `var(--accent)`.
- [ ] Sémantique respectée (action/premium/succès/alerte/danger).
- [ ] Espacements sur l'échelle base-4 ; layout en flex/grid + `gap`.
- [ ] Titres Fraunces, corps Inter, chiffres `tabular-nums`.
- [ ] Rayons/élévations depuis les tokens ; une seule action primaire.
- [ ] 4 états gérés (chargement / vide / erreur actionnable / succès visible).
- [ ] Mobile complet : `useIsMobile`, cibles ≥ 46 px, z-index de l'échelle, safe-area, **zéro débordement horizontal**.
- [ ] Animations utiles (`T.motion`/ease), `prefers-reduced-motion` géré.
- [ ] A11y : focus visible, contraste, statut = couleur **+** texte.
- [ ] Perf : `SmartImage`, pas de flash, réponse immédiate.
- [ ] Le **test ultime** (Ch. 1) : cet écran renforce-t-il une émotion cible et sert-il le pont physique↔numérique ?

---

## 15. Anti-patterns (à bannir)

- Hex/espacement/durée « à la main » hors tokens.
- Vert décoratif, rouge décoratif, or sur une action destructive.
- Modal desktop rétréci en guise d'UI mobile.
- `catch {}` silencieux : une erreur non montrée est un mensonge d'interface.
- Écran vide muet (sans pédagogie).
- Animation longue/décorative qui rallonge l'attente.
- Débordement horizontal, cibles < 46 px, texte < 13 px sur mobile.
- Faux chiffres / faux avis.
- Fonctionnalité ajoutée « parce qu'on peut » sans passer le test ultime (*Loi 5*).

---

*Ce chapitre est vivant : quand un token, un breakpoint ou une primitive évolue dans le code, on met à jour ce document dans le même mouvement. La Bible et le code ne doivent jamais diverger.*
