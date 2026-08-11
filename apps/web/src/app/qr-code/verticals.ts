// Données des pages SEO « QR code par usage » (/qr-code/[usage]).
// Source unique alimentant la route dynamique + le hub + le sitemap + le JSON-LD.
// Contenu HONNÊTE : aucun chiffre inventé, aucun faux avis. Chaque usage renvoie à une
// vraie capacité QRowg (QR dynamique, blocs menu / avis / WiFi / événement / vCard).

export type FaqItem = { q: string; a: string }

export type Vertical = {
  slug: string
  emoji: string
  eyebrow: string          // petite étiquette au-dessus du titre
  metaTitle: string        // <title>
  metaDescription: string  // meta description (~155 car.)
  h1: string
  intro: string            // paragraphe d'accroche
  problems: { pain: string; gain: string }[] // ❌ problème → ✅ solution
  features: { title: string; desc: string }[]
  steps: string[]          // « Comment ça marche »
  faq: FaqItem[]           // affiché + schéma FAQPage
  ctaTitle: string
  related: string[]        // slugs pour le maillage interne
}

export const VERTICALS: Record<string, Vertical> = {
  restaurant: {
    slug: "restaurant",
    emoji: "🍽️",
    eyebrow: "Restaurants & bars",
    metaTitle: "QR code pour restaurant : menu, réservation et avis | QRowg",
    metaDescription: "Créez un QR code pour votre restaurant : menu numérique modifiable sans réimprimer, réservation, avis Google et suivi des scans. Prêt à imprimer en 5 minutes.",
    h1: "Le QR code qui fait travailler votre restaurant",
    intro: "Un seul QR code sur vos tables et votre vitrine : vos clients consultent votre menu à jour, réservent, vous appellent et laissent un avis — et vous voyez enfin ce qui fonctionne.",
    problems: [
      { pain: "Réimprimer les menus à chaque changement de prix ou de plat.", gain: "Modifiez votre menu quand vous voulez : le QR déjà imprimé reste identique." },
      { pain: "Ne pas savoir combien de clients consultent vraiment votre carte.", gain: "Suivez les scans par table, par jour et par appareil." },
      { pain: "Peu d'avis Google malgré des clients satisfaits.", gain: "Un bouton « Laisser un avis » transforme vos clients contents en avis." },
    ],
    features: [
      { title: "Menu numérique modifiable", desc: "Catégories, plats, prix, allergènes, photos. Mis à jour en temps réel, sans réimpression." },
      { title: "Réservation & appel en un geste", desc: "Boutons Réserver, Appeler, WhatsApp et itinéraire directement sur la page." },
      { title: "Avis Google intégré", desc: "Un bouton dédié dirige vos clients satisfaits vers votre fiche Google." },
      { title: "Supports prêts à imprimer", desc: "Chevalet de table, sticker vitrine, affiche — avec votre QR et votre marque." },
    ],
    steps: [
      "Choisissez un modèle restaurant et ajoutez votre menu.",
      "Personnalisez couleurs, logo et boutons (réserver, avis, WhatsApp).",
      "Générez votre QR code dynamique et imprimez vos supports.",
      "Suivez les scans et ajustez votre carte quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je changer mon menu sans réimprimer le QR code ?", a: "Oui. Le QR code est dynamique : il reste identique sur vos supports imprimés, et vous modifiez le menu autant de fois que vous voulez." },
      { q: "Puis-je mettre un QR différent par table ?", a: "Oui. Vous pouvez créer plusieurs QR codes pointant vers la même carte pour mesurer les scans par emplacement (tables, vitrine, flyers)." },
      { q: "Est-ce que ça fonctionne pour un menu avec allergènes et photos ?", a: "Oui. Chaque plat peut afficher description, prix, allergènes et photo, organisés par catégories." },
    ],
    ctaTitle: "Créez le QR code de votre restaurant",
    related: ["menu", "avis-google", "wifi"],
  },

  menu: {
    slug: "menu",
    emoji: "📋",
    eyebrow: "Menu numérique",
    metaTitle: "QR code menu : créer une carte numérique modifiable | QRowg",
    metaDescription: "Créez un QR code menu pour afficher votre carte numérique. Modifiable à tout moment sans réimprimer, avec photos, prix et allergènes. Prêt à imprimer.",
    h1: "Votre carte, en QR code — modifiable à volonté",
    intro: "Affichez un menu numérique clair et à jour d'un simple scan. Changez un prix, ajoutez un plat du jour, masquez une rupture : le QR imprimé ne bouge pas.",
    problems: [
      { pain: "Des cartes plastifiées coûteuses et vite périmées.", gain: "Une carte numérique mise à jour en quelques secondes." },
      { pain: "Un PDF lourd qui s'ouvre mal sur mobile.", gain: "Une page mobile rapide, lisible et cliquable." },
      { pain: "Impossible de signaler un plat du jour facilement.", gain: "Ajoutez, masquez ou réorganisez vos plats à tout moment." },
    ],
    features: [
      { title: "Catégories & plats illimités", desc: "Entrées, plats, desserts, boissons — avec prix, description, allergènes et photo." },
      { title: "Mise à jour instantanée", desc: "La page reflète vos changements immédiatement, sans nouvelle impression." },
      { title: "Rapide sur mobile", desc: "Conçu pour s'ouvrir en moins d'une seconde après le scan, même en 4G." },
      { title: "Import depuis un tableur", desc: "Collez votre carte depuis Excel ou un tableau : QRowg la structure pour vous." },
    ],
    steps: [
      "Ajoutez vos catégories et vos plats (ou importez-les depuis un tableur).",
      "Réglez le style pour coller à votre identité.",
      "Générez le QR code et imprimez-le sur vos tables.",
      "Modifiez la carte quand vous voulez — le QR reste le même.",
    ],
    faq: [
      { q: "Le menu fonctionne-t-il sans application à installer ?", a: "Oui. Vos clients scannent le QR code et la carte s'ouvre directement dans leur navigateur, sans rien installer." },
      { q: "Puis-je afficher les allergènes et les photos ?", a: "Oui. Chaque plat peut inclure une description, un prix, les allergènes et une photo." },
      { q: "Combien de temps le QR code reste-t-il valable ?", a: "Un QR code dynamique reste valable tant que votre page est active — il ne cesse jamais brutalement de fonctionner." },
    ],
    ctaTitle: "Créez votre QR code menu",
    related: ["restaurant", "wifi", "avis-google"],
  },

  "avis-google": {
    slug: "avis-google",
    emoji: "⭐",
    eyebrow: "Avis Google",
    metaTitle: "QR code avis Google : collecter plus d'avis clients | QRowg",
    metaDescription: "Créez un QR code avis Google pour transformer vos clients satisfaits en avis. Un scan, un clic, un avis. Suivi des scans inclus. Prêt à imprimer.",
    h1: "Transformez vos clients satisfaits en avis Google",
    intro: "Placez un QR code là où vos clients sont contents — table, comptoir, ticket, vitrine. Un scan les amène directement à votre fiche Google pour laisser un avis.",
    problems: [
      { pain: "Des clients ravis… qui ne laissent jamais d'avis.", gain: "Un chemin ultra-court : scan → clic → avis." },
      { pain: "Le lien Google est trop long à taper.", gain: "Le QR code ouvre directement votre page d'avis." },
      { pain: "Aucune idée de ce qui déclenche les avis.", gain: "Suivez combien de personnes scannent, et quand." },
    ],
    features: [
      { title: "Redirection directe", desc: "Le QR code mène droit à votre fiche Google, prêt à noter." },
      { title: "À placer partout", desc: "Chevalet, sticker, ticket de caisse, carte de fidélité, vitrine." },
      { title: "Modifiable", desc: "Changez la destination (Google, Tripadvisor, autre) sans réimprimer." },
      { title: "Suivi des scans", desc: "Mesurez l'impact de chaque emplacement sur vos demandes d'avis." },
    ],
    steps: [
      "Renseignez le lien de votre fiche Google.",
      "Personnalisez le QR code à votre image.",
      "Imprimez-le sur vos supports (chevalet, ticket, vitrine).",
      "Suivez les scans et testez les meilleurs emplacements.",
    ],
    faq: [
      { q: "Le QR envoie-t-il directement vers la page d'avis ?", a: "Oui. Vous renseignez le lien de votre fiche Google et le QR code y mène directement, prêt pour un avis." },
      { q: "Puis-je changer la destination plus tard ?", a: "Oui. C'est un QR code dynamique : vous pouvez modifier la destination à tout moment sans réimprimer." },
      { q: "QRowg génère-t-il de faux avis ?", a: "Non, jamais. QRowg facilite seulement la demande d'avis auprès de vos vrais clients — les avis restent 100 % authentiques." },
    ],
    ctaTitle: "Créez votre QR code avis Google",
    related: ["restaurant", "carte-de-visite", "menu"],
  },

  wifi: {
    slug: "wifi",
    emoji: "📶",
    eyebrow: "WiFi",
    metaTitle: "QR code WiFi : connexion en un scan (gratuit) | QRowg",
    metaDescription: "Créez un QR code WiFi : vos visiteurs se connectent en un scan, sans taper le mot de passe. Fonctionne hors ligne, prêt à imprimer sur une affiche.",
    h1: "Vos invités se connectent au WiFi en un scan",
    intro: "Fini le mot de passe à dicter ou à afficher en gros. Un QR code WiFi connecte vos clients au réseau instantanément — idéal sur une table, un mur ou une affiche.",
    problems: [
      { pain: "Répéter le mot de passe WiFi toute la journée.", gain: "Un scan connecte automatiquement, sans rien taper." },
      { pain: "Un mot de passe compliqué mal recopié.", gain: "Plus d'erreur de saisie : la connexion est automatique." },
      { pain: "Une affiche « mot de passe » peu esthétique.", gain: "Un QR code propre, à votre image, prêt à imprimer." },
    ],
    features: [
      { title: "Connexion automatique", desc: "Le QR encode le réseau et le mot de passe : le téléphone propose de rejoindre." },
      { title: "Fonctionne hors ligne", desc: "Le QR WiFi encode l'info directement — aucun réseau requis au moment du scan." },
      { title: "Sécurité au choix", desc: "WPA/WPA2, WEP ou réseau ouvert." },
      { title: "Design imprimable", desc: "Couleurs, logo et cadre pour un affichage soigné." },
    ],
    steps: [
      "Entrez le nom du réseau et le mot de passe.",
      "Choisissez le type de sécurité et le style du QR.",
      "Téléchargez le QR en haute résolution.",
      "Imprimez-le sur une affichette ou un chevalet.",
    ],
    faq: [
      { q: "Le QR code WiFi fonctionne-t-il sans connexion Internet ?", a: "Oui. Il encode directement le réseau et le mot de passe : il fonctionne même sans réseau au moment du scan, et pour toujours." },
      { q: "Est-ce compatible iPhone et Android ?", a: "Oui. Les appareils récents iOS et Android proposent de rejoindre le réseau automatiquement au scan." },
      { q: "Est-ce sécurisé d'afficher mon WiFi en QR code ?", a: "Le QR contient le mot de passe comme une affichette classique. Pour un usage public, prévoyez un réseau invité dédié." },
    ],
    ctaTitle: "Créez votre QR code WiFi",
    related: ["restaurant", "menu", "evenement"],
  },

  evenement: {
    slug: "evenement",
    emoji: "🎪",
    eyebrow: "Événements",
    metaTitle: "QR code pour événement : programme, infos et billetterie | QRowg",
    metaDescription: "Créez un QR code pour votre événement : programme à jour, plan, infos pratiques et billetterie. Modifiable en temps réel, prêt à imprimer sur vos supports.",
    h1: "Un QR code pour tout votre événement",
    intro: "Programme, horaires, plan d'accès, intervenants, billetterie : rassemblez tout sur une page, accessible d'un scan — et mettez-la à jour en direct le jour J.",
    problems: [
      { pain: "Un programme papier figé qui devient faux au moindre changement.", gain: "Mettez à jour horaires et infos en temps réel." },
      { pain: "Des flyers qui ne mènent nulle part.", gain: "Un QR code qui ouvre toutes les infos utiles." },
      { pain: "Difficile de mesurer l'intérêt d'un support.", gain: "Suivez les scans par affiche, flyer ou story." },
    ],
    features: [
      { title: "Programme & timeline", desc: "Horaires, intervenants, temps forts — mis à jour quand vous voulez." },
      { title: "Infos pratiques", desc: "Plan d'accès, itinéraire, contacts, FAQ, billetterie externe." },
      { title: "Lien vers la billetterie", desc: "Renvoyez vers votre plateforme de vente en un bouton." },
      { title: "Suivi par support", desc: "Comparez les scans de vos affiches, flyers et publications." },
    ],
    steps: [
      "Composez votre page : programme, plan, contacts, billetterie.",
      "Personnalisez-la aux couleurs de l'événement.",
      "Générez le QR code et imprimez vos supports.",
      "Mettez à jour le programme en direct pendant l'événement.",
    ],
    faq: [
      { q: "Puis-je modifier le programme après impression des affiches ?", a: "Oui. Le QR code reste identique, et vous modifiez le programme et les infos autant que nécessaire — même le jour J." },
      { q: "Puis-je renvoyer vers ma billetterie ?", a: "Oui. Ajoutez un bouton qui pointe vers votre plateforme de billetterie existante." },
      { q: "Puis-je savoir quel flyer marche le mieux ?", a: "Oui. Créez un QR par support pour comparer les scans par affiche, flyer ou publication." },
    ],
    ctaTitle: "Créez le QR code de votre événement",
    related: ["carte-de-visite", "wifi", "avis-google"],
  },

  "carte-de-visite": {
    slug: "carte-de-visite",
    emoji: "👤",
    eyebrow: "Carte de visite",
    metaTitle: "QR code carte de visite (vCard) : partagez vos coordonnées | QRowg",
    metaDescription: "Créez un QR code de carte de visite : vos coordonnées, liens et boutons d'action en un scan. Enregistrement du contact en un geste. Prêt à imprimer.",
    h1: "Votre carte de visite, en un scan",
    intro: "Remplacez la carte papier par une page pro : coordonnées, réseaux, site, boutons Appeler et WhatsApp — et l'enregistrement du contact en un geste.",
    problems: [
      { pain: "Des cartes papier qui finissent au fond d'une poche.", gain: "Une page mémorable qu'on garde et qu'on partage." },
      { pain: "Réimprimer à chaque changement de poste ou de numéro.", gain: "Modifiez vos infos sans réimprimer le QR." },
      { pain: "Coordonnées recopiées à la main, avec erreurs.", gain: "Enregistrement du contact en un geste (vCard)." },
    ],
    features: [
      { title: "Contact enregistrable (vCard)", desc: "Un bouton ajoute votre contact au téléphone, sans faute de frappe." },
      { title: "Tous vos liens réunis", desc: "Téléphone, email, site, LinkedIn, Instagram, WhatsApp, itinéraire." },
      { title: "Toujours à jour", desc: "Changez de poste, de numéro ou de photo sans réimprimer." },
      { title: "À votre image", desc: "Couleurs, logo et style — une première impression soignée." },
    ],
    steps: [
      "Renseignez vos coordonnées et vos liens.",
      "Personnalisez la page et le QR à votre image.",
      "Imprimez le QR sur votre carte, votre badge ou votre vitrine.",
      "Mettez à jour vos infos quand vous voulez.",
    ],
    faq: [
      { q: "Le contact s'enregistre-t-il vraiment en un clic ?", a: "Oui. La page propose d'ajouter votre contact (vCard) au téléphone : coordonnées enregistrées sans recopie." },
      { q: "Puis-je changer mon numéro sans refaire mes cartes ?", a: "Oui. Vos infos se mettent à jour côté page ; le QR code imprimé reste identique." },
      { q: "Puis-je mettre mes réseaux sociaux ?", a: "Oui. Ajoutez autant de liens que vous voulez : LinkedIn, Instagram, site, WhatsApp, etc." },
    ],
    ctaTitle: "Créez votre QR code de carte de visite",
    related: ["avis-google", "evenement", "restaurant"],
  },
}

export const VERTICAL_SLUGS = Object.keys(VERTICALS)
export const getVertical = (slug: string): Vertical | undefined => VERTICALS[slug]
// Ordre d'affichage du hub /qr-code (le plus recherché en premier).
export const VERTICAL_ORDER = ["restaurant", "menu", "avis-google", "wifi", "evenement", "carte-de-visite"]
