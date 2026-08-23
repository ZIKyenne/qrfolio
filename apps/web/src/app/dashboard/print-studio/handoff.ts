// handoff.ts — Passage d'une PAGE PUBLIÉE au Print Studio, sans rien resaisir.
//
// Le studio sait déjà tout faire : 92 objets imprimables, filtres métier × objectif,
// pré-vol, PDF vectoriel. Ce qui manquait, c'est le PONT — jusqu'ici l'utilisateur
// publiait sa page, obtenait un QR en PNG, et devait tout recommencer à la main.
//
// Ce module lit les blocs de la page pour en déduire le métier, l'usage principal et
// le message à imprimer, puis fabrique l'adresse du studio déjà cadré. Entièrement
// pur : aucune dépendance React ou Supabase, donc testable seul.

export type Handoff = {
  metier: string      // valeur de METIERS (catalog.ts)
  objectif: string    // valeur de OBJECTIFS (catalog.ts)
  brand: string       // nom affiché sur le support
  message: string     // titre imprimé, ex. « Notre carte »
  cta: string         // ligne d'appel à l'action
  /** Objets conseillés (ids du catalogue), du plus évident au moins évident. */
  suggested: { id: string; label: string; why: string }[]
}

type Blockish = { type: string; content?: Record<string, any> | null }

const has = (blocks: Blockish[], ...types: string[]) => blocks.some(b => types.includes(b.type))

/** Tout le texte de la page, en minuscules — sert aux indices de métier. */
function corpus(blocks: Blockish[]): string {
  const out: string[] = []
  for (const b of blocks) {
    for (const v of Object.values(b.content || {})) {
      if (typeof v === "string" && v.length < 400 && !v.startsWith("data:") && !/^https?:/.test(v)) out.push(v)
    }
  }
  return out.join(" ").toLowerCase()
}

// ── Métier ───────────────────────────────────────────────────────────────────
// On combine deux signaux : les blocs présents (structure) et le vocabulaire
// (contenu). La structure prime — un bloc « carte » est un indice plus fiable
// que le mot « café » croisé dans une phrase.
export function detectMetier(blocks: Blockish[], title = ""): string {
  const t = `${corpus(blocks)} ${title.toLowerCase()}`
  const word = (...w: string[]) => w.some(x => t.includes(x))

  if (has(blocks, "menu_section", "menu_tabs", "table_booking")) {
    if (word("cocktail", "bar à", "mixolog", "happy hour")) return "Bar"
    if (word("café de spécialité", "torréfaction", "espresso", "latte")) return "Café"
    if (word("boulangerie", "viennoiserie", "levain", "fournée", "pâtisserie")) return "Boulangerie"
    if (word("food truck", "camion")) return "Food truck"
    return "Restaurant"
  }
  if (has(blocks, "before_after", "media_before_after") || word("coiffure", "coiffeur", "balayage", "barbier", "coupe + brushing")) return "Coiffeur"
  if (word("institut", "soin du visage", "épilation", "massage", "esthéti")) return "Beauté"
  if (word("tatouage", "tatoueur", "flash")) return "Tatoueur"
  if (has(blocks, "service_area") || word("dépannage", "plomberie", "chauffagiste", "électricien", "artisan", "devis gratuit", "décennale")) return "Artisan"
  if (word("salle de sport", "musculation", "cross training", "abonnement mensuel", "coach sportif")) return "Salle de sport"
  if (has(blocks, "event_info", "event_ticketing", "lineup", "event_program")) return "Événement"
  if (has(blocks, "portfolio_work", "gallery", "image_mosaic") && word("photograph", "shooting", "reportage")) return "Photographe"
  if (word("gîte", "chambre d'hôtes", "hôtel", "séjour", "nuitée", "check-in")) return "Hôtel"
  if (word("fleuriste", "bouquet", "composition florale")) return "Fleuriste"
  if (has(blocks, "product", "product_catalog", "popular_products", "external_shop", "merch")) return "Boutique"
  if (word("immobilier", "estimation", "bien à vendre", "mandat")) return "Immobilier"
  if (has(blocks, "calendly", "booking_button") && word("coach", "accompagnement", "séance")) return "Coach"
  if (word("ostéopath", "cabinet", "consultation", "praticien", "patient")) return "Coach"
  return "Tout"
}

