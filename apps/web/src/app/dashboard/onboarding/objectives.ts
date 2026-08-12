// Onboarding par objectif — table de correspondance « objectif » → recette de page.
// Chaque objectif produit un tableau de blocs pré-remplis (format /api/templates/use,
// types validés contre BLOCK_DEFS) + éventuellement un objectif de conversion (/api/goals).
// Le seul « code neuf » de la feature : cette donnée. Tout le reste réutilise l'existant.

export type ObjBlock = { type: string; content: Record<string, any> }
export type ObjGoal = { name: string; goal_type: string; target_match: string }

export type Objective = {
  key: string
  label: string
  emoji: string
  desc: string
  cta: string          // libellé du bénéfice (affiché sur la carte)
  blocks: ObjBlock[]   // page pré-remplie (l'utilisateur personnalise ensuite)
  goal?: ObjGoal       // objectif de conversion créé automatiquement (si détectable au clic)
}

const profile = (tagline: string): ObjBlock => ({ type: "profile", content: { name: "Votre établissement", tagline, badge: "" } })

export const OBJECTIVES: Objective[] = [
  {
    key: "avis",
    label: "Recueillir des avis",
    emoji: "⭐",
    desc: "Transformez chaque client satisfait en avis Google.",
    cta: "Plus d'avis Google",
    blocks: [
      profile("Merci de votre visite !"),
      { type: "google_review", content: { label: "Laisser un avis ⭐", url: "" } },
      { type: "testimonials", content: { name1: "Client satisfait", text1: "Super expérience, je recommande !", stars1: "5" } },
    ],
    goal: { name: "Avis Google", goal_type: "cta_button", target_match: "google" },
  },
  {
    key: "menu",
    label: "Présenter un menu",
    emoji: "🍽️",
    desc: "Votre carte accessible en un scan, modifiable sans réimprimer.",
    cta: "Carte toujours à jour",
    blocks: [
      profile("Notre carte"),
      { type: "menu_section", content: { category: "🥗 Entrées", item1_name: "Entrée du jour", item1_price: "—", item1_desc: "" } },
      { type: "menu_section", content: { category: "🍝 Plats", item1_name: "Plat signature", item1_price: "—", item1_desc: "" } },
      { type: "opening_hours", content: { title: "Horaires" } },
    ],
  },
  {
    key: "reservation",
    label: "Prendre des réservations",
    emoji: "📅",
    desc: "Vos clients réservent directement depuis le QR.",
    cta: "Réservations en direct",
    blocks: [
      profile("Réservez votre table"),
      { type: "table_booking", content: { label: "Réserver une table", platform: "TheFork" } },
      { type: "reservation_form", content: {} },
      { type: "opening_hours", content: { title: "Horaires" } },
    ],
    goal: { name: "Réservations", goal_type: "cta_button", target_match: "fork" },
  },
  {
    key: "appels",
    label: "Recevoir des appels",
    emoji: "📞",
    desc: "Un bouton d'appel direct, plus de numéro à taper.",
    cta: "Appels en 1 tap",
    blocks: [
      profile("Contactez-nous"),
      { type: "call_button", content: { label: "Appeler", phone: "" } },
      { type: "whatsapp_button", content: { label: "WhatsApp", phone: "" } },
      { type: "opening_hours", content: { title: "Disponibilités" } },
    ],
    goal: { name: "Appels", goal_type: "phone", target_match: "tel:" },
  },
  {
    key: "vente",
    label: "Vendre un produit",
    emoji: "🛍️",
    desc: "Présentez et vendez, paiement en un clic.",
    cta: "Vente directe",
    blocks: [
      profile("Notre sélection"),
      { type: "featured_product", content: { name: "Produit phare", price: "—", description: "" } },
      { type: "payment_button", content: { label: "Acheter", url: "" } },
      { type: "testimonials", content: { name1: "Client", text1: "Top qualité, livraison rapide !", stars1: "5" } },
    ],
    goal: { name: "Ventes", goal_type: "stripe_product", target_match: "stripe" },
  },
  {
    key: "contact",
    label: "Être contacté",
    emoji: "✉️",
    desc: "Formulaire + coordonnées : chaque prospect est capturé.",
    cta: "Prospects capturés",
    blocks: [
      profile("Écrivez-nous"),
      { type: "contact_form", content: {} },
      { type: "multi_contact", content: {} },
    ],
    // Les soumissions de formulaire arrivent dans Messages (leads), pas en clics -> pas d'objectif auto.
  },
]
