// templateWizard.ts — Moteur PUR de l'assistant de personnalisation d'un modèle.
//
// Idée : ne PAS écrire un questionnaire par métier (impossible à maintenir sur 34 modèles
// et 178 types de blocs). On DÉRIVE les questions des blocs réellement présents dans le
// modèle choisi. Trois registres suffisent :
//
//   • CHAMPS PARTAGÉS   — une même information sert plusieurs blocs (le nom apparaît dans
//     le profil, sur la carte, dans la bannière…). Une seule question, réinjectée partout.
//   • RÉPÉTITEURS       — un bloc = une liste (plats, prestations, tarifs, avis). Une seule
//     question en saisie libre, une ligne par élément.
//   • CHAMPS PROPRES    — un texte qui n'existe que dans ce bloc (une accroche, un encadré).
//
// Tout le reste — couleurs, arrondis, hauteurs, alignements — n'est JAMAIS demandé : ce sont
// des réglages de style, déjà posés par le modèle.
//
// Aucune dépendance React/Supabase : entièrement testable.

export type WizardBlock = { type: string; content: Record<string, any> }

export type StepGroup = "identite" | "contact" | "horaires" | "contenu" | "reseaux"

export type WizardField = { id: string; label: string; kind: "text" | "url" | "tel" | "email"; placeholder?: string }

export type WizardStep = {
  /** Identifiant de la réponse (variable partagée, ou `<index>:<type>` pour un bloc précis). */
  id: string
  kind: "text" | "textarea" | "url" | "tel" | "email" | "list" | "group"
  group: StepGroup
  /** Pour une étape groupée : les champs affichés ensemble sur la même carte. */
  fields?: WizardField[]
  label: string
  hint?: string
  /** Valeur d'exemple du modèle : sert de texte grisé dans le champ. */
  placeholder?: string
  /** Format attendu pour une liste, ex. « Nom ; Prix ; Description ». */
  listFormat?: string
  /** Index des blocs concernés — permet de faire défiler l'aperçu jusqu'au bon endroit. */
  blockIndexes: number[]
  required?: boolean
}

// ── Réglages de style : jamais demandés ──────────────────────────────────────
const STYLE_KEYS = new Set([
  "align", "pad", "radius", "edge", "bg_type", "bg_color", "bg_color2", "bg_image", "overlay",
  "text_color", "color", "color2", "accent_color", "style", "size", "height", "width", "layout",
  "columns", "per_row", "shape", "flip", "speed", "direction", "separator", "icon_style",
  "icon_size", "marker_size", "markers", "cell_style", "media", "line_style", "number_style",
  "number_shape", "number_color", "check_color", "value_color", "ring_color", "frame_style",
  "frame_color", "bar_side", "background", "position", "zoom", "full_width", "thickness",
  "show_value", "dots", "strike", "uppercase", "weight", "spacing", "fill", "dropcap", "rule",
  "divider", "logo_height", "min_height", "offset", "start", "image_width", "image_shape",
  "preview_lines", "default_open", "menu_display", "menu_collapsible", "text_size", "row_density",
  "item_columns", "angle", "tilt", "auto_play", "show_divider", "bg_style", "intensity", "mode",
  "caption", "alt", "ratio", "side", "marks", "left_color", "right_color", "logo_color",
])

const STYLE_PREFIXES = ["__", "effect_", "glow_", "mesh_", "pattern_", "noise_", "vignette_"]

// Quelques clés portent un nom de réglage mais sont du vrai contenu selon le bloc :
// « radius » vaut un arrondi de coins presque partout, mais un rayon d'intervention
// dans une zone de chalandise.
const CONTENT_EXCEPTIONS: Record<string, Set<string>> = {
  service_area: new Set(["radius", "city", "zones"]),
  countdown: new Set(["size"]),
  stat_hero: new Set(["value", "unit"]),
}

export function isStyleKey(key: string, blockType?: string): boolean {
  if (blockType && CONTENT_EXCEPTIONS[blockType]?.has(key)) return false
  if (STYLE_KEYS.has(key)) return true
  return STYLE_PREFIXES.some(p => key.startsWith(p))
}

// ── 1. CHAMPS PARTAGÉS ───────────────────────────────────────────────────────
// (type de bloc → clé → variable partagée). Une réponse alimente toutes les clés
// qui pointent vers la même variable.
type SharedVar =
  | "businessName" | "tagline" | "badge" | "bio" | "address" | "phone" | "email"
  | "website" | "bookingUrl" | "bookingLabel" | "hoursWeek" | "hoursSat" | "hoursSun" | "hoursNote"
  | "instagram" | "facebook" | "tiktok" | "linkedin" | "pinterest" | "youtube" | "whatsapp"