// ── Usage principal ──────────────────────────────────────────────────────────
// Ce que le passant doit faire une fois qu'il a scanné. On prend le premier
// usage présent dans l'ordre d'évidence commerciale.
export function detectObjectif(blocks: Blockish[]): string {
  if (has(blocks, "menu_section", "menu_tabs")) return "Menu"
  if (has(blocks, "table_booking", "booking_button", "calendly", "reservation_form")) return "Réservation"
  if (has(blocks, "order_online", "external_shop")) return "Commander"
  if (has(blocks, "google_review", "google_reviews_block")) return "Avis"
  if (has(blocks, "product", "product_catalog", "popular_products", "merch")) return "Commander"
  if (has(blocks, "opening_hours")) return "Horaires"
  if (has(blocks, "social_links", "instagram_feed", "tiktok_feed")) return "Réseaux"
  if (has(blocks, "contact_form", "quick_contact", "multi_contact")) return "Contact"
  return "Tout"
}

// ── Message imprimé ──────────────────────────────────────────────────────────
const MESSAGE_BY_OBJECTIF: Record<string, string> = {
  "Menu": "Notre carte",
  "Réservation": "Réservez votre table",
  "Commander": "Commander en ligne",
  "Avis": "Votre avis compte",
  "Horaires": "Infos & horaires",
  "Réseaux": "Suivez-nous",
  "Contact": "Nous contacter",
  "Wifi": "Wi-Fi gratuit",
}

const CTA_BY_OBJECTIF: Record<string, string> = {
  "Menu": "Scannez pour voir la carte",
  "Réservation": "Scannez pour réserver",
  "Commander": "Scannez pour commander",
  "Avis": "Scannez pour laisser un avis",
  "Horaires": "Scannez pour tout savoir",
  "Réseaux": "Scannez pour nous suivre",
  "Contact": "Scannez pour nous écrire",
  "Wifi": "Scannez pour vous connecter",
}

// ── Objets conseillés ────────────────────────────────────────────────────────
// Trois raccourcis maximum : au-delà, c'est le studio qui prend le relais avec
// ses filtres. Les identifiants proviennent du catalogue du studio.
const SUGGESTED: Record<string, { id: string; label: string; why: string }[]> = {
  "Restaurant": [
    { id: "i2", label: "Chevalet de table", why: "Sur chaque table, à hauteur de regard" },
    { id: "i1", label: "Sticker de table", why: "Discret, se colle et ne bouge plus" },
    { id: "i11", label: "Porte-menu A4", why: "À l'entrée ou sur le comptoir" },
  ],
  "Bar":         [{ id: "i10", label: "Sous-bock", why: "Sous chaque verre" }, { id: "i2", label: "Chevalet de table", why: "Sur les tables hautes" }, { id: "i3", label: "Sticker vitrine", why: "Vu depuis la rue" }],
  "Café":        [{ id: "i2", label: "Chevalet de table", why: "Sur chaque table" }, { id: "i1", label: "Sticker de table", why: "Ne s'envole pas en terrasse" }, { id: "i3", label: "Sticker vitrine", why: "Vu depuis la rue" }],
  "Boulangerie": [{ id: "i3", label: "Sticker vitrine", why: "Vu depuis le trottoir" }, { id: "i16", label: "Panneau horaires", why: "Sur la porte" }, { id: "i6", label: "Carte de visite", why: "Glissée avec la commande" }],
  "Food truck":  [{ id: "i3", label: "Sticker vitrine", why: "Sur le camion" }, { id: "i8", label: "Affiche A3", why: "Visible de loin dans la file" }, { id: "i6", label: "Carte de visite", why: "À glisser avec la commande" }],
  "Coiffeur":    [{ id: "i13", label: "Carte de fidélité", why: "Le client la garde sur lui" }, { id: "i3", label: "Sticker vitrine", why: "Vu depuis la rue" }, { id: "i6", label: "Carte de visite", why: "Remise à l'encaissement" }],
  "Beauté":      [{ id: "i13", label: "Carte de fidélité", why: "Elle revient à chaque visite" }, { id: "i6", label: "Carte de visite", why: "Remise en fin de soin" }, { id: "i7", label: "Flyer A5", why: "À laisser chez un partenaire" }],
  "Tatoueur":    [{ id: "i6", label: "Carte de visite", why: "Le geste le plus naturel" }, { id: "i3", label: "Sticker vitrine", why: "Sur la devanture" }, { id: "i8", label: "Affiche A3", why: "Au mur du studio" }],
  "Artisan":     [{ id: "i6", label: "Carte de visite", why: "Laissée après l'intervention" }, { id: "i3", label: "Sticker vitrine", why: "Sur le véhicule" }, { id: "i7", label: "Flyer A5", why: "En boîte aux lettres du quartier" }],
  "Salle de sport": [{ id: "i8", label: "Affiche A3", why: "Au mur, près des machines" }, { id: "i6", label: "Carte de visite", why: "À l'accueil" }, { id: "i3", label: "Sticker vitrine", why: "Sur la porte d'entrée" }],
  "Événement":   [{ id: "i8", label: "Affiche A3", why: "Sur les lieux de passage" }, { id: "i7", label: "Flyer A5", why: "Distribué à l'entrée" }, { id: "i6", label: "Carte de visite", why: "Glissée dans les sacs" }],
  "Hôtel":       [{ id: "i4", label: "Panneau Wifi", why: "Le premier réflexe d'un client" }, { id: "i2", label: "Chevalet de table", why: "Dans chaque chambre" }, { id: "i16", label: "Panneau horaires", why: "À la réception" }],
  "Boutique":    [{ id: "i3", label: "Sticker vitrine", why: "Vu depuis la rue" }, { id: "i9", label: "Marque-page", why: "Glissé dans chaque sac" }, { id: "i6", label: "Carte de visite", why: "À côté de la caisse" }],
  "Fleuriste":   [{ id: "i3", label: "Sticker vitrine", why: "Sur la devanture" }, { id: "i9", label: "Marque-page", why: "Piqué dans le bouquet" }, { id: "i6", label: "Carte de visite", why: "À l'encaissement" }],
  "Immobilier":  [{ id: "i6", label: "Carte de visite", why: "Remise en visite" }, { id: "i8", label: "Affiche A3", why: "En vitrine d'agence" }, { id: "i7", label: "Flyer A5", why: "En boîte aux lettres" }],
  "Coach":       [{ id: "i6", label: "Carte de visite", why: "Le geste le plus naturel" }, { id: "i7", label: "Flyer A5", why: "À laisser chez un partenaire" }, { id: "i8", label: "Affiche A3", why: "Au mur de la salle" }],
  "Photographe": [{ id: "i6", label: "Carte de visite", why: "Remise après la séance" }, { id: "i9", label: "Marque-page", why: "Glissé dans le tirage" }, { id: "i8", label: "Affiche A3", why: "En exposition" }],
}

