// Onboarding par objectif — données du wizard.
// « objectif » → recette de page (blocs pré-remplis, format /api/templates/use, types validés
// contre BLOCK_DEFS) + objectif de conversion optionnel. Une étape « secteur » facultative
// affine le pré-remplissage (nom/accroche du profil, titre de la page). AUCUN code métier
// ailleurs : cette donnée + la composition ci-dessous sont le seul « neuf » de la feature.

import { themeForAmbiance } from "@/app/dashboard/builder/page-templates"

export type ObjBlock = { type: string; content: Record<string, any> }
export type ObjGoal = { name: string; goal_type: string; target_match: string }

export type Objective = {
  key: string
  label: string
  emoji: string
  desc: string
  cta: string
  blocks: ObjBlock[]
  goal?: ObjGoal
}

export type Sector = { key: string; label: string; emoji: string; name: string; tagline: string }

const profile = (tagline: string): ObjBlock => ({ type: "profile", content: { name: "Votre établissement", tagline, badge: "" } })

export const OBJECTIVES: Objective[] = [
  {
    key: "avis", label: "Recueillir des avis", emoji: "⭐",
    desc: "Transformez chaque client satisfait en avis Google.",
    cta: "Plus d'avis Google",
    blocks: [
      profile("Merci de votre visite ! Votre avis compte énormément."),
      { type: "google_review", content: { label: "Laisser un avis ⭐", url: "" } },
      { type: "testimonials", content: { title: "Ils nous recommandent", name1: "Marie L.", text1: "Super expérience, je recommande vivement !", stars1: "5", name2: "Thomas R.", text2: "Accueil au top, je reviendrai.", stars2: "5" } },
      { type: "reassurance", content: { title: "Pourquoi nous faire confiance" } },
    ],
    goal: { name: "Avis Google", goal_type: "cta_button", target_match: "google" },
  },
  {
    key: "menu", label: "Présenter un menu", emoji: "🍽️",
    desc: "Votre carte en un scan, modifiable sans réimprimer.",
    cta: "Carte toujours à jour",
    blocks: [
      profile("Notre carte du moment"),
      { type: "menu_section", content: { category: "🥗 Entrées", item1_name: "Entrée du jour", item1_price: "—", item1_desc: "À compléter", item2_name: "Salade maison", item2_price: "—", item2_desc: "" } },
      { type: "menu_section", content: { category: "🍝 Plats", item1_name: "Plat signature", item1_price: "—", item1_desc: "À compléter", item2_name: "Suggestion du chef", item2_price: "—", item2_desc: "" } },
      { type: "menu_section", content: { category: "🍰 Desserts", item1_name: "Dessert maison", item1_price: "—", item1_desc: "" } },
      { type: "opening_hours", content: { title: "Horaires" } },
      { type: "google_maps_embed", content: { label: "Nous trouver", address: "", zoom: "16" } },
    ],
  },
  {
    key: "reservation", label: "Prendre des réservations", emoji: "📅",
    desc: "Vos clients réservent directement depuis le QR.",
    cta: "Réservations en direct",
    blocks: [
      profile("Réservez votre table en quelques secondes"),
      { type: "table_booking", content: { label: "Réserver une table", platform: "TheFork" } },
      { type: "reservation_form", content: { title: "Ou demandez par message" } },
      { type: "opening_hours", content: { title: "Horaires d'ouverture" } },
      { type: "google_maps_embed", content: { label: "Nous trouver", address: "", zoom: "16" } },
    ],
    goal: { name: "Réservations", goal_type: "cta_button", target_match: "fork" },
  },
  {
    key: "appels", label: "Recevoir des appels", emoji: "📞",
    desc: "Un bouton d'appel direct, plus de numéro à taper.",
    cta: "Appels en 1 tap",
    blocks: [
      profile("Une question ? Contactez-nous directement"),
      { type: "call_button", content: { label: "Appeler maintenant", phone: "" } },
      { type: "whatsapp_button", content: { label: "Écrire sur WhatsApp", phone: "" } },
      { type: "multi_contact", content: { title: "Nous joindre" } },
      { type: "opening_hours", content: { title: "Disponibilités" } },
    ],
    goal: { name: "Appels", goal_type: "phone", target_match: "tel:" },
  },
  {
    key: "vente", label: "Vendre un produit", emoji: "🛍️",
    desc: "Présentez et vendez, paiement en un clic.",
    cta: "Vente directe",
    blocks: [
      profile("Notre sélection"),
      { type: "featured_product", content: { name: "Produit phare", price: "—", description: "Votre meilleur produit, mis en avant." } },
      { type: "payment_button", content: { label: "Acheter maintenant", url: "" } },
      { type: "product_catalog", content: { title: "Toute la gamme" } },
      { type: "testimonials", content: { title: "Avis clients", name1: "Client vérifié", text1: "Top qualité, livraison rapide !", stars1: "5" } },
    ],
    goal: { name: "Ventes", goal_type: "stripe_product", target_match: "stripe" },
  },
  {
    key: "contact", label: "Être contacté", emoji: "✉️",
    desc: "Formulaire + coordonnées : chaque prospect est capturé.",
    cta: "Prospects capturés",
    blocks: [
      profile("Parlons de votre projet"),
      { type: "contact_form", content: { title: "Écrivez-nous" } },
      { type: "multi_contact", content: { title: "Nos coordonnées" } },
      { type: "quote_form", content: { title: "Demander un devis" } },
    ],
  },
  {
    key: "evenement", label: "Annoncer un événement", emoji: "🎉",
    desc: "Date, lieu, programme et inscriptions en un scan.",
    cta: "Inscriptions & infos",
    blocks: [
      profile("Vous êtes invité !"),
      { type: "event_info", content: { title: "L'événement", date: "", location: "" } },
      { type: "countdown", content: { title: "J-", target: "" } },
      { type: "event_program", content: { title: "Programme" } },
      { type: "event_register", content: { label: "Je m'inscris" } },
      { type: "add_to_calendar", content: { label: "Ajouter à mon agenda" } },
      { type: "google_maps_embed", content: { label: "Lieu", address: "", zoom: "15" } },
    ],
    goal: { name: "Inscriptions", goal_type: "cta_button", target_match: "" },
  },
  {
    key: "portfolio", label: "Montrer mon travail", emoji: "🎨",
    desc: "Un portfolio pro : réalisations, avis, prise de contact.",
    cta: "Portfolio + contact",
    blocks: [
      profile("Créateur · Portfolio"),
      { type: "about", content: { title: "À propos", text: "Présentez-vous en quelques lignes." } },
      { type: "portfolio_work", content: { title: "Mes réalisations" } },
      { type: "testimonials", content: { title: "Ils m'ont fait confiance", name1: "Client satisfait", text1: "Travail impeccable, très pro.", stars1: "5" } },
      { type: "cta_button", content: { label: "Me contacter", url: "#", style: "gold" } },
    ],
    goal: { name: "Prises de contact", goal_type: "cta_button", target_match: "" },
  },
  {
    key: "reseaux", label: "Regrouper mes réseaux", emoji: "🔗",
    desc: "Tous vos liens et réseaux sur une seule page.",
    cta: "Tous vos liens",
    blocks: [
      profile("Retrouvez-moi partout"),
      { type: "social_links", content: { title: "Mes réseaux" } },
      { type: "instagram_feed", content: { title: "Instagram" } },
      { type: "favorite_links", content: { title: "Mes liens" } },
      { type: "cta_button", content: { label: "M'écrire", url: "#", style: "gold" } },
    ],
  },
]

