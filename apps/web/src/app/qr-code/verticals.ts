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
    metaTitle: "QR code pour restaurant : menu, réservation et avis",
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
    metaTitle: "QR code menu : créer une carte numérique modifiable",
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
    metaTitle: "QR code avis Google : collecter plus d'avis clients",
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
    metaTitle: "QR code WiFi : connexion en un scan (gratuit)",
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
    metaTitle: "QR code événement : programme, infos et billetterie",
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
    metaTitle: "QR code carte de visite : partagez vos coordonnées",
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

  instagram: {
    slug: "instagram",
    emoji: "📸",
    eyebrow: "Réseaux sociaux",
    metaTitle: "QR code Instagram & réseaux sociaux : un lien unique",
    metaDescription: "Créez un QR code qui réunit Instagram, TikTok, YouTube et tous vos réseaux sur une seule page. Modifiable, suivi des clics, prêt à imprimer.",
    h1: "Tous vos réseaux derrière un seul QR code",
    intro: "Instagram, TikTok, YouTube, site, boutique : réunissez tout sur une page, accessible d'un scan. Plus besoin de changer le lien de votre bio à chaque campagne.",
    problems: [
      { pain: "Un seul lien dans la bio, et trop de choses à y mettre.", gain: "Une page qui réunit tous vos liens et contenus." },
      { pain: "Réimprimer un flyer à chaque nouveau lien.", gain: "Modifiez la page : le QR imprimé reste identique." },
      { pain: "Aucune idée de ce sur quoi on clique.", gain: "Suivez les clics par lien et par source." },
    ],
    features: [
      { title: "Tous vos liens réunis", desc: "Instagram, TikTok, YouTube, Spotify, site, boutique — au même endroit." },
      { title: "Modifiable à volonté", desc: "Ajoutez, retirez ou réordonnez vos liens à tout moment." },
      { title: "Suivi des clics", desc: "Voyez quels liens et quels réseaux performent le mieux." },
      { title: "À votre image", desc: "Couleurs, photo et style — une page qui vous ressemble." },
    ],
    steps: [
      "Ajoutez vos réseaux et vos liens importants.",
      "Personnalisez la page et le QR à votre image.",
      "Partagez le lien ou imprimez le QR (story, flyer, vitrine).",
      "Mettez à jour vos liens quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je mettre plusieurs réseaux sur un même QR code ?", a: "Oui. La page réunit autant de liens que vous voulez : Instagram, TikTok, YouTube, site, boutique, etc." },
      { q: "Puis-je changer mes liens sans refaire le QR code ?", a: "Oui. Le QR code reste identique ; vous modifiez la page à tout moment." },
      { q: "Puis-je voir quels liens sont cliqués ?", a: "Oui. Le suivi des clics vous montre les liens et les sources les plus performants." },
    ],
    ctaTitle: "Créez votre QR code réseaux sociaux",
    related: ["carte-de-visite", "whatsapp", "avis-google"],
  },

  whatsapp: {
    slug: "whatsapp",
    emoji: "💬",
    eyebrow: "WhatsApp",
    metaTitle: "QR code WhatsApp : contactez-vous en un scan",
    metaDescription: "Créez un QR code WhatsApp : vos clients vous écrivent en un scan, avec un message pré-rempli. Idéal en vitrine, sur un flyer ou une carte. Prêt à imprimer.",
    h1: "Vos clients vous écrivent sur WhatsApp en un scan",
    intro: "Un QR code qui ouvre directement une conversation WhatsApp avec vous — message pré-rempli inclus. Parfait pour la vitrine, les flyers ou le service client.",
    problems: [
      { pain: "Un numéro à recopier pour vous écrire.", gain: "Un scan ouvre la conversation, sans saisie." },
      { pain: "Des demandes qui se perdent.", gain: "Toutes vos demandes arrivent au même endroit." },
      { pain: "Difficile de guider le premier message.", gain: "Pré-remplissez le message (ex. « Bonjour, je souhaite… »)." },
    ],
    features: [
      { title: "Conversation directe", desc: "Le QR ouvre WhatsApp sur votre numéro, prêt à écrire." },
      { title: "Message pré-rempli", desc: "Guidez la demande avec un texte d'amorce." },
      { title: "À placer partout", desc: "Vitrine, flyer, carte, ticket, page produit." },
      { title: "Modifiable", desc: "Changez le numéro ou le message sans réimprimer." },
    ],
    steps: [
      "Renseignez votre numéro WhatsApp et un message d'amorce.",
      "Personnalisez le QR à votre image.",
      "Imprimez-le sur vos supports.",
      "Recevez les messages directement sur WhatsApp.",
    ],
    faq: [
      { q: "Le QR code ouvre-t-il directement WhatsApp ?", a: "Oui. Au scan, WhatsApp s'ouvre sur une conversation avec votre numéro, message pré-rempli inclus." },
      { q: "Faut-il WhatsApp Business ?", a: "Non. Un numéro WhatsApp classique suffit ; WhatsApp Business ajoute simplement des options professionnelles." },
      { q: "Puis-je changer le numéro plus tard ?", a: "Oui, avec un QR code dynamique : vous modifiez le numéro sans réimprimer." },
    ],
    ctaTitle: "Créez votre QR code WhatsApp",
    related: ["carte-de-visite", "instagram", "restaurant"],
  },

  immobilier: {
    slug: "immobilier",
    emoji: "🏠",
    eyebrow: "Immobilier",
    metaTitle: "QR code immobilier : présentez un bien en un scan",
    metaDescription: "Créez un QR code pour vos biens : photos, visite virtuelle, informations et contact agent en un scan. Sur le panneau, la vitrine ou l'annonce.",
    h1: "Présentez vos biens immobiliers d'un simple scan",
    intro: "Sur un panneau « À vendre », en vitrine ou sur une annonce : un QR code donne accès aux photos, à la visite, aux informations et à votre contact — 24 h/24.",
    problems: [
      { pain: "Un panneau qui ne dit presque rien du bien.", gain: "Un scan ouvre photos, détails et contact." },
      { pain: "Des appels hors horaires manqués.", gain: "Vos prospects consultent le bien à toute heure." },
      { pain: "Impossible de savoir quel bien attire.", gain: "Suivez les scans par bien et par panneau." },
    ],
    features: [
      { title: "Fiche du bien complète", desc: "Photos, surface, prix, description et points forts." },
      { title: "Visite et documents", desc: "Lien vers la visite virtuelle, le plan ou le dossier." },
      { title: "Contact agent en un geste", desc: "Appel, WhatsApp, formulaire de demande de visite." },
      { title: "Suivi par bien", desc: "Mesurez l'intérêt de chaque panneau et de chaque annonce." },
    ],
    steps: [
      "Créez la page du bien (photos, infos, contact).",
      "Personnalisez-la aux couleurs de votre agence.",
      "Imprimez le QR sur le panneau, la vitrine ou l'annonce.",
      "Suivez les scans et actualisez le statut (vendu, sous offre).",
    ],
    faq: [
      { q: "Puis-je marquer un bien comme vendu sans changer le QR code ?", a: "Oui. Vous mettez à jour la page (statut, prix) ; le QR imprimé reste identique." },
      { q: "Puis-je intégrer une visite virtuelle ?", a: "Oui. Ajoutez un lien vers votre visite virtuelle, un plan ou un dossier complet." },
      { q: "Puis-je savoir quel panneau génère le plus d'intérêt ?", a: "Oui. Créez un QR code par bien pour comparer les scans par emplacement." },
    ],
    ctaTitle: "Créez le QR code de votre bien",
    related: ["carte-de-visite", "evenement", "avis-google"],
  },

  hotel: {
    slug: "hotel",
    emoji: "🏨",
    eyebrow: "Hôtels & locations",
    metaTitle: "QR code hôtel & location : WiFi, services et infos",
    metaDescription: "Créez un QR code pour votre hôtel ou location (Airbnb) : WiFi, check-in, services et recommandations en un scan. Modifiable, prêt à imprimer en chambre.",
    h1: "Tout ce que vos voyageurs doivent savoir, en un scan",
    intro: "WiFi, check-in, équipements, règles, bonnes adresses : rassemblez toutes les infos de votre hôtel ou de votre location sur une page, accessible d'un scan en chambre.",
    problems: [
      { pain: "Répondre sans cesse aux mêmes questions.", gain: "Toutes les réponses sur une page, en libre-service." },
      { pain: "Un livret d'accueil papier vite périmé.", gain: "Mettez à jour horaires, codes et infos en direct." },
      { pain: "Des voyageurs qui cherchent le WiFi.", gain: "Connexion WiFi et infos essentielles en un scan." },
    ],
    features: [
      { title: "Livret d'accueil numérique", desc: "Check-in, équipements, règles, contacts d'urgence." },
      { title: "WiFi intégré", desc: "Connexion au réseau sans taper le mot de passe." },
      { title: "Recommandations locales", desc: "Restaurants, activités et transports autour de vous." },
      { title: "Avis en fin de séjour", desc: "Un bouton pour laisser un avis Google ou Airbnb." },
    ],
    steps: [
      "Composez votre livret (WiFi, check-in, services, adresses).",
      "Personnalisez-le à votre image.",
      "Imprimez le QR en chambre et à l'accueil.",
      "Mettez à jour les infos quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je mettre à jour les infos sans réimprimer ?", a: "Oui. Le QR code reste identique ; vous modifiez le livret à tout moment (codes, horaires, contacts)." },
      { q: "Puis-je inclure la connexion WiFi ?", a: "Oui. Ajoutez la connexion WiFi pour que vos voyageurs se connectent en un geste." },
      { q: "Est-ce adapté aux locations Airbnb ?", a: "Tout à fait. Le livret numérique remplace le classeur papier et se met à jour à distance." },
    ],
    ctaTitle: "Créez le QR code de votre hébergement",
    related: ["wifi", "avis-google", "restaurant"],
  },

  salon: {
    slug: "salon",
    emoji: "💇",
    eyebrow: "Beauté & bien-être",
    metaTitle: "QR code coiffure & beauté : RDV et prestations",
    metaDescription: "Créez un QR code pour votre salon de coiffure, barbier ou institut : prestations, prise de rendez-vous, réseaux et avis en un scan. Prêt à imprimer.",
    h1: "Prestations, rendez-vous et avis — en un scan",
    intro: "En vitrine ou sur le fauteuil, un QR code présente vos prestations, ouvre la prise de rendez-vous et invite vos clients à laisser un avis.",
    problems: [
      { pain: "Des clients qui ne savent pas comment réserver.", gain: "Un bouton de prise de rendez-vous en un scan." },
      { pain: "Une carte des prestations vite obsolète.", gain: "Mettez à jour prestations et tarifs sans réimprimer." },
      { pain: "Peu d'avis malgré des clients fidèles.", gain: "Un bouton avis transforme les habitués en avis." },
    ],
    features: [
      { title: "Prestations & tarifs", desc: "Coupe, couleur, soin, barbe… avec descriptions et prix." },
      { title: "Prise de rendez-vous", desc: "Lien vers votre agenda ou votre plateforme de réservation." },
      { title: "Réseaux & portfolio", desc: "Instagram, photos avant/après, galerie de réalisations." },
      { title: "Avis en un geste", desc: "Dirigez vos clients satisfaits vers votre fiche Google." },
    ],
    steps: [
      "Ajoutez vos prestations, votre lien de réservation et vos réseaux.",
      "Personnalisez la page à votre image.",
      "Imprimez le QR en vitrine et sur le fauteuil.",
      "Mettez à jour prestations et tarifs quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je connecter mon outil de réservation ?", a: "Oui. Ajoutez un bouton qui pointe vers votre agenda ou votre plateforme de rendez-vous existante." },
      { q: "Puis-je changer mes tarifs sans réimprimer ?", a: "Oui. Le QR code reste identique ; vous modifiez prestations et tarifs à tout moment." },
      { q: "Puis-je montrer mes réalisations ?", a: "Oui. Ajoutez une galerie avant/après et un lien vers votre Instagram." },
    ],
    ctaTitle: "Créez le QR code de votre salon",
    related: ["avis-google", "instagram", "carte-de-visite"],
  },

  boutique: {
    slug: "boutique",
    emoji: "🛍️",
    eyebrow: "Boutiques & commerces",
    metaTitle: "QR code boutique : catalogue, promos et avis",
    metaDescription: "Créez un QR code pour votre boutique : catalogue, promotions, réseaux, horaires et avis en un scan. Sur la vitrine, l'étiquette ou le sac. Prêt à imprimer.",
    h1: "Votre boutique, prolongée sur le mobile de vos clients",
    intro: "En vitrine, sur une étiquette ou un sac, un QR code ouvre votre catalogue, vos promotions, vos réseaux et vos horaires — et ramène vos clients.",
    problems: [
      { pain: "Une vitrine fermée = un client perdu.", gain: "Vos infos et promos accessibles 24 h/24." },
      { pain: "Des promotions que personne ne voit.", gain: "Mettez en avant vos offres, actualisées en direct." },
      { pain: "Peu de clients qui reviennent.", gain: "Réseaux, fidélité et avis pour recréer le lien." },
    ],
    features: [
      { title: "Catalogue & nouveautés", desc: "Produits, photos, prix et nouveautés du moment." },
      { title: "Promotions à jour", desc: "Affichez et modifiez vos offres sans réimprimer." },
      { title: "Réseaux & fidélité", desc: "Instagram, programme de fidélité, newsletter." },
      { title: "Horaires & itinéraire", desc: "Horaires à jour, adresse et itinéraire en un geste." },
    ],
    steps: [
      "Composez votre page (catalogue, promos, réseaux, horaires).",
      "Personnalisez-la à votre image de marque.",
      "Imprimez le QR en vitrine, sur les étiquettes ou les sacs.",
      "Mettez à jour promos et horaires quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je changer mes promotions à tout moment ?", a: "Oui. Le QR code reste identique ; vous mettez à jour vos offres en direct." },
      { q: "Puis-je vendre en ligne depuis la page ?", a: "Vous pouvez renvoyer vers votre boutique en ligne ou votre moyen de paiement existant." },
      { q: "Est-ce adapté à un petit commerce ?", a: "Oui. C'est pensé pour être créé en quelques minutes, sans compétence technique." },
    ],
    ctaTitle: "Créez le QR code de votre boutique",
    related: ["avis-google", "instagram", "menu"],
  },

  pdf: {
    slug: "pdf",
    emoji: "📄",
    eyebrow: "Document PDF",
    metaTitle: "QR code PDF : partagez un document en un scan",
    metaDescription: "Créez un QR code PDF pour partager un document (menu, notice, catalogue, CV) en un scan. Remplacez le fichier sans changer le QR code. Prêt à imprimer.",
    h1: "Partagez n'importe quel PDF en un scan",
    intro: "Notice, catalogue, carte, tarif, dossier : un QR code ouvre votre document sur le téléphone de vos lecteurs. Et si le document change, vous le remplacez sans refaire le QR.",
    problems: [
      { pain: "Un PDF envoyé par email que personne ne retrouve.", gain: "Un QR code qui ouvre le document à tout moment." },
      { pain: "Réimprimer le QR à chaque nouvelle version du fichier.", gain: "Remplacez le PDF : le QR code reste identique." },
      { pain: "Un fichier lourd qui s'ouvre mal sur mobile.", gain: "Une page claire qui présente et ouvre votre document." },
    ],
    features: [
      { title: "Document toujours accessible", desc: "Votre PDF s'ouvre d'un scan, sans application à installer." },
      { title: "Version modifiable", desc: "Remplacez le fichier quand vous voulez ; le QR imprimé ne bouge pas." },
      { title: "Plusieurs documents", desc: "Regroupez notice, tarifs et catalogue sur une même page." },
      { title: "Suivi des scans", desc: "Voyez combien de personnes ouvrent votre document, et quand." },
    ],
    steps: [
      "Importez votre PDF (ou plusieurs) sur votre page.",
      "Personnalisez la page à votre image.",
      "Générez le QR code et imprimez-le où vous voulez.",
      "Remplacez le document quand il évolue — le QR reste le même.",
    ],
    faq: [
      { q: "Puis-je remplacer le PDF sans refaire le QR code ?", a: "Oui. Le QR code est dynamique : vous remplacez le document à tout moment, le QR imprimé reste identique." },
      { q: "Faut-il une application pour ouvrir le document ?", a: "Non. Le PDF s'ouvre directement dans le navigateur du téléphone, sans rien installer." },
      { q: "Puis-je mettre plusieurs documents derrière un seul QR code ?", a: "Oui. Regroupez plusieurs documents sur une même page : notice, tarifs, catalogue, etc." },
    ],
    ctaTitle: "Créez votre QR code PDF",
    related: ["menu", "carte-de-visite", "boutique"],
  },

  "food-truck": {
    slug: "food-truck",
    emoji: "🚚",
    eyebrow: "Food truck",
    metaTitle: "QR code food truck : emplacement du jour et menu",
    metaDescription: "Créez un QR code pour votre food truck : emplacement du jour, menu, horaires et réseaux en un scan. Mettez à jour votre position sans réimprimer.",
    h1: "Votre food truck retrouvé où que vous soyez",
    intro: "Emplacement du jour, menu, horaires, réseaux : un QR code rassemble tout, et vous mettez à jour votre position à chaque service — sans jamais réimprimer.",
    problems: [
      { pain: "Vos clients ne savent pas où vous êtes aujourd'hui.", gain: "Indiquez votre emplacement du jour, mis à jour en direct." },
      { pain: "Un menu qui change au gré des produits.", gain: "Actualisez la carte quand vous voulez." },
      { pain: "Difficile de fidéliser une clientèle mobile.", gain: "Réseaux et avis pour garder le lien." },
    ],
    features: [
      { title: "Emplacement du jour", desc: "Affichez votre position et vos prochaines dates, actualisées en direct." },
      { title: "Menu du moment", desc: "Carte modifiable selon vos produits et vos services." },
      { title: "Réseaux & itinéraire", desc: "Instagram, itinéraire et horaires en un geste." },
      { title: "Suivi des scans", desc: "Voyez quels emplacements et supports fonctionnent le mieux." },
    ],
    steps: [
      "Composez votre page : emplacement, menu, réseaux.",
      "Personnalisez-la à votre image.",
      "Imprimez le QR sur le camion, les gobelets ou les flyers.",
      "Mettez à jour votre position à chaque service.",
    ],
    faq: [
      { q: "Puis-je changer mon emplacement chaque jour ?", a: "Oui. Vous mettez à jour votre position et vos dates autant que vous voulez ; le QR code reste identique." },
      { q: "Puis-je modifier le menu selon les produits ?", a: "Oui. La carte se modifie à tout moment, sans réimprimer le QR." },
      { q: "Où placer le QR code ?", a: "Sur le camion, les gobelets, les emballages ou vos flyers — partout où vos clients le voient." },
    ],
    ctaTitle: "Créez le QR code de votre food truck",
    related: ["restaurant", "menu", "instagram"],
  },

  artisan: {
    slug: "artisan",
    emoji: "🔧",
    eyebrow: "Artisans & services",
    metaTitle: "QR code artisan : réalisations, devis et contact",
    metaDescription: "Créez un QR code pour votre activité d'artisan : réalisations, demande de devis, avis et contact en un scan. Sur le véhicule, le chantier ou la carte.",
    h1: "Vos réalisations et vos devis, en un scan",
    intro: "Sur votre véhicule, un chantier ou une carte, un QR code présente vos réalisations, ouvre une demande de devis et rassure avec des avis — pendant que vous travaillez.",
    problems: [
      { pain: "Des prospects qui ne voient pas votre travail.", gain: "Une galerie de réalisations accessible d'un scan." },
      { pain: "Des demandes de devis qui se perdent.", gain: "Un formulaire de devis clair, reçu directement." },
      { pain: "Difficile d'inspirer confiance à distance.", gain: "Avis clients et coordonnées réunis au même endroit." },
    ],
    features: [
      { title: "Galerie de réalisations", desc: "Photos avant/après et chantiers marquants." },
      { title: "Demande de devis", desc: "Un formulaire qui capte chaque demande, avec les détails utiles." },
      { title: "Contact direct", desc: "Appel, WhatsApp et itinéraire en un geste." },
      { title: "Avis & confiance", desc: "Regroupez vos avis pour rassurer vos futurs clients." },
    ],
    steps: [
      "Ajoutez vos réalisations, votre formulaire de devis et vos contacts.",
      "Personnalisez la page à votre image.",
      "Imprimez le QR sur le véhicule, la carte ou le panneau de chantier.",
      "Mettez à jour vos réalisations au fil des projets.",
    ],
    faq: [
      { q: "Puis-je recevoir les demandes de devis directement ?", a: "Oui. Le formulaire capte chaque demande avec les détails utiles, que vous recevez au même endroit." },
      { q: "Puis-je montrer mes chantiers ?", a: "Oui. Ajoutez une galerie de réalisations avec photos avant/après." },
      { q: "Puis-je mettre à jour la page sans réimprimer ?", a: "Oui. Le QR code reste identique ; vous actualisez réalisations et infos à tout moment." },
    ],
    ctaTitle: "Créez le QR code de votre activité",
    related: ["carte-de-visite", "avis-google", "immobilier"],
  },

  association: {
    slug: "association",
    emoji: "🤝",
    eyebrow: "Associations & clubs",
    metaTitle: "QR code association : adhésion, dons et agenda",
    metaDescription: "Créez un QR code pour votre association : adhésion, dons, agenda et contact en un scan. Sur vos affiches, stands et événements. Modifiable, prêt à imprimer.",
    h1: "Fédérez votre association autour d'un QR code",
    intro: "Adhésion, dons, agenda, bénévolat, réseaux : rassemblez tout ce qui fait vivre votre association sur une page, accessible d'un scan sur vos stands et affiches.",
    problems: [
      { pain: "Des adhésions et des dons compliqués à collecter.", gain: "Un bouton qui renvoie vers votre lien d'adhésion ou de don." },
      { pain: "Un agenda que personne ne connaît.", gain: "Vos prochains rendez-vous, mis à jour en direct." },
      { pain: "Des bénévoles difficiles à mobiliser.", gain: "Un formulaire de contact et vos réseaux au même endroit." },
    ],
    features: [
      { title: "Adhésion & dons", desc: "Renvoyez vers votre plateforme d'adhésion ou de don existante." },
      { title: "Agenda & événements", desc: "Prochains rendez-vous, actualisés quand vous voulez." },
      { title: "Appel aux bénévoles", desc: "Formulaire de contact et présentation de vos actions." },
      { title: "Réseaux & partage", desc: "Regroupez vos réseaux pour faire connaître vos actions." },
    ],
    steps: [
      "Composez votre page : adhésion, dons, agenda, contact.",
      "Personnalisez-la aux couleurs de l'association.",
      "Imprimez le QR sur vos affiches, stands et flyers.",
      "Mettez à jour l'agenda et les actions quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je collecter des dons via QRowg ?", a: "QRowg ne traite pas les paiements, mais renvoie d'un bouton vers votre plateforme de dons ou d'adhésion existante." },
      { q: "Puis-je mettre à jour l'agenda après impression ?", a: "Oui. Le QR code reste identique ; vous actualisez vos événements à tout moment." },
      { q: "Est-ce adapté à un petit club ?", a: "Oui. La page se crée en quelques minutes, sans compétence technique." },
    ],
    ctaTitle: "Créez le QR code de votre association",
    related: ["evenement", "instagram", "carte-de-visite"],
  },

  cv: {
    slug: "cv",
    emoji: "💼",
    eyebrow: "CV & recherche d'emploi",
    metaTitle: "QR code CV : partagez votre profil en un scan",
    metaDescription: "Créez un QR code CV : profil, expériences, portfolio et contact en un scan. À ajouter sur votre CV papier ou votre carte. Modifiable, prêt à imprimer.",
    h1: "Votre CV augmenté, derrière un QR code",
    intro: "Ajoutez un QR code à votre CV papier : il ouvre une page complète — expériences, portfolio, LinkedIn, contact — et vous la mettez à jour sans réimprimer.",
    problems: [
      { pain: "Un CV papier figé et vite dépassé.", gain: "Une page à jour, modifiable à tout moment." },
      { pain: "Un portfolio impossible à glisser sur une feuille.", gain: "Un scan ouvre vos projets et vos liens." },
      { pain: "Des coordonnées recopiées avec des erreurs.", gain: "Contact enregistrable en un geste (vCard)." },
    ],
    features: [
      { title: "Profil complet", desc: "Parcours, compétences, expériences et centres d'intérêt." },
      { title: "Portfolio & liens", desc: "Projets, LinkedIn, site et documents (CV PDF)." },
      { title: "Contact en un geste", desc: "Enregistrement de vos coordonnées (vCard) sans faute." },
      { title: "Toujours à jour", desc: "Modifiez votre profil sans réimprimer votre CV." },
    ],
    steps: [
      "Composez votre page : parcours, portfolio, liens, contact.",
      "Personnalisez-la à votre image.",
      "Ajoutez le QR code sur votre CV et votre carte.",
      "Mettez à jour votre profil quand vous voulez.",
    ],
    faq: [
      { q: "Puis-je mettre à jour mon CV sans le réimprimer ?", a: "Oui. Le QR code reste identique ; vous modifiez votre page à tout moment." },
      { q: "Puis-je ajouter mon CV en PDF ?", a: "Oui. Ajoutez votre CV en document téléchargeable, en plus de votre profil en ligne." },
      { q: "Puis-je inclure LinkedIn et mon portfolio ?", a: "Oui. Regroupez LinkedIn, votre site, vos projets et vos coordonnées au même endroit." },
    ],
    ctaTitle: "Créez votre QR code CV",
    related: ["carte-de-visite", "instagram", "pdf"],
  },

  sms: {
    slug: "sms",
    emoji: "📲",
    eyebrow: "SMS",
    metaTitle: "QR code SMS : un message pré-rempli en un scan",
    metaDescription: "Créez un QR code SMS : vos clients vous envoient un message pré-rempli en un scan. Idéal pour un concours, un avis ou un contact rapide. Prêt à imprimer.",
    h1: "Un QR code qui déclenche un SMS pré-rempli",
    intro: "Concours, demande d'avis, réservation, contact : un QR code SMS ouvre l'application Messages avec votre numéro et un texte déjà écrit. Vos clients n'ont qu'à envoyer.",
    problems: [
      { pain: "Un numéro à recopier pour vous écrire par SMS.", gain: "Un scan ouvre le message, destinataire et texte pré-remplis." },
      { pain: "Des participations à un concours compliquées.", gain: "« Envoyez OUI pour participer » en un scan." },
      { pain: "Des demandes qui partent dans tous les sens.", gain: "Un message d'amorce cadre chaque demande." },
    ],
    features: [
      { title: "Message pré-rempli", desc: "Le SMS s'ouvre avec votre numéro et un texte d'amorce déjà écrit." },
      { title: "Compatible tous mobiles", desc: "Le format SMS est lu par les iPhone et les Android." },
      { title: "Aucune application", desc: "Vos clients utilisent l'app Messages, rien à installer." },
      { title: "À placer partout", desc: "Vitrine, flyer, affiche, ticket, packaging." },
    ],
    steps: [
      "Renseignez votre numéro et le message d'amorce.",
      "Personnalisez le QR à votre image.",
      "Téléchargez-le et imprimez-le sur vos supports.",
      "Recevez les SMS directement sur votre téléphone.",
    ],
    faq: [
      { q: "Le message est-il vraiment pré-rempli ?", a: "Oui. Au scan, l'application Messages s'ouvre avec votre numéro en destinataire et le texte d'amorce déjà saisi ; il ne reste qu'à envoyer." },
      { q: "Est-ce compatible iPhone et Android ?", a: "Oui. Le format SMS utilisé est lu par les téléphones iOS et Android récents." },
      { q: "Le SMS est-il facturé à mes clients ?", a: "L'envoi suit le forfait de la personne, comme un SMS classique. Vous ne contrôlez pas ce coût." },
    ],
    ctaTitle: "Créez votre QR code SMS",
    related: ["whatsapp", "carte-de-visite", "avis-google"],
  },

  paiement: {
    slug: "paiement",
    emoji: "💳",
    eyebrow: "Paiement & pourboire",
    metaTitle: "QR code paiement & pourboire : régler en un scan",
    metaDescription: "Créez un QR code qui renvoie vers votre lien de paiement ou de pourboire (Stripe, PayPal, SumUp, Lydia). QRowg ne traite pas les paiements.",
    h1: "Un QR code pour être payé ou recevoir un pourboire",
    intro: "Sur l'addition, le comptoir ou un badge, un QR code amène vos clients droit à votre lien de paiement ou de pourboire — vous encaissez avec l'outil que vous utilisez déjà.",
    problems: [
      { pain: "Un lien de paiement trop long à taper.", gain: "Un scan ouvre directement la page de règlement." },
      { pain: "Des pourboires en baisse faute d'espèces.", gain: "Un QR pourboire, réglé en quelques secondes." },
      { pain: "Devoir changer le support à chaque évolution.", gain: "Modifiez la destination sans réimprimer." },
    ],
    features: [
      { title: "Renvoi vers votre lien", desc: "Stripe, PayPal, SumUp, Lydia, HelloAsso… le paiement se fait chez votre prestataire." },
      { title: "Pourboire en un scan", desc: "Idéal pour la restauration, la coiffure et les services." },
      { title: "Modifiable", desc: "Changez le lien ou le montant sans réimprimer le QR." },
      { title: "Suivi des scans", desc: "Mesurez combien de personnes ouvrent la page de paiement." },
    ],
    steps: [
      "Collez votre lien de paiement ou de pourboire.",
      "Personnalisez le QR à votre image.",
      "Imprimez-le sur l'addition, le comptoir ou un badge.",
      "Modifiez la destination quand vous voulez.",
    ],
    faq: [
      { q: "QRowg encaisse-t-il les paiements ?", a: "Non. QRowg ne traite aucun paiement : le QR code renvoie vers votre lien de paiement existant (Stripe, PayPal, SumUp, Lydia…), où le règlement a lieu." },
      { q: "Puis-je changer le montant sans réimprimer ?", a: "Oui, si votre lien le permet : vous mettez à jour la destination du QR dynamique sans réimprimer le support." },
      { q: "Est-ce adapté aux pourboires ?", a: "Oui. Un QR pointant vers votre page de pourboire permet de laisser un montant en quelques secondes, sans espèces." },
    ],
    ctaTitle: "Créez votre QR code de paiement",
    related: ["restaurant", "salon", "boutique"],
  },

  musique: {
    slug: "musique",
    emoji: "🎵",
    eyebrow: "Musique & artistes",
    metaTitle: "QR code musique : Spotify, clips et dates en un scan",
    metaDescription: "Créez un QR code pour votre musique : Spotify, Apple Music, YouTube, clips et dates de concert sur une page. Modifiable, suivi des scans, prêt à imprimer.",
    h1: "Toute votre musique derrière un seul QR code",
    intro: "Spotify, Apple Music, YouTube, clips, dates de concert, réseaux : réunissez tout sur une page, accessible d'un scan — sur une affiche, un vinyle, un flyer ou un stand.",
    problems: [
      { pain: "Un seul lien de streaming à la fois.", gain: "Toutes vos plateformes réunies sur une page." },
      { pain: "Réimprimer à chaque nouvelle sortie.", gain: "Ajoutez un titre ou une date sans refaire le QR." },
      { pain: "Aucune idée de ce qui est écouté.", gain: "Suivez les clics par plateforme et par lien." },
    ],
    features: [
      { title: "Toutes les plateformes", desc: "Spotify, Apple Music, Deezer, YouTube, Bandcamp, SoundCloud." },
      { title: "Clips & actus", desc: "Vidéos, dernières sorties et dates de concert." },
      { title: "Modifiable à volonté", desc: "Mettez en avant une nouvelle sortie en un instant." },
      { title: "Suivi des clics", desc: "Voyez quelles plateformes et quels liens performent." },
    ],
    steps: [
      "Ajoutez vos liens de streaming, vos clips et vos dates.",
      "Personnalisez la page à votre univers.",
      "Imprimez le QR sur vos affiches, vinyles ou flyers.",
      "Mettez à jour à chaque sortie.",
    ],
    faq: [
      { q: "Puis-je réunir plusieurs plateformes de streaming ?", a: "Oui. La page regroupe autant de liens que vous voulez : Spotify, Apple Music, Deezer, YouTube, etc." },
      { q: "Puis-je mettre à jour à chaque sortie ?", a: "Oui. Le QR code reste identique ; vous ajoutez titres, clips et dates à tout moment." },
      { q: "Puis-je annoncer mes concerts ?", a: "Oui. Ajoutez vos dates et un lien vers la billetterie ou vos réseaux." },
    ],
    ctaTitle: "Créez le QR code de votre musique",
    related: ["instagram", "evenement", "carte-de-visite"],
  },
  boulangerie: {
    slug: "boulangerie",
    emoji: "🥐",
    eyebrow: "Boulangeries & pâtisseries",
    metaTitle: "QR code boulangerie : horaires et commandes",
    metaDescription: "Un QR code sur votre vitrine : horaires à jour, fournées du jour, commandes de pain et de gâteaux, avis Google. Modifiable sans réimprimer.",
    h1: "Le QR code collé sur votre vitrine travaille aussi quand vous êtes fermé",
    intro: "Vos clients passent devant votre vitrine bien après la fermeture. Un QR code sur la porte leur donne vos horaires du jour, vos fournées, et de quoi commander leur gâteau — sans que vous ayez à décrocher.",
    problems: [
      { pain: "Le papier des horaires jaunit sur la porte, et il est faux dès le premier jour férié.", gain: "Vous changez les horaires depuis votre téléphone ; l'affiche collée reste la même." },
      { pain: "Les commandes de gâteaux se prennent au téléphone, en plein coup de feu.", gain: "Un formulaire de commande recueille nom, date et détails, sans interrompre le service." },
      { pain: "Personne ne sait quand sort la prochaine fournée.", gain: "Une page que vous mettez à jour en deux gestes le matin." },
    ],
    features: [
      { title: "Horaires toujours justes", desc: "Ouvertures, fermetures annuelles, jours fériés. Un statut « ouvert / fermé » s'affiche en direct." },
      { title: "Commandes sur mesure", desc: "Un formulaire pour les gâteaux, buffets et pains spéciaux, avec date de retrait." },
      { title: "Avis Google", desc: "Un bouton dédié envoie vos clients satisfaits vers votre fiche Google." },
      { title: "Supports pour la vitrine", desc: "Sticker vitrine, panneau horaires, carte comptoir — prêts à imprimer avec votre QR." },
    ],
    steps: [
      "Partez d'un modèle et renseignez vos horaires et vos spécialités.",
      "Ajoutez un formulaire de commande si vous prenez des gâteaux sur commande.",
      "Imprimez le sticker vitrine et le panneau horaires depuis le Print Studio.",
      "Mettez à jour vos horaires quand vous voulez : le QR collé ne change jamais.",
    ],
    faq: [
      { q: "Je change mes horaires en été. Faut-il réimprimer ?", a: "Non. Le QR code est dynamique : vous modifiez la page, le code collé sur la vitrine reste identique." },
      { q: "Puis-je afficher les allergènes de mes produits ?", a: "Oui. Chaque produit peut porter une description, un prix et la liste des allergènes." },
      { q: "Est-ce que ça marche pour prendre les commandes de Noël ?", a: "Oui. Un formulaire recueille le nom, le téléphone, la date de retrait et le détail de la commande ; les demandes arrivent dans votre espace." },
      { q: "Et si mes clients n'ont pas de smartphone récent ?", a: "Tous les téléphones vendus depuis 2018 scannent un QR code avec l'appareil photo, sans installer d'application." },
    ],
    ctaTitle: "Créez le QR code de votre boulangerie",
    related: ["restaurant", "avis-google", "menu"],
  },

  bar: {
    slug: "bar",
    emoji: "🍸",
    eyebrow: "Bars & brasseries",
    metaTitle: "QR code bar : carte des cocktails et happy hour",
    metaDescription: "Un QR code sur vos tables et vos sous-bocks : carte des cocktails à jour, happy hour, événements et avis. Modifiable sans réimprimer la carte.",
    h1: "Votre carte change souvent. Votre QR code, jamais.",
    intro: "Une rupture sur un spiritueux, un cocktail de saison, un happy hour qui bouge : la carte papier est fausse avant d'être sèche. Un QR sur la table et sous le verre affiche toujours la bonne.",
    problems: [
      { pain: "Réimprimer la carte à chaque changement de prix ou de rupture.", gain: "Vous modifiez la carte en direct ; les supports imprimés ne bougent pas." },
      { pain: "Le happy hour et les soirées passent inaperçus.", gain: "Une bannière en haut de page annonce l'offre du moment." },
      { pain: "Pas moyen de savoir quelle table consulte quoi.", gain: "Des QR distincts par emplacement mesurent les scans, table par table." },
    ],
    features: [
      { title: "Carte par catégories", desc: "Cocktails, bières pression, vins au verre, sans alcool. Prix et descriptions modifiables à tout moment." },
      { title: "Bannière happy hour", desc: "Une offre mise en avant, que vous activez et désactivez quand vous voulez." },
      { title: "Agenda des soirées", desc: "Concerts, DJ sets, matchs diffusés — avec date, heure et lien de réservation." },
      { title: "Sous-bocks et chevalets", desc: "Le Print Studio produit vos sous-bocks ronds et chevalets de table, avec votre QR." },
    ],
    steps: [
      "Choisissez un modèle bar et saisissez votre carte.",
      "Ajoutez votre happy hour et vos prochaines soirées.",
      "Imprimez sous-bocks, chevalets et sticker vitrine.",
      "Changez la carte quand vous voulez, sans rien réimprimer.",
    ],
    faq: [
      { q: "Puis-je masquer un cocktail en rupture sans supprimer sa fiche ?", a: "Oui. Chaque élément peut être rendu invisible d'un geste, puis réaffiché plus tard." },
      { q: "Le QR fonctionne-t-il dans un bar peu éclairé ?", a: "Oui, à condition d'un bon contraste. Le contrôle avant impression vous prévient si les couleurs choisies risquent de gêner la lecture." },
      { q: "Puis-je mesurer les scans du comptoir et ceux des tables séparément ?", a: "Oui, en créant un QR par emplacement : ils mènent à la même carte, mais chacun compte ses propres scans." },
    ],
    ctaTitle: "Créez le QR code de votre bar",
    related: ["restaurant", "menu", "evenement"],
  },

  garage: {
    slug: "garage",
    emoji: "🔧",
    eyebrow: "Garages & mécanique",
    metaTitle: "QR code garage auto : devis, rendez-vous et avis",
    metaDescription: "Un QR code sur votre vitrine et vos factures : demande de devis, prise de rendez-vous, horaires et avis Google. Vos clients vous joignent sans appeler.",
    h1: "Vos clients demandent un devis pendant que vous êtes sous une voiture",
    intro: "Le téléphone sonne au mauvais moment, toujours. Un QR code sur la vitrine, le comptoir et les factures laisse vos clients demander un devis ou un rendez-vous — vous répondez quand vous avez les mains libres.",
    problems: [
      { pain: "Le téléphone interrompt les interventions toute la journée.", gain: "Les demandes de devis arrivent par écrit, avec le modèle et le besoin." },
      { pain: "Les clients ne savent pas si vous prenez les rendez-vous en ligne.", gain: "Un bouton de prise de rendez-vous, visible dès le scan." },
      { pain: "Peu d'avis en ligne, alors que le travail est bon.", gain: "Un QR sur la facture invite à laisser un avis, au moment où le client est content." },
    ],
    features: [
      { title: "Demande de devis", desc: "Un formulaire avec véhicule, immatriculation, besoin et photos. Les demandes arrivent dans votre espace." },
      { title: "Prestations et tarifs", desc: "Vidange, freins, pneus, contrôle technique : ce que vous faites, à quel prix indicatif." },
      { title: "Horaires et itinéraire", desc: "Ouvertures, fermeture annuelle, lien direct vers l'itinéraire." },
      { title: "Supports pour l'atelier", desc: "Sticker vitrine, carte de visite à glisser dans le véhicule, panneau horaires." },
    ],
    steps: [
      "Renseignez vos prestations, vos horaires et votre adresse.",
      "Ajoutez un formulaire de demande de devis.",
      "Imprimez le sticker vitrine et les cartes à laisser dans les véhicules.",
      "Traitez les demandes quand vous êtes disponible.",
    ],
    faq: [
      { q: "Les clients peuvent-ils joindre des photos à leur demande ?", a: "Oui. Le formulaire accepte des pièces jointes, utile pour un impact de pare-brise ou un voyant allumé." },
      { q: "Puis-je afficher des tarifs sans m'engager ?", a: "Oui. Rien ne vous oblige à afficher un prix ferme : beaucoup de garages indiquent une fourchette « à partir de »." },
      { q: "Où mettre le QR pour qu'il serve vraiment ?", a: "Sur la vitrine côté rue, au comptoir, et sur la facture ou le rapport d'intervention remis au client." },
    ],
    ctaTitle: "Créez le QR code de votre garage",
    related: ["artisan", "avis-google", "carte-de-visite"],
  },

  pharmacie: {
    slug: "pharmacie",
    emoji: "💊",
    eyebrow: "Pharmacies & santé",
    metaTitle: "QR code pharmacie : horaires, garde et services",
    metaDescription: "Un QR code sur votre vitrine : horaires, pharmacie de garde, services proposés et contact. À jour en permanence, sans réimprimer l'affiche.",
    h1: "L'information que vos patients cherchent porte fermée",
    intro: "Horaires, garde du week-end, vaccination, tests, matériel médical : ces questions arrivent au comptoir ou par téléphone, souvent au pire moment. Un QR sur la vitrine y répond, y compris la nuit.",
    problems: [
      { pain: "L'affiche des horaires est raturée et périmée.", gain: "Vous modifiez la page ; l'affiche collée reste identique." },
      { pain: "Les patients appellent pour savoir qui est de garde.", gain: "Une page que vous mettez à jour chaque semaine, consultable porte fermée." },
      { pain: "Vos services sont mal connus.", gain: "Une liste claire : vaccination, tests, orthopédie, location de matériel." },
    ],
    features: [
      { title: "Horaires et garde", desc: "Ouvertures, fermeture du midi, jours fériés, et l'information de garde mise à jour quand vous voulez." },
      { title: "Vos services", desc: "Ce que votre officine propose vraiment, avec le détail utile pour chacun." },
      { title: "Contact direct", desc: "Appel, itinéraire, et un formulaire pour les questions qui ne relèvent pas de l'urgence." },
      { title: "Panneau vitrine", desc: "Un panneau A5 prêt à imprimer, lisible depuis le trottoir." },
    ],
    steps: [
      "Saisissez vos horaires, vos services et vos coordonnées.",
      "Ajoutez l'information de garde si vous la communiquez.",
      "Imprimez le panneau vitrine depuis le Print Studio.",
      "Actualisez la page quand la garde ou les horaires changent.",
    ],
    faq: [
      { q: "Puis-je y mettre des conseils de santé ?", a: "Techniquement oui, mais restez dans le cadre déontologique de votre profession : une officine reste soumise aux règles de communication de l'Ordre des pharmaciens." },
      { q: "Les données du formulaire de contact sont-elles protégées ?", a: "Les messages sont stockés chiffrés et hébergés dans l'Union européenne. N'utilisez pas ce canal pour des données de santé : il n'est pas conçu pour ça." },
      { q: "Puis-je afficher la garde sans la mettre à jour moi-même ?", a: "Non, la mise à jour est manuelle. Beaucoup d'officines préfèrent renvoyer vers le service officiel de leur département par un simple lien." },
    ],
    ctaTitle: "Créez le QR code de votre pharmacie",
    related: ["artisan", "avis-google", "wifi"],
  },

  camping: {
    slug: "camping",
    emoji: "⛺",
    eyebrow: "Campings & locations",
    metaTitle: "QR code camping : Wi-Fi, infos et activités",
    metaDescription: "Un QR code à l'accueil et dans les hébergements : code Wi-Fi, horaires de la piscine, activités, plan du site et contact. Sans réimprimer chaque saison.",
    h1: "Le classeur d'accueil que personne ne lit, en un scan",
    intro: "Code Wi-Fi, horaires de la piscine, marché du village, urgences : vos vacanciers posent les mêmes questions toute la saison. Un QR dans chaque hébergement y répond avant qu'ils viennent à l'accueil.",
    problems: [
      { pain: "Le code Wi-Fi est dicté vingt fois par jour à l'accueil.", gain: "Un QR le donne d'un scan, sans faute de frappe." },
      { pain: "Le classeur d'accueil est déchiré et date de trois saisons.", gain: "Une page que vous corrigez en cours de saison, sans rien réimprimer." },
      { pain: "Les animations et les horaires changent chaque semaine.", gain: "Un agenda que vous actualisez le lundi matin." },
    ],
    features: [
      { title: "Wi-Fi en un scan", desc: "Le réseau et le mot de passe encodés : le téléphone se connecte sans rien taper." },
      { title: "Infos pratiques", desc: "Piscine, sanitaires, laverie, réception, urgences — chaque horaire à sa place." },
      { title: "Animations et alentours", desc: "Le programme de la semaine, les marchés, les randonnées, les commerces du village." },
      { title: "Supports pour les hébergements", desc: "Chevalet de table, panneau Wi-Fi, sticker — un par mobil-home ou par emplacement." },
    ],
    steps: [
      "Renseignez le Wi-Fi, les horaires et les infos pratiques.",
      "Ajoutez le programme d'animations de la semaine.",
      "Imprimez un chevalet ou un panneau par hébergement.",
      "Actualisez le programme en cours de saison, sans réimprimer.",
    ],
    faq: [
      { q: "Le QR Wi-Fi fonctionne-t-il sans connexion ?", a: "Oui. Un QR Wi-Fi encode directement le réseau et le mot de passe : le téléphone se connecte hors ligne, sans passer par internet." },
      { q: "Puis-je avoir une page différente par hébergement ?", a: "Oui, en créant une page par type d'hébergement. Vous pouvez aussi n'en faire qu'une et créer un QR par emplacement pour mesurer les scans." },
      { q: "Et pour un gîte ou une chambre d'hôtes ?", a: "Le principe est identique, en plus simple : une page, un QR affiché dans le logement." },
    ],
    ctaTitle: "Créez le QR code de votre camping",
    related: ["wifi", "hotel", "evenement"],
  },

  fleuriste: {
    slug: "fleuriste",
    emoji: "💐",
    eyebrow: "Fleuristes",
    metaTitle: "QR code fleuriste : commandes, livraison et avis",
    metaDescription: "Un QR code en vitrine et glissé dans le bouquet : commandes, livraison, occasions et avis Google. La personne qui reçoit vos fleurs vous retrouve.",
    h1: "Celui qui reçoit le bouquet ne sait pas d'où il vient",
    intro: "Vos plus belles compositions partent chez des gens qui ne connaissent pas votre boutique. Un marque-page glissé dans le bouquet, avec votre QR, transforme chaque livraison en nouveau client.",
    problems: [
      { pain: "La personne qui reçoit vos fleurs ignore qui les a faites.", gain: "Un marque-page avec votre QR part avec chaque bouquet." },
      { pain: "Les commandes pour la fête des mères saturent le téléphone.", gain: "Un formulaire de commande recueille occasion, budget, date et message." },
      { pain: "Votre vitrine ne travaille plus une fois fermée.", gain: "Un sticker vitrine renvoie vers vos compositions et vos horaires, jour et nuit." },
    ],
    features: [
      { title: "Commande à distance", desc: "Occasion, budget, couleurs, date de livraison et texte de la carte, en un formulaire." },
      { title: "Vos compositions", desc: "Une galerie de vos réalisations, que vous renouvelez au fil des saisons." },
      { title: "Livraison et zone couverte", desc: "Les communes que vous livrez, les délais et les tarifs." },
      { title: "Marque-page et sticker", desc: "Le Print Studio produit le marque-page à piquer dans le bouquet et le sticker vitrine." },
    ],
    steps: [
      "Présentez vos compositions et votre zone de livraison.",
      "Ajoutez un formulaire de commande avec date et occasion.",
      "Imprimez le marque-page et le sticker vitrine.",
      "Glissez un marque-page dans chaque bouquet livré.",
    ],
    faq: [
      { q: "Puis-je encaisser directement sur la page ?", a: "Vous pouvez ajouter un lien de paiement vers votre propre solution. QRowg ne traite pas les paiements de vos clients." },
      { q: "Comment mesurer si le marque-page fonctionne ?", a: "En créant un QR distinct pour les marque-pages : ses scans se comptent à part de ceux de la vitrine." },
      { q: "Puis-je changer ma galerie à chaque saison ?", a: "Oui, autant de fois que vous voulez. Les supports déjà imprimés ne changent pas." },
    ],
    ctaTitle: "Créez le QR code de votre boutique de fleurs",
    related: ["boutique", "avis-google", "carte-de-visite"],
  },
}

