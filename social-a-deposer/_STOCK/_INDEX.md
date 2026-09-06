# _STOCK — réserve de contenus QRowg

Tout visuel produit mais **non mis en file** atterrit ici au lieu d'être perdu.
La skill `qrowg-stock` lit ce fichier, choisit le plus ancien encore valable et le
réinjecte dans Buffer dès qu'il reste de la place dans la file.

## Colonnes
- **statut** : `dispo` (réinjectable) · `en-file` (parti dans Buffer) · `retiré` (doublon ou périmé)
- **ajouté le** : date de production d'origine
- **angle** : secteur + objet + bénéfice (sert au contrôle anti-doublon)

| statut | fichier | canal cible | tableau / meta | angle | lien | ajouté le |
|---|---|---|---|---|---|---|
| retiré | qr-code-bar-happy-hour-ardoise.png | Pinterest | QR code restaurant (726416683586817614) | bar · ardoise happy hour · l'offre change selon l'heure sans réimprimer | https://qrowg.com/qr-code/restaurant | 2026-08-31 |
| retiré | qr-code-pizzeria-a-emporter-carte-du-soir.png | Pinterest | QR code restaurant (726416683586817614) | pizzeria · carte du soir à emporter · commande sans appel téléphonique | https://qrowg.com/qr-code/menu | 2026-08-31 |
| en-file | checklist-ouverture-commerce-matin.png | Pinterest | **Productivité au travail** (726416683586787011) | commerce · checklist d'ouverture · rien d'oublié le matin — *test de placement en tableau historique* | https://qrowg.com/guides | 2026-09-03 |
| en-file | qr-code-bar-happy-hour-ardoise-v2.png | Pinterest | **Templates gratuits** (726416683586787015) | bar · ardoise happy hour · l'offre change selon l'heure — *test de placement* | https://qrowg.com/qr-code/restaurant | 2026-09-03 |
| en-file | qr-code-pizzeria-carte-du-soir-v2.png | Pinterest | QR code restaurant (726416683586817614) | pizzeria · carte du soir à emporter · commande sans appel — *témoin, tableau neuf* | https://qrowg.com/qr-code/menu | 2026-09-03 |
| retiré | qr-code-carte-fidelite-commerce-comptoir.png | — | — | commerce · carte de fidélité comptoir — **doublon** de `carte-fidelite-dematerialisee-boulangerie` publié le 02/09 | — | 2026-08-31 |

| en-file | qr-code-menu-quatre-langues-touristes-restaurant.png | Pinterest | QR code restaurant (726416683586817614) | restaurant · carte en 4 langues · le touriste lit la carte dans sa langue sans réimprimer | https://qrowg.com/qr-code/menu | 2026-09-04 |
| en-file | qr-code-vins-au-verre-qui-tournent-bar.png | Pinterest | QR code restaurant (726416683586817614) | bar/cave · vins au verre · la sélection du soir à jour en dix secondes | https://qrowg.com/qr-code/restaurant | 2026-09-04 |
| en-file | qr-code-invendus-du-soir-boulangerie-anti-gaspi.png | Pinterest | **Productivité au travail** (726416683586787011) | boulangerie · invendus du soir · anti-gaspi annoncé à 18 h en vitrine | https://qrowg.com/qr-code/boutique | 2026-09-04 |
| en-file | qr-code-panier-de-la-semaine-producteur-marche.png | Pinterest | **Templates gratuits** (726416683586787015) | marché/producteur · panier de la semaine · réservé avant l'étal | https://qrowg.com/qr-code/artisan | 2026-09-04 |

> **04/09 — tout est parti en file.** Les 3 épingles du test de placement (tableaux
> historiques + témoin) et, dans un second temps, les 4 épingles neuves du jour, placées
> sur les tableaux « QR code X » pour garder le test lisible. File à 9/10, réserve vide.
> Contrôlées à zéro alerte, QR décodés vers leur lien tracké. Textes conservés plus bas.

> Les deux fichiers du 31/08 sont passés en `retiré` : leur QR était non scannable
> (ancien générateur). Ils sont remplacés par les versions `-v2` ci-dessus, re-rendues
> avec le générateur corrigé et contrôlées à zéro alerte.

## Textes prêts