// Secteurs (étape 2 facultative) : affinent le nom/accroche du profil + le titre de la page.
export const SECTORS: Sector[] = [
  { key: "restaurant", label: "Restaurant · Café", emoji: "🍽️", name: "Le Bistrot", tagline: "Cuisine maison" },
  { key: "beaute", label: "Beauté · Coiffure", emoji: "💇", name: "Studio Beauté", tagline: "Coiffure & esthétique" },
  { key: "commerce", label: "Commerce · Boutique", emoji: "🛍️", name: "Ma Boutique", tagline: "Sélection & nouveautés" },
  { key: "artisan", label: "Artisan · Services", emoji: "🔧", name: "Mon Atelier", tagline: "Savoir-faire & devis" },
  { key: "createur", label: "Créateur · Freelance", emoji: "🎨", name: "Mon Studio", tagline: "Projets & collaborations" },
  { key: "pro", label: "Profession · Cabinet", emoji: "💼", name: "Mon Cabinet", tagline: "Prise de rendez-vous" },
]

// Ambiance visuelle (thème cohérent, réutilise AMBIANCE_THEMES) par secteur puis par objectif :
// la page générée est belle et adaptée dès l'ouverture, pas sur le thème générique par défaut.
const SECTOR_AMBIANCE: Record<string, string> = { restaurant: "velvet", beaute: "rose", commerce: "slate", artisan: "wood", createur: "violet", pro: "navy" }
const OBJ_AMBIANCE: Record<string, string> = { avis: "gold", menu: "velvet", reservation: "velvet", appels: "calm", vente: "slate", contact: "calm", evenement: "cocktail", portfolio: "ink", réseaux: "violet" }

// Compose la recette finale (objectif [× secteur]) envoyée à /api/templates/use.
export function composeRecipe(o: Objective, s?: Sector) {
  const blocks = o.blocks.map(b =>
    b.type === "profile" && s
      ? { type: "profile", content: { ...b.content, name: s.name } } // le secteur nomme, l'objectif garde son accroche
      : b,
  )
  const templateName = s ? `${s.name} — ${o.label}` : `Ma page — ${o.label}`
  const ambiance = (s && SECTOR_AMBIANCE[s.key]) || OBJ_AMBIANCE[o.key] || "gold"
  return { templateName, blocks, goal: o.goal, theme: themeForAmbiance(ambiance) }
}
