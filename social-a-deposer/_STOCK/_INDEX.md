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
| dispo | qr-code-bar-happy-hour-ardoise.png | Pinterest | QR code restaurant (726416683586817614) | bar · ardoise happy hour · l'offre change selon l'heure sans réimprimer | https://qrowg.com/qr-code/restaurant | 2026-08-31 |
| dispo | qr-code-pizzeria-a-emporter-carte-du-soir.png | Pinterest | QR code restaurant (726416683586817614) | pizzeria · carte du soir à emporter · commande sans appel téléphonique | https://qrowg.com/qr-code/menu | 2026-08-31 |
| retiré | qr-code-carte-fidelite-commerce-comptoir.png | — | — | commerce · carte de fidélité comptoir — **doublon** de `carte-fidelite-dematerialisee-boulangerie` publié le 02/09 | — | 2026-08-31 |

## Textes prêts

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
