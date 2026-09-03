# Pourquoi Pinterest ne distribue rien — 03/09/2026

## Le chiffre

Statistiques Buffer, toutes les épingles publiées depuis le 22/08 :

| | |
|---|---|
| Épingles publiées | 56 |
| Impressions cumulées | ≈ 100 |
| Enregistrements | 1 |
| Clics sortants | 0 |
| Abonnés du compte | ~9 400 |

Une épingle plafonne à **1 ou 2 impressions**. Les meilleures — 8 et 11 impressions —
datent du 23/08 et pointent vers `qrowg.com/social/`. Depuis, la courbe descend : les
épingles du 31/08 et du 02/09 sont à **0**.

Ce n'est pas une question de qualité de visuel ni de titre. À ce niveau, **le contenu
n'est simplement pas distribué**. Corriger le QR des anciennes épingles n'a donc aucune
valeur : personne ne les voit. Cette action est annulée.

## Les trois causes plausibles, par ordre de probabilité

**1. On épingle dans des tableaux neufs et vides.** Les 9 400 abonnés ont suivi le
compte pour son ancien contenu — organisation, productivité, bullet journal, rangement.
Or toute la production part dans « QR code restaurant », « QR code food truck »,
« QR code boutique commerce »… des tableaux **créés récemment, sans historique et sans
abonnés**. Pinterest distribue d'abord par tableau et par intérêt : un tableau neuf
démarre à zéro, quel que soit le compte qui le porte. C'est l'explication la plus
simple et la plus cohérente avec la chronologie — les rares impressions viennent des
épingles les plus anciennes.

**2. Le domaine `qrowg.com` n'est probablement pas revendiqué** (*claim*) dans les
réglages Pinterest. Un domaine non revendiqué voit ses liens sortants déclassés, et le
compte ne récupère aucune statistique de destination. Cela expliquerait aussi les
**0 clic sortant**. À vérifier dans Paramètres → Comptes connectés.

**3. Le sujet est hors de l'intérêt de l'audience héritée.** Réel, mais insuffisant pour
expliquer 1 impression par épingle : même hors sujet, Pinterest teste un contenu auprès
de quelques centaines de personnes avant de l'enterrer. Un plafond à 1–2 impressions
ressemble davantage à un problème de placement ou de compte qu'à un problème d'audience.

## Le test à lancer (3 épingles, 3 emplacements)

Une seule variable change : **le tableau**. Même soin, mêmes règles, angle adapté au
tableau visé — c'est le principe du pont décrit dans `audience-bridge.md`, appliqué cette
fois au placement et pas seulement au texte.

| Épingle | Tableau visé | Pourquoi |
|---|---|---|
| `checklist-ouverture-commerce-matin` | **Productivité au travail** (`726416683586787011`) | Tableau historique, angle checklist/organisation : exactement ce que l'audience suit. |
| `qr-code-bar-happy-hour-ardoise-v2` | **Templates gratuits** (`726416683586787015`) | Tableau historique, angle « modèle à utiliser ». |
| `qr-code-pizzeria-carte-du-soir-v2` | **QR code restaurant** (`726416683586817614`) | Le **témoin** : tableau neuf, placement actuel. Point de comparaison. |

Lecture à J+7 : si les deux premières dépassent nettement la troisième, la cause n°1 est
confirmée et toute la stratégie de tableaux bascule sur les tableaux historiques, les
tableaux « QR code X » ne servant plus qu'en second épinglage. Si les trois restent à
zéro, la cause est le compte ou le domaine (n°2), et il faut régler cela **avant** de
produire une épingle de plus.

## Point mort à signaler

**Supermetrics : essai expiré le 30/08.** L'étape « apprentissage » de la tâche
quotidienne échoue donc en silence depuis quatre jours — le run continue sans données.
Les statistiques utilisées ici viennent de Buffer, qui donne les impressions et les
enregistrements mais **pas les clics sortants par épingle**. Soit on prend un abonnement,
soit on retire cette étape du run pour ne pas croire qu'elle tourne.

## Note sur le QR (correctif technique du jour)

Une URL longue (lien profond + UTM complets) produit un QR de version 9, soit 53 × 53
modules. Rétréci à l'affichage, il devient illisible. Le générateur fabrique désormais
l'image du QR **à la résolution finale exacte**, sans réduction, avec
`image-rendering: pixelated`. Le contrôleur, lui, rejoue la détection par tuiles : un
détecteur qui reçoit une affiche 2000 × 3000 décroche sur un motif occupant 8 % du cadre,
alors qu'un téléphone, qui cadre de près, le lit sans peine.
