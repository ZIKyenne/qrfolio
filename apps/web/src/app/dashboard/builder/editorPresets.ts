// editorPresets.ts — les catalogues de choix proposés DANS L'ÉDITEUR : thèmes tout
// prêts, presets d'identité, d'action, de commerce, de médias, aides à la saisie.
//
// Même raison d'être que blockDefs.ts : une page publiée utilise UN thème, celui
// enregistré avec elle. Elle n'a aucun besoin de la galerie des quarante autres.
// Tant que ces catalogues vivaient dans types.ts, ils partaient sur chaque scan
// avec les fonctions d'affichage — mesuré à 90 Ko de JavaScript décompressé.
//
// Règle à tenir : types.ts ne réexporte pas ce module, sinon le lien revient.

import type { PageTheme } from "./types"


// Modèles d'identité par métier : un clic crée un ensemble de blocs pré-remplis adaptés.
// Chaque bloc = { type, content } fusionné avec le defaultContent du bloc à la création.
export const IDENTITY_PRESETS: { key: string; label: string; emoji: string; blocks: { type: string; content: Record<string, string> }[] }[] = [
  {
    key: "artiste", label: "Artiste / Musicien", emoji: "🎤",
    blocks: [
      { type: "profile", content: { name: "Nom d'artiste", tagline: "Artiste & Producteur", badge: "Disponible booking" } },
      { type: "cover_banner", content: { banner_type: "gradient", grad_preset: "violet", overlay_gradient: "bottom", animation: "gradient_flow", cover_title: "En tournée 2025" } },
      { type: "bio", content: { text: "Je crée des univers sonores qui font vibrer. Écoutez, ressentez, partagez.", align: "center" } },
      { type: "business_stats", content: { stat1_icon: "🎧", stat1_value: "120k", stat1_label: "Écoutes", stat2_icon: "🎤", stat2_value: "45", stat2_label: "Concerts", stat3_icon: "👥", stat3_value: "12k", stat3_label: "Abonnés" } },
      { type: "availability", content: { status: "available", message: "Ouvert aux bookings & collabs", cta_label: "Me booker" } },
    ],
  },
  {
    key: "restaurant", label: "Restaurant / Bar", emoji: "🍽️",
    blocks: [
      { type: "profile", content: { name: "Mon Établissement", tagline: "Cuisine & Bar à cocktails", badge: "Ouvert" } },
      { type: "cover_banner", content: { banner_type: "gradient", grad_preset: "coucher", overlay_gradient: "bottom", cover_title: "Bienvenue" } },
      { type: "bio", content: { text: "Une cuisine généreuse, des produits frais et une ambiance chaleureuse. À très vite !", align: "center" } },
      { type: "availability", content: { status: "available", message: "Ouvert · service ce soir", cta_label: "Réserver une table" } },
      { type: "business_stats", content: { stat1_icon: "⭐", stat1_value: "4.8", stat1_label: "Note", stat2_icon: "💬", stat2_value: "320", stat2_label: "Avis", stat3_icon: "📅", stat3_value: "8 ans", stat3_label: "À votre service" } },
    ],
  },
  {
    key: "immobilier", label: "Immobilier", emoji: "🏡",
    blocks: [
      { type: "profile", content: { name: "Votre nom", tagline: "Conseiller immobilier", badge: "Réponse sous 24h" } },
      { type: "cover_banner", content: { banner_type: "gradient", grad_preset: "ocean", overlay_gradient: "bottom" } },
      { type: "bio", content: { text: "J'accompagne acheteurs et vendeurs à chaque étape, avec expertise et transparence.", align: "center" } },
      { type: "business_stats", content: { stat1_icon: "🏡", stat1_value: "85", stat1_label: "Biens vendus", stat2_icon: "👥", stat2_value: "200+", stat2_label: "Clients", stat3_icon: "⭐", stat3_value: "4.9", stat3_label: "Note" } },
      { type: "availability", content: { status: "available", message: "Estimation offerte", cta_label: "Demander une estimation" } },
    ],
  },
  {
    key: "coach", label: "Coach / Formation", emoji: "🎓",
    blocks: [
      { type: "profile", content: { name: "Votre nom", tagline: "Coach & Formateur", badge: "Certifié" } },
      { type: "bio", content: { text: "Je vous aide à atteindre vos objectifs avec méthode, énergie et bienveillance.", align: "center" } },
      { type: "skills", content: { title: "Mes expertises", tags: "Coaching, Nutrition, Motivation, Bien-être" } },
      { type: "business_stats", content: { stat1_icon: "🎓", stat1_value: "500+", stat1_label: "Élèves formés", stat2_icon: "⭐", stat2_value: "98%", stat2_label: "Satisfaction", stat3_icon: "🏆", stat3_value: "10 ans", stat3_label: "Expérience" } },
      { type: "availability", content: { status: "available", message: "Places disponibles ce mois-ci", cta_label: "Réserver un appel" } },
    ],
  },
  {
    key: "entreprise", label: "Entreprise", emoji: "🏢",
    blocks: [
      { type: "company", content: { company_name: "Mon Entreprise", sector: "Agence digitale", founded_year: "2018" } },
      { type: "bio", content: { text: "Notre mission : transformer vos idées en projets concrets, avec exigence et proximité.", align: "center" } },
      { type: "values", content: { title: "Nos valeurs", v1_icon: "🤝", v1_label: "Proximité", v2_icon: "⚡", v2_label: "Réactivité", v3_icon: "🎯", v3_label: "Qualité" } },
      { type: "business_stats", content: { stat1_icon: "👥", stat1_value: "500+", stat1_label: "Clients", stat2_icon: "🌍", stat2_value: "12", stat2_label: "Pays", stat3_icon: "⭐", stat3_value: "4.9", stat3_label: "Note" } },
      { type: "availability", content: { status: "available", message: "Parlons de votre projet", cta_label: "Demander un devis" } },
    ],
  },
  {
    key: "createur", label: "Créateur de contenu", emoji: "✨",
    blocks: [
      { type: "profile", content: { name: "Votre nom", tagline: "Créateur de contenu", badge: "Créateur" } },
      { type: "cover_banner", content: { banner_type: "gradient", grad_preset: "aurore", overlay_gradient: "bottom", animation: "floating" } },
      { type: "bio", content: { text: "Je crée du contenu qui inspire, amuse et rassemble. Rejoins l'aventure !", align: "center" } },
      { type: "business_stats", content: { stat1_icon: "👥", stat1_value: "50k", stat1_label: "Abonnés", stat2_icon: "❤️", stat2_value: "1.2M", stat2_label: "Likes", stat3_icon: "🎬", stat3_value: "300", stat3_label: "Vidéos" } },
      { type: "social_links", content: {} },
      { type: "availability", content: { status: "available", message: "Ouvert aux partenariats", cta_label: "Collaborer" } },
    ],
  },
]

// URL de base par réseau (point de départ pré-rempli dans les modèles Réseaux, à compléter par l'utilisateur).


// Modèles Médias par métier : un clic crée un ensemble de blocs média adaptés.
export const MEDIA_PRESETS: { key: string; label: string; emoji: string; blocks: { type: string; content: Record<string, string> }[] }[] = [
  {
    key: "restaurant", label: "Restaurant / Bar", emoji: "🍽️",
    blocks: [
      { type: "gallery", content: { title: "Notre ambiance" } },
      { type: "image_carousel", content: { title: "Nos plats & cocktails" } },
      { type: "pdf_viewer", content: { title: "Notre menu (PDF)" } },
    ],
  },
  {
    key: "photographe", label: "Photographe", emoji: "📷",
    blocks: [
      { type: "gallery", content: { title: "Portfolio" } },
      { type: "media_before_after", content: { title: "Avant / Après" } },
      { type: "pdf_viewer", content: { title: "Mes tarifs (PDF)" } },
    ],
  },
  {
    key: "musicien", label: "Musicien / Artiste", emoji: "🎸",
    blocks: [
      { type: "youtube_gallery", content: { title: "Mes clips" } },
      { type: "gallery", content: { title: "En concert" } },
      { type: "pdf_viewer", content: { title: "Press kit" } },
    ],
  },
  {
    key: "immobilier", label: "Immobilier", emoji: "🏡",
    blocks: [
      { type: "gallery", content: { title: "Photos du bien" } },
      { type: "media_before_after", content: { title: "Avant / Après rénovation" } },
      { type: "pdf_viewer", content: { title: "Brochure du bien (PDF)" } },
    ],
  },
  {
    key: "coach", label: "Coach / Formation", emoji: "🎓",
    blocks: [
      { type: "video_local", content: { title: "Ma présentation" } },
      { type: "video_testimonials", content: { title: "Témoignages" } },
      { type: "pdf_viewer", content: { title: "Le programme (PDF)" } },
    ],
  },
  {
    key: "entreprise", label: "Entreprise", emoji: "🏢",
    blocks: [
      { type: "video_local", content: { title: "Vidéo de présentation" } },
      { type: "logo_wall", content: { title: "Ils nous font confiance" } },
      { type: "pdf_viewer", content: { title: "Notre brochure (PDF)" } },
    ],
  },
  {
    key: "evenement", label: "Événement", emoji: "🎫",
    blocks: [
      { type: "youtube_gallery", content: { title: "Teaser & aftermovie" } },
      { type: "gallery", content: { title: "Édition précédente" } },
      { type: "pdf_viewer", content: { title: "Le programme (PDF)" } },
    ],
  },
  {
    key: "createur", label: "Créateur de contenu", emoji: "✨",
    blocks: [
      { type: "tiktok_gallery", content: { title: "Mes vidéos" } },
      { type: "youtube_gallery", content: { title: "Ma chaîne" } },
      { type: "gallery", content: { title: "Mes contenus" } },
    ],
  },
]

// Modèles Commerce par métier : un clic crée un ensemble de blocs de vente adaptés.


// Modèles Commerce par métier : un clic crée un ensemble de blocs de vente adaptés.
export const COMMERCE_PRESETS: { key: string; label: string; emoji: string; blocks: { type: string; content: Record<string, string> }[] }[] = [
  {
    key: "restaurant", label: "Restaurant", emoji: "🍽️",
    blocks: [
      { type: "product_catalog", content: { title: "Notre carte" } },
      { type: "popular_products", content: { title: "Nos plats populaires" } },
      { type: "table_booking", content: { label: "Réserver une table", platform: "TheFork" } },
      { type: "download_file", content: { label: "Télécharger le menu (PDF)", type_doc: "Carte" } },
    ],
  },
  {
    key: "bar", label: "Bar / Cocktails", emoji: "🍹",
    blocks: [
      { type: "product_catalog", content: { title: "Carte des cocktails" } },
      { type: "promo_code", content: { code: "HAPPY", description: "Happy hour tous les jours 18h-20h" } },
      { type: "order_online", content: { label: "Commander", platform: "Site web" } },
      { type: "call_button", content: { label: "Appeler" } },
    ],
  },
  {
    key: "beaute", label: "Beauté", emoji: "💅",
    blocks: [
      { type: "services_pricing", content: { title: "Mes prestations" } },
      { type: "packs", content: { title: "Mes forfaits" } },
      { type: "booking_button", content: { label: "Réserver un rendez-vous", platform: "URL personnalisee" } },
      { type: "gift_card", content: { title: "Offrir un bon cadeau", cta_label: "Offrir" } },
    ],
  },
  {
    key: "coach", label: "Coach / Formation", emoji: "🎓",
    blocks: [
      { type: "packs", content: { title: "Mes offres" } },
      { type: "offer_comparison", content: { title: "Comparez mes formules", plan2_highlight: "yes" } },
      { type: "payment_button", content: { label: "Payer / s'inscrire", platform: "Stripe" } },
      { type: "booking_button", content: { label: "Réserver un appel", platform: "URL personnalisee" } },
    ],
  },
  {
    key: "freelance", label: "Freelance / Artisan", emoji: "💼",
    blocks: [
      { type: "services_pricing", content: { title: "Mes tarifs" } },
      { type: "quote_request", content: { label: "Demander un devis", description: "Réponse sous 24h" } },
      { type: "download_file", content: { label: "Télécharger la plaquette", type_doc: "Brochure" } },
    ],
  },
  {
    key: "boutique", label: "Boutique locale", emoji: "🛍️",
    blocks: [
      { type: "product_catalog", content: { title: "Nos produits" } },
      { type: "popular_products", content: { title: "Meilleures ventes" } },
      { type: "promo_code", content: { code: "PROMO10", description: "-10% sur votre première commande" } },
      { type: "order_online", content: { label: "Commander en ligne", platform: "Site web" } },
    ],
  },
  {
    key: "immobilier", label: "Immobilier", emoji: "🏡",
    blocks: [
      { type: "product_catalog", content: { title: "Nos biens" } },
      { type: "quote_request", content: { label: "Demander une estimation", description: "Estimation offerte" } },
      { type: "download_file", content: { label: "Télécharger la brochure", type_doc: "Brochure" } },
      { type: "call_button", content: { label: "Appeler l'agence" } },
    ],
  },
  {
    key: "evenement", label: "Événement", emoji: "🎫",
    blocks: [
      { type: "payment_button", content: { label: "Acheter un billet", platform: "Stripe" } },
      { type: "packs", content: { title: "Formules & VIP" } },
      { type: "download_file", content: { label: "Programme (PDF)", type_doc: "PDF" } },
      { type: "booking_button", content: { label: "Ajouter à mon agenda", platform: "Google Calendar" } },
    ],
  },
]