const SHARED: Record<string, Partial<Record<string, SharedVar>>> = {
  profile:            { name: "businessName", tagline: "tagline", badge: "badge" },
  company:            { company_name: "businessName", sector: "tagline", website: "website" },
  bio:                { text: "bio" },
  about:              { text: "bio" },
  google_maps_embed:  { label: "businessName", address: "address" },
  google_maps:        { label: "businessName", address: "address" },
  opening_hours:      { mon_fri: "hoursWeek", saturday: "hoursSat", sunday: "hoursSun", note: "hoursNote" },
  cta_button:         { label: "bookingLabel", url: "bookingUrl" },
  table_booking:      { label: "bookingLabel", url: "bookingUrl" },
  booking_button:     { label: "bookingLabel", url: "bookingUrl" },
  calendly:           { label: "bookingLabel", url: "bookingUrl" },
  order_online:       { url: "bookingUrl" },
  call_button:        { phone: "phone" },
  quick_contact:      { phone: "phone", email: "email" },
  multi_contact:      { phone: "phone", email: "email", website: "website" },
  email_button:       { email: "email" },
  whatsapp_button:    { phone: "whatsapp" },
  vcard:              { name: "businessName", phone: "phone", email: "email", website: "website", address: "address" },
  social_links:       {
    instagram: "instagram", facebook: "facebook", tiktok: "tiktok",
    linkedin: "linkedin", pinterest: "pinterest", youtube: "youtube", website: "website",
  },
}

// Sur les modèles récents, il n'y a pas de bloc « profil » : c'est la GRANDE BANNIÈRE
// d'ouverture qui porte le nom de l'établissement. Mais seule la PREMIÈRE — les suivantes
// sont des sections ordinaires, dont le titre reste une question propre au bloc.
const HERO_SHARED: Partial<Record<string, SharedVar>> = {
  title: "businessName", subtitle: "tagline", eyebrow: "badge",
  cta_label: "bookingLabel", cta_url: "bookingUrl",
}

function heroIndexOf(blocks: WizardBlock[]): number {
  return blocks.findIndex(b => b.type === "overlay_card")
}

/** Mapping partagé applicable à CE bloc (position comprise). */
function sharedMapAt(blocks: WizardBlock[], idx: number): Partial<Record<string, SharedVar>> | undefined {
  const b = blocks[idx]
  if (!b) return undefined
  if (b.type === "overlay_card") return idx === heroIndexOf(blocks) ? HERO_SHARED : undefined
  return SHARED[b.type]
}

// Ordre et libellé des questions partagées.
const SHARED_STEPS: Record<SharedVar, { group: StepGroup; label: string; kind: WizardStep["kind"]; hint?: string; required?: boolean }> = {
  businessName: { group: "identite", label: "Quel est le nom de votre établissement ?", kind: "text", required: true, hint: "Il sera repris partout : titre, carte, bannière." },
  tagline:      { group: "identite", label: "En une phrase, que faites-vous ?", kind: "text", hint: "C'est la ligne juste sous votre nom." },
  badge:        { group: "identite", label: "Un petit badge à mettre en avant ?", kind: "text", hint: "Court, avec un emoji si vous voulez. Ex. « 🌿 Fait maison »." },
  bio:          { group: "identite", label: "Présentez-vous en deux ou trois phrases", kind: "textarea" },
  address:      { group: "contact", label: "Votre adresse complète", kind: "text", hint: "Numéro, rue, code postal et ville — elle sert à placer la carte." },
  phone:        { group: "contact", label: "Votre numéro de téléphone", kind: "tel" },
  email:        { group: "contact", label: "Votre adresse e-mail", kind: "email" },
  website:      { group: "contact", label: "Votre site internet", kind: "url" },
  bookingLabel: { group: "contact", label: "Que doit dire votre bouton principal ?", kind: "text", hint: "Ex. « Réserver une table », « Prendre rendez-vous », « Commander »." },
  bookingUrl:   { group: "contact", label: "Vers quel lien mène ce bouton ?", kind: "url", hint: "Votre page de réservation, Doctolib, un formulaire… Laissez vide si vous n'en avez pas encore." },
  hoursWeek:    { group: "horaires", label: "Vos horaires du lundi au vendredi", kind: "text" },
  hoursSat:     { group: "horaires", label: "Et le samedi ?", kind: "text" },
  hoursSun:     { group: "horaires", label: "Et le dimanche ?", kind: "text" },
  hoursNote:    { group: "horaires", label: "Une précision sur les horaires ?", kind: "text", hint: "Ex. « Fermé le lundi », « Dernière commande à 22h »." },
  instagram:    { group: "reseaux", label: "Votre Instagram", kind: "url" },
  facebook:     { group: "reseaux", label: "Votre Facebook", kind: "url" },
  tiktok:       { group: "reseaux", label: "Votre TikTok", kind: "url" },
  linkedin:     { group: "reseaux", label: "Votre LinkedIn", kind: "url" },
  pinterest:    { group: "reseaux", label: "Votre Pinterest", kind: "url" },
  youtube:      { group: "reseaux", label: "Votre YouTube", kind: "url" },
  whatsapp:     { group: "contact", label: "Votre numéro WhatsApp", kind: "tel" },
}