### checklist-ouverture-commerce-matin
**Titre Pinterest** : Checklist d'ouverture : ce que personne n'oublie le matin
**Description** : Le café à lancer, la caisse à ouvrir, la vitrine à retourner, le stock à vérifier : la liste vit dans la tête du patron et se perd dès qu'il n'est pas là. Une checklist derrière un QR collé au comptoir se coche chaque matin et se met à jour sans réimprimer la feuille. Idée d'organisation pour commerce, café et restaurant.
`#organisation #checklist #productivite #commercelocal`
**Tableau** : Productivité au travail — *test de placement en tableau historique*

### qr-code-bar-happy-hour-ardoise
**Titre Pinterest** : QR code bar : l'ardoise happy hour qui change toute seule
**Description** : L'ardoise annonce 17 h – 19 h depuis l'ouverture, alors que l'offre bouge selon les soirs et la météo. Un QR sur le comptoir ouvre l'happy hour du jour : les prix, l'horaire, la sélection — modifiés en dix secondes depuis le téléphone du patron. Idée simple pour bar, pub et brasserie.
`#bar #happyhour #qrcode #commercelocal`

### qr-code-pizzeria-a-emporter-carte-du-soir
**Titre Pinterest** : QR code pizzeria : la carte du soir à emporter, sans appel
**Description** : Le téléphone sonne pendant le coup de feu et personne ne peut répondre : la commande part chez le concurrent. Un QR sur la vitrine et sur les cartons ouvre la carte du soir et la prise de commande, sans appel ni application. Idée pratique pour pizzeria, snack et restaurant à emporter.
`#pizzeria #aemporter #qrcode #restauration`

## Trous de calendrier constatés (à combler avec le stock)
Jours sans production entre le 23/08 et le 03/09 : **25/08, 27/08, 29/08**.
Aucun post en statut `error` ni `draft` sur Buffer au 03/09.

### qr-code-menu-quatre-langues-touristes-restaurant
**Titre Pinterest** : Menu en 4 langues : un seul QR sur la table
**Description** : L'été, la table de six parle trois langues et la carte n'en parle qu'une. Réimprimer quatre versions coûte cher et vieillit en une semaine. Un seul QR sur la table ouvre la carte dans la langue du téléphone, et se met à jour quand le plat change. Idée pratique pour restaurant, brasserie et bistrot touristique.
`#restaurant #menu #qrcode #tourisme`

### qr-code-vins-au-verre-qui-tournent-bar
**Titre Pinterest** : Vins au verre : la sélection du soir, à jour
**Description** : La sélection au verre tourne toutes les semaines, l'ardoise reste au mois dernier et le serveur récite. Un QR sur la table ouvre la sélection du soir : les cépages, les prix, ce qui vient d'ouvrir — modifié en dix secondes depuis le téléphone. Idée simple pour bar à vins, cave et brasserie.
`#barvin #cave #qrcode #restauration`

### qr-code-invendus-du-soir-boulangerie-anti-gaspi
**Titre Pinterest** : Anti-gaspi : les invendus du soir annoncés à 18 h
**Description** : Ce qui reste à 18 h finit à la poubelle à 19 h 30, faute d'avoir prévenu qui que ce soit. Un QR en vitrine ouvre la liste du soir : ce qu'il reste, à quel prix, jusqu'à quelle heure. La page change chaque jour, l'affiche jamais. Idée anti-gaspillage pour boulangerie, pâtisserie et épicerie.
`#antigaspi #boulangerie #organisation #commercelocal`

### qr-code-panier-de-la-semaine-producteur-marche
**Titre Pinterest** : Panier de la semaine : réservé avant l'étal
**Description** : Le panier part en une heure le samedi matin, et ceux qui arrivent à 11 h repartent les mains vides. Un QR sur l'étal ouvre le panier de la semaine : ce qu'il y a dedans, ce qu'il coûte, comment le réserver. La composition change chaque semaine, le panneau reste le même. Idée pour producteur, maraîcher et marché de plein vent.
`#marche #producteur #panier #circuitcourt`

---

## 05/09 — production du jour, en attente de dépôt

