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

| dispo | qr-code-menu-quatre-langues-touristes-restaurant.png | Pinterest | QR code restaurant (726416683586817614) | restaurant · carte en 4 langues · le touriste lit la carte dans sa langue sans réimprimer | https://qrowg.com/qr-code/menu | 2026-09-04 |
| dispo | qr-code-vins-au-verre-qui-tournent-bar.png | Pinterest | QR code restaurant (726416683586817614) | bar/cave · vins au verre · la sélection du soir à jour en dix secondes | https://qrowg.com/qr-code/restaurant | 2026-09-04 |
| dispo | qr-code-invendus-du-soir-boulangerie-anti-gaspi.png | Pinterest | **Productivité au travail** (726416683586787011) | boulangerie · invendus du soir · anti-gaspi annoncé à 18 h en vitrine | https://qrowg.com/qr-code/boutique | 2026-09-04 |
| dispo | qr-code-panier-de-la-semaine-producteur-marche.png | Pinterest | **Templates gratuits** (726416683586787015) | marché/producteur · panier de la semaine · réservé avant l'étal | https://qrowg.com/qr-code/artisan | 2026-09-04 |

> **04/09 — les trois épingles du test de placement sont sorties du stock et MISES EN FILE** (Buffer, 04/09).
> Les quatre épingles neuves du 04/09 entrent en réserve : le DIAGNOSTIC demande de ne pas
> augmenter la production Pinterest avant la lecture du test (J+7, soit le 11/09).
> Contrôlées à zéro alerte, QR décodés vers leur lien tracké. Textes prêts plus bas.

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