const SHARED_ORDER: SharedVar[] = [
  "businessName", "tagline", "badge", "bio",
  "address", "phone", "whatsapp", "email", "website", "bookingLabel", "bookingUrl",
  "hoursWeek", "hoursSat", "hoursSun", "hoursNote",
  "instagram", "facebook", "tiktok", "linkedin", "pinterest", "youtube",
]

// ── 2. RÉPÉTITEURS ───────────────────────────────────────────────────────────
// Un bloc = une liste. On pose UNE question, l'utilisateur écrit une ligne par
// élément, les colonnes séparées par « ; ». Le modèle sert d'exemple prérempli.
type Repeater = {
  label: string
  format: string          // ce qu'on attend sur une ligne
  max: number
  /** Clés d'un élément, dans l'ordre des colonnes. `i` commence à 1. */
  keys: (i: number) => string[]
  hint?: string
}

const REPEATERS: Record<string, Repeater> = {
  menu_section:      { label: "Les plats de cette section", format: "Nom ; Prix ; Description", max: 10, keys: i => [`item${i}_name`, `item${i}_price`, `item${i}_desc`] },
  services_list:     { label: "Vos prestations", format: "Nom ; Description", max: 6, keys: i => [`s${i}_name`, `s${i}_desc`] },
  services_pricing:  { label: "Vos prestations et leurs prix", format: "Nom ; Prix ; Durée", max: 8, keys: i => [`s${i}_name`, `s${i}_price`, `s${i}_duration`] },
  definition_list:   { label: "Vos informations pratiques", format: "Intitulé ; Valeur", max: 8, keys: i => [`r${i}_label`, `r${i}_value`] },
  info_table:        { label: "Vos informations pratiques", format: "Intitulé ; Valeur", max: 8, keys: i => [`r${i}_label`, `r${i}_value`] },
  checklist:         { label: "Ce qui est compris", format: "Une ligne = un élément", max: 10, keys: i => [`i${i}`] },
  free_grid:         { label: "Les cases de la grille", format: "Emoji ; Titre ; Texte", max: 9, keys: i => [`c${i}_emoji`, `c${i}_title`, `c${i}_text`] },
  icon_row:          { label: "Vos points forts en icônes", format: "Emoji ; Texte court", max: 6, keys: i => [`i${i}_emoji`, `i${i}_label`] },
  steps_horizontal:  { label: "Les étapes, côte à côte", format: "Emoji ; Titre ; Texte", max: 4, keys: i => [`s${i}_emoji`, `s${i}_title`, `s${i}_text`] },
  process_steps:     { label: "Les étapes de votre méthode", format: "Emoji ; Titre ; Description", max: 6, keys: i => [`s${i}_icon`, `s${i}_title`, `s${i}_desc`] },
  numbered_list:     { label: "Votre liste numérotée", format: "Titre ; Texte", max: 8, keys: i => [`i${i}_title`, `i${i}_text`] },
  stats_block:       { label: "Vos chiffres clés", format: "Emoji ; Chiffre ; Libellé", max: 4, keys: i => [`s${i}_icon`, `s${i}_value`, `s${i}_label`] },
  business_stats:    { label: "Vos chiffres clés", format: "Emoji ; Chiffre ; Libellé", max: 4, keys: i => [`stat${i}_icon`, `stat${i}_value`, `stat${i}_label`] },
  testimonials:      { label: "De vrais avis de vos clients", format: "Prénom ; Avis ; Note sur 5", max: 4, keys: i => [`name${i}`, `text${i}`, `stars${i}`], hint: "N'inventez rien : mieux vaut supprimer ce bloc que d'afficher de faux avis." },
  values:            { label: "Vos valeurs", format: "Une ligne = une valeur", max: 6, keys: i => [`v${i}_label`] },
  advantages:        { label: "Vos avantages", format: "Une ligne = un avantage", max: 8, keys: i => [`adv${i}`] },
  engagements:       { label: "Vos engagements", format: "Une ligne = un engagement", max: 8, keys: i => [`e${i}`] },
  trust_badge:       { label: "Vos gages de confiance", format: "Emoji ; Libellé", max: 6, keys: i => [`b${i}_icon`, `b${i}_label`] },
  reassurance:       { label: "Vos garanties", format: "Emoji ; Titre ; Détail", max: 4, keys: i => [`g${i}_icon`, `g${i}_label`, `g${i}_desc`] },
  faq:               { label: "Vos questions fréquentes", format: "Question ; Réponse", max: 8, keys: i => [`q${i}`, `a${i}`] },
  team:              { label: "Votre équipe", format: "Prénom ; Rôle", max: 6, keys: i => [`m${i}_name`, `m${i}_role`] },
  timeline:          { label: "Les moments de votre parcours", format: "Date ; Titre ; Détail", max: 6, keys: i => [`e${i}_date`, `e${i}_title`, `e${i}_desc`] },
  event_program:     { label: "Le programme", format: "Heure ; Titre", max: 8, keys: i => [`s${i}_time`, `s${i}_title`] },
  compare_two:       { label: "Votre comparatif, ligne par ligne", format: "Chez vous ; Ailleurs", max: 8, keys: i => [`r${i}_left`, `r${i}_right`] },
  progress_bars:     { label: "Vos jauges", format: "Intitulé ; Valeur sur 100", max: 6, keys: i => [`b${i}_label`, `b${i}_value`] },
  stack_cards:       { label: "Vos cartes", format: "Titre ; Texte", max: 6, keys: i => [`c${i}_title`, `c${i}_text`] },
  columns_text:      { label: "Vos colonnes", format: "Emoji ; Titre ; Texte", max: 3, keys: i => [`c${i}_emoji`, `c${i}_title`, `c${i}_text`] },
  popular_products:  { label: "Vos produits les plus demandés", format: "Nom ; Prix ; Mention", max: 4, keys: i => [`p${i}_name`, `p${i}_price`, `p${i}_sales`] },
  packs:             { label: "Vos formules", format: "Nom ; Prix ; Détail", max: 4, keys: i => [`p${i}_name`, `p${i}_price`, `p${i}_desc`] },
  documents:         { label: "Vos documents", format: "Type ; Titre ; Description", max: 4, keys: i => [`d${i}_type`, `d${i}_title`, `d${i}_desc`] },
  concerts:          { label: "Vos dates", format: "Date ; Ville ; Salle", max: 6, keys: i => [`c${i}_date`, `c${i}_city`, `c${i}_venue`] },
  merch:             { label: "Vos produits dérivés", format: "Nom ; Prix", max: 3, keys: i => [`name${i}`, `price${i}`] },
  anchor_nav:        { label: "Les entrées du menu de la page", format: "Texte ; Nom de l'ancre", max: 6, keys: i => [`i${i}_label`, `i${i}_target`] },
}