// Modèles d'actions par métier : un clic crée un ensemble de boutons d'action adaptés.


// Modèles d'actions par métier : un clic crée un ensemble de boutons d'action adaptés.
export const ACTION_PRESETS: { key: string; label: string; emoji: string; blocks: { type: string; content: Record<string, string> }[] }[] = [
  {
    key: "restaurant", label: "Restaurant / Bar", emoji: "🍽️",
    blocks: [
      { type: "table_booking", content: { label: "Réserver une table", platform: "TheFork" } },
      { type: "download_file", content: { label: "Voir le menu", type_doc: "Carte" } },
      { type: "call_button", content: { label: "Appeler" } },
      { type: "directions_button", content: { label: "Itinéraire", provider: "auto" } },
      { type: "google_review", content: { label: "Laisser un avis", stars: "5" } },
    ],
  },
  {
    key: "artiste", label: "Artiste / Musicien", emoji: "🎤",
    blocks: [
      { type: "cta_button", content: { label: "Écouter sur Spotify", icon: "🎧", style: "gold" } },
      { type: "booking_button", content: { label: "Booking / me contacter", platform: "URL personnalisee" } },
      { type: "download_file", content: { label: "Télécharger le press kit", type_doc: "Brochure" } },
      { type: "cta_button", content: { label: "Mes prochaines dates", icon: "📅", style: "outline" } },
    ],
  },
  {
    key: "immobilier", label: "Immobilier", emoji: "🏡",
    blocks: [
      { type: "call_button", content: { label: "Appeler l'agent" } },
      { type: "whatsapp_button", content: { label: "WhatsApp", message: "Bonjour, je suis intéressé(e) par un bien." } },
      { type: "quote_request", content: { label: "Demander une estimation", description: "Réponse sous 24h" } },
      { type: "download_file", content: { label: "Télécharger la brochure", type_doc: "Brochure" } },
    ],
  },
  {
    key: "coach", label: "Coach / Formation", emoji: "🎓",
    blocks: [
      { type: "booking_button", content: { label: "Réserver un appel", platform: "URL personnalisee" } },
      { type: "download_file", content: { label: "Voir le programme (PDF)", type_doc: "PDF" } },
      { type: "payment_button", content: { label: "Payer / s'inscrire", platform: "Stripe" } },
      { type: "cta_button", content: { label: "Voir les témoignages", icon: "⭐", style: "outline" } },
    ],
  },
  {
    key: "freelance", label: "Freelance / Entreprise", emoji: "💼",
    blocks: [
      { type: "quote_request", content: { label: "Demander un devis", description: "Réponse rapide" } },
      { type: "booking_button", content: { label: "Prendre rendez-vous", platform: "URL personnalisee" } },
      { type: "email_button", content: { label: "M'écrire", subject: "Demande de renseignements" } },
      { type: "download_file", content: { label: "Télécharger la plaquette", type_doc: "Brochure" } },
    ],
  },
  {
    key: "evenement", label: "Événement", emoji: "🎫",
    blocks: [
      { type: "payment_button", content: { label: "Acheter un billet", platform: "Stripe" } },
      { type: "download_file", content: { label: "Voir le programme", type_doc: "PDF" } },
      { type: "booking_button", content: { label: "Ajouter à mon agenda", platform: "Google Calendar" } },
      { type: "call_button", content: { label: "Contacter l'organisateur" } },
    ],
  },
  {
    key: "commerce", label: "Commerce local", emoji: "🛍️",
    blocks: [
      { type: "order_online", content: { label: "Commander en ligne", platform: "Site web" } },
      { type: "call_button", content: { label: "Appeler la boutique" } },
      { type: "directions_button", content: { label: "Venir à la boutique", provider: "auto" } },
      { type: "google_review", content: { label: "Laisser un avis Google", stars: "5" } },
    ],
  },
]

// Presets Infos : un clic crée un set de blocs informatifs adaptés au métier.