| statut | fichier | canal cible | tableau / meta | angle | lien | ajouté le |
|---|---|---|---|---|---|---|
| en-file | qr-code-stock-disponible-magasin-boutique-01..06.png | Instagram (carrousel) | — | commerce · stock disponible en magasin · le client voit ce qu'il reste sans attendre | https://qrowg.com/qr-code/boutique | 2026-09-05 |
| en-file | tiktok-qr-code-stock-disponible-magasin-boutique-01..06.png | TikTok (carrousel photo) | — | idem, copies 1080×1350 | https://qrowg.com/qr-code/boutique | 2026-09-05 |
| en-file | qr-code-retours-garantie-ticket-caisse-boutique.png | Pinterest | QR code boutique commerce (726416683586817655) | commerce · retours & garantie · le ticket de caisse explique le retour | https://qrowg.com/qr-code/boutique | 2026-09-05 |
| en-file | qr-code-carte-sandwichs-du-midi-boulangerie.png | Pinterest | QR code food truck (726416683586817654) | boulangerie · carte des sandwichs du midi · à jour à 11 h 30 | https://qrowg.com/qr-code/artisan | 2026-09-05 |
| en-file | qr-code-carte-bieres-pression-du-moment-bar.png | Pinterest | QR code restaurant (726416683586817614) | bar · bières pression du moment · la sélection du soir à jour en dix secondes | https://qrowg.com/qr-code/restaurant | 2026-09-05 |

> **05/09 — tout est parti en file.** Dépôt effectué, puis 5 posts programmés :
> carrousel Instagram, carrousel photo TikTok et les 3 épingles sur 3 tableaux distincts
> (QR code boutique commerce, QR code food truck, QR code restaurant). **File à 5/10**,
> réserve vide. Contrôle qualité : **15 visuels, 0 alerte**, chaque QR décodé vers son
> lien tracké. Textes conservés ci-dessous.
> La vidéo `qr-code-stock-disponible-magasin-boutique-reel.mp4` (32,2 s) reste **manuelle**
> et n'entre jamais dans ce circuit.

### qr-code-retours-garantie-ticket-caisse-boutique
**Titre Pinterest** : Retours et garantie : le ticket qui explique tout
**Description** : Le client rentre chez lui, ouvre le carton, hésite — et le ticket ne dit rien du délai de retour. Un QR imprimé sur le ticket de caisse ouvre la page retours : le délai, les conditions, le formulaire à remplir. Les règles changent aux soldes, la page suit, le ticket reste le même. Idée d'organisation pour boutique, commerce de proximité et e-commerce.
`#commercelocal #boutique #organisation #qrcode`
**Tableau** : QR code boutique commerce

### qr-code-carte-sandwichs-du-midi-boulangerie
**Titre Pinterest** : Carte des sandwichs du midi : à jour à 11 h 30
**Description** : À midi la file s'allonge et tout le monde pose la même question : il reste quoi ? L'ardoise date d'hier, le poulet-crudités est parti à 12 h 10. Un QR sur le comptoir ouvre la carte du jour, corrigée en dix secondes quand une garniture s'épuise. Idée pratique pour boulangerie, snack et pause déjeuner.
`#boulangerie #pausedejeuner #organisation #qrcode`
**Tableau** : QR code food truck

---

## 06/09 — production du jour

> **Dépôt fait** (15 PNG via `QRowg-Depot.cmd`), puis **5 posts mis en file** : carrousel
> Instagram (19 h 07 UTC), carrousel photo TikTok (07/09, 06 h 40) et les 3 épingles sur
> 3 tableaux distincts — QR code salon coiffure (10 h 26), QR code restaurant (13 h 17),
> QR code boutique commerce (18 h 27). **File à 5/10**, aucune erreur.
> Contrôle qualité : **15 visuels, 0 alerte**, chaque QR décodé vers son lien tracké.
> Seule l'épingle **hôtel** reste en réserve `dispo` (voir la note plus bas).

| statut | fichier | canal cible | tableau / meta | angle | lien | ajouté le |
|---|---|---|---|---|---|---|
| en-file | qr-code-carte-enfants-jeu-table-restaurant-01..06.png | Instagram (carrousel) | — | restaurant · carte enfants sur le set de table · les parents restent jusqu'au dessert | https://qrowg.com/qr-code/restaurant | 2026-09-06 |
| en-file | tiktok-qr-code-carte-enfants-jeu-table-restaurant-01..06.png | TikTok (carrousel photo) | — | idem, copies 1080×1350 | https://qrowg.com/qr-code/restaurant | 2026-09-06 |
| en-file | qr-code-tarifs-durees-prestations-salon-coiffure.png | Pinterest | QR code salon coiffure (726416683586817657) | salon/coiffeur · tarifs et durées des prestations · le prix affiché sans avoir à le demander | https://qrowg.com/qr-code/salon | 2026-09-06 |
| en-file | qr-code-menu-buffet-reception-traiteur.png | Pinterest | QR code restaurant (726416683586817614) | traiteur · formules buffet et devis · la demande aboutit au lieu de dormir dans une boîte mail | https://qrowg.com/qr-code/artisan | 2026-09-06 |
| en-file | qr-code-carte-cadeau-dematerialisee-boutique.png | Pinterest | QR code boutique commerce (726416683586817655) | commerce · carte cadeau dématérialisée · offrir sans emballer ni imprimer | https://qrowg.com/qr-code/boutique | 2026-09-06 |
| **dispo** | qr-code-arrivee-tardive-check-in-autonome-hotel.png | Pinterest | QR code hôtel (726416683586817656) | hôtel/chambre d'hôtes · arrivée tardive en autonomie · le code, l'étage et la marche à suivre sur la porte | https://qrowg.com/qr-code/hotel | 2026-09-06 |