// Blocs répétitifs à 3 colonnes fixes (le bloc « Tarifs » n'est pas indexé pareil).
const PRICING_KEYS = (i: number) => [`title${i}`, `price${i}`, `desc${i}`]

// ── 3. CHAMPS PROPRES À UN BLOC ──────────────────────────────────────────────
// Un texte qui n'existe que là. La question porte le nom du bloc pour situer.
const LOCAL: Record<string, Partial<Record<string, string>>> = {
  heading:         { text: "Le titre de cette section", subtitle: "Son sous-titre" },
  big_statement:   { text: "Votre phrase d'accroche, en très gros", subtext: "La ligne sous l'accroche" },
  free_section:    { eyebrow: "Le petit sur-titre", title: "Le titre de cette section", subtitle: "Son sous-titre", text: "Le texte de cette section", cta_label: "Le texte du bouton", cta_url: "Le lien du bouton" },
  overlay_card:    { eyebrow: "Le petit sur-titre de la bannière", title: "Le titre de la bannière", subtitle: "Le sous-titre de la bannière", cta_label: "Le texte du bouton", cta_url: "Le lien du bouton" },
  highlight_box:   { title: "Le titre de l'encadré", text: "Le texte de l'encadré" },
  frame_box:       { title: "Le titre du cadre", text: "Le texte du cadre", signature: "La signature" },
  info_box:        { title: "Le titre de l'encadré", message: "Le message de l'encadré" },
  announcement:    { title: "Le titre de l'annonce", message: "Le texte de l'annonce" },
  banner_strip:    { text: "Le message du bandeau", cta_label: "Le texte de son bouton", cta_url: "Le lien de son bouton" },
  marquee_text:    { items: "Les messages qui défilent, séparés par des virgules" },
  ribbon_banner:   { text: "Le texte du ruban" },
  badge_row:       { title: "Le titre au-dessus des badges", items: "Vos badges, séparés par des virgules" },
  skills:          { title: "Le titre au-dessus des mots-clés", tags: "Vos mots-clés, séparés par des virgules" },
  text_columns:    { title: "Le titre de ce texte", text: "Votre texte, réparti en colonnes" },
  toggle_content:  { title: "Le titre du contenu repliable", text: "Le texte caché derrière « Voir plus »" },
  rich_text:       { text: "Votre texte" },
  quote_block:     { quote: "La citation", author: "Son auteur" },
  stat_hero:       { eyebrow: "Le sur-titre", value: "Le chiffre", unit: "Son unité", label: "Ce que ce chiffre désigne", text: "La précision sous le chiffre" },
  card_link:       { eyebrow: "Le sur-titre", title: "Le titre de la carte", text: "Sa description", url: "Son lien" },
  split_panel:     { l_title: "Le titre du panneau de gauche", l_text: "Son texte", l_cta_label: "Son bouton", l_cta_url: "Le lien de gauche", r_title: "Le titre du panneau de droite", r_text: "Son texte", r_cta_label: "Son bouton", r_cta_url: "Le lien de droite" },
  image_text:      { title: "Le titre à côté de l'image", text: "Le texte à côté de l'image", cta_label: "Le bouton", cta_url: "Son lien" },
  promo_banner:    { text: "Le message promotionnel", subtext: "Sa précision", cta_label: "Le bouton", cta_url: "Son lien" },
  gift_card:       { title: "Le titre de la carte cadeau", description: "Sa description", cta_url: "Le lien pour offrir" },
  contact_form:    { title: "Le titre du formulaire" },
  countdown:       { title: "Le titre du compte à rebours", target: "La date visée", subtitle: "Le sous-titre" },
  event_info:      { name: "Le nom de l'événement", date: "Sa date", time: "Son heure", location: "Son lieu", price: "Son tarif", cta_url: "Le lien de réservation" },
  service_area:    { city: "Votre ville de rattachement", zones: "Les communes que vous couvrez", radius: "Votre rayon d'intervention" },
  external_shop:   { url: "Le lien de votre boutique" },
  spotify_embed:   { url: "Le lien Spotify" },
  spotify_player:  { url: "Le lien Spotify" },
  video:           { url: "Le lien de la vidéo" },
  embed_block:     { url: "Le lien à intégrer" },
  product:         { name: "Le nom du produit", price: "Son prix", description: "Sa description", cta_url: "Le lien pour l'acheter" },
}

