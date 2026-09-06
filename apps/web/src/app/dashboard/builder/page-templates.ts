// QRowg — Modèles de PAGE complets (multi-sections) par métier + sous-variantes.
// Appliqué depuis le builder : pose un thème cohérent + un jeu de blocs prêts à personnaliser.
// N'utilise QUE des types de blocs existants et des clés de contenu réelles (mêmes clés que le rendu).
import type { PageTheme } from "./types"
import { STUDIO_TEMPLATES, STUDIO_THEMES } from "./templatesStudio"

export type PageTemplate = {
  key: string
  group: string   // métier, ex: "Restauration"
  label: string   // sous-variante, ex: "Bistrot français"
  emoji: string
  desc: string
  theme: PageTheme
  blocks: { type: string; content: Record<string, any> }[]
}

// Thèmes réutilisés (cohérence visuelle par ambiance) — version PREMIUM : dégradés, glow, mesh, vignette.
const T = {
  velvet:   { name: "Velvet Rouge",   bg: "#0D0505", surface: "#1A0A0A", primary: "#EF4444", accent: "#F97316", text: "#FFF5F5", muted: "#B8837A", fontDisplay: "Playfair Display", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#0D0505,#1C0704)", effect_vignette: true, vignette_intensity: 55 } as PageTheme,
  gold:     { name: "Midnight Gold",  bg: "#080808", surface: "#111009", primary: "#C9A84C", accent: "#39FF8F", text: "#F5F0E8", muted: "#A8A190", fontDisplay: "Fraunces", fontBody: "DM Sans", bgMode: "solid", effect_glow: true, glow_color: "#C9A84C", glow_intensity: 18, glow_size: 360 } as PageTheme,
  neon:     { name: "Neon Punch",     bg: "#0A0A0F", surface: "#12121C", primary: "#F59E0B", accent: "#EF4444", text: "#FFF7ED", muted: "#9A8478", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(145deg,#0A0A0F,#16040A)", effect_glow: true, glow_color: "#F59E0B", glow_intensity: 24, glow_size: 340 } as PageTheme,
  cocktail: { name: "Nuit Cocktail",  bg: "#0B0616", surface: "#160C26", primary: "#A78BFA", accent: "#F472B6", text: "#F5EEFF", muted: "#9E8FB8", fontDisplay: "Playfair Display", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#0B0616,#160C26)", effect_glow: true, glow_color: "#A78BFA", glow_intensity: 24, glow_size: 350 } as PageTheme,
  rose:     { name: "Rose Poudré",    bg: "#140A10", surface: "#20101A", primary: "#F472B6", accent: "#C9A84C", text: "#FFF0F7", muted: "#C08FA8", fontDisplay: "Fraunces", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(145deg,#140A10,#20101A)", effect_glow: true, glow_color: "#F472B6", glow_intensity: 22, glow_size: 340 } as PageTheme,
  spa:      { name: "Zen Émeraude",   bg: "#04120E", surface: "#0A1F19", primary: "#34D399", accent: "#C9A84C", text: "#ECFDF5", muted: "#7FA898", fontDisplay: "Fraunces", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#04120E,#0A1F19)", effect_glow: true, glow_color: "#34D399", glow_intensity: 16, glow_size: 360 } as PageTheme,
  calm:     { name: "Bleu Sérénité",  bg: "#060B14", surface: "#0C1524", primary: "#60A5FA", accent: "#34D399", text: "#EFF6FF", muted: "#7E93B8", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#060B14,#0C1524)", effect_glow: true, glow_color: "#60A5FA", glow_intensity: 16, glow_size: 360 } as PageTheme,
  navy:     { name: "Corporate Navy", bg: "#0A1628", surface: "#142240", primary: "#478AF7", accent: "#60A5FA", text: "#EFF6FF", muted: "#7E93B8", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "solid", effect_glow: true, glow_color: "#3B82F6", glow_intensity: 16, glow_size: 380 } as PageTheme,
  slate:    { name: "Ardoise Pro",    bg: "#0B0F14", surface: "#141A22", primary: "#38BDF8", accent: "#39FF8F", text: "#F1F5F9", muted: "#8598AD", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "mesh", mesh_c1: "#38BDF8", mesh_c2: "#39FF8F", mesh_c3: "#7B2FBE", mesh_blur: 110 } as PageTheme,
  wood:     { name: "Atelier Bois",   bg: "#120C06", surface: "#1E140A", primary: "#D9A066", accent: "#39FF8F", text: "#FBF3E8", muted: "#A88C6E", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#120C06,#1E140A)" } as PageTheme,
  ink:      { name: "Encre Photo",    bg: "#0A0A0A", surface: "#141414", primary: "#E8E8E8", accent: "#C9A84C", text: "#FAFAFA", muted: "#8A8A8A", fontDisplay: "Fraunces", fontBody: "DM Sans", bgMode: "solid", effect_vignette: true, vignette_intensity: 45 } as PageTheme,
  violet:   { name: "Créatif Violet", bg: "#0B0616", surface: "#170C28", primary: "#A78BFA", accent: "#39FF8F", text: "#F3EEFF", muted: "#9A8FB8", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#0B0616,#170C28)", effect_glow: true, glow_color: "#A78BFA", glow_intensity: 26, glow_size: 340 } as PageTheme,
  coral:    { name: "Corail Créateur",bg: "#12070A", surface: "#200D12", primary: "#FB7185", accent: "#FBBF24", text: "#FFF1F2", muted: "#C08990", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(145deg,#12070A,#200D12)", effect_glow: true, glow_color: "#FB7185", glow_intensity: 22, glow_size: 330 } as PageTheme,
  forest:   { name: "Forêt Asso",     bg: "#04120B", surface: "#0A2016", primary: "#4ADE80", accent: "#FBBF24", text: "#ECFDF5", muted: "#7FA890", fontDisplay: "Poppins", fontBody: "DM Sans", bgMode: "gradient", bgGradient: "linear-gradient(160deg,#04120B,#0A2016)", effect_glow: true, glow_color: "#4ADE80", glow_intensity: 18, glow_size: 350 } as PageTheme,
}

// Petits helpers de contenu récurrents.
const social = (extra: Record<string, string> = {}) => ({ instagram: "https://instagram.com", ...extra })

export const PAGE_TEMPLATES: PageTemplate[] = [
  // ── Restauration ────────────────────────────────────────────────────────────
  {
    key: "resto_bistrot", group: "Restauration", label: "Bistrot français", emoji: "🍽️",
    desc: "Menu, horaires, réservation, avis, plan",
    theme: T.velvet,
    blocks: [
      { type: "profile", content: { name: "Le Bistrot Parisien", tagline: "Cuisine française maison depuis 1985", badge: "🌟 Recommandé" } },
      { type: "table_booking", content: { label: "Réserver une table", platform: "TheFork" } },
      { type: "menu_section", content: { category: "🥗 Entrées", item1_name: "Foie gras poêlé", item1_price: "18€", item1_desc: "Chutney de figues, brioche toastée", item2_name: "Soupe à l'oignon", item2_price: "12€", item2_desc: "Gratinée au comté", item3_name: "Tartare de saumon", item3_price: "16€", item3_desc: "Avocat, citron vert, aneth" } },
      { type: "menu_section", content: { category: "🥩 Plats", item1_name: "Entrecôte 300g", item1_price: "32€", item1_desc: "Sauce béarnaise, frites maison", item2_name: "Filet de sole meunière", item2_price: "28€", item2_desc: "Beurre blanc, légumes vapeur", item3_name: "Risotto aux truffes", item3_price: "24€", item3_desc: "Parmesan 24 mois" } },
      { type: "documents", content: { title: "Notre carte", d1_type: "Menu", d1_title: "Carte complète", d1_desc: "Entrées, plats, desserts, vins", d1_meta: "PDF · mise à jour ce mois" } },
      { type: "opening_hours", content: { title: "Horaires", mode: "Simple (Lun-Ven / Sam / Dim)", mon_fri: "12h - 14h30, 19h - 23h", saturday: "19h - 23h30", sunday: "Fermé", note: "Réservation recommandée le week-end" } },
      { type: "testimonials", content: { name1: "Marie L.", text1: "La meilleure entrecôte de Paris, service impeccable.", stars1: "5", name2: "Pierre M.", text2: "Cadre chaleureux, plats savoureux. On reviendra !", stars2: "5" } },
      { type: "google_maps_embed", content: { label: "Le Bistrot Parisien", address: "12 rue de la Paix, 75001 Paris", zoom: "16" } },
      { type: "social_links", content: social({ facebook: "https://facebook.com" }) },
    ],
  },
  {
    key: "resto_fastfood", group: "Restauration", label: "Fast-food & Burger", emoji: "🍔",
    desc: "Commande en ligne, best-sellers, promo, horaires",
    theme: T.neon,
    blocks: [
      { type: "profile", content: { name: "Big Bite", tagline: "Burgers smashés & frites maison", badge: "🔥 Ouvert maintenant" } },
      { type: "announcement", content: { type: "Promo", title: "Menu du midi -20%", message: "Du lundi au vendredi, de 11h30 à 14h.", style: "Détaillé" } },
      { type: "cta_button", content: { label: "Commander en ligne", url: "#", style: "gold", icon: "🛵", full_width: "yes" } },
      { type: "popular_products", content: { title: "Les best-sellers", p1_name: "Le Smash Classic", p1_price: "9,90€", p1_sales: "🔥 le plus vendu", p2_name: "Double Cheese", p2_price: "12,50€", p2_sales: "★ coup de cœur", p3_name: "Menu Chicken", p3_price: "11€" } },
      { type: "menu_section", content: { category: "🍟 Accompagnements", item1_name: "Frites maison", item1_price: "3,50€", item2_name: "Onion rings", item2_price: "4,50€", item3_name: "Potatoes", item3_price: "4€" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "11h30 - 23h", saturday: "11h30 - 00h", sunday: "18h - 23h" } },
      { type: "google_maps_embed", content: { label: "Big Bite", address: "5 avenue de la République, 75011 Paris", zoom: "16" } },
      { type: "social_links", content: social({ tiktok: "https://tiktok.com" }) },
    ],
  },
  {
    key: "resto_bar", group: "Restauration", label: "Bar à cocktails", emoji: "🍸",
    desc: "Carte cocktails, happy hour, ambiance, événements",
    theme: T.cocktail,
    blocks: [
      { type: "profile", content: { name: "The Alchemist", tagline: "Cocktails d'auteur · Paris", badge: "🍸 Mixologie" } },
      { type: "announcement", content: { type: "Information", title: "Happy hour 18h - 20h", message: "Tous les cocktails signature à -30%.", style: "Compact" } },
      { type: "menu_section", content: { category: "🍸 Signatures", item1_name: "Smoked Old Fashioned", item1_price: "14€", item1_desc: "Bourbon, fumée de hêtre", item2_name: "Garden Spritz", item2_price: "12€", item2_desc: "Gin, concombre, basilic", item3_name: "Velvet Espresso", item3_price: "13€", item3_desc: "Vodka, café, tonka" } },
      { type: "table_booking", content: { label: "Réserver une table", platform: "Adresse personnalisée" } },
      { type: "timeline", content: { title: "La soirée", layout: "Horizontale", e1_icon: "🍸", e1_date: "18h", e1_title: "Happy hour", e2_icon: "🎧", e2_date: "21h", e2_title: "DJ set", e3_icon: "✨", e3_date: "23h", e3_title: "Ambiance club" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "18h - 02h", saturday: "18h - 03h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "The Alchemist", address: "8 rue Oberkampf, 75011 Paris", zoom: "16" } },
      { type: "social_links", content: social() },
    ],
  },

  // ── Beauté & bien-être ───────────────────────────────────────────────────────
  {
    key: "beaute_coiffure", group: "Beauté & bien-être", label: "Salon de coiffure", emoji: "💇",
    desc: "Prestations, tarifs, réservation, équipe, avis",
    theme: T.rose,
    blocks: [
      { type: "profile", content: { name: "Salon Éclat", tagline: "Coiffure & couleur · Paris 11e", badge: "⭐ 4,9/5" } },
      { type: "services_pricing", content: { title: "Nos prestations", s1_name: "Coupe & brushing", s1_price: "à partir de 45€", s2_name: "Coloration / balayage", s2_price: "à partir de 80€", s3_name: "Soin kératine", s3_price: "à partir de 60€" } },
      { type: "cta_button", content: { label: "Prendre rendez-vous", url: "#", style: "gold", icon: "📅", full_width: "yes" } },
      { type: "team", content: { title: "L'équipe", layout: "Grille", m1_name: "Sophie", m1_role: "Coloriste experte", m2_name: "Léa", m2_role: "Coiffeuse styliste" } },
      { type: "gift_card", content: { title: "Offrir un moment beauté", description: "Le cadeau parfait, valable 1 an", cta_label: "Offrir un bon" } },
      { type: "testimonials", content: { name1: "Emma R.", text1: "Le balayage est parfait, l'équipe est adorable.", stars1: "5", name2: "Julie M.", text2: "Meilleure coloration de ma vie !", stars2: "5" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h - 19h", saturday: "9h - 18h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Salon Éclat", address: "24 rue de la Roquette, 75011 Paris", zoom: "16" } },
      { type: "social_links", content: social() },
    ],
  },
  {
    key: "beaute_spa", group: "Beauté & bien-être", label: "Institut & Spa", emoji: "🧖",
    desc: "Soins, forfaits, ambiance zen, réservation",
    theme: T.spa,
    blocks: [
      { type: "profile", content: { name: "Maison Sérénité", tagline: "Institut de beauté & spa", badge: "🌿 Bio & naturel" } },
      { type: "announcement", content: { type: "Promo", title: "Offre découverte", message: "-15% sur votre premier soin visage.", style: "Compact" } },
      { type: "services_pricing", content: { title: "Nos soins", s1_name: "Massage relaxant 60 min", s1_price: "75€", s2_name: "Soin visage éclat", s2_price: "65€", s3_name: "Rituel corps complet", s3_price: "120€" } },
      { type: "packs", content: { title: "Nos forfaits", t1: "Escapade", p1: "150€", d1: "2 soins au choix", t2: "Journée détente", p2: "260€", d2: "3 soins + déjeuner" } },
      { type: "cta_button", content: { label: "Réserver un soin", url: "#", style: "gold", icon: "🌸", full_width: "yes" } },
      { type: "testimonials", content: { name1: "Clara B.", text1: "Un vrai moment hors du temps, je recommande.", stars1: "5", name2: "Nadia S.", text2: "Cadre magnifique et praticiennes en or.", stars2: "5" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h - 20h", saturday: "10h - 19h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Maison Sérénité", address: "3 rue du Calme, 75006 Paris", zoom: "16" } },
      { type: "social_links", content: social() },
    ],
  },

  // ── Coaching & Formation ─────────────────────────────────────────────────────
  {
    key: "coach_vie", group: "Coaching & Formation", label: "Coach de vie", emoji: "🎯",
    desc: "Méthode, offres, témoignages, appel découverte",
    theme: T.calm,
    blocks: [
      { type: "profile", content: { name: "Marie Laurent", tagline: "Coach de vie certifiée · PNL & pleine conscience", badge: "✅ +200 accompagnés" } },
      { type: "bio", content: { text: "Je vous accompagne vers une vie alignée avec vos valeurs. Ma méthode combine PNL, pleine conscience et coaching systémique.", align: "center" } },
      { type: "process_steps", content: { title: "Comment ça se passe", s1_icon: "📞", s1_title: "Appel découverte", s1_desc: "Gratuit, 30 min", s2_icon: "🎯", s2_title: "Objectifs", s2_desc: "On définit le cap ensemble", s3_icon: "🚀", s3_title: "Séances", s3_desc: "En visio ou présentiel", s4_icon: "✨", s4_title: "Transformation", s4_desc: "Un vrai changement durable" } },
      { type: "pricing", content: { title: "Mes offres", title1: "Séance", price1: "90€", desc1: "1h en visio", title2: "Pack 5", price2: "380€", desc2: "Économisez 70€", title3: "Programme", price3: "850€", desc3: "12 séances + suivi" } },
      { type: "testimonials", content: { name1: "Lucie D.", text1: "Marie m'a aidée à reprendre confiance. Bienveillance remarquable.", stars1: "5", name2: "Paul R.", text2: "Un accompagnement qui m'a fait changer de cap pro.", stars2: "5" } },
      { type: "cta_button", content: { label: "Réserver un appel découverte offert", url: "https://calendly.com", style: "gold", icon: "📅", full_width: "yes" } },
      { type: "social_links", content: social({ linkedin: "https://linkedin.com" }) },
    ],
  },
  {
    key: "coach_formateur", group: "Coaching & Formation", label: "Formateur en ligne", emoji: "🎓",
    desc: "Formations, programme, preuve sociale, inscription",
    theme: T.gold,
    blocks: [
      { type: "profile", content: { name: "Digital Academy", tagline: "Formations pratiques pour entrepreneurs", badge: "🎓 +1200 élèves" } },
      { type: "stats_block", content: { s1_icon: "🎓", s1_value: "1200+", s1_label: "Élèves formés", s2_icon: "⭐", s2_value: "4,9/5", s2_label: "Note moyenne", s3_icon: "🎬", s3_value: "80+", s3_label: "Heures de contenu" } },
      { type: "announcement", content: { type: "Promo", title: "Formation bestseller à -50%", message: "47€ au lieu de 97€ — offre limitée.", style: "Détaillé" } },
      { type: "process_steps", content: { title: "Le programme", s1_icon: "📚", s1_title: "Fondations", s1_desc: "Les bases solides", s2_icon: "🛠️", s2_title: "Pratique", s2_desc: "Exercices guidés", s3_icon: "🚀", s3_title: "Passage à l'action", s3_desc: "Votre projet réel" } },
      { type: "faq", content: { title: "Questions fréquentes", search: "Non", q1: "L'accès est-il à vie ?", a1: "Oui, accès illimité + mises à jour.", q2: "Y a-t-il un certificat ?", a2: "Oui, à la fin de la formation.", q3: "Puis-je payer en plusieurs fois ?", a3: "Oui, 3× sans frais." } },
      { type: "cta_button", content: { label: "Accéder à la formation", url: "#", style: "gold", icon: "🎓", full_width: "yes" } },
      { type: "social_links", content: social({ youtube: "https://youtube.com" }) },
    ],
  },

  // ── Immobilier ───────────────────────────────────────────────────────────────
  {
    key: "immo_agence", group: "Immobilier", label: "Agence immobilière", emoji: "🏢",
    desc: "Services, estimation, chiffres, avis, contact",
    theme: T.navy,
    blocks: [
      { type: "profile", content: { name: "Dubois Immobilier", tagline: "Agent immobilier · Paris & IDF", badge: "🏠 +150 biens vendus" } },
      { type: "stats_block", content: { s1_icon: "🏠", s1_value: "150+", s1_label: "Biens vendus", s2_icon: "⭐", s2_value: "4,9/5", s2_label: "Satisfaction", s3_icon: "📅", s3_value: "12 ans", s3_label: "Expérience" } },
      { type: "services_list", content: { title: "Mes services", s1_icon: "🏠", s1_name: "Vente & achat", s1_desc: "Estimation, négociation, closing", s2_icon: "🔑", s2_name: "Location & gestion", s2_desc: "Mise en location, suivi", s3_icon: "📊", s3_name: "Estimation gratuite", s3_desc: "Valorisation de votre bien" } },
      { type: "process_steps", content: { title: "Notre accompagnement", s1_icon: "📞", s1_title: "Contact", s1_desc: "On échange sur votre projet", s2_icon: "📊", s2_title: "Estimation", s2_desc: "Gratuite et précise", s3_icon: "🤝", s3_title: "Vente", s3_desc: "Au meilleur prix" } },
      { type: "testimonials", content: { name1: "Famille Moreau", text1: "Notre appartement idéal trouvé en 3 semaines.", stars1: "5", name2: "Sophie L.", text2: "Vente rapide au meilleur prix. Je recommande !", stars2: "5" } },
      { type: "cta_button", content: { label: "Estimation gratuite de mon bien", url: "#", style: "gold", icon: "🏡", full_width: "yes" } },
      { type: "multi_contact", content: { title: "Me contacter" } },
      { type: "social_links", content: social({ linkedin: "https://linkedin.com" }) },
    ],
  },
  {
    key: "immo_location", group: "Immobilier", label: "Location saisonnière", emoji: "🏖️",
    desc: "Le logement, équipements, avis, réservation, accès",
    theme: T.slate,
    blocks: [
      { type: "profile", content: { name: "Villa Azur", tagline: "Location vue mer · 6 personnes", badge: "🏖️ Superhost" } },
      { type: "cta_button", content: { label: "Réserver mon séjour", url: "#", style: "gold", icon: "🗓️", full_width: "yes" } },
      { type: "values", content: { title: "Les équipements", v1_icon: "📶", v1_label: "Wi-Fi fibre", v2_icon: "🅿️", v2_label: "Parking privé", v3_icon: "🏊", v3_label: "Piscine chauffée", v4_icon: "🌅", v4_label: "Terrasse vue mer" } },
      { type: "stats_block", content: { s1_icon: "⭐", s1_value: "4,95/5", s1_label: "Note voyageurs", s2_icon: "🛏️", s2_value: "3 ch.", s2_label: "6 couchages", s3_icon: "📐", s3_value: "110 m²", s3_label: "Surface" } },
      { type: "testimonials", content: { name1: "Camille & Théo", text1: "Vue à couper le souffle, logement impeccable.", stars1: "5", name2: "Marc D.", text2: "Accueil parfait, on reviendra sans hésiter.", stars2: "5" } },
      { type: "faq", content: { title: "Infos pratiques", q1: "Quelle est l'heure d'arrivée ?", a1: "Check-in à partir de 16h, check-out avant 11h.", q2: "Les animaux sont-ils acceptés ?", a2: "Oui, sur demande préalable.", q3: "Y a-t-il une caution ?", a3: "Oui, 500€ restitués au départ." } },
      { type: "google_maps_embed", content: { label: "Villa Azur", address: "Route des Calanques, 06400 Cannes", zoom: "13" } },
      { type: "social_links", content: social() },
    ],
  },

  // ── Artisan ──────────────────────────────────────────────────────────────────
  {
    key: "artisan_batiment", group: "Artisan & Services", label: "Artisan du bâtiment", emoji: "🔨",
    desc: "Savoir-faire, réalisations, zone, garanties, devis",
    theme: T.wood,
    blocks: [
      { type: "profile", content: { name: "Atelier Renov", tagline: "Rénovation tous corps d'état · 15 ans", badge: "🔨 Devis gratuit" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🧱", s1_name: "Maçonnerie", s1_desc: "Gros œuvre, extension", s2_icon: "🎨", s2_name: "Peinture & finitions", s2_desc: "Intérieur / extérieur", s3_icon: "🚿", s3_name: "Plomberie & salle de bain", s3_desc: "Rénovation complète" } },
      { type: "process_steps", content: { title: "Comment ça marche", s1_icon: "📞", s1_title: "Contact", s1_desc: "Prise de rendez-vous", s2_icon: "📋", s2_title: "Devis", s2_desc: "Gratuit sous 48h", s3_icon: "🔨", s3_title: "Réalisation", s3_desc: "Dans les délais", s4_icon: "✅", s4_title: "Garantie", s4_desc: "Travaux garantis" } },
      { type: "trust_badge", content: { title: "Nos garanties", b1_icon: "🛡️", b1_label: "Garantie décennale", b2_icon: "✅", b2_label: "Assurance RC Pro", b3_icon: "🏅", b3_label: "Artisan certifié RGE" } },
      { type: "service_area", content: { title: "Zone d'intervention", areas: "Paris, Boulogne, Neuilly, Levallois, Issy" } },
      { type: "testimonials", content: { name1: "M. et Mme Blanc", text1: "Chantier propre, dans les temps, résultat parfait.", stars1: "5", name2: "Karim B.", text2: "Devis clair, équipe pro et à l'écoute.", stars2: "5" } },
      { type: "cta_button", content: { label: "Demander un devis gratuit", url: "#", style: "gold", icon: "📋", full_width: "yes" } },
      { type: "multi_contact", content: { title: "Nous joindre" } },
    ],
  },

  // ── Freelance & Entreprise ───────────────────────────────────────────────────
  {
    key: "biz_freelance", group: "Freelance & Entreprise", label: "Freelance / Consultant", emoji: "💼",
    desc: "Bio, expertises, services, tarifs, appel, avis",
    theme: T.gold,
    blocks: [
      { type: "profile", content: { name: "Jean Dupont", tagline: "Développeur Full-Stack & Consultant", badge: "✅ Disponible" } },
      { type: "bio", content: { text: "10 ans d'expérience. Je transforme vos idées en produits digitaux performants. Spécialisé React, Node.js et architecture cloud.", align: "left" } },
      { type: "skills", content: { title: "Mes expertises", tags: "React, Next.js, Node.js, TypeScript, AWS, UX Design" } },
      { type: "services_list", content: { title: "Mes services", s1_icon: "💻", s1_name: "Développement sur mesure", s1_desc: "Web & mobile performants", s2_icon: "🎨", s2_name: "Design & prototypage", s2_desc: "Figma, design system", s3_icon: "🚀", s3_name: "Conseil & architecture", s3_desc: "Audit, roadmap, stack" } },
      { type: "pricing", content: { title: "Mes tarifs", title1: "Journée", price1: "650€", desc1: "TJM", title2: "Forfait site", price2: "3 500€", desc2: "Vitrine complet", title3: "Retainer", price3: "2 000€/m", desc3: "20h/mois" } },
      { type: "testimonials", content: { name1: "Sarah M., CEO", text1: "MVP livré en 6 semaines. Code propre, communication parfaite.", stars1: "5", name2: "Thomas R., DSI", text2: "Vision claire et pragmatique. A su cadrer notre projet.", stars2: "5" } },
      { type: "cta_button", content: { label: "Réserver un appel découverte", url: "https://calendly.com", style: "gold", icon: "📅", full_width: "yes" } },
      { type: "social_links", content: social({ linkedin: "https://linkedin.com", github: "https://github.com" }) },
    ],
  },
  {
    key: "biz_agence", group: "Freelance & Entreprise", label: "Agence créative", emoji: "🎨",
    desc: "Expertises, réalisations, offres, contact projet",
    theme: T.violet,
    blocks: [
      { type: "profile", content: { name: "Studio PIXEL", tagline: "Agence créative · Web · Brand · Motion", badge: "🚀 50+ projets" } },
      { type: "bio", content: { text: "Nous créons des expériences digitales mémorables, de la stratégie de marque au développement.", align: "center" } },
      { type: "portfolio_work", content: { title: "Nos réalisations", w1_title: "Refonte e-commerce", w1_desc: "+120% de conversions", w2_title: "Identité de marque", w2_desc: "Startup fintech", w3_title: "App mobile", w3_desc: "50k téléchargements" } },
      { type: "services_list", content: { title: "Nos expertises", s1_icon: "🎨", s1_name: "Branding & identité", s1_desc: "Logo, charte, guidelines", s2_icon: "💻", s2_name: "Développement web", s2_desc: "Sites, apps, e-commerce", s3_icon: "📱", s3_name: "Social & contenu", s3_desc: "Stratégie, création" } },
      { type: "logo_wall", content: { title: "Ils nous font confiance" } },
      { type: "contact_form", content: { title: "Parlons de votre projet", button_label: "Envoyer" } },
      { type: "social_links", content: social({ linkedin: "https://linkedin.com", behance: "https://behance.net" }) },
    ],
  },
  {
    key: "biz_startup", group: "Freelance & Entreprise", label: "Startup / SaaS", emoji: "🚀",
    desc: "Pitch, fonctionnalités, preuve, tarifs, essai gratuit",
    theme: T.slate,
    blocks: [
      { type: "profile", content: { name: "TechVision AI", tagline: "Transformez vos données en décisions", badge: "🚀 Beta gratuite" } },
      { type: "bio", content: { text: "TechVision utilise le machine learning pour générer des insights actionnables en temps réel. +500 entreprises nous font confiance.", align: "center" } },
      { type: "stats_block", content: { s1_icon: "🏢", s1_value: "500+", s1_label: "Entreprises", s2_icon: "⚡", s2_value: "10x", s2_label: "Plus rapide", s3_icon: "⭐", s3_value: "4,8/5", s3_label: "Satisfaction" } },
      { type: "services_list", content: { title: "Fonctionnalités clés", s1_icon: "🤖", s1_name: "Analyse prédictive", s1_desc: "Anticipez les tendances", s2_icon: "📊", s2_name: "Tableaux de bord IA", s2_desc: "Temps réel", s3_icon: "🔗", s3_name: "50+ intégrations", s3_desc: "Salesforce, Notion, HubSpot" } },
      { type: "pricing", content: { title: "Tarifs simples", title1: "Starter", price1: "0€", desc1: "Pour tester", title2: "Growth", price2: "49€/m", desc2: "Pour les équipes", title3: "Enterprise", price3: "Sur devis", desc3: "Grands comptes" } },
      { type: "cta_button", content: { label: "Commencer gratuitement", url: "#", style: "gold", icon: "🚀", full_width: "yes" } },
      { type: "social_links", content: social({ linkedin: "https://linkedin.com", twitter: "https://twitter.com" }) },
    ],
  },

  // ── Créatif & Média ──────────────────────────────────────────────────────────
  {
    key: "creatif_photo", group: "Créatif & Média", label: "Photographe", emoji: "📷",
    desc: "Galerie, prestations, tarifs, réservation",
    theme: T.ink,
    blocks: [
      { type: "profile", content: { name: "Studio Lumière", tagline: "Photographe portrait & mariage", badge: "📷 Book 2026 ouvert" } },
      { type: "gallery", content: { title: "Portfolio" } },
      { type: "services_pricing", content: { title: "Prestations", s1_name: "Séance portrait (1h)", s1_price: "180€", s2_name: "Reportage mariage", s2_price: "à partir de 1 400€", s3_name: "Shooting produit", s3_price: "sur devis" } },
      { type: "process_steps", content: { title: "Comment ça se passe", s1_icon: "💬", s1_title: "Échange", s1_desc: "On cadre votre projet", s2_icon: "📸", s2_title: "Séance", s2_desc: "En studio ou extérieur", s3_icon: "🖼️", s3_title: "Retouche & livraison", s3_desc: "Galerie privée HD" } },
      { type: "testimonials", content: { name1: "Julie & Marc", text1: "Des photos de mariage sublimes, un vrai talent !", stars1: "5", name2: "Léa P.", text2: "Séance super agréable, résultats magnifiques.", stars2: "5" } },
      { type: "cta_button", content: { label: "Réserver une séance", url: "#", style: "gold", icon: "📅", full_width: "yes" } },
      { type: "social_links", content: social() },
    ],
  },
  {
    key: "creatif_artiste", group: "Créatif & Média", label: "Artiste / Musicien", emoji: "🎤",
    desc: "Écoute, plateformes, concerts, boutique, réseaux",
    theme: T.violet,
    blocks: [
      { type: "profile", content: { name: "NOVA", tagline: "Artiste électro-pop · Paris", badge: "🔥 Nouvel EP" } },
      { type: "spotify_embed", content: { title: "Mon dernier EP", url: "https://open.spotify.com" } },
      { type: "music_links", content: { artist_name: "NOVA", spotify: "https://open.spotify.com", apple_music: "https://music.apple.com", deezer: "https://deezer.com" } },
      { type: "concerts", content: { title: "Tournée 2026" } },
      { type: "merch", content: { title: "Ma boutique" } },
      { type: "cta_button", content: { label: "Me suivre sur Instagram", url: "https://instagram.com", style: "neon", icon: "📸", full_width: "yes" } },
      { type: "social_links", content: social({ tiktok: "https://tiktok.com", youtube: "https://youtube.com", spotify: "https://open.spotify.com" }) },
    ],
  },
  {
    key: "creatif_createur", group: "Créatif & Média", label: "Créateur de contenu", emoji: "✨",
    desc: "Réseaux, code promo, collab, media kit",
    theme: T.coral,
    blocks: [
      { type: "profile", content: { name: "Alex Créa", tagline: "Créateur lifestyle & tech", badge: "✨ 500K abonnés" } },
      { type: "bio", content: { text: "Je crée du contenu autour du lifestyle, de la tech et de la productivité. Rejoins ma communauté !", align: "center" } },
      { type: "social_links", content: social({ tiktok: "https://tiktok.com", youtube: "https://youtube.com", twitter: "https://twitter.com" }) },
      { type: "promo_banner", content: { emoji: "🎁", text: "Mon code promo -15%", subtext: "Code ALEX15 chez mes partenaires", cta_label: "En profiter", cta_url: "#" } },
      { type: "cta_button", content: { label: "Télécharger mon media kit", url: "#", style: "neon", icon: "📋", full_width: "yes" } },
      { type: "cta_button", content: { label: "Proposer une collaboration", url: "mailto:contact@alex.com", style: "gold", icon: "💌", full_width: "yes" } },
    ],
  },

  // ── Événementiel ─────────────────────────────────────────────────────────────
  {
    key: "event_soiree", group: "Événementiel", label: "Soirée / Événement", emoji: "🎉",
    desc: "Compte à rebours, infos, programme, billetterie",
    theme: T.neon,
    blocks: [
      { type: "profile", content: { name: "GALA NIGHT 2026", tagline: "La soirée de l'année", badge: "🎟️ Dernières places" } },
      { type: "countdown", content: { title: "La soirée commence dans", target: "2026-12-31T21:00", subtitle: "Soyez prêts !" } },
      { type: "event_info", content: { name: "GALA NIGHT 2026", date: "31 décembre 2026", time: "21h - 06h", location: "Palais Brongniart, Paris 2e", price: "à partir de 80€" } },
      { type: "event_program", content: { title: "Le programme" } },
      { type: "cta_button", content: { label: "Réserver mes billets", url: "#", style: "gold", icon: "🎟️", full_width: "yes" } },
      { type: "google_maps_embed", content: { label: "Palais Brongniart", address: "28 place de la Bourse, 75002 Paris", zoom: "16" } },
      { type: "social_links", content: social({ facebook: "https://facebook.com" }) },
    ],
  },
  {
    key: "event_mariage", group: "Événementiel", label: "Mariage", emoji: "💍",
    desc: "Le jour J, programme, RSVP, plan, liste",
    theme: T.rose,
    blocks: [
      { type: "profile", content: { name: "Julie & Marc", tagline: "Se marient le 12 juin 2026", badge: "💍 Save the date" } },
      { type: "countdown", content: { title: "Jour J dans", target: "2026-06-12T15:00", subtitle: "On a hâte de vous voir !" } },
      { type: "timeline", content: { title: "Le programme", layout: "Verticale", e1_icon: "⛪", e1_date: "15h", e1_title: "Cérémonie", e2_icon: "🥂", e2_date: "17h", e2_title: "Cocktail", e3_icon: "🍽️", e3_date: "20h", e3_title: "Dîner", e4_icon: "🎉", e4_date: "23h", e4_title: "Soirée dansante" } },
      { type: "rsvp", content: { title: "Confirmez votre présence" } },
      { type: "google_maps_embed", content: { label: "Château de la Roseraie", address: "Domaine de la Roseraie, 78000 Versailles", zoom: "14" } },
      { type: "cta_button", content: { label: "Voir la liste de mariage", url: "#", style: "gold", icon: "🎁", full_width: "yes" } },
    ],
  },

  // ── Commerce & Association ───────────────────────────────────────────────────
  {
    key: "shop_boutique", group: "Commerce", label: "Boutique en ligne", emoji: "🛍️",
    desc: "Promo, produits phares, avis, boutique",
    theme: T.gold,
    blocks: [
      { type: "profile", content: { name: "Maison Lumière", tagline: "Décoration artisanale & objets de créateurs", badge: "🚚 Livraison offerte dès 60€" } },
      { type: "promo_banner", content: { emoji: "🎉", text: "Soldes jusqu'à -40%", subtext: "Offre valable jusqu'au 31 juillet", cta_label: "Voir les offres", cta_url: "#" } },
      { type: "popular_products", content: { title: "Nos best-sellers", p1_name: "Vase céramique", p1_price: "45€", p1_sales: "★ le plus vendu", p2_name: "Bougie parfumée", p2_price: "28€", p3_name: "Plaid laine", p3_price: "65€" } },
      { type: "product", content: { name: "Vase céramique artisanal", price: "45€", old_price: "75€", description: "Fait main en France, collection printemps.", cta_label: "Commander", cta_url: "#" } },
      { type: "cta_button", content: { label: "Voir toute la boutique", url: "#", style: "gold", icon: "🛍️", full_width: "yes" } },
      { type: "testimonials", content: { name1: "Claire B.", text1: "Produits magnifiques, emballage soigné. Je recommande !", stars1: "5", name2: "Antoine L.", text2: "Livraison rapide, qualité au rendez-vous.", stars2: "5" } },
      { type: "social_links", content: social({ pinterest: "https://pinterest.com" }) },
    ],
  },
  {
    key: "asso_ong", group: "Association", label: "Association / ONG", emoji: "🤝",
    desc: "Mission, valeurs, actions, équipe, don",
    theme: T.forest,
    blocks: [
      { type: "profile", content: { name: "Les Mains Solidaires", tagline: "Ensemble pour un impact durable", badge: "🌍 Depuis 2015" } },
      { type: "bio", content: { text: "Notre association agit pour l'accès à l'éducation et à l'eau potable. Chaque don compte.", align: "center" } },
      { type: "stats_block", content: { s1_icon: "🌍", s1_value: "12", s1_label: "Pays", s2_icon: "👥", s2_value: "8 000+", s2_label: "Bénéficiaires", s3_icon: "🤝", s3_value: "150", s3_label: "Bénévoles" } },
      { type: "values", content: { title: "Nos valeurs", v1_icon: "🤝", v1_label: "Solidarité", v2_icon: "🔍", v2_label: "Transparence", v3_icon: "🌱", v3_label: "Durabilité" } },
      { type: "timeline", content: { title: "Notre histoire", e1_date: "2015", e1_title: "Création", e2_date: "2019", e2_title: "1er programme international", e3_date: "2024", e3_title: "8 000 bénéficiaires" } },
      { type: "cta_button", content: { label: "Faire un don", url: "#", style: "gold", icon: "❤️", full_width: "yes" } },
      { type: "social_links", content: social({ facebook: "https://facebook.com", linkedin: "https://linkedin.com" }) },
    ],
  },
]

// Modèles « nouvelle génération » (templatesStudio.ts) : bâtis sur les blocs de création
// libre, avec leurs thèmes sur mesure. Concaténés ici pour qu'ils alimentent d'un coup le
// sélecteur du builder ET la galerie, sans toucher à leur code.
PAGE_TEMPLATES.push(...STUDIO_TEMPLATES)

// Groupes ordonnés pour l'affichage (dérivé, garde l'ordre d'apparition).
export const PAGE_TEMPLATE_GROUPS: string[] = PAGE_TEMPLATES.reduce<string[]>((acc, t) => {
  if (!acc.includes(t.group)) acc.push(t.group)
  return acc
}, [])

// Ambiances réutilisables (clé -> thème premium), pour la génération par IA.
// L'IA choisit une clé d'ambiance ; le mapper la traduit en thème réel cohérent.
// Les thèmes sur mesure des modèles studio rejoignent les ambiances : n'importe quel
// modèle de la galerie peut donc être re-stylé avec l'un d'eux (moteur templateEngine).
export const AMBIANCE_THEMES: Record<string, PageTheme> = { ...T, ...STUDIO_THEMES }
export const AMBIANCE_KEYS = Object.keys(AMBIANCE_THEMES)
export function themeForAmbiance(key: string): PageTheme {
  return AMBIANCE_THEMES[key] || T.gold
}