const DEFAULT_SUGGESTED = [
  { id: "i6", label: "Carte de visite", why: "Le support le plus universel" },
  { id: "i3", label: "Sticker vitrine", why: "Se colle où on veut" },
  { id: "i7", label: "Flyer A5", why: "À distribuer ou à laisser" },
]

/** Déduit tout ce qu'il faut pour ouvrir le studio déjà cadré. */
export function printHandoff(page: { title?: string; blocks: Blockish[] }): Handoff {
  const blocks = page.blocks || []
  const metier = detectMetier(blocks, page.title || "")
  const objectif = detectObjectif(blocks)
  const brand = (page.title || "").trim() || firstText(blocks, ["profile", "overlay_card"], ["name", "title"]) || ""
  return {
    metier, objectif, brand,
    message: MESSAGE_BY_OBJECTIF[objectif] || "Scannez-moi",
    cta: CTA_BY_OBJECTIF[objectif] || "Scannez avec votre téléphone",
    suggested: SUGGESTED[metier] || DEFAULT_SUGGESTED,
  }
}

function firstText(blocks: Blockish[], types: string[], keys: string[]): string {
  for (const b of blocks) {
    if (!types.includes(b.type)) continue
    for (const k of keys) {
      const v = (b.content || {})[k]
      if (typeof v === "string" && v.trim()) return v.trim()
    }
  }
  return ""
}

/** Adresse du studio, déjà cadré. `itemId` ouvre directement un objet précis. */
export function printStudioUrl(shortCode: string, h: Handoff, itemId?: string): string {
  const p = new URLSearchParams()
  if (shortCode) p.set("qr", shortCode)
  if (h.metier && h.metier !== "Tout") p.set("metier", h.metier)
  if (h.objectif && h.objectif !== "Tout") p.set("objectif", h.objectif)
  if (h.brand) p.set("brand", h.brand)
  if (h.message) p.set("message", h.message)
  if (h.cta) p.set("cta", h.cta)
  if (itemId) p.set("item", itemId)
  return `/dashboard/print-studio?${p.toString()}`
}
