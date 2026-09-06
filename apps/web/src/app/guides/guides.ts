// Données des GUIDES SEO/GEO (/guides/[slug]). Contenu informationnel structuré (réponse
// directe « En bref », sections H2, tableaux, FAQ) pensé pour être cité par les moteurs
// génératifs (ChatGPT, Gemini, Claude). Source unique alimentant route + hub + sitemap + JSON-LD.
// HONNÊTE : aucun chiffre inventé ; décrit le comportement réel de QRowg.

import { PLANS } from "@/lib/plans"
import { phraseHebergement } from "@/lib/editeur"

export type GuideSection = {
  h2: string
  body?: string[]
  bullets?: string[]
  table?: { head: string[]; rows: string[][] }
}
export type Guide = {
  slug: string
  emoji: string
  category: string
  metaTitle: string
  metaDescription: string
  h1: string
  lede: string
  tldr: string // réponse directe en 1-2 phrases (featured snippet / GEO)
  sections: GuideSection[]
  faq: { q: string; a: string }[]
  related: string[]        // slugs d'autres guides
  relatedUsages: string[]  // slugs de /qr-code/[usage]
  cta: string
  /** Destination du bouton. Absente = déduite du libellé (voir la route). */
  ctaHref?: string
  /** Dernière révision de CE guide (AAAA-MM-JJ). Absente = GUIDES_UPDATED. */
  revise?: string
}

// Date de révision par défaut (Article: datePublished/dateModified). Statique = pas de Date.now().
export const GUIDES_UPDATED = "2026-08-11"

/** Date de révision d'un guide, en ISO. Le sitemap et le JSON-LD lisent la même. */
export function reviseLe(slug: string): string {
  return GUIDES[slug]?.revise || GUIDES_UPDATED
}

/** Image de partage d'un guide : la route opengraph-image du guide lui-même. */
export function imageGuide(slug: string, app: string): string {
  return `${app}/guides/${slug}/opengraph-image`
}