> L'épingle **hôtel** a été rendue puis écartée de la sélection du jour pour respecter la
> règle du pont d'audience (`audience-bridge.md` : une seule épingle hors-food par jour ;
> le salon occupait déjà cette place). Elle est contrôlée, QR décodé, réutilisable telle
> quelle un jour où le quota hors-food est libre. Son fichier vit dans
> `social-a-deposer/2026-09-06/`.

> La vidéo `qr-code-carte-enfants-jeu-table-restaurant-reel.mp4` (32,2 s) reste **manuelle**
> et n'entre jamais dans ce circuit.

### qr-code-tarifs-durees-prestations-salon-coiffure
**Titre Pinterest** : Tarifs coiffeur : le prix affiché, sans avoir à demander
**Description** : « C'est combien, un balayage ? » Personne n'ose poser la question au bac, et la cliente découvre le montant à la caisse. Un QR sur le miroir ouvre la carte des prestations : chaque geste, sa durée, son tarif. Les prix changent en janvier, la page suit, l'affiche reste la même. Idée d'organisation pour salon de coiffure, barbier et institut de beauté.
`#coiffure #salondecoiffure #organisation #qrcode`
**Tableau** : QR code salon coiffure

### qr-code-menu-buffet-reception-traiteur
**Titre Pinterest** : Traiteur : les formules buffet consultables en un scan
**Description** : La demande de devis part par mail un mardi soir, et personne ne rappelle. Le client compare ailleurs, la réception se fera sans toi. Un QR sur ta carte ouvre les formules buffet : les menus, le prix par personne, le formulaire à remplir en deux minutes. Les tarifs bougent à la saison, la page suit, la carte reste la même. Idée pratique pour traiteur, chef à domicile et organisation de réception.
`#traiteur #reception #buffet #qrcode`
**Tableau** : QR code restaurant

### qr-code-carte-cadeau-dematerialisee-boutique
**Titre Pinterest** : Carte cadeau dématérialisée : offrir sans emballer ni imprimer
**Description** : Le cadeau se décide la veille, la boutique est fermée et le bon papier dort dans le tiroir. Un QR envoyé par message ouvre la carte cadeau : le montant, la date de validité, les conditions, l'adresse de la boutique. Rien à imprimer, rien à perdre au fond d'un sac, et le montant se met à jour sans réimprimer quoi que ce soit. Idée pour boutique, commerce de proximité et créateur.
`#cartecadeau #boutique #commercelocal #qrcode`
**Tableau** : QR code boutique commerce

### qr-code-arrivee-tardive-check-in-autonome-hotel *(réserve, non planifiée)*
**Titre Pinterest** : Arrivée tardive : le check-in qui se fait sans toi
**Description** : Le train a du retard, il sonne à 23 h et tu dors depuis une heure. Un QR sur la porte ouvre la page d'arrivée : le code de la boîte à clés, l'étage, la marche à suivre, qui appeler en cas de souci. Le code change à chaque réservation, l'autocollant reste le même. Idée pratique pour chambre d'hôtes, location saisonnière et petit hôtel.
`#chambredhotes #locationsaisonniere #hotel #qrcode`
**Tableau** : QR code hôtel

---

### qr-code-carte-bieres-pression-du-moment-bar
**Titre Pinterest** : Bières pression : ce qui coule ce soir, à jour
**Description** : Le fût de la blonde artisanale est vide depuis mardi et l'ardoise l'annonce encore. Le client commande, le serveur s'excuse, la vente se transforme en négociation. Un QR sur la table ouvre la sélection pression du soir : ce qui coule, le degré, le prix — modifié en dix secondes depuis le téléphone du patron. Idée simple pour bar, brasserie et pub.
`#bar #brasserie #biere #qrcode`
**Tableau** : QR code restaurant