// Un titre de section est demandé pour tous les répétitifs qui en ont un.
const TITLE_LABELS: Record<string, string> = {
  title: "Le titre de cette partie",
  subtitle: "Son sous-titre",
  category: "Le nom de cette section de carte",
  left_title: "L'en-tête de la colonne de gauche",
  right_title: "L'en-tête de la colonne de droite",
}

// ── Utilitaires ──────────────────────────────────────────────────────────────
const txt = (v: any): string => (typeof v === "string" ? v : "")
const filled = (v: any): boolean => txt(v).trim().length > 0

/** Une valeur qui n'est manifestement pas du contenu à personnaliser. */
function isPlaceholderUrl(v: string): boolean {
  const s = v.trim()
  return s === "#" || s === "" || /^https?:\/\/(www\.)?(instagram|facebook|tiktok|linkedin|pinterest|youtube|calendly|monsite|exemple)\.com\/?$/i.test(s)
}

/** Reconstruit le texte d'un répétitif : une ligne par élément, colonnes séparées par « ; ». */
export function repeaterToText(content: Record<string, any>, spec: Repeater): string {
  const lines: string[] = []
  for (let i = 1; i <= spec.max; i++) {
    const cols = spec.keys(i).map(k => txt(content[k]).trim())
    if (!cols.some(Boolean)) continue
    while (cols.length && !cols[cols.length - 1]) cols.pop()
    lines.push(cols.join(" ; "))
  }
  return lines.join("\n")
}

