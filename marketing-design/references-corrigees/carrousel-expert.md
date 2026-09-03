# Playbook expert — Carrousels Instagram

Le carrousel est le format n°1 pour la **valeur + les enregistrements** (donc la
portée qui dure). Objectif : faire **swiper jusqu'au bout**, puis **enregistrer** et
**partager**. Une idée, un fil, une seule action.

## Format & specs techniques
- Ratio : **4:5 (1080 × 1350 px)** — occupe le max de hauteur dans le feed.
  Le générateur rend en 2160 × 2700 (×2) ; pour TikTok, redimensionner à 1080 × 1350
  (TikTok refuse toute image > 2 073 600 pixels).
- Nombre de slides : **6** en production quotidienne, avec l'arc du générateur
  `cover → body → qr → body → metric → cta`. L'arc en 7 étapes ci-dessous reste la
  référence éditoriale : la slide « déclic » est fondue dans la slide `qr`.
- **Zone de sécurité** : garder le texte à ≥ 80 px des bords ; ne rien mettre
  d'important dans les 60 px du bas (le compteur de slides).
- Poids visuel : un point focal par slide, pas de slide surchargée.

## Système de design (cohérence = marque)
- **Grille** : marges régulières, texte aligné à gauche ou centré, mais UNE règle
  pour tout le carrousel.
- **Typo** : 2 polices max — une titre (grasse, impactante) + une texte (lisible).
  Tailles hiérarchisées : titre ≫ sous-titre ≫ corps.
- **Couleurs** : palette QRowg officielle — noir `#080A08` dominant, panneaux `#101310`,
  accent or `#D4AF45`, texte ivoire `#F4F1E8`, secondaire gris chaud `#A7A69F`.
  Rouge métier `#A5122A` pour restaurant/bar uniquement. **Jamais de violet/indigo ni
  de cyan** : ces valeurs venaient d'une ancienne identité et sont abandonnées.
  Contraste AA minimum (texte lisible même en petit).
- **Accent** : colorer LE mot clé de chaque slide. Une couleur d'accent, pas cinq.
- **Répétition** : même gabarit de slide (position titre, logo discret en pied) sur
  toutes les slides → on reconnaît la marque au scroll.

## Architecture narrative (arc en 7 slides)
```
Slide 1 — COUVERTURE : hook + promesse claire. C'est 80 % du succès.
Slide 2 — LE PROBLÈME : nomme la douleur du persona (il doit se reconnaître).
Slide 3 — LE DÉCLIC : « et si… » / la bascule.
Slide 4 — POINT CLÉ 1 : un argument/étape, illustré.
Slide 5 — POINT CLÉ 2 : la preuve / le comment concret.
Slide 6 — RÉSULTAT : le bénéfice tangible (avant/après, chiffre parlant honnête).
Slide 7 — CTA : une seule action + rappel de marque.
```
Variantes d'arc : « X erreurs à éviter », « X façons d'utiliser un QR pour [métier] »,
« le guide en 5 étapes », « mythe vs réalité ».

## La couverture (slide 1) — la plus importante
Elle doit, à elle seule, donner envie de swiper. Formules :
- **Bénéfice chiffré/concret** : « Ce chevalet de table peut te rapporter 30 avis
  Google ce mois-ci. »
- **Promesse + curiosité** : « 5 supports qui transforment tes clients en avis 5★
  (le n°3 est sous-exploité). »
- **Adresse + douleur** : « Freelances : votre carte papier est déjà périmée. »
- **Contre-pied** : « Un QR code ne sert à rien. (Voilà ce qui sert vraiment.) »
Ajouter un **indice de swipe** discret (flèche « → » ou « slide »).

## La slide de rétention (slide 2-3)
Reprends la tension de la couverture pour retenir : « Le vrai problème n'est pas X,
c'est Y. » Le lecteur doit sentir qu'il va manquer quelque chose s'il arrête.

## La slide CTA (dernière)
Une seule action, formulée simplement : « Crée ta page gratuitement → qrowg.com »,
« Enregistre ce post pour ton prochain support », « Envoie "QR" en DM ». Ajouter le
logo QRowg + éventuellement « suis-nous pour + d'astuces ».

## Légende du carrousel
- 1re ligne = hook (souvent la promesse de la couverture, reformulée).
- Développe la valeur en 3-6 lignes (le carrousel montre, la légende approfondit).
- 1 CTA + 8-12 hashtags ciblés + invitation à enregistrer/partager.

## Formats récurrents prêts à décliner
- « X erreurs de [métier] avec les QR codes »
- « X supports physiques à connecter dans ton commerce »
- « Avant / Après : [objet papier] → version QRowg »
- « Le funnel caché derrière un simple QR »
- « 3 chiffres qui prouvent que ton [support] peut rapporter plus »

## Ce que l'agent LIVRE pour chaque carrousel
Nombre de slides · texte slide par slide (titre + corps) · direction visuelle par
slide (image/icône/fond) · specs design (ratio, palette, typo, mot accentué) ·
couverture optimisée (2 variantes de titre) · légende + hashtags · le CTA final.

## Checklist qualité carrousel
- La couverture donne envie de swiper sans lire la légende ? ✅
- Une seule idée directrice sur tout le carrousel ? ✅
- Gabarit visuel cohérent d'une slide à l'autre ? ✅
- Dernière slide = 1 CTA clair ? ✅
- Texte lisible en petit (contraste, taille) ? ✅
- On vend un résultat, pas une fonctionnalité ? ✅


## Anti-monotonie (ajout)
Deux slides `body` consécutives ne doivent pas partager le même squelette : alterner
kicker / pas de kicker, alignement, présence du filet or. Un carrousel dont les slides
2 et 4 sont typographiquement identiques est un carrousel raté, même si les textes
diffèrent. Voir la skill `qrowg-design-qc`.

## QR (ajout, non négociable)
Le QR affiché est un **vrai QR** encodant le lien profond tracké du contenu, en modules
sombres sur plaque or, ≥ 260 px dans le gabarit. Un QR aux modules or sur fond noir
n'est pas lu par les téléphones.