// Presets Infos : un clic crée un set de blocs informatifs adaptés au métier.
export const INFO_PRESETS: { key: string; label: string; emoji: string; blocks: { type: string; content: Record<string, string> }[] }[] = [
  {
    key: "restaurant", label: "Restaurant / Bar", emoji: "🍽️",
    blocks: [
      { type: "heading", content: { text: "Bienvenue chez nous", subtitle: "Cuisine maison, produits frais" } },
      { type: "announcement", content: { emoji: "📅", title: "Réservation conseillée", message: "Le week-end, pensez à réserver votre table.", type: "Information" } },
      { type: "stats_block", content: { s1_value: "4.8/5", s1_label: "Avis clients", s1_icon: "⭐", s2_value: "150+", s2_label: "Plats servis/jour", s2_icon: "🍽️", s3_value: "2012", s3_label: "Depuis", s3_icon: "🏆" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Avez-vous des options végétariennes ?", q2: "Acceptez-vous les groupes ?", q3: "Y a-t-il un parking ?" } },
    ],
  },
  {
    key: "entreprise", label: "Entreprise", emoji: "🏢",
    blocks: [
      { type: "heading", content: { text: "Qui sommes-nous", subtitle: "Notre expertise à votre service" } },
      { type: "values", content: { title: "Nos valeurs" } },
      { type: "stats_block", content: {} },
      { type: "team", content: { title: "Notre équipe" } },
      { type: "faq", content: { title: "Questions fréquentes" } },
    ],
  },
  {
    key: "freelance", label: "Freelance", emoji: "💼",
    blocks: [
      { type: "heading", content: { text: "Mon approche", subtitle: "Un accompagnement sur mesure" } },
      { type: "process_steps", content: { title: "Comment je travaille" } },
      { type: "testimonials", content: {} },
      { type: "faq", content: { title: "Questions fréquentes" } },
    ],
  },
  {
    key: "coach", label: "Coach / Formation", emoji: "🎓",
    blocks: [
      { type: "heading", content: { text: "Ma méthode", subtitle: "Des résultats concrets" } },
      { type: "process_steps", content: { title: "Le déroulé" } },
      { type: "engagements", content: { title: "Mes engagements" } },
      { type: "testimonials", content: {} },
    ],
  },
  {
    key: "artisan", label: "Artisan", emoji: "🔨",
    blocks: [
      { type: "heading", content: { text: "Mon savoir-faire", subtitle: "La qualité avant tout" } },
      { type: "process_steps", content: { title: "De l'idée à la réalisation" } },
      { type: "trust_badge", content: { title: "Garanties & labels" } },
      { type: "testimonials", content: {} },
    ],
  },
  {
    key: "association", label: "Association", emoji: "🤝",
    blocks: [
      { type: "heading", content: { text: "Notre mission", subtitle: "Agir ensemble" } },
      { type: "values", content: { title: "Nos valeurs" } },
      { type: "timeline", content: { title: "Notre histoire" } },
      { type: "team", content: { title: "Le bureau" } },
    ],
  },
  {
    key: "immobilier", label: "Immobilier", emoji: "🏡",
    blocks: [
      { type: "heading", content: { text: "L'agence", subtitle: "Votre projet, notre priorité" } },
      { type: "stats_block", content: { s1_value: "500+", s1_label: "Biens vendus", s1_icon: "🏠", s2_value: "4.9/5", s2_label: "Satisfaction", s2_icon: "⭐", s3_value: "15 ans", s3_label: "Expérience", s3_icon: "🏆" } },
      { type: "process_steps", content: { title: "Notre accompagnement" } },
      { type: "faq", content: { title: "Questions fréquentes" } },
    ],
  },
  {
    key: "evenement", label: "Événement", emoji: "🎉",
    blocks: [
      { type: "heading", content: { text: "À propos de l'événement", subtitle: "Tout ce qu'il faut savoir" } },
      { type: "announcement", content: { emoji: "🎫", title: "Places limitées", message: "Réservez vite votre place !", type: "Promo" } },
      { type: "timeline", content: { title: "Le programme" } },
      { type: "faq", content: { title: "Infos pratiques" } },
    ],
  },
]

// Presets de bannière : un clic configure plusieurs champs d'un coup


// Presets de bannière : un clic configure plusieurs champs d'un coup
export const BANNER_PRESETS: { key: string; label: string; emoji: string; content: Record<string, any> }[] = [
  { key: "luxury", label: "Luxe", emoji: "👑", content: { banner_type: "gradient", grad_preset: "or_nuit", height_px: 220, block_radius: 16, text_position: "bottom-left", overlay_gradient: "bottom", animation: "shimmer", text_color: "#F5EBD0" } },
  { key: "spotify", label: "Spotify", emoji: "🎧", content: { banner_type: "gradient", grad_preset: "menthe", height_px: 200, block_radius: 14, text_position: "bottom-left", overlay_gradient: "bottom", animation: "gradient_flow", text_color: "#ffffff" } },
  { key: "apple", label: "Apple", emoji: "🍎", content: { banner_type: "color", bg_color: "#0b0b0f", height_px: 220, block_radius: 20, text_position: "center", overlay_gradient: "none", animation: "none", text_color: "#f5f5f7" } },
  { key: "gaming", label: "Gaming", emoji: "🎮", content: { banner_type: "gradient", grad_preset: "violet", height_px: 240, block_radius: 12, text_position: "bottom-center", overlay_gradient: "full", animation: "pulse", text_color: "#ffffff" } },
  { key: "minimal", label: "Minimal", emoji: "⚪", content: { banner_type: "color", bg_color: "#141414", height_px: 150, block_radius: 14, text_position: "center", overlay_gradient: "none", animation: "none", text_color: "#F5F0E8" } },
  { key: "creator", label: "Créateur", emoji: "✨", content: { banner_type: "gradient", grad_preset: "aurore", height_px: 220, block_radius: 18, text_position: "bottom-left", overlay_gradient: "bottom", animation: "floating", text_color: "#ffffff" } },
  { key: "fashion", label: "Mode", emoji: "🖤", content: { banner_type: "color", bg_color: "#0a0a0a", height_px: 280, block_radius: 0, text_position: "bottom-center", overlay_gradient: "bottom", animation: "kenburns", text_color: "#ffffff" } },
  { key: "ocean", label: "Océan", emoji: "🌊", content: { banner_type: "gradient", grad_preset: "ocean", height_px: 210, block_radius: 16, text_position: "bottom-left", overlay_gradient: "bottom", animation: "gradient_flow", text_color: "#ffffff" } },
  { key: "sunset", label: "Sunset", emoji: "🌇", content: { banner_type: "gradient", grad_preset: "coucher", height_px: 220, block_radius: 16, text_position: "bottom-left", overlay_gradient: "bottom", animation: "floating", text_color: "#ffffff" } },
  { key: "corail", label: "Corail", emoji: "🪸", content: { banner_type: "gradient", grad_preset: "corail", height_px: 200, block_radius: 18, text_position: "center", overlay_gradient: "full", animation: "pulse", text_color: "#ffffff" } },
]


// ── Thèmes prédéfinis ─────────────────────────────────────────────────────────
export const PRESET_THEMES: Record<string, PageTheme> = {

  // ── MINIMAL ──────────────────────────────────────────────────────────────────
  epure_clair: {
    name: "Épuré Clair", category: "Minimal", emoji: "◻️", tags: ["minimal","clair","sobre"],
    bg: "#FAFAF8", surface: "#FFFFFF", primary: "#141414", accent: "#C9A84C",
    text: "#161616", muted: "#A8A190",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
  },
  sobre_nuit: {
    name: "Sobre Nuit", category: "Minimal", emoji: "🌑", tags: ["minimal","sombre","sobre"],
    bg: "#0C0C0D", surface: "#161617", primary: "#F5F5F3", accent: "#C9A84C",
    text: "#F0F0EE", muted: "#8A8A88",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
  },

  // ── BUSINESS ─────────────────────────────────────────────────────────────────
  midnight_gold: {
    name: "Midnight Gold", category: "Business", emoji: "💼", tags: ["premium","sombre","or"],
    bg: "#080808", surface: "#111009", primary: "#C9A84C", accent: "#39FF8F",
    text: "#F5F0E8", muted: "#A8A190",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 25, glow_size: 350,
  },

  corporate_navy: {
    name: "Corporate Navy", category: "Business", emoji: "🏢", tags: ["corporate","bleu","professionnel"],
    bg: "#0A1628", surface: "#142240", primary: "#3B82F6", accent: "#60A5FA",
    text: "#F0F6FF", muted: "#7A8FA8",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A1628 0%,#0D2347 50%,#0A1628 100%)",
    bgPattern: "grid",
    effect_vignette: true, vignette_intensity: 50,
  },

  executive_slate: {
    name: "Executive Slate", category: "Business", emoji: "📊", tags: ["consulting","gris","moderne"],
    bg: "#141A22", surface: "#1E2736", primary: "#58A6FF", accent: "#3FB950",
    text: "#E6EDF3", muted: "#8B949E",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#141A22,#1C2840)",
    effect_noise: true, noise_opacity: 5,
    effect_vignette: true, vignette_intensity: 40,
  },

  boardroom: {
    name: "Boardroom", category: "Business", emoji: "👔", tags: ["executive","sombre","elegant"],
    bg: "#0E0E0E", surface: "#1A1A1A", primary: "#E8E8E8", accent: "#C9A84C",
    text: "#F5F5F5", muted: "#888888",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "pattern",
    bgPattern: "grid",
    effect_vignette: true, vignette_intensity: 70,
    pattern_color: "#FFFFFF", pattern_opacity: 0.025, pattern_size: 40,
  },

  black_diamond: {
    name: "Black Diamond", category: "Business", emoji: "💎", tags: ["luxe","noir","diamant"],
    bg: "#050505", surface: "#0F0F0F", primary: "#E8E8E8", accent: "#A78BFA",
    text: "#F5F5F5", muted: "#666666",
    border: "rgba(167,139,250,0.12)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#050505,#0A0A0F,#050505)",
    effect_noise: true, noise_opacity: 3,
    effect_glow: true, glow_color: "#A78BFA", glow_intensity: 20, glow_size: 400,
    effect_vignette: true, vignette_intensity: 60,
  },

  platinum_executive: {
    name: "Platinum Executive", category: "Business", emoji: "🔘", tags: ["platine","argent","premium"],
    bg: "#1A1A1A", surface: "#252525", primary: "#D4D4D4", accent: "#C9A84C",
    text: "#F5F5F5", muted: "#999999",
    border: "rgba(212,212,212,0.15)",
    fontDisplay: "Playfair Display", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#1A1A1A,#2A2A2A)",
    effect_noise: true, noise_opacity: 6,
  },

  bloomberg_dark: {
    name: "Bloomberg Dark", category: "Business", emoji: "📈", tags: ["finance","data","bleu"],
    bg: "#0A0E13", surface: "#131A23", primary: "#FF8C00", accent: "#00C2FF",
    text: "#E8F0F8", muted: "#5A6A7A",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#0A0E13,#0D1520)",
    bgPattern: "grid",
  },

  finance_elite: {
    name: "Finance Elite", category: "Business", emoji: "🏦", tags: ["banque","or","prestige"],
    bg: "#0C0A00", surface: "#1A1400", primary: "#D4A843", accent: "#FFD700",
    text: "#FFF8E6", muted: "#8A7840",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0C0A00,#1A1200)",
    effect_glow: true, glow_color: "#D4A843", glow_intensity: 20, glow_size: 350,
    effect_vignette: true, vignette_intensity: 65,
  },

  silicon_office: {
    name: "Silicon Office", category: "Business", emoji: "💻", tags: ["tech","startup","moderne"],
    bg: "#F8FAFC", surface: "#F1F5F9", primary: "#0F172A", accent: "#6366F1",
    text: "#0F172A", muted: "#64748B",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  consulting_blue: {
    name: "Consulting Blue", category: "Business", emoji: "🎯", tags: ["conseil","bleu","pro"],
    bg: "#040D21", surface: "#0A1935", primary: "#4F83F4", accent: "#38BDF8",
    text: "#EEF2FF", muted: "#6678A0",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "mesh",
    effect_vignette: true, vignette_intensity: 55,
    mesh_c1: "#4F83F4", mesh_c2: "#0A1935", mesh_c3: "#1E3A5F", mesh_blur: 80,
  },

  steel_modern: {
    name: "Steel Modern", category: "Business", emoji: "⚙️", tags: ["acier","gris","clean"],
    bg: "#1C1C1E", surface: "#2C2C2E", primary: "#FF9F0A", accent: "#30D158",
    text: "#F5F5F7", muted: "#98989A",
    border: "rgba(255,255,255,0.1)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  dark_architect: {
    name: "Dark Architect", category: "Business", emoji: "🏗️", tags: ["architecture","sombre","lignes"],
    bg: "#0D0D0D", surface: "#161616", primary: "#C8A96E", accent: "#4A9EFF",
    text: "#E8E8E0", muted: "#6A6A60",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "pattern",
    bgPattern: "grid",
    effect_vignette: true, vignette_intensity: 50,
    pattern_color: "#C8A96E", pattern_opacity: 0.05, pattern_size: 50,
  },

  navy_gold_prestige: {
    name: "Navy Gold Prestige", category: "Business", emoji: "⚓", tags: ["marine","or","prestige"],
    bg: "#05111E", surface: "#0A2035", primary: "#C9A84C", accent: "#3B82F6",
    text: "#F0F6FF", muted: "#5A7A9A",
    border: "rgba(201,168,76,0.15)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#05111E,#091A2E)",
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 15, glow_size: 400,
  },

  // ── LUXURY ───────────────────────────────────────────────────────────────────
  velvet_noir: {
    name: "Velvet Noir", category: "Luxury", emoji: "🖤", tags: ["luxe","violet","velvet"],
    bg: "#070508", surface: "#0F0A12", primary: "#C4A6E8", accent: "#F472B6",
    text: "#F5F0FF", muted: "#7A6A9A",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#070508,#100818)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#A78BFA", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  golden_luxury: {
    name: "Golden Luxury", category: "Luxury", emoji: "✨", tags: ["or","prestige","rolex"],
    bg: "#060400", surface: "#120D00", primary: "#D4A843", accent: "#FFC940",
    text: "#FFF3D0", muted: "#8A7030",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#060400,#130E00,#060400)",
    effect_noise: true, noise_opacity: 5,
    effect_glow: true, glow_color: "#D4A843", glow_intensity: 30, glow_size: 300,
    effect_vignette: true, vignette_intensity: 65,
  },

  royal_purple: {
    name: "Royal Purple", category: "Luxury", emoji: "👑", tags: ["royal","cartier","violet"],
    bg: "#06000F", surface: "#0F0020", primary: "#9B59B6", accent: "#DA70D6",
    text: "#F8F0FF", muted: "#8060A0",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#06000F,#120028)",
    effect_glow: true, glow_color: "#9B59B6", glow_intensity: 30, glow_size: 320,
    effect_vignette: true, vignette_intensity: 70,
  },

  pearl_white: {
    name: "Pearl White", category: "Luxury", emoji: "🤍", tags: ["blanc","pur","hermes"],
    bg: "#FAFAF8", surface: "#F2F0ED", primary: "#1A1410", accent: "#C9A84C",
    text: "#1A1410", muted: "#7A7060",
    border: "rgba(26,20,16,0.08)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 2,
  },

  champagne: {
    name: "Champagne", category: "Luxury", emoji: "🥂", tags: ["champagne","rose","cartier"],
    bg: "#160C06", surface: "#251508", primary: "#E8C48C", accent: "#D4956A",
    text: "#FFF0DC", muted: "#9A7858",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#160C06,#2A1608)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#E8C48C", glow_intensity: 20, glow_size: 350,
  },

  monaco_nights: {
    name: "Monaco Nights", category: "Luxury", emoji: "🎰", tags: ["monaco","rouge","casino"],
    bg: "#0A0005", surface: "#150008", primary: "#FF1744", accent: "#FFD700",
    text: "#FFF0F0", muted: "#9A6070",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A0005,#180008)",
    effect_glow: true, glow_color: "#FF1744", glow_intensity: 25, glow_size: 300,
    effect_vignette: true, vignette_intensity: 65,
  },

  black_card: {
    name: "Black Card", category: "Luxury", emoji: "💳", tags: ["amex","elite","platine"],
    bg: "#000000", surface: "#0A0A0A", primary: "#C9A84C", accent: "#FFFFFF",
    text: "#F8F8F8", muted: "#606060",
    border: "rgba(201,168,76,0.2)",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
    effect_vignette: true, vignette_intensity: 55,
  },

  emerald_palace: {
    name: "Emerald Palace", category: "Luxury", emoji: "💚", tags: ["emeraude","palais","prestige"],
    bg: "#01100A", surface: "#041F12", primary: "#00C877", accent: "#40FF88",
    text: "#E8FFF4", muted: "#40806A",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#01100A,#041A0E)",
    effect_glow: true, glow_color: "#00C877", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  imperial_gold: {
    name: "Imperial Gold", category: "Luxury", emoji: "🏛️", tags: ["empire","or","imperial"],
    bg: "#08050A", surface: "#130C14", primary: "#FFD700", accent: "#FFA500",
    text: "#FFFDE8", muted: "#9A8A40",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#08050A,#180E00,#08050A)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#FFD700", glow_intensity: 35, glow_size: 300,
  },

  rolls_edition: {
    name: "Rolls Edition", category: "Luxury", emoji: "🚗", tags: ["rolls","royce","prestige"],
    bg: "#0A0A08", surface: "#151510", primary: "#C9B882", accent: "#E8D4A0",
    text: "#F5F0E0", muted: "#8A8060",
    border: "rgba(201,184,130,0.15)",
    fontDisplay: "Playfair Display", fontBody: "Fraunces",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#0A0A08,#14140C)",
    effect_noise: true, noise_opacity: 5,
    effect_vignette: true, vignette_intensity: 55,
  },

  diamond_dust: {
    name: "Diamond Dust", category: "Luxury", emoji: "✦", tags: ["diamant","cristal","blanc"],
    bg: "#F8FAFB", surface: "#EEF2F5", primary: "#1A1E2A", accent: "#4F8EF7",
    text: "#1A1E2A", muted: "#7A8A9A",
    border: "rgba(26,30,42,0.1)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 2,
  },

  midnight_velvet: {
    name: "Midnight Velvet", category: "Luxury", emoji: "🌙", tags: ["velours","minuit","profond"],
    bg: "#050508", surface: "#0C0C14", primary: "#8B5CF6", accent: "#DDD6FE",
    text: "#F5F0FF", muted: "#6A60A0",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "mesh",
    effect_vignette: true, vignette_intensity: 70,
    mesh_c1: "#8B5CF6", mesh_c2: "#0C0C14", mesh_c3: "#1A0830", mesh_blur: 120,
  },

  ivory_gold: {
    name: "Ivory Gold", category: "Luxury", emoji: "🏺", tags: ["ivoire","or","raffinement"],
    bg: "#FAF8F0", surface: "#F0EDD8", primary: "#8B6914", accent: "#C9A84C",
    text: "#2A2010", muted: "#8A7850",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  obsidian_luxury: {
    name: "Obsidian Luxury", category: "Luxury", emoji: "⬛", tags: ["obsidien","noir","minimaliste"],
    bg: "#030303", surface: "#0A0A0A", primary: "#FFFFFF", accent: "#C9A84C",
    text: "#FAFAFA", muted: "#555555",
    border: "rgba(255,255,255,0.06)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_vignette: true, vignette_intensity: 60,
  },

  saphir_bleu: {
    name: "Saphir Bleu", category: "Luxury", emoji: "💎", tags: ["saphir","bleu","joaillerie"],
    bg: "#030A18", surface: "#071528", primary: "#1E90FF", accent: "#87CEEB",
    text: "#EEF6FF", muted: "#506080",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#030A18,#081C35)",
    effect_glow: true, glow_color: "#1E90FF", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  // ── CREATOR ──────────────────────────────────────────────────────────────────
  neon_creator: {
    name: "Neon Creator", category: "Creator", emoji: "⚡", tags: ["neon","creator","rose"],
    bg: "#030303", surface: "#0A0A0A", primary: "#FF0080", accent: "#00FFFF",
    text: "#F8F0FF", muted: "#808080",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#FF0080", glow_intensity: 30, glow_size: 300,
  },

  electric_neon: {
    name: "Electric Neon", category: "Creator", emoji: "🟢", tags: ["vert","neon","techno"],
    bg: "#020A04", surface: "#061208", primary: "#39FF8F", accent: "#00FFFF",
    text: "#E8FFF0", muted: "#40806A",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
    effect_glow: true, glow_color: "#39FF8F", glow_intensity: 30, glow_size: 280,
  },

  tiktok_vibes: {
    name: "TikTok Vibes", category: "Creator", emoji: "🎵", tags: ["tiktok","rouge","trend"],
    bg: "#000000", surface: "#0F0F0F", primary: "#FF2D55", accent: "#00F5FF",
    text: "#FFFFFF", muted: "#888888",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
    effect_glow: true, glow_color: "#FF2D55", glow_intensity: 25, glow_size: 350,
  },

  cyber_punk: {
    name: "Cyber Punk", category: "Creator", emoji: "🤖", tags: ["cyber","violet","futurisme"],
    bg: "#050010", surface: "#0D0028", primary: "#BF00FF", accent: "#FF6B00",
    text: "#F8F0FF", muted: "#7050A0",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#050010,#120030)",
    bgPattern: "grid",
    effect_glow: true, glow_color: "#BF00FF", glow_intensity: 35, glow_size: 300,
  },

  youtube_studio: {
    name: "YouTube Studio", category: "Creator", emoji: "▶️", tags: ["youtube","rouge","content"],
    bg: "#0F0F0F", surface: "#181818", primary: "#FF0000", accent: "#FFFFFF",
    text: "#FFFFFF", muted: "#AAAAAA",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
  },

  twitch_night: {
    name: "Twitch Night", category: "Creator", emoji: "🎮", tags: ["twitch","violet","stream"],
    bg: "#0D0514", surface: "#17073D", primary: "#9146FF", accent: "#BF94FF",
    text: "#F0E8FF", muted: "#7070A0",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0D0514,#1A0A3D)",
    effect_glow: true, glow_color: "#9146FF", glow_intensity: 30, glow_size: 300,
  },

  viral_neon: {
    name: "Viral Neon", category: "Creator", emoji: "💥", tags: ["viral","neon","explosion"],
    bg: "#020206", surface: "#06060F", primary: "#FF2079", accent: "#FFE000",
    text: "#FFFAF0", muted: "#705070",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#020206,#0A020F)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#FF2079", glow_intensity: 35, glow_size: 280,
  },

  creator_pro: {
    name: "Creator Pro", category: "Creator", emoji: "🎬", tags: ["professionnel","sombre","qualite"],
    bg: "#0A0A0A", surface: "#141414", primary: "#FF6B35", accent: "#4ECDC4",
    text: "#F5F5F5", muted: "#888888",
    border: "rgba(255,107,53,0.15)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  future_stream: {
    name: "Future Stream", category: "Creator", emoji: "📡", tags: ["futur","bleu","streaming"],
    bg: "#010A14", surface: "#021525", primary: "#00D4FF", accent: "#00FF88",
    text: "#E8F8FF", muted: "#407080",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#010A14,#021E30)",
    bgPattern: "dots",
    effect_glow: true, glow_color: "#00D4FF", glow_intensity: 30, glow_size: 300,
  },

  instagram_aesthetic: {
    name: "Instagram Aesthetic", category: "Creator", emoji: "📸", tags: ["instagram","rose","lifestyle"],
    bg: "#1A0818", surface: "#2A1028", primary: "#E1306C", accent: "#F77737",
    text: "#FFEEF8", muted: "#9060A0",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#1A0818,#18081A,#0A1018)",
    effect_glow: true, glow_color: "#E1306C", glow_intensity: 25, glow_size: 350,
  },

  retro_wave: {
    name: "Retro Wave", category: "Creator", emoji: "🌊", tags: ["retro","80s","synthwave"],
    bg: "#080020", surface: "#120038", primary: "#FF6AD5", accent: "#C774E8",
    text: "#FFF0FF", muted: "#8060C0",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#080020,#100030,#0A0010)",
    effect_glow: true, glow_color: "#FF6AD5", glow_intensity: 30, glow_size: 320,
  },

  dark_mode_creator: {
    name: "Dark Mode Creator", category: "Creator", emoji: "🌑", tags: ["sombre","minimal","creator"],
    bg: "#121212", surface: "#1E1E1E", primary: "#BB86FC", accent: "#03DAC6",
    text: "#E8E8E8", muted: "#888888",
    border: "rgba(187,134,252,0.1)",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
  },

  hype_orange: {
    name: "Hype Orange", category: "Creator", emoji: "🔥", tags: ["hype","orange","energie"],
    bg: "#0A0500", surface: "#150A00", primary: "#FF6D00", accent: "#FFD600",
    text: "#FFF3E0", muted: "#9A6020",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A0500,#180A00)",
    effect_glow: true, glow_color: "#FF6D00", glow_intensity: 30, glow_size: 280,
  },

  matrix_glitch: {
    name: "Matrix Glitch", category: "Creator", emoji: "⬛", tags: ["matrix","vert","hacker"],
    bg: "#000A00", surface: "#001500", primary: "#00FF41", accent: "#00C832",
    text: "#E8FFE8", muted: "#308A30",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "dots",
    effect_glow: true, glow_color: "#00FF41", glow_intensity: 25, glow_size: 300,
  },

  // ── STARTUP ──────────────────────────────────────────────────────────────────
  deep_space: {
    name: "Deep Space", category: "Startup", emoji: "🚀", tags: ["tech","cosmos","bleu"],
    bg: "#020B16", surface: "#071828", primary: "#00D4FF", accent: "#7B2FBE",
    text: "#EEF8FF", muted: "#5A7A9A",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#020B16,#071828)",
    bgPattern: "dots",
    effect_glow: true, glow_color: "#00D4FF", glow_intensity: 20, glow_size: 350,
  },

  aurora: {
    name: "Aurora", category: "Startup", emoji: "🌌", tags: ["aurora","gradient","futur"],
    bg: "#080E1E", surface: "#0E1830", primary: "#00FF9D", accent: "#00CFFF",
    text: "#E8FFF5", muted: "#409898",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "mesh",
    effect_vignette: true, vignette_intensity: 55,
    mesh_c1: "#00FF9D", mesh_c2: "#00CFFF", mesh_c3: "#7B2FBE", mesh_blur: 100,
  },

  saas_blue: {
    name: "SaaS Blue", category: "Startup", emoji: "💡", tags: ["saas","indigo","clean"],
    bg: "#F8FAFF", surface: "#EEF2FF", primary: "#4F46E5", accent: "#06B6D4",
    text: "#0F172A", muted: "#64748B",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
    bgPattern: "dots",
  },

  matrix_code: {
    name: "Matrix Code", category: "Startup", emoji: "💻", tags: ["matrix","vert","code"],
    bg: "#000800", surface: "#001200", primary: "#00FF41", accent: "#00C832",
    text: "#E8FFE8", muted: "#306030",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "grid",
    effect_glow: true, glow_color: "#00FF41", glow_intensity: 20, glow_size: 300,
  },

  stripe_inspired: {
    name: "Stripe Inspired", category: "Startup", emoji: "💳", tags: ["stripe","violet","payments"],
    bg: "#0A2540", surface: "#1A3550", primary: "#635BFF", accent: "#00D4FF",
    text: "#FFFFFF", muted: "#7A90A8",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#0A2540,#1A3A5C)",
    bgPattern: "grid",
  },

  linear_dark: {
    name: "Linear Dark", category: "Startup", emoji: "⚡", tags: ["linear","sombre","productivite"],
    bg: "#080808", surface: "#111111", primary: "#5E6AD2", accent: "#8B8BF0",
    text: "#E8E8F0", muted: "#606080",
    border: "rgba(94,106,210,0.15)",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  notion_light: {
    name: "Notion Light", category: "Startup", emoji: "📝", tags: ["notion","blanc","propre"],
    bg: "#FFFFFF", surface: "#F7F6F3", primary: "#191919", accent: "#E67E22",
    text: "#191919", muted: "#9B9A97",
    border: "rgba(25,25,25,0.09)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  ai_future: {
    name: "AI Future", category: "Startup", emoji: "🤖", tags: ["IA","futur","gradient"],
    bg: "#050B14", surface: "#0A1520", primary: "#9B59B6", accent: "#3498DB",
    text: "#ECF0F1", muted: "#5A6A8A",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "mesh",
    effect_vignette: true, vignette_intensity: 50,
    mesh_c1: "#9B59B6", mesh_c2: "#3498DB", mesh_c3: "#050B14", mesh_blur: 90,
  },

  quantum_saas: {
    name: "Quantum SaaS", category: "Startup", emoji: "🔮", tags: ["quantum","cyan","tech"],
    bg: "#030A0A", surface: "#061515", primary: "#00E5CC", accent: "#00B4D8",
    text: "#E0FFFF", muted: "#309898",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#030A0A,#061818)",
    effect_glow: true, glow_color: "#00E5CC", glow_intensity: 25, glow_size: 320,
  },

  vercel_inspired: {
    name: "Vercel Inspired", category: "Startup", emoji: "◼", tags: ["vercel","noir","minimal"],
    bg: "#000000", surface: "#111111", primary: "#FFFFFF", accent: "#888888",
    text: "#EDEDED", muted: "#888888",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  raycast_pro: {
    name: "Raycast Pro", category: "Startup", emoji: "🎯", tags: ["raycast","gradient","outil"],
    bg: "#1C1C1C", surface: "#272727", primary: "#FF6363", accent: "#FF9F0A",
    text: "#F5F5F5", muted: "#9A9A9A",
    border: "rgba(255,99,99,0.15)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  cloud_native: {
    name: "Cloud Native", category: "Startup", emoji: "☁️", tags: ["cloud","bleu","aws"],
    bg: "#F0F7FF", surface: "#E5EFFF", primary: "#0052CC", accent: "#00B8D9",
    text: "#172B4D", muted: "#6B778C",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
    bgPattern: "dots",
  },

  product_hunt: {
    name: "Product Hunt", category: "Startup", emoji: "🐱", tags: ["ph","orange","launch"],
    bg: "#FAFAFA", surface: "#F5F5F5", primary: "#DA552F", accent: "#FF6154",
    text: "#4B4B4B", muted: "#999999",
    border: "rgba(218,85,47,0.1)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  growth_dark: {
    name: "Growth Dark", category: "Startup", emoji: "📊", tags: ["growth","sombre","analytics"],
    bg: "#0D0D12", surface: "#16161E", primary: "#7C3AED", accent: "#10B981",
    text: "#F0F0F8", muted: "#6060A0",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0D0D12,#14142A)",
  },

  // ── RESTAURANT ───────────────────────────────────────────────────────────────
  sunset_fire: {
    name: "Sunset Fire", category: "Restaurant", emoji: "🔥", tags: ["orange","bistro","chaleur"],
    bg: "#120300", surface: "#200800", primary: "#FF6B00", accent: "#FF4500",
    text: "#FFF5EE", muted: "#9A5020",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#120300,#1F0600)",
    effect_glow: true, glow_color: "#FF6B00", glow_intensity: 20, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  bistro_rouge: {
    name: "Bistro Rouge", category: "Restaurant", emoji: "🍷", tags: ["rouge","vin","francais"],
    bg: "#120006", surface: "#200010", primary: "#C41E3A", accent: "#E8B4B8",
    text: "#FFF0F2", muted: "#9A4060",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#120006,#1E000A)",
    effect_noise: true, noise_opacity: 5,
    effect_vignette: true, vignette_intensity: 55,
  },

  coffee_house: {
    name: "Coffee House", category: "Restaurant", emoji: "☕", tags: ["cafe","brun","cosy"],
    bg: "#140A06", surface: "#221204", primary: "#8B5E3C", accent: "#D4956A",
    text: "#FFF5EC", muted: "#9A7858",
    fontDisplay: "Playfair Display", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#140A06,#201008)",
    effect_noise: true, noise_opacity: 6,
    effect_vignette: true, vignette_intensity: 50,
  },

  garden_fresh: {
    name: "Garden Fresh", category: "Restaurant", emoji: "🌿", tags: ["bio","vert","frais"],
    bg: "#F5FFF5", surface: "#EBF8EB", primary: "#16A34A", accent: "#4ADE80",
    text: "#0A2A0A", muted: "#406040",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  michelin_gold: {
    name: "Michelin Gold", category: "Restaurant", emoji: "⭐", tags: ["michelin","etoile","gastronomie"],
    bg: "#080808", surface: "#111111", primary: "#C9A84C", accent: "#E8D08C",
    text: "#F5F0E0", muted: "#8A7840",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#080808,#130F00)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 20, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  tokyo_sushi: {
    name: "Tokyo Sushi", category: "Restaurant", emoji: "🍣", tags: ["japonais","rouge","minimal"],
    bg: "#0F0000", surface: "#1A0000", primary: "#E8192C", accent: "#FFD700",
    text: "#FFF5F5", muted: "#9A4040",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "grid",
    effect_vignette: true, vignette_intensity: 55,
  },

  italian_trattoria: {
    name: "Italian Trattoria", category: "Restaurant", emoji: "🍝", tags: ["italie","rouge","convivial"],
    bg: "#1A0808", surface: "#2A1010", primary: "#CC3333", accent: "#F5A623",
    text: "#FFF5EE", muted: "#9A5840",
    fontDisplay: "Playfair Display", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#1A0808,#240C08)",
    effect_noise: true, noise_opacity: 5,
    effect_vignette: true, vignette_intensity: 50,
  },

  steak_house: {
    name: "Steak House", category: "Restaurant", emoji: "🥩", tags: ["steak","brun","premium"],
    bg: "#0A0600", surface: "#160C00", primary: "#C85000", accent: "#E8A020",
    text: "#FFF5E0", muted: "#9A6020",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A0600,#180C00)",
    effect_noise: true, noise_opacity: 6,
    effect_vignette: true, vignette_intensity: 60,
  },

  wine_cellar: {
    name: "Wine Cellar", category: "Restaurant", emoji: "🍾", tags: ["cave","bordeaux","vins"],
    bg: "#0C0406", surface: "#1A080C", primary: "#8B1A3A", accent: "#D4A0A8",
    text: "#FFF0F2", muted: "#7A4050",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#0C0406,#1A0808)",
    effect_noise: true, noise_opacity: 6,
    effect_vignette: true, vignette_intensity: 65,
  },

  street_food: {
    name: "Street Food", category: "Restaurant", emoji: "🌮", tags: ["street","coloré","vivant"],
    bg: "#141414", surface: "#1E1E1E", primary: "#FF4500", accent: "#FFD700",
    text: "#FFFFFF", muted: "#AAAAAA",
    border: "rgba(255,69,0,0.15)",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
  },

  boulangerie: {
    name: "Boulangerie", category: "Restaurant", emoji: "🥐", tags: ["boulangerie","creme","chaud"],
    bg: "#FAF3E0", surface: "#F0E8CA", primary: "#8B5E3C", accent: "#D4A843",
    text: "#3C2008", muted: "#8A6040",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  thai_spice: {
    name: "Thai Spice", category: "Restaurant", emoji: "🌶️", tags: ["thai","vert","epice"],
    bg: "#0A1400", surface: "#121E00", primary: "#7CB518", accent: "#F7B32B",
    text: "#F5FFF0", muted: "#50701A",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A1400,#141E00)",
    effect_vignette: true, vignette_intensity: 50,
  },

  nordic_cafe: {
    name: "Nordic Cafe", category: "Restaurant", emoji: "☕", tags: ["nordique","blanc","epure"],
    bg: "#F5F5F0", surface: "#ECEAE4", primary: "#2D2D2A", accent: "#8B6914",
    text: "#1A1A18", muted: "#808070",
    border: "rgba(45,45,42,0.1)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  rooftop_bar: {
    name: "Rooftop Bar", category: "Restaurant", emoji: "🍸", tags: ["rooftop","nuit","cocktail"],
    bg: "#050510", surface: "#0C0C20", primary: "#9B59B6", accent: "#F39C12",
    text: "#F8F0FF", muted: "#605080",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#050510,#0A0A1E)",
    effect_glow: true, glow_color: "#9B59B6", glow_intensity: 20, glow_size: 350,
    effect_vignette: true, vignette_intensity: 60,
  },

  // ── IMMOBILIER ───────────────────────────────────────────────────────────────
  prestige_immo: {
    name: "Prestige Immo", category: "Immobilier", emoji: "🏠", tags: ["prestige","or","luxe"],
    bg: "#0C0C0C", surface: "#161616", primary: "#D4AF37", accent: "#C9A84C",
    text: "#F5F0E0", muted: "#8A7840",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_glow: true, glow_color: "#D4AF37", glow_intensity: 15, glow_size: 400,
    effect_vignette: true, vignette_intensity: 55,
  },

  coastal_living: {
    name: "Coastal Living", category: "Immobilier", emoji: "🌊", tags: ["mer","bleu","clair"],
    bg: "#EEF8FF", surface: "#E0F2FF", primary: "#0284C7", accent: "#0EA5E9",
    text: "#0C2A40", muted: "#5A90B0",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  urban_loft: {
    name: "Urban Loft", category: "Immobilier", emoji: "🏙️", tags: ["urbain","béton","moderne"],
    bg: "#1A1A1A", surface: "#252525", primary: "#E0E0E0", accent: "#FF5722",
    text: "#F5F5F5", muted: "#909090",
    border: "rgba(255,255,255,0.1)",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
  },

  manhattan_premium: {
    name: "Manhattan Premium", category: "Immobilier", emoji: "🗽", tags: ["manhattan","noir","premium"],
    bg: "#070707", surface: "#101010", primary: "#C8B08A", accent: "#E8D0A8",
    text: "#F8F4EC", muted: "#807060",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#070707,#100E08)",
    effect_noise: true, noise_opacity: 4,
    effect_vignette: true, vignette_intensity: 55,
  },

  dubai_towers: {
    name: "Dubai Towers", category: "Immobilier", emoji: "🌇", tags: ["dubai","or","futuriste"],
    bg: "#040408", surface: "#08081A", primary: "#D4A843", accent: "#F0D080",
    text: "#F5F0E0", muted: "#808060",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#040408,#080816)",
    effect_glow: true, glow_color: "#D4A843", glow_intensity: 20, glow_size: 400,
    effect_vignette: true, vignette_intensity: 60,
  },

  villa_prestige: {
    name: "Villa Prestige", category: "Immobilier", emoji: "🌴", tags: ["villa","blanc","prestige"],
    bg: "#FAFAF5", surface: "#F2F0E8", primary: "#1A1A10", accent: "#8B6914",
    text: "#1A1A10", muted: "#808060",
    border: "rgba(26,26,16,0.1)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 2,
  },

  modern_architecture: {
    name: "Modern Architecture", category: "Immobilier", emoji: "🔲", tags: ["architecture","gris","lignes"],
    bg: "#F8F8F8", surface: "#F0F0F0", primary: "#212121", accent: "#455A64",
    text: "#212121", muted: "#757575",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "grid",
  },

  provence_stone: {
    name: "Provence Stone", category: "Immobilier", emoji: "🌻", tags: ["provence","pierre","chaud"],
    bg: "#F5EFE0", surface: "#EDE5CC", primary: "#8B5E3C", accent: "#D4956A",
    text: "#3A2010", muted: "#9A7050",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
  },

  sothebys_dark: {
    name: "Sotheby's Dark", category: "Immobilier", emoji: "🏛️", tags: ["sothebys","classique","prestige"],
    bg: "#0A0808", surface: "#141010", primary: "#C8A870", accent: "#E0C898",
    text: "#F5F0E0", muted: "#887060",
    fontDisplay: "Playfair Display", fontBody: "Fraunces",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#0A0808,#140E0A)",
    effect_noise: true, noise_opacity: 4,
    effect_vignette: true, vignette_intensity: 55,
  },

  hamptons: {
    name: "The Hamptons", category: "Immobilier", emoji: "⛵", tags: ["hamptons","bleu","blanc"],
    bg: "#F0F8FF", surface: "#E5F2FF", primary: "#1B3D6B", accent: "#4A90D9",
    text: "#1B3D6B", muted: "#5A7A9A",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "grid",
  },

  tokyo_modern: {
    name: "Tokyo Modern", category: "Immobilier", emoji: "🏯", tags: ["tokyo","blanc","epure"],
    bg: "#FAFAFA", surface: "#F0F0F0", primary: "#1A1A1A", accent: "#E8192C",
    text: "#1A1A1A", muted: "#888888",
    border: "rgba(26,26,26,0.08)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  green_architect: {
    name: "Green Architect", category: "Immobilier", emoji: "🌿", tags: ["bio","vert","eco"],
    bg: "#F0F8F0", surface: "#E5F3E5", primary: "#1B5E20", accent: "#4CAF50",
    text: "#1B3020", muted: "#507050",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  luxury_penthouse: {
    name: "Luxury Penthouse", category: "Immobilier", emoji: "🌆", tags: ["penthouse","nuit","ciel"],
    bg: "#030A14", surface: "#06121E", primary: "#C9A84C", accent: "#87CEEB",
    text: "#F0F8FF", muted: "#5070A0",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#030A14,#050F1E)",
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 15, glow_size: 400,
    effect_vignette: true, vignette_intensity: 50,
  },

  // ── FITNESS ──────────────────────────────────────────────────────────────────
  power_red: {
    name: "Power Red", category: "Fitness", emoji: "💪", tags: ["rouge","energie","sport"],
    bg: "#080000", surface: "#140000", primary: "#DC2626", accent: "#EF4444",
    text: "#FFF5F5", muted: "#9A3020",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#080000,#140000)",
    effect_glow: true, glow_color: "#DC2626", glow_intensity: 25, glow_size: 300,
    effect_vignette: true, vignette_intensity: 60,
  },

  iron_black: {
    name: "Iron Black", category: "Fitness", emoji: "🏋️", tags: ["noir","metal","muscu"],
    bg: "#060606", surface: "#0F0F0F", primary: "#FFFFFF", accent: "#C9A84C",
    text: "#F5F5F5", muted: "#888888",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "diagonals",
    effect_noise: true, noise_opacity: 4,
  },

  zen_wellness: {
    name: "Zen Wellness", category: "Fitness", emoji: "🧘", tags: ["zen","vert","calme"],
    bg: "#F5FFF5", surface: "#EAFAEA", primary: "#059669", accent: "#34D399",
    text: "#064E3B", muted: "#407A60",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  orange_boost: {
    name: "Orange Boost", category: "Fitness", emoji: "🏃", tags: ["orange","running","vitesse"],
    bg: "#070400", surface: "#120800", primary: "#EA580C", accent: "#FBBF24",
    text: "#FFF5EE", muted: "#9A5020",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#070400,#130800)",
    effect_glow: true, glow_color: "#EA580C", glow_intensity: 25, glow_size: 300,
  },

  spartan: {
    name: "Spartan", category: "Fitness", emoji: "⚔️", tags: ["spartan","rouge","warrior"],
    bg: "#0A0000", surface: "#180000", primary: "#CC0000", accent: "#FF6B6B",
    text: "#FFFFFF", muted: "#AA4444",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "diagonals",
    effect_vignette: true, vignette_intensity: 65,
  },

  ufc_arena: {
    name: "UFC Arena", category: "Fitness", emoji: "🥊", tags: ["ufc","doré","champion"],
    bg: "#000000", surface: "#0A0A0A", primary: "#FFD700", accent: "#FF4500",
    text: "#FFFFFF", muted: "#AAAAAA",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_glow: true, glow_color: "#FFD700", glow_intensity: 20, glow_size: 350,
  },

  beast_mode: {
    name: "Beast Mode", category: "Fitness", emoji: "💥", tags: ["beast","noir","rouge"],
    bg: "#050505", surface: "#0F0505", primary: "#FF0000", accent: "#FFFFFF",
    text: "#FFFFFF", muted: "#AA3333",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#FF0000", glow_intensity: 30, glow_size: 280,
  },

  elite_performance: {
    name: "Elite Performance", category: "Fitness", emoji: "🏆", tags: ["elite","bleu","performance"],
    bg: "#050A14", surface: "#0A1525", primary: "#1E90FF", accent: "#00CFFF",
    text: "#EEF8FF", muted: "#4070A0",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#050A14,#0A1428)",
    effect_glow: true, glow_color: "#1E90FF", glow_intensity: 25, glow_size: 300,
  },

  crossfit_brutal: {
    name: "Crossfit Brutal", category: "Fitness", emoji: "🔩", tags: ["crossfit","gris","acier"],
    bg: "#1A1A1A", surface: "#252525", primary: "#FF6B35", accent: "#FFD700",
    text: "#FFFFFF", muted: "#AAAAAA",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "grid",
  },

  nike_dark: {
    name: "Nike Dark", category: "Fitness", emoji: "👟", tags: ["nike","noir","blanc"],
    bg: "#000000", surface: "#111111", primary: "#FFFFFF", accent: "#EF4444",
    text: "#FFFFFF", muted: "#888888",
    border: "rgba(255,255,255,0.06)",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
  },

  yoga_sunrise: {
    name: "Yoga Sunrise", category: "Fitness", emoji: "🌅", tags: ["yoga","rose","douceur"],
    bg: "#FFF5F0", surface: "#FFE8E0", primary: "#E8784A", accent: "#F5B5A0",
    text: "#3A1808", muted: "#9A5040",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  gymshark_pro: {
    name: "Gymshark Pro", category: "Fitness", emoji: "💎", tags: ["gymshark","sombre","sleek"],
    bg: "#0A0A0A", surface: "#141414", primary: "#00C2A8", accent: "#00E5C8",
    text: "#F0FFFD", muted: "#40A090",
    border: "rgba(0,194,168,0.12)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  green_machine: {
    name: "Green Machine", category: "Fitness", emoji: "💚", tags: ["vert","endurance","trail"],
    bg: "#030A03", surface: "#061206", primary: "#22C55E", accent: "#86EFAC",
    text: "#E8FFE8", muted: "#307A30",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
    effect_glow: true, glow_color: "#22C55E", glow_intensity: 20, glow_size: 300,
  },

  aqua_swim: {
    name: "Aqua Swim", category: "Fitness", emoji: "🏊", tags: ["aqua","bleu","natation"],
    bg: "#020A14", surface: "#041525", primary: "#0EA5E9", accent: "#38BDF8",
    text: "#E0F8FF", muted: "#306080",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#020A14,#041828)",
    effect_glow: true, glow_color: "#0EA5E9", glow_intensity: 20, glow_size: 350,
  },

  // ── EVENT ────────────────────────────────────────────────────────────────────
  festival_night: {
    name: "Festival Night", category: "Event", emoji: "🎉", tags: ["festival","sombre","fete"],
    bg: "#020008", surface: "#060012", primary: "#FF6B35", accent: "#FFD700",
    text: "#FFF5F0", muted: "#806050",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#020008,#08001A)",
    effect_glow: true, glow_color: "#FF6B35", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 55,
  },

  celebration: {
    name: "Celebration", category: "Event", emoji: "🥳", tags: ["fete","or","festif"],
    bg: "#080400", surface: "#120800", primary: "#F59E0B", accent: "#FBBF24",
    text: "#FFFDE8", muted: "#8A7020",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#080400,#140A00)",
    effect_glow: true, glow_color: "#F59E0B", glow_intensity: 25, glow_size: 300,
  },

  corporate_event: {
    name: "Corporate Event", category: "Event", emoji: "🎯", tags: ["conference","bleu","pro"],
    bg: "#0A1628", surface: "#142240", primary: "#3B82F6", accent: "#60A5FA",
    text: "#F0F6FF", muted: "#6A8AB0",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A1628,#0E2040)",
    bgPattern: "grid",
  },

  wedding: {
    name: "Wedding", category: "Event", emoji: "💍", tags: ["mariage","rose","elegant"],
    bg: "#FDF8F5", surface: "#F5EDE8", primary: "#B8836F", accent: "#D4A090",
    text: "#3A1E18", muted: "#9A7060",
    border: "rgba(184,131,111,0.12)",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  luxury_wedding: {
    name: "Luxury Wedding", category: "Event", emoji: "💒", tags: ["mariage","or","luxe"],
    bg: "#0A0808", surface: "#141010", primary: "#D4AF37", accent: "#F0D080",
    text: "#FFF8E8", muted: "#8A7040",
    fontDisplay: "Fraunces", fontBody: "Fraunces",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A0808,#141008)",
    effect_glow: true, glow_color: "#D4AF37", glow_intensity: 20, glow_size: 400,
    effect_vignette: true, vignette_intensity: 55,
  },

  black_tie: {
    name: "Black Tie", category: "Event", emoji: "🎩", tags: ["gala","noir","formel"],
    bg: "#000000", surface: "#0A0A0A", primary: "#FFFFFF", accent: "#C9A84C",
    text: "#FFFFFF", muted: "#888888",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
    effect_vignette: true, vignette_intensity: 60,
  },

  vip_gala: {
    name: "VIP Gala", category: "Event", emoji: "🌟", tags: ["vip","pourpre","gala"],
    bg: "#0A0010", surface: "#140020", primary: "#C084FC", accent: "#A855F7",
    text: "#F8F0FF", muted: "#705090",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A0010,#180030)",
    effect_glow: true, glow_color: "#C084FC", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 55,
  },

  fashion_week: {
    name: "Fashion Week", category: "Event", emoji: "👗", tags: ["mode","noir","fashion"],
    bg: "#050505", surface: "#0F0F0F", primary: "#F0F0F0", accent: "#E8192C",
    text: "#F8F8F8", muted: "#707070",
    fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_vignette: true, vignette_intensity: 50,
  },

  music_concert: {
    name: "Music Concert", category: "Event", emoji: "🎸", tags: ["concert","noir","rock"],
    bg: "#000000", surface: "#080808", primary: "#FF2079", accent: "#FF8C00",
    text: "#FFFFFF", muted: "#AAAAAA",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_glow: true, glow_color: "#FF2079", glow_intensity: 30, glow_size: 300,
  },

  rooftop_party: {
    name: "Rooftop Party", category: "Event", emoji: "🌃", tags: ["rooftop","nuit","fete"],
    bg: "#030615", surface: "#06101F", primary: "#7B61FF", accent: "#FF6B6B",
    text: "#F0F0FF", muted: "#5550A0",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#030615,#040A1A)",
    effect_glow: true, glow_color: "#7B61FF", glow_intensity: 25, glow_size: 350,
    effect_vignette: true, vignette_intensity: 50,
  },

  summer_festival: {
    name: "Summer Festival", category: "Event", emoji: "☀️", tags: ["ete","tropical","coloré"],
    bg: "#FF6B35", surface: "#FF8C5A", primary: "#FFFFFF", accent: "#FFD700",
    text: "#FFFFFF", muted: "#FFE0D0",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#FF6B35,#FF8C00)",
  },

  tech_conference: {
    name: "Tech Conference", category: "Event", emoji: "🖥️", tags: ["tech","bleu","startup"],
    bg: "#0D1117", surface: "#161B22", primary: "#58A6FF", accent: "#3FB950",
    text: "#E6EDF3", muted: "#7D8590",
    fontDisplay: "DM Sans", fontBody: "Inter",
    bgMode: "solid",
    bgPattern: "grid",
  },

  art_opening: {
    name: "Art Opening", category: "Event", emoji: "🎨", tags: ["art","blanc","galerie"],
    bg: "#F8F8F6", surface: "#F0F0EE", primary: "#1A1A1A", accent: "#E8192C",
    text: "#1A1A1A", muted: "#808080",
    border: "rgba(26,26,26,0.1)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
  },

  charity_gala: {
    name: "Charity Gala", category: "Event", emoji: "💛", tags: ["charité","or","elegant"],
    bg: "#0A0800", surface: "#141200", primary: "#C9A84C", accent: "#F0D080",
    text: "#FFF8E0", muted: "#8A7020",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A0800,#160E00)",
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 20, glow_size: 400,
  },

  // ── MUSIC ────────────────────────────────────────────────────────────────────
  studio_dark: {
    name: "Studio Dark", category: "Music", emoji: "🎙️", tags: ["studio","sombre","rap"],
    bg: "#030303", surface: "#0A0A0A", primary: "#1DB954", accent: "#1ED760",
    text: "#FFFFFF", muted: "#AAAAAA",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_glow: true, glow_color: "#1DB954", glow_intensity: 20, glow_size: 300,
  },

  rose_luxe: {
    name: "Rose Luxe", category: "Music", emoji: "🌸", tags: ["rose","pop","girly"],
    bg: "#0A0008", surface: "#150010", primary: "#EC4899", accent: "#F9A8D4",
    text: "#FFF0F8", muted: "#9060A0",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#0A0008,#180018)",
    effect_glow: true, glow_color: "#EC4899", glow_intensity: 25, glow_size: 350,
  },

  vinyl_club: {
    name: "Vinyl Club", category: "Music", emoji: "🎵", tags: ["vinyle","retro","jazz"],
    bg: "#140E06", surface: "#201608", primary: "#D97706", accent: "#F59E0B",
    text: "#FFF5DC", muted: "#8A6020",
    fontDisplay: "Playfair Display", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#140E06,#1E1206)",
    effect_noise: true, noise_opacity: 6,
  },

  cherry_blossom: {
    name: "Cherry Blossom", category: "Music", emoji: "🌺", tags: ["sakura","rose","doux"],
    bg: "#140008", surface: "#200010", primary: "#FF6B9D", accent: "#FF99BB",
    text: "#FFF0F5", muted: "#9A5070",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#140008,#1E000E)",
    effect_glow: true, glow_color: "#FF6B9D", glow_intensity: 20, glow_size: 350,
  },

  synthwave: {
    name: "Synthwave", category: "Music", emoji: "🌊", tags: ["80s","synthwave","retro"],
    bg: "#050015", surface: "#0A0025", primary: "#FF6AD5", accent: "#C774E8",
    text: "#FFF0FF", muted: "#8060C0",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#050015,#0E0030)",
    bgPattern: "grid",
    effect_glow: true, glow_color: "#FF6AD5", glow_intensity: 30, glow_size: 300,
  },

  edm_festival: {
    name: "EDM Festival", category: "Music", emoji: "🎧", tags: ["edm","bleu","festival"],
    bg: "#020010", surface: "#050020", primary: "#00FFFF", accent: "#FF00FF",
    text: "#F0FFFF", muted: "#40A0A0",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#020010,#080028)",
    effect_noise: true, noise_opacity: 3,
    effect_glow: true, glow_color: "#00FFFF", glow_intensity: 30, glow_size: 280,
  },

  piano_lounge: {
    name: "Piano Lounge", category: "Music", emoji: "🎹", tags: ["piano","elegant","jazz"],
    bg: "#0A0808", surface: "#141010", primary: "#E8D5B0", accent: "#C9A84C",
    text: "#FFF8F0", muted: "#8A7060",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A0808,#140C08)",
    effect_noise: true, noise_opacity: 5,
    effect_vignette: true, vignette_intensity: 55,
  },

  jazz_club: {
    name: "Jazz Club", category: "Music", emoji: "🎷", tags: ["jazz","brun","vintage"],
    bg: "#1A1008", surface: "#261808", primary: "#D4A843", accent: "#F5C878",
    text: "#FFF5D0", muted: "#9A7840",
    fontDisplay: "Playfair Display", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#1A1008,#221408)",
    effect_noise: true, noise_opacity: 7,
    effect_vignette: true, vignette_intensity: 60,
  },

  spotify_modern: {
    name: "Spotify Modern", category: "Music", emoji: "🎵", tags: ["spotify","vert","stream"],
    bg: "#121212", surface: "#181818", primary: "#1DB954", accent: "#1ED760",
    text: "#FFFFFF", muted: "#B3B3B3",
    border: "rgba(255,255,255,0.06)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  hip_hop_dark: {
    name: "Hip Hop Dark", category: "Music", emoji: "🎤", tags: ["hiphop","sombre","urban"],
    bg: "#050505", surface: "#0A0A0A", primary: "#FF4500", accent: "#FFD700",
    text: "#FFFFFF", muted: "#888888",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_glow: true, glow_color: "#FF4500", glow_intensity: 25, glow_size: 300,
  },

  lo_fi_chill: {
    name: "Lo-Fi Chill", category: "Music", emoji: "🌙", tags: ["lofi","pastel","calme"],
    bg: "#1E1B2E", surface: "#2A2640", primary: "#B8A8D4", accent: "#A0D4C8",
    text: "#E8E0F8", muted: "#706090",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#1E1B2E,#28243A)",
    effect_noise: true, noise_opacity: 5,
  },

  metal_heavy: {
    name: "Metal Heavy", category: "Music", emoji: "🤘", tags: ["metal","sombre","puissance"],
    bg: "#000000", surface: "#080808", primary: "#CC0000", accent: "#FF3300",
    text: "#E8E8E8", muted: "#888888",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "grid",
    effect_vignette: true, vignette_intensity: 65,
  },

  classical_gold: {
    name: "Classical Gold", category: "Music", emoji: "🎻", tags: ["classique","or","orchestre"],
    bg: "#0C0A00", surface: "#181400", primary: "#C9A84C", accent: "#E8D070",
    text: "#FFF8DC", muted: "#9A8040",
    fontDisplay: "Fraunces", fontBody: "Fraunces",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0C0A00,#181400)",
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 20, glow_size: 400,
    effect_vignette: true, vignette_intensity: 55,
  },

  pop_art_music: {
    name: "Pop Art Music", category: "Music", emoji: "🎨", tags: ["pop","coloré","vivant"],
    bg: "#FF3CAC", surface: "#784BA0", primary: "#FFFFFF", accent: "#2B86C5",
    text: "#FFFFFF", muted: "#FFE0F8",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(135deg,#FF3CAC,#784BA0,#2B86C5)",
  },

  // ── PORTFOLIO ────────────────────────────────────────────────────────────────
  pure_white: {
    name: "Pure White", category: "Portfolio", emoji: "⬜", tags: ["blanc","minimaliste","clean"],
    bg: "#FFFFFF", surface: "#F8F8F8", primary: "#1A1A1A", accent: "#6366F1",
    text: "#1A1A1A", muted: "#888888",
    border: "rgba(26,26,26,0.08)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  minimal_cream: {
    name: "Minimal Cream", category: "Portfolio", emoji: "🤎", tags: ["creme","chaud","design"],
    bg: "#FAF7F2", surface: "#F2EDE4", primary: "#1A1410", accent: "#C9A84C",
    text: "#1A1410", muted: "#8A7860",
    fontDisplay: "DM Sans", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  ocean_deep: {
    name: "Ocean Deep", category: "Portfolio", emoji: "🌊", tags: ["ocean","bleu","profond"],
    bg: "#020C18", surface: "#051828", primary: "#00B4D8", accent: "#48CAE4",
    text: "#E0F8FF", muted: "#305880",
    fontDisplay: "DM Sans", fontBody: "Inter",
    bgMode: "gradient",
    bgGradient: "linear-gradient(180deg,#020C18,#061525)",
    effect_glow: true, glow_color: "#00B4D8", glow_intensity: 20, glow_size: 350,
    effect_vignette: true, vignette_intensity: 50,
  },

  candy_pop: {
    name: "Candy Pop", category: "Portfolio", emoji: "🍭", tags: ["coloré","fun","pop"],
    bg: "#FFF5FA", surface: "#FFE8F4", primary: "#EC4899", accent: "#F97316",
    text: "#1A0814", muted: "#9060A0",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  forest_zen: {
    name: "Forest Zen", category: "Portfolio", emoji: "🌿", tags: ["foret","vert","zen"],
    bg: "#071A0A", surface: "#0F2A10", primary: "#22C55E", accent: "#86EFAC",
    text: "#E8FFE8", muted: "#306040",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#071A0A,#0E2812)",
    effect_vignette: true, vignette_intensity: 45,
  },

  behance_minimal: {
    name: "Behance Minimal", category: "Portfolio", emoji: "🎨", tags: ["design","gris","minimal"],
    bg: "#F5F5F5", surface: "#EBEBEB", primary: "#1769FF", accent: "#0057FF",
    text: "#1A1A1A", muted: "#808080",
    border: "rgba(26,26,26,0.08)",
    fontDisplay: "Inter", fontBody: "Inter",
    bgMode: "solid",
  },

  apple_showcase: {
    name: "Apple Showcase", category: "Portfolio", emoji: "🍎", tags: ["apple","blanc","premium"],
    bg: "#FBFBFD", surface: "#F5F5F7", primary: "#1D1D1F", accent: "#0066CC",
    text: "#1D1D1F", muted: "#6E6E73",
    border: "rgba(29,29,31,0.06)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
  },

  designer_grid: {
    name: "Designer Grid", category: "Portfolio", emoji: "📐", tags: ["grille","gris","structure"],
    bg: "#111111", surface: "#1A1A1A", primary: "#FFFFFF", accent: "#00D4AA",
    text: "#F0F0F0", muted: "#808080",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "grid",
  },

  creative_studio: {
    name: "Creative Studio", category: "Portfolio", emoji: "✏️", tags: ["creatif","sombre","agence"],
    bg: "#0A0A0A", surface: "#141414", primary: "#FF6B35", accent: "#FFD700",
    text: "#F5F5F5", muted: "#888888",
    border: "rgba(255,107,53,0.12)",
    fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
  },

  museum: {
    name: "Museum", category: "Portfolio", emoji: "🏛️", tags: ["musee","beige","culture"],
    bg: "#F8F5F0", surface: "#EEE9E0", primary: "#2A1E10", accent: "#8B6914",
    text: "#2A1E10", muted: "#9A7860",
    border: "rgba(42,30,16,0.1)",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
  },

  brutalist_dark: {
    name: "Brutalist Dark", category: "Portfolio", emoji: "⬛", tags: ["brutalisme","noir","impact"],
    bg: "#000000", surface: "#111111", primary: "#FFFF00", accent: "#FF0000",
    text: "#FFFFFF", muted: "#888888",
    border: "rgba(255,255,255,0.15)",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
  },

  editorial_cream: {
    name: "Editorial Cream", category: "Portfolio", emoji: "📰", tags: ["editorial","creme","presse"],
    bg: "#FAF8F3", surface: "#F2EDE0", primary: "#1A1208", accent: "#8B5E3C",
    text: "#1A1208", muted: "#9A8060",
    fontDisplay: "Playfair Display", fontBody: "Lora",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  dark_folio: {
    name: "Dark Folio", category: "Portfolio", emoji: "🌑", tags: ["sombre","portfolio","pro"],
    bg: "#0A0A0A", surface: "#141414", primary: "#E0E0E0", accent: "#C9A84C",
    text: "#F0F0F0", muted: "#888888",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
  },

  pastel_dream: {
    name: "Pastel Dream", category: "Portfolio", emoji: "🌸", tags: ["pastel","doux","artiste"],
    bg: "#FFF5FF", surface: "#F8E8FF", primary: "#8B3FA8", accent: "#E879F9",
    text: "#1A0820", muted: "#9060A0",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "solid",
    bgPattern: "dots",
  },

  neon_portfolio: {
    name: "Neon Portfolio", category: "Portfolio", emoji: "💡", tags: ["neon","sombre","coloré"],
    bg: "#030308", surface: "#06060F", primary: "#FF00FF", accent: "#00FFFF",
    text: "#F8F0FF", muted: "#807090",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#FF00FF", glow_intensity: 25, glow_size: 350,
  },

  // ── QROWG SIGNATURE ────────────────────────────────────────────────────────
  qrf_obsidian_gold: {
    name: "QRf Obsidian Gold", category: "QRowg Signature", emoji: "✦", tags: ["signature","or","obsidien"],
    bg: "#030203", surface: "#080608", primary: "#C9A84C", accent: "#F0D880",
    text: "#FFF8E8", muted: "#8A7840",
    border: "rgba(201,168,76,0.18)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#030203,#0A0800,#030203)",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 22, glow_size: 380,
    effect_vignette: true, vignette_intensity: 65,
  },

  qrf_aurora_night: {
    name: "QRf Aurora Night", category: "QRowg Signature", emoji: "🌌", tags: ["signature","aurora","nuit"],
    bg: "#020512", surface: "#050A20", primary: "#00FFB3", accent: "#7B5EA7",
    text: "#E8F8FF", muted: "#506890",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "mesh",
    effect_noise: true, noise_opacity: 3,
    effect_vignette: true, vignette_intensity: 60,
    mesh_c1: "#00FFB3", mesh_c2: "#7B5EA7", mesh_c3: "#020512", mesh_blur: 120,
  },

  qrf_crimson_silk: {
    name: "QRf Crimson Silk", category: "QRowg Signature", emoji: "🩸", tags: ["signature","rouge","soie"],
    bg: "#0A0000", surface: "#160000", primary: "#DC143C", accent: "#FF6B6B",
    text: "#FFF0F0", muted: "#9A3040",
    fontDisplay: "Fraunces", fontBody: "Lora",
    bgMode: "gradient",
    bgGradient: "linear-gradient(160deg,#0A0000,#180000)",
    effect_noise: true, noise_opacity: 5,
    effect_glow: true, glow_color: "#DC143C", glow_intensity: 25, glow_size: 320,
    effect_vignette: true, vignette_intensity: 65,
  },

  qrf_ivory_noir: {
    name: "QRf Ivory Noir", category: "QRowg Signature", emoji: "🤍", tags: ["signature","ivoire","noir"],
    bg: "#FAF8F5", surface: "#F0EDE8", primary: "#0A0808", accent: "#C9A84C",
    text: "#0A0808", muted: "#7A7060",
    border: "rgba(10,8,8,0.08)",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 3,
  },

  qrf_deep_ocean: {
    name: "QRf Deep Ocean", category: "QRowg Signature", emoji: "🌊", tags: ["signature","ocean","abyssal"],
    bg: "#000E18", surface: "#001525", primary: "#00C8E8", accent: "#0080FF",
    text: "#E0F8FF", muted: "#305878",
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    bgMode: "mesh",
    effect_glow: true, glow_color: "#00C8E8", glow_intensity: 20, glow_size: 380,
    effect_vignette: true, vignette_intensity: 55,
    mesh_c1: "#00C8E8", mesh_c2: "#0040A0", mesh_c3: "#000E18", mesh_blur: 100,
  },

  qrf_sunset_mesh: {
    name: "QRf Sunset Mesh", category: "QRowg Signature", emoji: "🌅", tags: ["signature","sunset","dégradé"],
    bg: "#0A0308", surface: "#140610", primary: "#FF6B9D", accent: "#FF8C00",
    text: "#FFF0F5", muted: "#906070",
    fontDisplay: "DM Sans", fontBody: "DM Sans",
    bgMode: "mesh",
    effect_noise: true, noise_opacity: 3,
    effect_vignette: true, vignette_intensity: 50,
    mesh_c1: "#FF6B9D", mesh_c2: "#FF8C00", mesh_c3: "#7B2FBE", mesh_blur: 90,
  },

  qrf_matrix_gold: {
    name: "QRf Matrix Gold", category: "QRowg Signature", emoji: "🔢", tags: ["signature","matrice","or"],
    bg: "#010501", surface: "#020A02", primary: "#C9A84C", accent: "#39FF8F",
    text: "#F0FFE0", muted: "#608040",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "solid",
    bgPattern: "grid",
    effect_noise: true, noise_opacity: 3,
    effect_glow: true, glow_color: "#C9A84C", glow_intensity: 20, glow_size: 350,
  },

  qrf_void_purple: {
    name: "QRf Void Purple", category: "QRowg Signature", emoji: "🔮", tags: ["signature","vide","violet"],
    bg: "#030008", surface: "#060010", primary: "#9B59B6", accent: "#DDD6FE",
    text: "#F0E8FF", muted: "#6050A0",
    fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#030008,#0A0020)",
    bgPattern: "dots",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#9B59B6", glow_intensity: 28, glow_size: 350,
    effect_vignette: true, vignette_intensity: 65,
  },

  qrf_paper_ink: {
    name: "QRf Paper Ink", category: "QRowg Signature", emoji: "✒️", tags: ["signature","papier","encre"],
    bg: "#F5F0E8", surface: "#EDE5D8", primary: "#1A1208", accent: "#8B5E3C",
    text: "#1A1208", muted: "#9A7860",
    border: "rgba(26,18,8,0.1)",
    fontDisplay: "Playfair Display", fontBody: "Fraunces",
    bgMode: "solid",
    effect_noise: true, noise_opacity: 6,
  },

  qrf_neon_future: {
    name: "QRf Neon Future", category: "QRowg Signature", emoji: "🚀", tags: ["signature","neon","futur"],
    bg: "#020208", surface: "#04040F", primary: "#00FFFF", accent: "#FF00FF",
    text: "#F0FFFF", muted: "#408080",
    fontDisplay: "Space Grotesk", fontBody: "Space Grotesk",
    bgMode: "gradient",
    bgGradient: "linear-gradient(145deg,#020208,#050518)",
    bgPattern: "dots",
    effect_noise: true, noise_opacity: 4,
    effect_glow: true, glow_color: "#00FFFF", glow_intensity: 30, glow_size: 300,
    effect_vignette: true, vignette_intensity: 55,
  },

}

// ── Reseaux sociaux ───────────────────────────────────────────────────────────


// Modèles d'apparence 1-clic : appliquent un jeu cohérent de clés __ (les clés non listées d'un
// preset sont remises à "" pour repartir d'un état propre).
export const BLOCK_STYLE_PRESETS: { key: string; label: string; emoji: string; apply: Record<string, string> }[] = [
  { key: "card",       label: "Carte",      emoji: "🃏", apply: { __border: "Oui", __radius: "M", __shadow: "Douce", __bg: "", __grad: "", __glow: "", __glass: "", __intensity: "" } },
  { key: "premium",    label: "Premium",    emoji: "👑", apply: { __grad: "Or nuit", __radius: "L", __shadow: "Douce", __border: "Oui", __intensity: "Moyen", __bg: "", __glow: "", __glass: "" } },
  { key: "luxe",       label: "Luxe noir",  emoji: "🖤", apply: { __bg: "#0a0a0a", __border: "Oui", __radius: "L", __shadow: "Forte", __grad: "", __glow: "", __glass: "", __intensity: "" } },
  { key: "corporate",  label: "Corporate",  emoji: "🏢", apply: { __grad: "Nuit bleue", __radius: "M", __border: "Oui", __shadow: "Douce", __intensity: "Moyen", __bg: "", __glow: "", __glass: "" } },
  { key: "chaleureux", label: "Chaleureux", emoji: "🔥", apply: { __grad: "Cuivre", __radius: "L", __shadow: "Douce", __intensity: "Moyen", __border: "", __bg: "", __glow: "", __glass: "" } },
  { key: "glass",      label: "Verre",      emoji: "🧊", apply: { __glass: "Oui", __radius: "L", __shadow: "Douce", __grad: "", __bg: "", __border: "", __glow: "", __intensity: "" } },
  { key: "neon",       label: "Néon",       emoji: "✨", apply: { __bg: "#0d0d10", __border: "Oui", __radius: "L", __glow: "Oui", __grad: "", __shadow: "", __glass: "", __intensity: "" } },
  { key: "ocean",      label: "Océan",      emoji: "🌊", apply: { __grad: "Océan", __radius: "L", __shadow: "Douce", __intensity: "Léger", __border: "", __bg: "", __glow: "", __glass: "" } },
  { key: "sombre",     label: "Sombre",     emoji: "🌑", apply: { __bg: "#111114", __radius: "M", __border: "Oui", __grad: "", __shadow: "", __glow: "", __glass: "", __intensity: "" } },
  { key: "minimal",    label: "Minimal",    emoji: "▫️", apply: { __radius: "S", __space: "Aéré", __border: "", __bg: "", __grad: "", __shadow: "", __glow: "", __glass: "", __intensity: "" } },
]

// Style universel appliqué au conteneur d'un bloc à partir de clés réservées (__bg, __grad, __border,
// __radius, __shadow, __glow, __space, __width, __anim). PUR + par défaut INERTE : si aucune clé n'est
// posée, renvoie { style: {}, animClass: "" } -> rendu identique à l'existant (zéro régression).


// Cas d usage pour les blocs clés
export const BLOCK_HINTS: Record<string, { hint: string; preview: string }> = {
  profile:        { hint: "Idéal en premier bloc", preview: "Photo · Nom · Accroche" },
  bio:            { hint: "Présentez-vous en 2-3 phrases", preview: "Dev passionne..." },
  cta_button:     { hint: "Votre action principale", preview: "[ Me contacter → ]" },
  social_links:   { hint: "Tous vos réseaux en un clic", preview: "Instagram · TikTok · LinkedIn" },
  link_button:    { hint: "Lien vers n importe quelle URL", preview: "[ Mon site web → ]" },
  image_block:    { hint: "Photo ou illustration", preview: "🖼 Image pleine largeur" },
  video_embed:    { hint: "YouTube, Vimeo, TikTok...", preview: "▶ Lecture directe" },
  gallery:        { hint: "Grille de photos 2x ou 3x", preview: "📷 📷 📷" },
  product:        { hint: "Fiche produit avec prix et CTA", preview: "Produit · 29€ · [Acheter]" },
  pricing:        { hint: "Grille de tarifs / abonnements", preview: "Free · Pro · Business" },
  faq:            { hint: "Questions fréquentes accordéon", preview: "▸ Comment ça marche ?" },
  testimonials:   { hint: "Avis clients avec étoiles", preview: "⭐⭐⭐⭐⭐ 'Excellent !'" },
  countdown:      { hint: "Compte à rebours événement", preview: "12j 4h 23m 15s" },
  map_embed:      { hint: "Carte Google Maps intégrée", preview: "📍 12 rue de la Paix, Paris" },
  contact_form:   { hint: "Formulaire nom + email + message", preview: "Nom · Email · [Envoyer]" },
  stats:          { hint: "Chiffres clés de votre activité", preview: "500+ clients · 98% satisfaction" },
  spotify_embed:  { hint: "Lecteur Spotify intégré", preview: "🎧 Titre · Album · Artiste" },
  latest_release: { hint: "Mise en avant de votre sortie", preview: "🔥 Nouveau single dispo" },
  concerts:       { hint: "Dates de tournée et billetterie", preview: "📍 Paris · 15 juin · [Billets]" },
  event_program:  { hint: "Planning détaillé de l événement", preview: "18h Accueil · 20h Concert" },
  hero_banner:    { hint: "Grande bannière d ouverture", preview: "TITRE · Sous-titre · [CTA]" },
  section_banner: { hint: "Séparateur visuel de section", preview: "━━━ MES SERVICES ━━━" },
  qr_code_block:  { hint: "Affiche le QR code de la page", preview: "⬛⬛ QR Code ⬛⬛" },
  tabs_block:     { hint: "Contenu organisé par onglets", preview: "| Tab 1 | Tab 2 | Tab 3 |" },
  accordion_block:{ hint: "Sections repliables (FAQ, infos)", preview: "▸ Section 1  ▸ Section 2" },
  embed_block:    { hint: "Intégrer Google Forms, Typeform...", preview: "🔗 iframe externe" },
  two_columns:    { hint: "Mise en page côte à côte", preview: "| Col 1 | Col 2 |" },
  grid_section:   { hint: "Grille de cartes 2/3/4 colonnes", preview: "⬜⬜⬜ cartes" },
  merch:          { hint: "Boutique de produits dérivés", preview: "👕 T-shirt · 🧢 Cap · 💿 Vinyle" },
  presave:        { hint: "Pré-save avant une sortie", preview: "💾 Sort le 15 juin · [Pré-save]" },
  rsvp:           { hint: "Confirmation de présence", preview: "[✅ Oui] [🤔 Peut-être] [❌ Non]" },
  lineup:         { hint: "Liste des artistes festival", preview: "HEADLINER · Artiste 2 · ..." },
  info_box:       { hint: "Mettre un texte important en avant", preview: "💡 À savoir : ..." },
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAMPS DE STYLE PARTAGÉS — blocs « Création libre »
// -----------------------------------------------------------------------------
// Les blocs de la catégorie `freeform` exposent tous les mêmes réglages de fond et
// de boîte. On les déclare UNE fois et on les étale (`...LAYOUT_STYLE_FIELDS`) à la
// fin de chaque définition : un réglage ajouté ici apparaît partout, sans oubli.
// Les valeurs sont interprétées par `shared-renderer/models/layoutStyle.ts`.