/** Inverse : écrit les clés du répétitif à partir du texte saisi. Vide les surplus. */
export function textToRepeater(text: string, spec: Repeater): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = txt(text).split("\n").map(l => l.trim()).filter(Boolean).slice(0, spec.max)
  for (let i = 1; i <= spec.max; i++) {
    const cols = (lines[i - 1] || "").split(";").map(c => c.trim())
    spec.keys(i).forEach((k, j) => { out[k] = cols[j] || "" })
  }
  return out
}

function repeaterSpec(type: string): Repeater | null {
  if (type === "pricing") return { label: "Vos formules", format: "Nom ; Prix ; Détail", max: 3, keys: PRICING_KEYS }
  return REPEATERS[type] || null
}

// ── Construction du questionnaire ────────────────────────────────────────────
export type BuiltWizard = { steps: WizardStep[]; initial: Record<string, string> }

/**
 * Dérive les questions des blocs présents. `initial` contient les valeurs du modèle,
 * pour que chaque champ arrive PRÉREMPLI : l'utilisateur corrige au lieu de tout écrire.
 */
export function buildWizard(blocks: WizardBlock[]): BuiltWizard {
  const steps: WizardStep[] = []
  const initial: Record<string, string> = {}
  const sharedSeen = new Map<SharedVar, WizardStep>()

  const pushShared = (v: SharedVar, idx: number, sample: string) => {
    const existing = sharedSeen.get(v)
    if (existing) {
      if (!existing.blockIndexes.includes(idx)) existing.blockIndexes.push(idx)
      if (!initial[v] && sample) initial[v] = sample
      return
    }
    const meta = SHARED_STEPS[v]
    const step: WizardStep = {
      id: v, kind: meta.kind, group: meta.group, label: meta.label,
      hint: meta.hint, required: meta.required, blockIndexes: [idx],
    }
    sharedSeen.set(v, step)
    if (sample) initial[v] = sample
  }

  const socialIdx = blocks.findIndex(b => b.type === "social_links")

  blocks.forEach((b, idx) => {
    const c = b.content || {}
    // a. champs partagés
    const map = sharedMapAt(blocks, idx)
    if (map) {
      for (const [key, v] of Object.entries(map)) {
        if (!v) continue
        const sample = txt(c[key])
        if (isPlaceholderUrl(sample) && SHARED_STEPS[v].kind === "url") { pushShared(v, idx, ""); continue }
        pushShared(v, idx, sample)
      }
    }
    // b. répétitif
    const spec = repeaterSpec(b.type)
    if (spec) {
      const titleSteps: WizardStep[] = []
      const id = `b${idx}.__list`
      const listStep: WizardStep = {
        id, kind: "list", group: "contenu",
        label: spec.label, hint: spec.hint, listFormat: spec.format,
        blockIndexes: [idx],
      }
      initial[id] = repeaterToText(c, spec)
      // titre de la section, s'il existe
      // Le titre passe AVANT la liste : on nomme la section, puis on la remplit.
      for (const [tk, tlabel] of Object.entries(TITLE_LABELS)) {
        if (!filled(c[tk])) continue
        const tid = `b${idx}.${tk}`
        titleSteps.push({ id: tid, kind: "text", group: "contenu", label: tlabel, blockIndexes: [idx] })
        initial[tid] = txt(c[tk])
      }
      steps.push(...titleSteps, listStep)
    }
    // c. champs propres au bloc
    const local = LOCAL[b.type]
    if (local) {
      for (const [key, label] of Object.entries(local)) {
        if (!label) continue
        if (map && (map as any)[key]) continue          // déjà couvert par une question partagée
        if (isStyleKey(key, b.type)) continue            // réglage de style : jamais demandé
        if (spec && key in TITLE_LABELS) continue        // déjà posé juste avant la liste
        const sample = txt(c[key])
        if (!filled(sample)) continue                    // rien à corriger
        if (isPlaceholderUrl(sample)) continue
        if (/^tel:/i.test(sample)) { pushShared("phone", idx, sample.replace(/^tel:/i, "")); continue }
        const id = `b${idx}.${key}`
        steps.push({
          id,
          kind: key.endsWith("_url") || key === "url" ? "url" : sample.length > 90 ? "textarea" : "text",
          group: "contenu", label, blockIndexes: [idx],
        })
        initial[id] = sample
      }
    }
  })

  // Regroupements : trois champs d'horaires et six réseaux ne méritent pas neuf
  // questions successives. On les pose sur une seule carte chacun.
  const sharedOrdered = SHARED_ORDER.map(v => sharedSeen.get(v)).filter(Boolean) as WizardStep[]
  const pack = (ids: SharedVar[], id: string, label: string, hint: string, group: StepGroup): WizardStep | null => {
    const members = sharedOrdered.filter(s => ids.includes(s.id as SharedVar))
    if (members.length === 0) return null
    return {
      id, kind: "group", group, label, hint,
      blockIndexes: [...new Set(members.flatMap(m => m.blockIndexes))],
      fields: members.map(m => ({
        id: m.id,
        label: SHORT_LABELS[m.id as SharedVar] || m.label,
        kind: (m.kind === "textarea" || m.kind === "list" || m.kind === "group" ? "text" : m.kind),
      })),
    }
  }
  const hoursStep = pack(["hoursWeek", "hoursSat", "hoursSun", "hoursNote"], "grp:hours",
    "Vos horaires d'ouverture", "Écrivez-les comme vous voulez : « 9h – 19h », « 12h-14h et 19h-22h », « Fermé »…", "horaires")
  const socialStep = pack(["instagram", "facebook", "tiktok", "linkedin", "pinterest", "youtube"], "grp:social",
    "Vos réseaux sociaux", "Collez l'adresse de vos profils. Laissez vide ceux que vous n'avez pas.", "reseaux")

  const packed = new Set(["hoursWeek", "hoursSat", "hoursSun", "hoursNote", "instagram", "facebook", "tiktok", "linkedin", "pinterest", "youtube"])
  const before = sharedOrdered.filter(s => !packed.has(s.id) && s.group !== "reseaux")
  const ordered: WizardStep[] = [
    ...before,
    ...(hoursStep ? [hoursStep] : []),
    ...steps,
    ...(socialStep ? [socialStep] : []),
  ]
  return { steps: ordered, initial }
}

