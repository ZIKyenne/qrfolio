// Données des GUIDES SEO/GEO (/guides/[slug]). Contenu informationnel structuré (réponse
// directe « En bref », sections H2, tableaux, FAQ) pensé pour être cité par les moteurs
// génératifs (ChatGPT, Gemini, Claude). Source unique alimentant route + hub + sitemap + JSON-LD.
// HONNÊTE : aucun chiffre inventé ; décrit le comportement réel de QRowg.

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
}

// Date de dernière révision (Article: datePublished/dateModified). Statique = pas de Date.now().
export const GUIDES_UPDATED = "2026-08-11"

export const GUIDES: Record<string, Guide> = {
  "qr-code-dynamique-vs-statique": {
    slug: "qr-code-dynamique-vs-statique",
    emoji: "🔀",
    category: "Les bases",
    metaTitle: "QR code dynamique ou statique : quelle différence ? | QRowg",
    metaDescription: "QR code statique vs dynamique : définitions, tableau comparatif et conseils pour choisir. Le statique est figé et gratuit ; le dynamique est modifiable et mesurable.",
    h1: "QR code dynamique ou statique : quelle différence ?",
    lede: "Deux QR codes peuvent se ressembler à l'écran mais se comporter très différemment. Voici comment choisir en connaissance de cause.",
    tldr: "Un QR code statique encode son contenu directement : gratuit et permanent, mais figé. Un QR code dynamique pointe vers une adresse modifiable à tout moment, avec suivi des scans — idéal dès qu'il est imprimé ou utilisé en pro.",
    sections: [
      { h2: "Qu'est-ce qu'un QR code statique ?", body: ["Un QR code statique contient directement l'information (une URL, un texte, un réseau WiFi). Rien n'est stocké côté serveur : le contenu est « gravé » dans les modules du QR."], bullets: ["✅ Gratuit et permanent, fonctionne même hors ligne", "✅ Aucune dépendance à un service tiers", "❌ Impossible de changer le contenu après création", "❌ Aucun suivi des scans"] },
      { h2: "Qu'est-ce qu'un QR code dynamique ?", body: ["Un QR code dynamique encode une courte adresse de redirection. Au scan, un serveur compte le passage puis renvoie vers la destination réelle — que vous pouvez modifier à tout moment."], bullets: ["✅ Destination modifiable sans réimprimer", "✅ Suivi des scans (nombre, date, appareil, pays)", "✅ Un même QR peut évoluer dans le temps", "❌ Nécessite une connexion au scan et un abonnement pour rester actif"] },
      { h2: "Tableau comparatif", table: { head: ["Critère", "Statique", "Dynamique"], rows: [["Modifiable après impression", "Non", "Oui"], ["Suivi des scans", "Non", "Oui"], ["Fonctionne hors ligne", "Oui", "Redirection requise"], ["Coût", "Gratuit", "Abonnement"], ["Durée de vie", "Permanent", "Tant que l'abonnement est actif"]] } },
      { h2: "Lequel choisir ?", bullets: ["Choisissez le statique pour un usage ponctuel, un QR WiFi ou un contenu qui ne changera jamais.", "Choisissez le dynamique dès que le QR est imprimé en quantité, doit évoluer (menu, promo, destination) ou que vous voulez mesurer son impact."] },
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
    metaTitle: "Comment créer un QR code : le guide complet (2026) | QRowg",
    metaDescription: "Comment créer un QR code étape par étape : choisir le type, générer, personnaliser, vérifier la scannabilité et télécharger en PNG ou SVG. Guide clair et gratuit.",
    h1: "Comment créer un QR code : le guide complet",
    lede: "Créer un QR code prend quelques minutes. Ce guide couvre les types, les étapes, la personnalisation et les pièges à éviter.",
    tldr: "Choisissez le type de contenu (lien, WiFi, texte…), générez le QR avec un outil en ligne, personnalisez-le (couleurs, logo), vérifiez qu'il est scannable, puis téléchargez-le en PNG ou SVG pour l'imprimer.",
    sections: [
      { h2: "1. Choisissez le type de contenu", body: ["Un QR code peut encoder différents contenus. Les plus courants :"], bullets: ["Lien vers un site, une page ou un réseau social", "Réseau WiFi (connexion automatique)", "Texte libre", "Adresse email ou numéro de téléphone", "Carte de visite (vCard)"] },
      { h2: "2. Générez le QR code", body: ["Utilisez un générateur en ligne : saisissez votre contenu, le QR se génère en direct. Un générateur gratuit suffit pour un QR statique."] },
      { h2: "3. Personnalisez (sans casser la scannabilité)", body: ["Vous pouvez changer les couleurs, le style des modules et ajouter un logo au centre. Gardez toujours un contraste fort et une marge blanche."] },
      { h2: "4. Vérifiez et téléchargez", body: ["Testez le QR sur plusieurs téléphones avant impression. Téléchargez-le en PNG haute résolution ou en SVG (vectoriel) pour une impression nette à toute taille."] },
      { h2: "Statique ou dynamique ?", body: ["Pour un QR que vous imprimerez et pourriez vouloir modifier ensuite (ou mesurer), préférez un QR code dynamique. Sinon, un QR statique gratuit suffit."] },
    ],
    faq: [
      { q: "Créer un QR code est-il gratuit ?", a: "Oui pour un QR code statique : un générateur gratuit permet de le créer et de le télécharger sans compte. Le QR dynamique (modifiable, avec statistiques) nécessite un abonnement." },
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
    metaTitle: "Quelle taille pour un QR code à imprimer ? | QRowg",
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
    metaTitle: "Comment créer un QR code toujours scannable | QRowg",
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
    metaTitle: "Comment suivre les scans d'un QR code (statistiques) | QRowg",
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
}

export const GUIDE_SLUGS = Object.keys(GUIDES)
export const getGuide = (slug: string): Guide | undefined => GUIDES[slug]
// Ordre d'affichage du hub /guides.
export const GUIDE_ORDER = [
  "qr-code-dynamique-vs-statique", "comment-creer-un-qr-code", "taille-qr-code-impression",
  "qr-code-scannable", "qr-code-avec-statistiques",
]