export const GUIDES: Record<string, Guide> = {
  "qr-code-dynamique-vs-statique": {
    slug: "qr-code-dynamique-vs-statique",
    emoji: "🔀",
    category: "Les bases",
    metaTitle: "QR code dynamique ou statique : quelle différence ?",
    metaDescription: "QR code statique ou dynamique : définitions, tableau comparatif et conseils. Le statique est figé et gratuit, le dynamique modifiable et mesurable.",
    h1: "QR code dynamique ou statique : quelle différence ?",
    lede: "Deux QR codes peuvent se ressembler à l'écran mais se comporter très différemment. Voici comment choisir en connaissance de cause.",
    tldr: "Un QR code statique encode son contenu directement : gratuit et permanent, mais figé. Un QR code dynamique pointe vers une adresse modifiable à tout moment, avec suivi des scans — idéal dès qu'il est imprimé ou utilisé en pro.",
    sections: [
      { h2: "Qu'est-ce qu'un QR code statique ?", body: ["Un QR code statique contient directement l'information (une URL, un texte, un réseau Wi-Fi). Rien n'est stocké côté serveur : le contenu est « gravé » dans les modules du QR."], bullets: ["✅ Gratuit et permanent, fonctionne même hors ligne", "✅ Aucune dépendance à un service tiers", "❌ Impossible de changer le contenu après création", "❌ Aucun suivi des scans"] },
      { h2: "Qu'est-ce qu'un QR code dynamique ?", body: ["Un QR code dynamique encode une courte adresse de redirection. Au scan, un serveur compte le passage puis renvoie vers la destination réelle — que vous pouvez modifier à tout moment."], bullets: ["✅ Destination modifiable sans réimprimer", "✅ Suivi des scans (nombre, date, appareil, pays)", "✅ Un même QR peut évoluer dans le temps", "❌ Nécessite une connexion au scan et un abonnement pour rester actif"] },
      { h2: "Tableau comparatif", table: { head: ["Critère", "Statique", "Dynamique"], rows: [["Modifiable après impression", "Non", "Oui"], ["Suivi des scans", "Non", "Oui"], ["Fonctionne hors ligne", "Oui", "Redirection requise"], ["Coût", "Gratuit", "Abonnement"], ["Durée de vie", "Permanent", "Tant que l'abonnement est actif"]] } },
      { h2: "Lequel choisir ?", bullets: ["Choisissez le statique pour un usage ponctuel, un QR Wi-Fi ou un contenu qui ne changera jamais.", "Choisissez le dynamique dès que le QR est imprimé en quantité, doit évoluer (menu, promo, destination) ou que vous voulez mesurer son impact."] },
    ],
    faq: [
      { q: "Un QR code dynamique peut-il devenir statique ?", a: "Non. La logique de redirection est différente. En revanche, vous pouvez toujours générer un nouveau QR statique séparément." },
      { q: "Un QR code statique expire-t-il ?", a: "Non. Comme le contenu est encodé directement, il fonctionne pour toujours, sans dépendre d'un service." },
      { q: "Peut-on suivre les scans d'un QR statique ?", a: "Non. Le suivi des scans nécessite une redirection, donc un QR code dynamique." },
    ],
    related: ["qr-code-avec-statistiques", "comment-creer-un-qr-code"],
    relatedUsages: ["restaurant", "menu"],
    cta: "Créer un QR code dynamique",
  },

  "comment-creer-un-qr-code": {
    slug: "comment-creer-un-qr-code",
    emoji: "🛠️",
    category: "Guide",
    metaTitle: "Comment créer un QR code : le guide complet (2026)",
    metaDescription: "Créer un QR code étape par étape : choisir le type, générer, personnaliser, vérifier qu'il scanne et télécharger en PNG ou SVG. Guide clair et gratuit.",
    h1: "Comment créer un QR code : le guide complet",
    lede: "Créer un QR code prend quelques minutes. Ce guide couvre les types, les étapes, la personnalisation et les pièges à éviter.",
    tldr: "Choisissez le type de contenu (lien, Wi-Fi, texte…), générez le QR avec un outil en ligne, personnalisez-le (couleurs, logo), vérifiez qu'il est scannable, puis téléchargez-le en PNG ou SVG pour l'imprimer.",
    sections: [
      { h2: "1. Choisissez le type de contenu", body: ["Un QR code peut encoder différents contenus. Les plus courants :"], bullets: ["Lien vers un site, une page ou un réseau social", "Réseau Wi-Fi (connexion automatique)", "Texte libre", "Adresse email ou numéro de téléphone", "Carte de visite (vCard)"] },
      { h2: "2. Générez le QR code", body: ["Utilisez un générateur en ligne : saisissez votre contenu, le QR se génère en direct. Un générateur gratuit suffit pour un QR statique."] },
      { h2: "3. Personnalisez (sans casser la scannabilité)", body: ["Vous pouvez changer les couleurs, le style des modules et ajouter un logo au centre. Gardez toujours un contraste fort et une marge blanche."] },
      { h2: "4. Vérifiez et téléchargez", body: ["Testez le QR sur plusieurs téléphones avant impression. Téléchargez-le en PNG haute résolution ou en SVG (vectoriel) pour une impression nette à toute taille."] },
      { h2: "Statique ou dynamique ?", body: ["Pour un QR que vous imprimerez et pourriez vouloir modifier ensuite (ou mesurer), préférez un QR code dynamique. Sinon, un QR statique gratuit suffit."] },
    ],
    faq: [
      { q: "Créer un QR code est-il gratuit ?", a: `Oui pour un QR code statique : un générateur gratuit permet de le créer et de le télécharger sans compte. Le QR dynamique (modifiable après impression, avec statistiques) est aussi accessible sans payer : le plan ${PLANS.free.label} en inclut ${PLANS.free.limits.dyn}, les plans payants davantage (${PLANS.pro.limits.dyn} en ${PLANS.pro.label}).` },
      { q: "Quel format choisir pour l'impression ?", a: "Le PNG haute résolution convient à la plupart des usages ; le SVG (vectoriel) reste net à n'importe quelle taille, idéal pour les grands formats." },
      { q: "Faut-il un logo sur le QR code ?", a: "C'est optionnel. Si vous en ajoutez un, augmentez le niveau de correction d'erreur pour que le QR reste lisible." },
    ],
    related: ["qr-code-dynamique-vs-statique", "qr-code-scannable"],
    relatedUsages: ["carte-de-visite", "wifi"],
    cta: "Créer mon QR code",
  },

  "taille-qr-code-impression": {
    slug: "taille-qr-code-impression",
    emoji: "📐",
    category: "Impression",
    metaTitle: "Quelle taille pour un QR code à imprimer ?",
    metaDescription: "Taille d'un QR code à imprimer : la règle du 1:10 (taille ≈ distance de scan ÷ 10), un tableau distance/taille, la marge blanche et la résolution recommandée.",
    h1: "Quelle taille pour un QR code à imprimer ?",
    lede: "Un QR trop petit ne se scanne pas ; trop grand, il gâche votre support. Voici comment trouver la bonne taille.",
    tldr: "Règle simple (1:10) : la taille du QR ≈ la distance de scan ÷ 10. Pour un scan à 30 cm, visez ~3 cm ; pour une affiche lue à 3 m, ~30 cm. Minimum recommandé : 2 × 2 cm.",
    sections: [
      { h2: "La règle du 1:10", body: ["La distance de lecture d'un QR code est environ 10 fois sa taille. Autrement dit : taille minimale ≈ distance de scan ÷ 10. Prévoyez une marge de sécurité en imprimant un peu plus grand."] },
      { h2: "Tableau distance → taille", table: { head: ["Support (distance de scan)", "Taille recommandée"], rows: [["Table, menu, carte (~30 cm)", "2,5 – 3 cm"], ["Flyer, brochure (~40 cm)", "3 cm"], ["Vitrine, chevalet (~1 m)", "8 – 12 cm"], ["Affiche (~3 m)", "~30 cm"], ["Panneau, façade (~5 m)", "~50 cm"]] } },
      { h2: "N'oubliez pas la marge blanche", body: ["Laissez une zone de silence (quiet zone) autour du QR, d'au moins 4 modules (l'équivalent d'un petit cadre vide). Sans elle, de nombreux lecteurs échouent."] },
      { h2: "Résolution et format", body: ["Pour l'impression, exportez en haute résolution (300 DPI) ou, mieux, en SVG vectoriel qui reste net à toute taille. Évitez d'agrandir un petit PNG : il devient flou."] },
      { h2: "Erreurs fréquentes", bullets: ["QR trop petit pour la distance réelle de scan", "Marge blanche supprimée pour « gagner de la place »", "Contraste insuffisant (couleurs proches)", "PNG basse résolution agrandi à l'impression"] },
    ],
    faq: [
      { q: "Quelle est la taille minimale d'un QR code ?", a: "En pratique, 2 × 2 cm est un minimum fiable pour un scan rapproché. En dessous, la lecture devient hasardeuse selon les téléphones." },
      { q: "Quel format pour une grande affiche ?", a: "Le SVG vectoriel : il reste parfaitement net quelle que soit la taille d'impression, contrairement à un PNG agrandi." },
      { q: "Faut-il vraiment une marge autour du QR ?", a: "Oui. La zone de silence (au moins 4 modules) est indispensable pour que les lecteurs isolent le QR du reste du visuel." },
    ],
    related: ["qr-code-scannable", "comment-creer-un-qr-code"],
    relatedUsages: ["restaurant", "evenement"],
    cta: "Générer un QR code prêt à imprimer",
  },

  "qr-code-scannable": {
    slug: "qr-code-scannable",
    emoji: "✅",
    category: "Bonnes pratiques",
    metaTitle: "Comment créer un QR code toujours scannable",
    metaDescription: "Un QR code fiable repose sur 4 règles : contraste fort, marge blanche, correction d'erreur adaptée et test réel avant impression. Guide pratique et exemples.",
    h1: "Comment créer un QR code toujours scannable",
    lede: "Un QR code n'a de valeur que s'il se scanne du premier coup. Voici les règles qui font la différence.",
    tldr: "Un QR code fiable respecte 4 règles : contraste fort (foncé sur clair), marge blanche autour, correction d'erreur suffisante (surtout avec un logo), et un test réel sur plusieurs téléphones avant l'impression.",
    sections: [
      { h2: "1. Un contraste fort", body: ["Les modules doivent être nettement plus foncés que le fond. Le classique noir sur blanc reste le plus sûr. Évitez couleur claire sur fond clair, ou l'inversion (modules clairs sur fond foncé), mal gérée par certains lecteurs."] },
      { h2: "2. Une marge blanche (quiet zone)", body: ["Gardez un cadre vide d'au moins 4 modules autour du QR. C'est ce qui permet au lecteur de l'isoler du reste du visuel."] },
      { h2: "3. Le bon niveau de correction d'erreur", body: ["La correction d'erreur (L, M, Q, H) permet au QR de rester lisible même partiellement abîmé ou masqué. Montez à un niveau élevé si vous ajoutez un logo ou imprimez sur une surface exposée."] },
      { h2: "4. Un logo raisonnable", body: ["Un logo au centre est possible, mais il masque des modules. Gardez-le petit (≈ 20 % du QR) et augmentez la correction d'erreur en conséquence."] },
      { h2: "5. Le test réel", body: ["Avant d'imprimer en quantité, scannez le QR avec plusieurs téléphones (iOS et Android), à la distance réelle d'usage et sous différents éclairages."] },
    ],
    faq: [
      { q: "Peut-on faire un QR code de couleur ?", a: "Oui, tant que le contraste reste fort entre les modules et le fond. Des couleurs trop proches ou un QR clair sur fond sombre réduisent la fiabilité." },
      { q: "Un logo empêche-t-il le scan ?", a: "Pas s'il reste petit et que la correction d'erreur est élevée. La redondance intégrée au QR compense la zone masquée." },
      { q: "Pourquoi mon QR code ne se scanne pas ?", a: "Le plus souvent : contraste insuffisant, marge blanche absente, taille trop petite pour la distance, ou impression basse résolution." },
    ],
    related: ["taille-qr-code-impression", "comment-creer-un-qr-code"],
    relatedUsages: ["restaurant", "boutique"],
    cta: "Générer un QR code scannable",
  },

  "qr-code-avec-statistiques": {
    slug: "qr-code-avec-statistiques",
    emoji: "📊",
    category: "Statistiques",
    metaTitle: "Comment suivre les scans d'un QR code (statistiques)",
    metaDescription: "Suivre les scans d'un QR code nécessite un QR dynamique : nombre de scans, date, appareil et pays. Découvrez comment ça marche et ce que vous pouvez mesurer.",
    h1: "Comment suivre les scans d'un QR code",
    lede: "Savoir combien de personnes scannent votre QR — et d'où — change la façon de piloter vos supports. Voici comment obtenir ces données.",
    tldr: "Le suivi des scans nécessite un QR code dynamique : le QR pointe vers une redirection qui compte chaque scan (nombre, date, appareil, pays) avant d'ouvrir la destination. Un QR code statique, lui, n'est pas mesurable.",
    sections: [
      { h2: "Pourquoi un QR statique n'est pas mesurable", body: ["Un QR code statique encode directement la destination : le téléphone y va sans passer par un serveur. Personne ne peut donc compter les scans."] },
      { h2: "Comment fonctionne le suivi (QR dynamique)", body: ["Un QR code dynamique encode une adresse de redirection. À chaque scan, un serveur enregistre le passage puis renvoie vers la destination. C'est cet intermédiaire qui rend la mesure possible."] },
      { h2: "Ce que vous pouvez mesurer", bullets: ["Nombre total de scans et évolution dans le temps", "Jour et heure des scans", "Type d'appareil (mobile, ordinateur, tablette)", "Pays d'origine", "Comparaison entre plusieurs QR (par support ou emplacement)"] },
      { h2: "Suivre par support physique", body: ["En créant un QR différent par emplacement (vitrine, table, flyer, carte), vous mesurez le ROI de chaque support : lequel génère le plus de scans et de conversions."] },
      { h2: "Et la vie privée ?", body: ["Le suivi porte sur des données agrégées (compteurs, type d'appareil, pays), pas sur l'identité des personnes. Informez vos visiteurs si vous collectez des données au-delà, conformément au RGPD."] },
    ],
    faq: [
      { q: "Peut-on suivre les scans d'un QR code gratuit ?", a: "Non. Un QR statique gratuit n'est pas mesurable. Le suivi nécessite un QR code dynamique." },
      { q: "Le suivi ralentit-il l'ouverture de la page ?", a: "Non de façon perceptible : la redirection est quasi instantanée, le comptage se fait en arrière-plan." },
      { q: "Puis-je savoir quel support fonctionne le mieux ?", a: "Oui, en utilisant un QR différent par support ou emplacement, puis en comparant leurs scans." },
    ],
    related: ["qr-code-dynamique-vs-statique", "comment-creer-un-qr-code"],
    relatedUsages: ["restaurant", "immobilier"],
    cta: "Créer un QR code avec statistiques",
  },

  "comment-scanner-un-qr-code": {
    slug: "comment-scanner-un-qr-code",
    emoji: "📱",
    category: "Guide",
    metaTitle: "Comment scanner un QR code (iPhone et Android)",
    metaDescription: "Comment scanner un QR code avec un iPhone ou un Android : avec l'appareil photo, depuis une photo de la galerie, et que faire si le QR ne se scanne pas.",
    h1: "Comment scanner un QR code (iPhone et Android)",
    lede: "Scanner un QR code ne demande aucune application sur la plupart des téléphones récents. Voici la marche à suivre, et les solutions si rien ne se passe.",
    tldr: "Sur iPhone comme sur Android récent, ouvrez l'appareil photo et visez le QR code : une notification apparaît, touchez-la pour ouvrir le lien. Aucune application à installer dans la majorité des cas.",
    sections: [
      { h2: "Scanner un QR code sur iPhone", body: ["Ouvrez l'application Appareil photo (mode Photo), visez le QR code sans prendre de photo, puis touchez la bannière qui apparaît en haut de l'écran."], bullets: ["Ouvrez l'appareil photo.", "Cadrez le QR code au centre.", "Touchez la notification pour ouvrir le lien."] },
      { h2: "Scanner un QR code sur Android", body: ["Sur la plupart des Android récents, l'appareil photo détecte les QR codes. Sinon, utilisez Google Lens (intégré à l'appareil photo ou à l'application Google)."], bullets: ["Ouvrez l'appareil photo et visez le QR.", "Touchez le lien proposé.", "Si rien n'apparaît : ouvrez Google Lens et cadrez le QR."] },
      { h2: "Scanner un QR code depuis une photo", body: ["Vous avez reçu un QR par message ou en capture d'écran ? Sur iPhone, ouvrez la photo et utilisez la détection intégrée (Texte en direct) ; sur Android, ouvrez l'image dans Google Lens ou Google Photos et touchez le QR."] },
      { h2: "Le QR code ne se scanne pas : que faire ?", bullets: ["Approchez ou éloignez le téléphone pour la mise au point.", "Nettoyez l'objectif et améliorez l'éclairage.", "Assurez-vous que tout le QR est dans le cadre, marge comprise.", "Essayez Google Lens ou une application de scan dédiée.", "Le QR est peut-être trop petit, flou ou peu contrasté à l'impression."] },
    ],
    faq: [
      { q: "Faut-il une application pour scanner un QR code ?", a: "Non, dans la plupart des cas. Les iPhone et les Android récents scannent les QR codes directement depuis l'appareil photo, sans application." },
      { q: "Comment scanner un QR code reçu sur le même téléphone ?", a: "Affichez ou enregistrez l'image, puis ouvrez-la dans Google Lens (Android) ou via la détection de l'appareil photo/Photos (iPhone) pour toucher le lien." },
      { q: "Pourquoi mon téléphone ne détecte pas le QR code ?", a: "Souvent un problème de mise au point, d'éclairage, de cadrage (marge coupée) ou un QR trop petit ou flou. Google Lens aide dans les cas difficiles." },
    ],
    related: ["comment-creer-un-qr-code", "qr-code-scannable"],
    relatedUsages: ["restaurant", "menu"],
    cta: "Créer mon QR code",
  },

  "personnaliser-qr-code": {
    slug: "personnaliser-qr-code",
    emoji: "🎨",
    category: "Bonnes pratiques",
    metaTitle: "Personnaliser un QR code : couleurs, logo et style",
    metaDescription: "Comment personnaliser un QR code (couleurs, logo, forme des modules) sans casser la scannabilité : les règles de contraste, de marge et de correction d'erreur.",
    h1: "Personnaliser un QR code sans casser la scannabilité",
    lede: "Un QR code à votre image inspire plus confiance qu'un carré noir générique — à condition de respecter quelques règles.",
    tldr: "Vous pouvez changer les couleurs, la forme des modules et ajouter un logo au centre d'un QR code. La règle d'or : garder un contraste fort, une marge blanche et une correction d'erreur élevée si vous ajoutez un logo.",
    sections: [
      { h2: "Ce que vous pouvez personnaliser", bullets: ["Couleur des modules et du fond", "Forme des modules et des coins (les « yeux »)", "Logo ou icône au centre", "Cadre et arrière-plan sur le support d'impression"] },
      { h2: "La règle du contraste", body: ["Les modules doivent rester nettement plus foncés que le fond. Foncé sur clair est le plus sûr ; évitez l'inversion (clair sur foncé) et les couleurs trop proches."] },
      { h2: "Ajouter un logo sans casser le scan", body: ["Un logo masque des modules au centre. Gardez-le petit (environ 20 % de la largeur) et montez la correction d'erreur (Q ou H) pour compenser la zone couverte."] },
      { h2: "Garder la marge blanche", body: ["La zone de silence autour du QR (au moins 4 modules) reste indispensable, même avec un design travaillé. Sans elle, de nombreux lecteurs échouent."] },
      { h2: "Toujours tester", body: ["Après personnalisation, scannez le QR sur plusieurs téléphones à la distance réelle. Une jauge de scannabilité, comme celle de QRowg, aide à rester dans le vert."] },
    ],
    faq: [
      { q: "Un QR code de couleur se scanne-t-il aussi bien ?", a: "Oui, tant que le contraste entre modules et fond reste fort. Des couleurs proches ou une inversion clair/foncé réduisent la fiabilité." },
      { q: "Quelle taille de logo maximum ?", a: "Autour de 20 % de la largeur du QR, avec une correction d'erreur élevée. Au-delà, le risque d'échec de lecture augmente." },
      { q: "Peut-on mettre une photo en fond du QR code ?", a: "C'est déconseillé : un fond chargé réduit le contraste. Préférez un fond uni et réservez la personnalisation aux couleurs, aux modules et au logo." },
    ],
    related: ["qr-code-scannable", "comment-creer-un-qr-code"],
    relatedUsages: ["carte-de-visite", "boutique"],
    cta: "Personnaliser mon QR code",
  },

  "duree-de-vie-qr-code": {
    slug: "duree-de-vie-qr-code",
    emoji: "⏳",
    category: "Les bases",
    metaTitle: "Un QR code expire-t-il ? Durée de vie et validité",
    metaDescription: "Un QR code statique n'expire jamais ; un QR code dynamique fonctionne tant que sa redirection reste active. Durée de vie et validité, expliquées.",
    h1: "Un QR code expire-t-il ? Durée de vie et validité",
    lede: "« Est-ce que mon QR code va cesser de fonctionner ? » Une question légitime, surtout avant d'imprimer en quantité. Voici la réponse claire.",
    tldr: "Un QR code statique n'expire jamais : son contenu est encodé directement. Un QR code dynamique fonctionne tant que sa redirection reste active (le plus souvent liée à un abonnement) — le QR lui-même ne « s'use » pas.",
    sections: [
      { h2: "Le QR code en lui-même ne s'use pas", body: ["Un QR code est un motif imprimé : il ne se périme pas physiquement. Ce qui peut cesser de fonctionner, c'est ce vers quoi il pointe."] },
      { h2: "QR statique : permanent", body: ["Un QR statique encode directement son contenu (lien, texte, Wi-Fi). Tant que l'imprimé est lisible, il fonctionne — pour toujours, sans dépendre d'un service."] },
      { h2: "QR dynamique : tant que la redirection est active", body: ["Un QR dynamique passe par une adresse de redirection. Il fonctionne tant que cette redirection reste active, le plus souvent tant que l'abonnement associé est en cours. Chez QRowg, un lien dynamique ne s'arrête pas brutalement sans que vous le sachiez."] },
      { h2: "Éviter les mauvaises surprises", bullets: ["Pour un support imprimé en masse, préférez un QR dynamique chez un fournisseur pérenne.", "Vérifiez la destination avant chaque grande impression.", "Gardez la main sur la destination pour la corriger sans réimprimer.", "Pour un usage ponctuel et définitif, un QR statique gratuit suffit."] },
      { h2: "Statique ou dynamique selon la durée ?", table: { head: ["Besoin", "Recommandation"], rows: [["Contenu qui ne changera jamais", "QR statique (permanent, gratuit)"], ["Support imprimé en quantité", "QR dynamique (corrigible sans réimprimer)"], ["Suivi des scans", "QR dynamique"], ["Usage unique et court", "QR statique"]] } },
    ],
    faq: [
      { q: "Un QR code statique peut-il expirer ?", a: "Non. Son contenu est encodé directement dans le motif : il fonctionne indéfiniment, sans dépendre d'un service en ligne." },
      { q: "Que se passe-t-il si j'arrête mon abonnement dynamique ?", a: "La redirection peut cesser de fonctionner. Chez QRowg, ce comportement est transparent : un lien ne s'arrête pas sans que vous en soyez informé." },
      { q: "Combien de temps un QR code dynamique reste-t-il valable ?", a: "Tant que sa redirection est active, généralement tant que l'abonnement associé est en cours. Le QR imprimé, lui, reste identique." },
    ],
    related: ["qr-code-dynamique-vs-statique", "qr-code-avec-statistiques"],
    relatedUsages: ["menu", "immobilier"],
    cta: "Créer un QR code dynamique",
  },
  "qr-code-ne-fonctionne-pas": {
    slug: "qr-code-ne-fonctionne-pas",
    emoji: "🚑",
    category: "Dépannage",
    metaTitle: "Mon QR code ne fonctionne pas : que faire ?",
    metaDescription: "QR code qui ne scanne pas : les huit causes réelles, dans l'ordre où les vérifier — contraste, taille, marge, pliure, reflet, logo, impression, lien mort.",
    h1: "Mon QR code ne fonctionne pas : que faire ?",
    lede: "Un QR qui refuse de se scanner a presque toujours l'une de ces huit causes. Vérifiez-les dans cet ordre : les premières sont les plus fréquentes.",
    tldr: "Dans neuf cas sur dix : contraste insuffisant, QR trop petit pour la distance, ou marge blanche supprimée. Testez d'abord à l'écran ; si ça marche à l'écran mais pas sur papier, le problème vient de l'impression.",
    sections: [
      { h2: "D'abord : à l'écran ou sur papier ?", body: ["Affichez le QR sur un écran et scannez-le. S'il fonctionne là et pas sur votre support imprimé, le code est bon : le problème vient de l'impression, de la taille ou du placement. S'il échoue déjà à l'écran, c'est le code ou sa destination."] },
      { h2: "Les huit causes, par fréquence", table: { head: ["Cause", "Comment la reconnaître", "Correction"], rows: [
        ["Contraste trop faible", "Couleurs proches, ou QR clair sur fond clair", "Foncez les modules, éclaircissez le fond"],
        ["QR trop petit", "Il faut coller le téléphone pour que ça marche", "Taille ≈ distance de scan ÷ 10"],
        ["Marge blanche supprimée", "Le QR touche un bord, une image ou du texte", "Laissez une zone vide d'au moins 4 modules autour"],
        ["Logo central trop grand", "Un logo mange le centre du code", "Réduisez-le : au-delà d'environ 30 %, la correction d'erreur ne suffit plus"],
        ["Pliure ou courbure", "Le QR est sur un pli, un angle ou une bouteille", "Déplacez-le sur une zone plane"],
        ["Reflet", "Vitrine, plastification brillante, écran", "Support mat, ou changez l'angle"],
        ["Impression floue", "Contours baveux, modules empâtés", "Exportez en SVG, ou en PNG à 300 DPI"],
        ["Lien mort", "Le scan marche, mais la page est en erreur", "Vérifiez la destination et sa publication"]] } },
      { h2: "Le cas particulier : ça scanne mais la page est vide", body: ["Là, le QR fonctionne parfaitement — c'est la destination qui pose problème. Vérifiez que la page est bien publiée, et que son adresse n'a pas changé.", "C'est l'intérêt d'un QR dynamique : la destination se corrige sans réimprimer quoi que ce soit. Avec un QR statique, l'adresse est gravée dans le code : il faut tout refaire."] },
      { h2: "Inverser les couleurs : mauvaise idée", body: ["Un QR clair sur fond sombre est lisible par certains téléphones et pas par d'autres : beaucoup de lecteurs attendent des modules sombres sur fond clair. Si le rendu inversé compte pour votre design, testez-le sur plusieurs appareils avant d'imprimer en série."] },
      { h2: "Tester avant d'imprimer en série", bullets: ["Imprimez UNE épreuve, à la taille réelle, sur le vrai support", "Scannez-la à la distance réelle d'utilisation", "Testez avec au moins deux téléphones différents", "Testez dans la lumière du lieu : une vitrine ensoleillée n'est pas un bureau"] },
    ],
    faq: [
      { q: "Pourquoi mon QR marche sur mon téléphone mais pas sur celui d'un client ?", a: "Les lecteurs n'ont pas tous la même tolérance. Un QR limite — contraste faible, taille juste, marge réduite — passe sur un appareil récent et échoue sur un autre. Corrigez la cause plutôt que de conclure que ça fonctionne." },
      { q: "Puis-je réparer un QR déjà imprimé ?", a: "Si le code est dynamique, oui : changez la destination, les supports restent valides. S'il est statique, l'adresse est encodée dans le dessin lui-même — il faut réimprimer." },
      { q: "Un QR abîmé fonctionne-t-il encore ?", a: "En partie. La correction d'erreur intégrée tolère une part de dégradation, mais une rayure sur un coin de repérage suffit souvent à le rendre illisible." },
      { q: "Faut-il une application pour scanner ?", a: "Non. Tous les téléphones vendus depuis 2018 environ scannent un QR avec l'appareil photo, sans rien installer." },
    ],
    related: ["qr-code-scannable", "taille-qr-code-impression", "qr-code-dynamique-vs-statique"],
    relatedUsages: ["restaurant", "boutique", "avis-google"],
    cta: "Créer un QR code fiable",
    ctaHref: "/generateur-qr-code",
  },

  "ou-placer-son-qr-code": {
    slug: "ou-placer-son-qr-code",
    emoji: "📍",
    category: "Impression",
    metaTitle: "Où placer son QR code dans un commerce ?",
    metaDescription: "Où poser un QR code pour qu'il soit vraiment scanné : les emplacements qui marchent par type de commerce, la hauteur, la distance, et les erreurs à éviter.",
    h1: "Où placer son QR code dans un commerce ?",
    lede: "Un QR code scanné, c'est d'abord un QR bien placé. L'endroit compte davantage que le design.",
    tldr: "Placez-le là où votre client a déjà les mains libres et une raison d'attendre : sur la table, au comptoir pendant l'encaissement, en vitrine côté rue. À hauteur des yeux, jamais au sol ni au plafond.",
    sections: [
      { h2: "La règle : un temps mort, les mains libres", body: ["On ne scanne pas en marchant, ni les bras chargés. Les emplacements qui fonctionnent sont ceux où la personne attend déjà : assise à une table, dans une file, devant une vitrine fermée, en salle d'attente.", "À l'inverse, un QR sur un sac de courses ou sur une porte qu'on pousse en sortant ne sera presque jamais scanné."] },
      { h2: "Par type de commerce", table: { head: ["Commerce", "Le meilleur emplacement", "Pourquoi"], rows: [
        ["Restaurant, café", "Sur la table (chevalet ou sticker)", "Le client est assis et attend"],
        ["Bar", "Sous le verre (sous-bock)", "Il arrive avec la commande, sans qu'on le demande"],
        ["Boulangerie, commerce", "Vitrine côté rue + comptoir", "La vitrine travaille porte fermée"],
        ["Coiffeur, institut", "À l'encaissement", "Moment naturel pour demander un avis"],
        ["Artisan, garage", "Sur la facture et le véhicule", "Le client garde le document"],
        ["Fleuriste", "Marque-page dans le bouquet", "Atteint celui qui reçoit, pas seulement l'acheteur"],
        ["Hôtel, camping", "Dans la chambre ou l'hébergement", "Le Wi-Fi est le premier besoin"],
        ["Événement", "Affiche sur les lieux de passage", "Grand format, lu de loin"]] } },
      { h2: "Hauteur et distance", body: ["Un QR se lit confortablement entre 1,20 m et 1,60 m du sol — hauteur des yeux d'une personne debout. En vitrine, visez le niveau du regard depuis le trottoir, pas le bas de la devanture.", "La taille suit la distance : environ un dixième de la distance de lecture. Un QR lu à un mètre demande une dizaine de centimètres."] },
      { h2: "Dites ce qu'il y a derrière", body: ["Un QR nu est rarement scanné. Une ligne suffit à changer les choses : « Scannez pour voir la carte », « Scannez pour le Wi-Fi », « Scannez pour laisser un avis ». La personne doit savoir ce qu'elle obtient avant de sortir son téléphone."] },
      { h2: "Les erreurs qui tuent un emplacement", bullets: ["Derrière une vitre qui reflète en plein soleil", "Sur une surface courbe : bouteille, colonne, coin de comptoir", "Trop bas — sous 1 m, il faut se pencher", "Sur un support qu'on emporte et qu'on jette", "Au milieu d'un mur d'affiches, où il disparaît"] },
      { h2: "Mesurer plutôt que deviner", body: ["Si vous hésitez entre deux emplacements, ne tranchez pas au feeling : créez un QR par emplacement. Ils mènent à la même page, mais chacun compte ses propres scans. Au bout de deux semaines, vous saurez lequel garder."] },
    ],
    faq: [
      { q: "Combien de QR codes différents faut-il ?", a: "Un par emplacement que vous voulez mesurer séparément. Tous peuvent mener à la même page : ce sont les compteurs qui diffèrent." },
      { q: "Faut-il mettre un QR sur le ticket de caisse ?", a: "C'est un bon emplacement pour demander un avis, à condition que le ticket ne soit pas jeté immédiatement. Une carte remise en main propre fonctionne souvent mieux." },
      { q: "Un autocollant tient-il sur une vitrine ?", a: "Oui, à condition de le poser à l'intérieur de la vitre pour le protéger des intempéries — en pensant à inverser le sens si l'adhésif est côté verre." },
    ],
    related: ["taille-qr-code-impression", "qr-code-scannable", "qr-code-avec-statistiques"],
    relatedUsages: ["restaurant", "boutique", "avis-google"],
    cta: "Créer mes supports imprimables",
    ctaHref: "/creer",
  },

  "qr-code-rgpd": {
    slug: "qr-code-rgpd",
    emoji: "⚖️",
    category: "Les bases",
    metaTitle: "QR code et RGPD : ce qu'il faut savoir",
    metaDescription: "QR code et RGPD : ce que mesure vraiment un QR dynamique, quand un bandeau cookies s'impose, ce que devient un formulaire de contact et vos obligations.",
    h1: "QR code et RGPD : ce qu'il faut savoir",
    lede: "Compter les scans n'est pas anodin au regard du droit. Voici ce qui est en jeu, en clair — sans jargon et sans dramatiser.",
    tldr: "Un QR code n'est qu'un lien : il ne collecte rien par lui-même. Ce sont la page d'arrivée et la mesure des scans qui relèvent du RGPD. Les statistiques agrégées posent peu de difficultés ; un formulaire de contact, lui, vous rend responsable des données reçues.",
    sections: [
      { h2: "Le QR code lui-même ne collecte rien", body: ["Un QR est un dessin qui encode du texte, le plus souvent une adresse. Le scanner n'envoie aucune donnée à qui que ce soit : c'est le téléphone qui lit le motif, hors ligne. Tant que la personne n'ouvre pas le lien, rien ne circule."] },
      { h2: "Ce que mesure un QR dynamique", body: ["Un QR dynamique passe par une adresse de redirection, ce qui permet de compter les scans. Ce que QRowg enregistre à ce moment : la date, le pays et la ville approximatifs, le type d'appareil (mobile, tablette, ordinateur), le système et le navigateur, la source (site référent, paramètres de campagne) et, sur une page, les blocs touchés. Pour compter les visiteurs uniques sans conserver l'adresse IP, une empreinte hachée (adresse, navigateur et sel secret) est calculée : elle ne permet pas de retrouver l'adresse. Ni nom, ni adresse e-mail, ni identifiant publicitaire.", "Ces mesures restent agrégées : elles servent à savoir qu'un support fonctionne, pas à suivre une personne. C'est une différence de nature avec le pistage publicitaire, et elle compte juridiquement."] },
      { h2: "Faut-il un bandeau cookies ?", body: ["La règle française, portée par la CNIL, distingue les traceurs strictement nécessaires — ou de mesure d'audience limitée à cette seule finalité — des traceurs publicitaires, qui exigent un consentement préalable.", "Une mesure d'audience simple, sans recoupement avec d'autres sites et sans usage publicitaire, peut relever de l'exemption. Ajoutez en revanche un pixel Meta ou Google Ads sur votre page, et vous basculez dans le régime du consentement : bandeau obligatoire."] },
      { h2: "Le formulaire de contact change tout", body: ["Dès que votre page recueille un nom, un e-mail ou un téléphone, vous devenez responsable de ces données. Trois obligations concrètes : dire à quoi elles servent, ne les garder que le temps utile, et pouvoir les supprimer sur demande.", "Chez QRowg, les messages reçus sont stockés chiffrés et hébergés dans l'Union européenne. Vous pouvez les exporter et les effacer depuis votre espace."] },
      { h2: "En pratique, pour un commerce", bullets: ["Indiquez sur votre page qui vous êtes et comment vous joindre", "Si vous avez un formulaire, dites en une phrase à quoi servent les réponses", "N'ajoutez un pixel publicitaire que si vous assumez le bandeau qui va avec", "Ne demandez que ce dont vous avez besoin : un champ en moins, c'est une obligation en moins"] },
      { h2: "Ce guide n'est pas un avis juridique", body: ["Nous décrivons le fonctionnement de QRowg et les principes généraux du RGPD. Votre situation peut appeler des obligations particulières — secteur réglementé, données sensibles, effectif. Pour un cas précis, l'interlocuteur juste est un juriste, ou directement la CNIL, qui publie des fiches pratiques gratuites."] },
    ],
    faq: [
      { q: "Dois-je déclarer mes QR codes à la CNIL ?", a: "Non. La déclaration préalable a disparu avec le RGPD en 2018. Vous devez en revanche pouvoir démontrer votre conformité si on vous le demande." },
      { q: "Les scans permettent-ils d'identifier une personne ?", a: "Pas dans QRowg : ce qui est enregistré — date, pays et ville approximatifs, appareil, navigateur, source, empreinte hachée non réversible — sert à compter, pas à désigner quelqu'un. Le détail exact figure dans la politique de confidentialité." },
      { q: "Où sont hébergées les données ?", a: `${phraseHebergement()} Les messages reçus via les formulaires sont lisibles uniquement par le propriétaire de la page, et supprimables à tout moment.` },
      { q: "Un QR code Wi-Fi pose-t-il un problème ?", a: "Non : il encode le nom du réseau et le mot de passe directement dans le motif. Rien ne transite par un serveur, il fonctionne même hors ligne." },
    ],
    related: ["qr-code-avec-statistiques", "qr-code-dynamique-vs-statique", "duree-de-vie-qr-code"],
    relatedUsages: ["avis-google", "restaurant", "wifi"],
    cta: "Créer un QR code",
  },

  "qr-code-gratuit-sans-inscription": {
    slug: "qr-code-gratuit-sans-inscription",
    emoji: "🎁",
    category: "Les bases",
    metaTitle: "QR code gratuit sans inscription : le vrai périmètre",
    metaDescription: "Créer un QR code gratuitement et sans compte : ce que vous obtenez vraiment, ce qui demande un compte, et le piège des générateurs qui expirent.",
    h1: "QR code gratuit sans inscription : ce qui est possible",
    lede: "Beaucoup de services promettent « gratuit et sans inscription », puis désactivent le code trois semaines plus tard. Voici où passe la vraie frontière.",
    tldr: "Un QR statique se crée et se télécharge sans compte, et fonctionne pour toujours : le contenu est encodé dans le dessin, personne ne peut l'éteindre. Un QR dynamique — modifiable, mesurable — passe forcément par un compte, parce qu'il dépend d'un service qui redirige.",
    sections: [
      { h2: "Pourquoi certains QR « gratuits » cessent de marcher", body: ["Un QR dynamique ne contient pas votre lien : il contient l'adresse d'un service, qui redirige vers vous. C'est ce qui permet de changer la destination après impression — et c'est aussi ce qui permet au service de couper la redirection le jour où l'essai se termine.", "Un QR statique, lui, encode directement votre contenu. Aucun intermédiaire, donc rien à couper. Il ne peut pas expirer."] },
      { h2: "Ce qui se fait sans compte", table: { head: ["Besoin", "Sans compte ?", "Pourquoi"], rows: [
        ["QR vers un lien", "Oui", "Contenu encodé directement"],
        ["QR Wi-Fi", "Oui", "Réseau et mot de passe dans le motif"],
        ["QR contact (vCard)", "Oui", "Fiche encodée dans le code"],
        ["QR texte, SMS, e-mail", "Oui", "Aucun serveur nécessaire"],
        ["Télécharger en PNG ou SVG", "Oui", "Rendu dans votre navigateur"],
        ["Composer une page", "Oui, chez QRowg", "Gardée dans votre navigateur"],
        ["Changer la destination après impression", "Non", "Suppose une redirection à votre nom"],
        ["Compter les scans", "Non", "Suppose un serveur qui les enregistre"],
        ["Publier la page en ligne", "Non", "Une page doit appartenir à quelqu'un"]] } },
      { h2: "Chez QRowg, concrètement", body: ["Le générateur crée et télécharge des QR statiques sans compte : ils sont à vous, définitivement, et fonctionnent hors ligne pour le Wi-Fi et les contacts.", "Vous pouvez aussi composer une page entière sans compte — choisir un modèle, écrire vos textes, voir le résultat. Le travail est gardé dans votre navigateur. Le compte n'intervient qu'au moment de publier, parce qu'il faut bien que la page ait une adresse et un propriétaire."] },
      { h2: "Statique ou dynamique : comment choisir", bullets: ["Le contenu ne changera jamais (Wi-Fi, coordonnées) → statique, sans compte", "Vous imprimez en série et le contenu peut évoluer → dynamique", "Vous voulez savoir si le support fonctionne → dynamique", "Vous testez une idée avant d'investir → statique pour commencer"] },
      { h2: "Les questions à poser avant de choisir un service", bullets: ["Le QR reste-t-il actif si j'arrête de payer ?", "Combien de scans avant que ça se bloque ?", "Puis-je exporter en vectoriel pour une grande impression ?", "Où sont hébergées les données de scan ?"] },
    ],
    faq: [
      { q: "Un QR code gratuit peut-il expirer ?", a: "Un QR statique, non : le contenu est dans le dessin. Un QR dynamique gratuit peut cesser de rediriger si le service le décide — c'est le modèle économique de beaucoup de générateurs." },
      { q: "Puis-je créer une page sans donner mon e-mail ?", a: "Chez QRowg, oui : vous composez la page et voyez le résultat sans compte. L'e-mail n'est demandé qu'au moment de la publier." },
      { q: "Le QR statique est-il de moins bonne qualité ?", a: "Non, c'est le même standard. La différence est fonctionnelle : le statique est figé, le dynamique est modifiable et mesurable." },
      { q: "Combien de QR statiques puis-je créer ?", a: "Autant que vous voulez : le rendu se fait dans votre navigateur, rien n'est décompté." },
    ],
    related: ["qr-code-dynamique-vs-statique", "duree-de-vie-qr-code", "comment-creer-un-qr-code"],
    relatedUsages: ["wifi", "carte-de-visite", "restaurant"],
    cta: "Créer un QR code gratuitement",
  },
}

export const GUIDE_SLUGS = Object.keys(GUIDES)
export const getGuide = (slug: string): Guide | undefined => GUIDES[slug]
// Ordre d'affichage du hub /guides.
export const GUIDE_ORDER = [
  "qr-code-dynamique-vs-statique", "comment-creer-un-qr-code", "comment-scanner-un-qr-code",
  "personnaliser-qr-code", "taille-qr-code-impression", "qr-code-scannable",
  "qr-code-avec-statistiques", "duree-de-vie-qr-code",
  "qr-code-ne-fonctionne-pas", "ou-placer-son-qr-code", "qr-code-rgpd",
  "qr-code-gratuit-sans-inscription",
]