// Libellés courts, utilisés dans les cartes groupées.
const SHORT_LABELS: Partial<Record<SharedVar, string>> = {
  hoursWeek: "Lundi – vendredi", hoursSat: "Samedi", hoursSun: "Dimanche", hoursNote: "Précision",
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
  linkedin: "LinkedIn", pinterest: "Pinterest", youtube: "YouTube",
}

// ── Application des réponses ─────────────────────────────────────────────────
/**
 * Réécrit les blocs avec les réponses. Une réponse VIDE efface le champ : c'est
 * volontaire — mieux vaut un champ absent qu'une adresse de démonstration publiée.
 * `answers` ne contient que les étapes réellement vues ; une étape jamais atteinte
 * laisse le contenu du modèle intact.
 */
export function applyAnswers(blocks: WizardBlock[], answers: Record<string, string>): WizardBlock[] {
  const out: WizardBlock[] = blocks.map(b => ({ type: b.type, content: { ...(b.content || {}) } }))

  // 1. champs partagés
  out.forEach((b, idx) => {
    const map = sharedMapAt(blocks, idx)
    if (!map) return
    for (const [key, v] of Object.entries(map)) {
      if (!v || !(v in answers)) continue
      b.content[key] = answers[v]
    }
  })

  // 2. répétitifs et champs propres
  out.forEach((b, idx) => {
    const spec = repeaterSpec(b.type)
    if (spec) {
      const id = `b${idx}.__list`
      if (id in answers) Object.assign(b.content, textToRepeater(answers[id], spec))
    }
    for (const [k, val] of Object.entries(answers)) {
      const m = k.match(/^b(\d+)\.(.+)$/)
      if (!m || Number(m[1]) !== idx || m[2] === "__list") continue
      b.content[m[2]] = val
    }
  })

  // 3. le nom de démonstration peut traîner ailleurs (titre de bannière, texte…).
  //    On remplace ses occurrences restantes par le vrai nom.
  const heroIdx = heroIndexOf(blocks)
  const oldName = firstSample(blocks, "profile", "name")
    || (heroIdx >= 0 ? txt(blocks[heroIdx].content?.title).trim() : "")
  const newName = answers.businessName
  if (oldName && newName && oldName !== newName) {
    out.forEach(b => {
      for (const [k, v] of Object.entries(b.content)) {
        if (isStyleKey(k, b.type) || typeof v !== "string" || !v.includes(oldName)) continue
        b.content[k] = v.split(oldName).join(newName)
      }
    })
  }
  return out
}