export const VERTICAL_SLUGS = Object.keys(VERTICALS)
export const getVertical = (slug: string): Vertical | undefined => VERTICALS[slug]

// Objectif d'onboarding pré-sélectionné depuis une page SEO (deep-link du CTA vers
// /dashboard/onboarding). Les valeurs correspondent à une clé d'OBJECTIVES du wizard
// (validé par verticals.test.ts). Les usages sans objectif clair (wifi, pdf) sont omis
// -> le CTA reste une inscription simple. Chaîne de contenu HONNÊTE conservée.
export const VERTICAL_OBJECTIVE: Record<string, string> = {
  restaurant: "menu", menu: "menu", "avis-google": "avis", instagram: "reseaux",
  whatsapp: "appels", sms: "contact", immobilier: "contact", hotel: "contact",
  salon: "reservation", boutique: "vente", "food-truck": "menu", artisan: "contact",
  paiement: "vente", association: "contact", musique: "reseaux", cv: "portfolio",
  evenement: "evenement", "carte-de-visite": "contact",
  boulangerie: "menu", bar: "menu", garage: "contact",
  pharmacie: "contact", camping: "contact", fleuriste: "vente",
}
export const objectiveForVertical = (slug: string): string | undefined => VERTICAL_OBJECTIVE[slug]
// Ordre d'affichage du hub /qr-code (le plus recherché en premier).
export const VERTICAL_ORDER = [
  "restaurant", "menu", "avis-google", "wifi", "instagram", "whatsapp", "sms", "pdf",
  "immobilier", "hotel", "salon", "boutique", "food-truck", "artisan", "paiement",
  "boulangerie", "bar", "garage", "pharmacie", "camping", "fleuriste",
  "association", "musique", "cv", "evenement", "carte-de-visite",
]
