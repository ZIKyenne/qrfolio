# Playbook expert — Pinterest

Pinterest n'est PAS un réseau social classique : c'est un **moteur de recherche
visuel** où le contenu est **evergreen** (une épingle performe pendant des mois, voire
des années). On ne cherche pas le buzz du jour, on se fait **trouver** par des gens qui
cherchent une idée/solution. Objectif : trafic durable vers QRowg + notoriété.

## Ce qui change vs Insta/TikTok
- **SEO d'abord** : les mots-clés dans le titre, la description et le nom du tableau
  décident de qui voit l'épingle. On écrit pour la recherche, pas pour l'algo social.
- **Evergreen** : on crée des épingles utiles/intemporelles (idées, tutos, modèles,
  checklists), pas de l'actu.
- **Chaque épingle a un LIEN** vers une destination (page QRowg, outil gratuit, modèle).
  C'est un canal d'acquisition, pas juste de la visibilité.
- **Volume** : Pinterest récompense la régularité et la déclinaison (plusieurs
  épingles par idée, plusieurs visuels pour un même lien).

## Formats
- **Épingle standard (image)** : visuel vertical **2:3 — 1000 × 1500 px**. Le format
  de base, le plus efficace. Texte accroche intégré au visuel (overlay).
- **Épingle vidéo** : même ratio, courte (5–15 s), idéale pour réutiliser un Reel
  animation-texte (recadré + titre + mots-clés). Réemploi malin de nos vidéos.
- **Idea Pin (multi-pages)** : plusieurs pages (étapes/tips), très bonne portée ;
  bon pour les checklists et tutos. (Le lien sortant peut être limité selon les
  évolutions Pinterest — vérifier.)
- **On peut recycler nos carrousels** en Idea Pin, et nos Reels en épingle vidéo.

## SEO Pinterest (le cœur du métier)
1. **Titre (≤ 100 car., mots-clés en tête)** : formule « [mot-clé principal] : [bénéfice] ».
   Ex : « QR code menu restaurant : le menu qui se met à jour tout seul ».
2. **Description (2–4 phrases, riche en mots-clés naturels)** : décris ce que
   l'utilisateur va trouver + le bénéfice + un léger appel à l'action. 2–4 hashtags
   descriptifs suffisent (moins déterminants que sur Insta).
3. **Tableau (board) pertinent** : ranger l'épingle dans un tableau au nom
   keyword-friendly (« Idées marketing restaurant », « Cartes de visite modernes »,
   « Astuces commerce local »).
4. **Texte sur le visuel** : un titre lisible en gros (Pinterest indexe aussi le
   visuel). Le mot-clé apparaît à l'écran.
5. **Lien** : vers la page produit / l'outil gratuit / le modèle QRowg concerné.

## Specs visuelles d'une épingle
- Ratio **2:3** ; le générateur rend en 2000 × 3000 (×2 de 1000 × 1500). Éviter le
  trop long (déclassé).
- Titre gros et lisible, palette QRowg officielle : noir `#080A08` dominant, accent or
  `#D4AF45`, texte ivoire `#F4F1E8`. **Pas de violet-indigo ni de cyan** (ancienne
  identité abandonnée). Rouge métier `#A5122A` seulement pour restaurant/bar.
- Logo/URL discret en bas. Contraste fort (beaucoup consultent en petit).
- Un visuel = une idée. Décliner 2–3 variantes de visuel pour un même lien.

## Angles QRowg qui cartonnent sur Pinterest (evergreen)
- **Inspiration / design** : « idées de QR code à sa marque », « cartes de visite
  QR modernes », « déco de table resto avec QR ».
- **Idées marketing par secteur** : « 7 idées marketing pour restaurant », « idées
  pour agent immobilier », « marketing pour coach ».
- **Checklists / tutos visuels** : « checklist ouverture de resto », « comment
  collecter plus d'avis Google », « préparer sa vitrine ».
- **Infographies** : « QR statique vs dynamique », « le parcours phygital en 5 étapes ».
- **Avant / après** : support papier figé → version QRowg vivante.
- **Modèles / templates** : « modèle de sticker vitrine avis Google », « chevalet de
  table à imprimer ».

## Idées de tableaux (boards) à tenir
Idées marketing restaurant · Marketing commerce local · Cartes de visite modernes ·
QR codes design & branding · Astuces avis Google · Marketing immobilier · Idées pour
freelances & indépendants · Supports imprimables (Print Studio).

## Cadence & bonnes pratiques
- Publier **régulièrement** (quelques épingles/semaine), décliner chaque idée en
  plusieurs visuels/titres.
- Réutiliser systématiquement le contenu Insta/TikTok : un Reel → une épingle vidéo ;
  un carrousel → un Idea Pin ou une série d'épingles.
- Toujours un **lien** + un **tableau** cohérents.

## Ce que l'agent LIVRE pour chaque épingle
Type (image / vidéo / idea pin) · **2 variantes de titre SEO** (mots-clés en tête) ·
description riche en mots-clés (2–4 phrases) · 2–4 hashtags descriptifs · le **tableau
cible** · la **direction visuelle** (ratio 2:3, texte overlay, palette) · le **lien de
destination** · si pertinent, la source à recycler (« = le Reel de lundi recadré »).

## Checklist qualité épingle
- Le mot-clé principal est-il dans le titre ET sur le visuel ? ✅
- L'épingle est-elle evergreen (utile dans 6 mois) ? ✅
- Ratio 2:3, texte lisible en petit ? ✅
- Un lien + un tableau pertinents ? ✅
- On vend un résultat, pas une fonctionnalité ? ✅


## Anti-monotonie (ajout — le défaut n°1 constaté)
Cinq épingles publiées le même jour avec la même mise en page rendent le compte
invisible dans un feed Pinterest, même avec cinq titres différents. **Au moins 3
compositions distinctes** par journée. Le générateur v2 propose 4 gabarits (titre haut /
QR héros en haut / bandeau + QR en coin / bloc panneau) sélectionnés sur le slug, ou
forçables par le champ `layout` (0–3).

## QR (ajout, non négociable)
Chaque épingle porte un **vrai QR scannable** encodant son lien profond tracké
(`?utm_source=pinterest&utm_medium=pin&utm_campaign=aaaammjj-secteur`). Sans cela le
scan n'est attribuable à aucune épingle. Contrôler avec `qrowg_qc.py` avant publication.