function firstSample(blocks: WizardBlock[], type: string, key: string): string {
  const b = blocks.find(x => x.type === type)
  return b ? txt((b.content || {})[key]).trim() : ""
}

// ── État de chaque bloc, pour la revue finale ────────────────────────────────
export type BlockState = "filled" | "example" | "decorative" | "empty"
export type BlockDecision = "keep" | "hide" | "remove"

export type BlockReview = {
  index: number
  type: string
  state: BlockState
  /** Ce que le bloc affiche actuellement, en une ligne — pour que l'utilisateur reconnaisse. */
  preview: string
  /** Choix conseillé : garder ce qui est rempli, retirer ce qui n'est que de l'exemple. */
  suggested: BlockDecision
}

/** Résume chaque bloc APRÈS application des réponses. */
export function reviewBlocks(
  original: WizardBlock[], applied: WizardBlock[], steps: WizardStep[], answers: Record<string, string>,
): BlockReview[] {
  const touched = new Set<number>()
  const concerned = new Set<number>()
  for (const s of steps) {
    for (const i of s.blockIndexes) {
      concerned.add(i)
      if (filled(answers[s.id])) touched.add(i)
    }
  }
  return applied.map((b, index) => {
    const hasText = Object.entries(b.content).some(([k, v]) => !isStyleKey(k, b.type) && filled(v) && !txt(v).startsWith("data:"))
    let state: BlockState
    if (!concerned.has(index)) state = hasText ? "decorative" : "decorative"
    else if (touched.has(index)) state = "filled"
    else if (hasText) state = "example"
    else state = "empty"
    return {
      index, type: b.type, state,
      preview: onelinePreview(b),
      suggested: state === "example" ? "remove" : state === "empty" ? "hide" : "keep",
    }
  })
}

/** Première ligne de texte lisible du bloc — sert d'étiquette dans la revue. */
export function onelinePreview(b: WizardBlock): string {
  const priority = ["title", "name", "label", "category", "value", "quote", "message", "text", "items", "eyebrow"]
  for (const k of priority) {
    const v = txt(b.content?.[k]).trim()
    if (v && !v.startsWith("data:")) return v.slice(0, 60)
  }
  for (const [k, v] of Object.entries(b.content || {})) {
    if (isStyleKey(k, b.type)) continue
    const s = txt(v).trim()
    if (s && !s.startsWith("data:") && !/^https?:/.test(s)) return s.slice(0, 60)
  }
  return ""
}

/** Applique les décisions : on garde, on masque (invisible en ligne), ou on retire. */
export function finalizeBlocks(
  blocks: WizardBlock[], decisions: Record<number, BlockDecision>,
): { type: string; content: Record<string, any>; visible: boolean }[] {
  const out: { type: string; content: Record<string, any>; visible: boolean }[] = []
  blocks.forEach((b, i) => {
    const d = decisions[i] || "keep"
    if (d === "remove") return
    out.push({ type: b.type, content: b.content, visible: d !== "hide" })
  })
  return out
}

// =============================================================================
// Aperçu ciblé — « qu'est-ce que cette question va changer ? »
// -----------------------------------------------------------------------------
// Sur ordinateur, l'assistant montre la page entière à côté des questions. Sur
// téléphone, il n'y avait AUCUN aperçu : on répondait à seize questions à
// l'aveugle, sans jamais voir ce qu'on modifiait.
//
// Montrer la page entière dans une vignette de téléphone n'aiderait pas. Ce qui
// aide, c'est de voir LE bloc que la question en cours modifie.
//
// Attention aux index : la liste d'aperçu retire les blocs décidés « à enlever »,
// donc ses positions ne correspondent plus à `blockIndexes`, qui compte sur la
// liste d'ORIGINE. D'où `srcIndex`, porté par chaque bloc d'aperçu.
// =============================================================================

/** Blocs d'aperçu que l'étape en cours modifie, dans l'ordre de la page. */
export function blocsDeLEtape<T extends { srcIndex: number }>(
  blocsApercu: T[], indexes: number[] | undefined,
): T[] {
  if (!indexes || indexes.length === 0) return []
  const vises = new Set(indexes)
  return blocsApercu.filter(b => vises.has(b.srcIndex))
}
