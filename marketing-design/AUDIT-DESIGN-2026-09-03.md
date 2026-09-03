# Audit des agents de design QRowg — 03/09/2026

Périmètre : les trois chaînes de design — visuels sociaux (générateur d'images),
Motion System (vidéos), et `theme-creator` (thèmes produit). Plus le rattrapage
des contenus et la mise en place d'une réserve.

---

## 1. Le défaut critique : les QR publiés ne sont pas scannables

**Constat.** Le générateur affiche une image décorative (`assets/qr_gold.png`) :
modules **or sur fond noir**. Testée au décodeur, cette image ne renvoie rien —
ni telle quelle, ni inversée, ni seuillée. Deux causes cumulées :

- **polarité inversée** : un QR se lit modules sombres sur fond clair ; ici c'est
  l'inverse, et beaucoup de lecteurs refusent ;
- **contraste insuffisant** : l'or `#D4AF45` a une luminance d'environ 0,68 — trop
  proche du blanc pour servir de module, trop clair pour trancher franchement.

**Portée.** Toutes les épingles et tous les carrousels publiés depuis le 23/08
affichent ce visuel. La règle « QR toujours vrai et scannable » de la tâche
quotidienne était respectée sur le papier et violée en pratique, sans qu'aucun
garde-fou ne le détecte.

**Second effet.** Même s'il avait été lisible, ce QR était **unique et statique** :
il pointait toujours au même endroit, quel que soit le secteur ou le lien profond du
contenu. Aucun scan n'était donc attribuable à l'épingle qui l'avait provoqué — ce qui
contredit frontalement la promesse produit (« on mesure la performance d'un support »).

**Correction.** Le générateur v2 fabrique un vrai QR par contenu, encodant son lien
tracké, en **modules `#080A08` sur plaque `#D4AF45`** : conforme à la charte et décodé
au premier essai. Taille minimale portée à 260 px (à 190 px la détection décrochait).

Bug annexe trouvé au passage : le module `qrowg_visuals.py` n'importait pas `io`, donc
la génération de QR levait un `NameError` **avalé par un `except` muet** et retombait
silencieusement sur l'image décorative. Un `except: pass` qui cache une régression
d'identité produit.

---

## 2. La monotonie des compositions

`pin_html()` n'avait **qu'une seule mise en page** : eyebrow, titre, sous-titre, QR
centré, logo, URL. Les cinq épingles d'une même journée sortaient donc rigoureusement
identiques. Le journal anti-doublon contrôlait les doublons de *texte* ; rien ne
contrôlait les doublons de *forme*. Sur Pinterest, où l'on est jugé sur la vignette,
c'est le plus sûr moyen de devenir invisible.

Même problème dans le carrousel : les slides 02 et 04 (`kind: body`) partagent le même
squelette typographique.

**Correction.** Quatre gabarits d'épingle, choisis de façon déterministe sur le slug
(même slug → même gabarit, slugs différents → gabarits différents) : titre haut /
QR héros en haut / bandeau d'accent avec QR en coin / bloc panneau surélevé. Règle
ajoutée : au moins trois compositions distinctes par journée.

---

## 3. Deux chartes qui se contredisent

`guide-identite.md` décrit l'identité noir/or. Mais `carrousel-expert.md` et
`pinterest-expert.md` prescrivaient encore **« palette QRowg (violet/indigo + cyan
d'accent) »** — une identité abandonnée. Trois documents, deux vérités : l'agent
appliquait l'un ou l'autre selon ce qu'il lisait en premier.

Troisième divergence, plus subtile : le Motion System travaille sur `#06070A` et un or
`#E7C67A`, quand les images utilisent `#080A08` et `#D4AF45`. Un Reel et un carrousel
publiés le même jour n'ont donc pas exactement le même or.

**Correction.** Versions corrigées de `carrousel-expert.md` et `pinterest-expert.md`
dans `references-corrigees/`, et palette unique imposée par la skill `qrowg-design-qc`.

---

## 4. Rien ne contrôlait le résultat

La charte se termine par une checklist en 10 points « viser 10/10 » — jamais évaluée
autrement qu'à l'œil, quand quelqu'un regardait. Le Motion System, lui, a un vrai
validateur (`--validate`, planche-contact, autoréduction des titres) : la chaîne image
n'avait aucun équivalent.

**Correction.** `qrowg_qc.py` mesure sur chaque PNG le pourcentage de fond sombre, le
pourcentage d'or, décode le QR et vérifie qu'il pointe vers l'URL attendue. Écrit un
`qc.json` et sort la liste des visuels en alerte. Règle : **zéro alerte, sinon on ne
publie pas.**

Autres garde-fous ajoutés au générateur :

- **autoréduction des titres** (comme le Motion System) : la taille n'est plus figée à
  108 px / 88 px, elle décroît quand le texte dépasse la longueur idéale ;
- **`metric` sans `number` = erreur bloquante.** La valeur par défaut était `+31%` :
  un chiffre inventé pouvait partir en production par simple oubli, alors que la charte
  l'interdit ;
- **accent rouge métier** `#A5122A` enfin câblé, piloté par le champ `sector` — il
  était dans la charte depuis le début et n'avait jamais été implémenté.

---

## 5. Motion System — solide, deux réserves

Le moteur est la partie la mieux construite de l'ensemble : 52 moteurs d'animation,
validation en amont, planche-contact obligatoire, rendu déterministe image par image,
autoréduction des titres. Rien à refondre.

Deux points :

- **la palette** (voir §3) doit être ramenée sur les hex officiels ;
- le validateur avertit au-delà de 15 s alors que la consigne quotidienne vise 30–35 s.
  On contourne avec `--no-validate`, ce qui **désactive aussi les vraies erreurs**.
  Mieux vaudrait un seuil paramétrable que de neutraliser tout le garde-fou.

---

## 6. theme-creator — bien conçu, mais aucune vérification machine

La skill est rigoureuse : lecture obligatoire du `types.ts` réel avant génération,
taxonomie de catégories, gestion du lot avec variations imposées, respect de
`prefers-reduced-motion`, refus d'inventer la structure.

Sa faiblesse est la même que celle de la chaîne image avant aujourd'hui : elle
**demande** de vérifier les contrastes (`text/bg ≥ 7:1`, `muted/bg ≥ 4.5:1`) sans
fournir de quoi les calculer. Un thème illisible peut passer. Elle ne produit pas non
plus de rendu réel du thème, seulement un aperçu décrit.

Recommandation : un petit script de contrôle de contraste (même principe que
`qrowg_qc.py`) qui prend le `PageTheme` en JSON et sort les ratios calculés. À faire
dans une prochaine passe — la skill vit dans un plugin distant, non modifiable ici.

---

## 7. Rattrapage

**Posts en erreur ou brouillon :** aucun. Rien à relancer.

**Visuels produits mais jamais mis en file** (croisement des dossiers datés avec les
assets réellement utilisés par les posts `sent` + `scheduled`) :

| fichier | date | verdict |
|---|---|---|
| `qr-code-bar-happy-hour-ardoise.png` | 31/08 | récupéré → `_STOCK`, statut `dispo` |
| `qr-code-pizzeria-a-emporter-carte-du-soir.png` | 31/08 | récupéré → `_STOCK`, statut `dispo` |
| `qr-code-carte-fidelite-commerce-comptoir.png` | 31/08 | `retiré` — doublon de l'épingle fidélité publiée le 02/09 |

Limite à connaître : seuls les dossiers `2026-08-31`, `2026-09-02` et `2026-09-03`
existent encore en local. Les visuels non publiés des jours antérieurs, s'il y en a
eu, sont perdus. C'est exactement ce que la réserve empêche désormais.

**Jours sans production** entre le 23/08 et le 03/09 : **25/08, 27/08, 29/08**.
Trois trous sur douze jours. À combler en priorité avec le stock plutôt qu'avec du neuf.

---

## 8. Ce qui a été livré

- `generateur-v2/qrowg_visuals.py` — QR réel et tracké, 4 gabarits d'épingle,
  autoréduction des titres, accent secteur, chiffre par défaut supprimé, `io` importé.
- `generateur-v2/qrowg_qc.py` — contrôle qualité automatique + `qc.json`.
- `references-corrigees/` — les deux playbooks débarrassés de l'ancienne palette.
- Skill **`qrowg-design-qc`** — les cinq lois de la direction artistique, la recette
  d'environnement, la procédure de contrôle.
- Skill **`qrowg-stock`** — archivage du surplus et réinjection automatique dès qu'il
  reste de la place dans la file Buffer.
- `social-a-deposer/_STOCK/` — la réserve, avec son index et les textes prêts.

## 9. Ce qui reste à décider

1. **Republier ou non** les épingles déjà en ligne avec le QR corrigé. Elles sont
   evergreen et vont tourner des mois avec une porte d'entrée qui ne s'ouvre pas.
   Le plus rentable est de re-rendre les plus performantes et de remplacer l'image.
2. **Aligner la palette du Motion System** sur les hex officiels (une passe de
   remplacement dans `qrowg-motion.js`).
3. **Seuil de durée paramétrable** dans le validateur vidéo, pour arrêter de rendre
   avec `--no-validate`.
4. **Script de contraste** pour `theme-creator`.

---

## 10. Suite donnée le même jour

**Visuels du 03/09 re-rendus.** Les 7 posts encore en file portaient le QR cassé : les
6 slides du carrousel, ses 6 copies TikTok et les 5 épingles ont été régénérées en v2,
avec les mêmes noms de fichier (donc les mêmes URL Supabase, qui s'écrasent au dépôt).
Contrôle : **17 visuels, 0 alerte** ; chaque QR décodé renvoie bien son lien tracké.
Les épingles sortent désormais sur 4 gabarits différents au lieu d'un seul.

**Motion System — un second problème de fond.** Sa palette par défaut `signature`
n'était pas dorée du tout : turquoise, cyan, bleu, violet, émeraude — l'ancienne
identité. Pire, la palette `or` elle-même contenait une étape **turquoise** au milieu
du dégradé. Les vidéos n'étaient donc pas seulement d'un or légèrement différent : elles
étaient d'une autre marque. Corrigé dans `motion-corrige/` : `signature` devient la
palette de marque, `or` est purgée de toute teinte froide, l'ancienne est conservée sous
le nom `froid` pour les usages hors-marque, et les hex sont ramenés sur `#080A08`,
`#D4AF45`, `#B8922F`, `#F4F1E8`, `#A7A69F`, `#A5122A`.

**Validateur vidéo.** Le seuil de 15 s est devenu paramétrable : poser
`"maxDuration": 36` dans le clip. On arrête ainsi de rendre avec `--no-validate`, qui
neutralisait au passage les erreurs bloquantes (moteur inconnu, titre qui déborde,
CTA multiple).

**theme-creator.** `theme-qc/theme_contraste.py` calcule les cinq ratios exigés par la
skill (text/bg, muted/bg, text/surface, accent/bg, primary/surface), durcit
automatiquement les seuils de +1,0 quand `effects.glass` est actif, accepte un thème
seul, une liste ou un objet `PRESET_THEMES` entier, et sort en code 1 avec `--strict`
pour bloquer un lot dans un enchaînement.

**Installation.** `INSTALLER-CORRECTIFS.ps1` pose les sept fichiers corrigés dans la
skill `qrowg-marketing` en sauvegardant les originaux. À lancer **hors session Cowork** :
le dossier de la skill est en lecture seule pendant une session.

---

## 11. Troisième passe — ce qui a encore été corrigé

**Supermetrics retiré du run quotidien.** L'essai a expiré le 30/08 : l'étape
« apprentissage » échouait en silence depuis quatre jours et le run continuait comme si
elle avait tourné. Le prompt de la tâche planifiée l'interdit désormais explicitement et
la remplace par les statistiques Buffer (`execute_query` sur les posts `sent` avec
`metrics { name value }`), en précisant ce que Buffer **ne** donne pas — les clics
sortants par épingle — pour qu'on ne prétende pas les mesurer.

**Slides de corps enfin variées.** L'alternance était documentée mais pas implémentée,
et un premier essai s'est trompé de critère : les slides `body` tombent sur les index 02
et 04, tous deux pairs, donc la parité de l'index les envoyait toutes deux sur le même
squelette. L'alternance se fait maintenant sur le **rang de la slide de corps**. Deux
squelettes : kicker + filet bas, ou filet vertical d'accent avec titre décalé.

**Rouge métier restreint.** Le food truck avait été rangé avec le restaurant et le bar ;
la charte réserve `#A5122A` à la restauration assise et aux bars. Corrigé.

**Kicker inventé supprimé.** La variante 1 des slides de corps affichait « LE PROBLÈME »
par défaut quand le champ était absent — même faute que le `+31%` du bloc `metric` :
un contenu que personne n'a écrit qui part en production.

**Contrôleur de QR fiabilisé.** Il criait au loup : un détecteur qui reçoit une affiche
2000 × 3000 décroche sur un motif occupant 8 % du cadre, alors qu'un téléphone, qui cadre
de près, le lit sans peine. La détection rejoue désormais par tuiles. Et côté générateur,
le QR est fabriqué à la résolution finale exacte — une URL avec UTM complets donne un QR
version 9 dont les modules se brouillaient à la réduction.

**`preparer-env.sh`.** L'installation de l'environnement de rendu était réécrite à la main
à chaque run, avec les mêmes occasions de se tromper. Un script fait tout : dépendances,
extraction de chromium, copie du générateur depuis la skill en lecture seule, application
de la version corrigée, vérification de syntaxe. Testé de bout en bout.
Piège rencontré en l'écrivant, corrigé dans le script : `find / | head -1` fait recevoir
un SIGPIPE à `find`, ce qui tue tout le script sous `set -o pipefail`.

**Prompt de la tâche quotidienne réécrit.** Il porte maintenant l'ordre réel des
opérations : stock d'abord, anti-doublon, apprentissage sans Supermetrics, production
avec le générateur v2, **contrôle qualité bloquant**, dépôt dans le dossier `outputs`
(c'est celui que scanne `QRowg-Depot.cmd` — se tromper de dossier a coûté un aller-retour
inutile), mise en file, surplus au stock. Et une consigne d'honnêteté : si la
distribution reste nulle, le dire au lieu de produire comme si de rien n'était.
