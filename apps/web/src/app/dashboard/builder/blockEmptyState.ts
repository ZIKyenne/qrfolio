// blockEmptyState.ts — détection PURE du « contenu publiable » d'un bloc.
// But : l'éditeur ne doit jamais montrer de faux contenu (données de démo) comme s'il
// serait publié. Pour les blocs qui retournent `null` en public quand ils sont vides,
// l'éditeur doit afficher un état vide explicite au lieu d'exemples factices.
//
// Les clés de champs ci-dessous sont IDENTIQUES à celles filtrées côté public
// (PublicPageClient) → `hasPublishableContent === false` ⟺ le bloc rend `null` en ligne.
// Testable sans React (voir blockEmptyState.test.ts).

// Une valeur ne compte comme réelle que si c'est un texte non vide (espaces ignorés) :
// une ligne blanche, un item « fantôme » (espaces seuls) ne sont PAS du contenu publiable.
export function hasMeaningfulText(v: any): boolean {
  return typeof v === "string" && v.trim().length > 0
}

// Balaye des champs indexés field(1..max) ; vrai dès qu'un est réellement rempli.
function anyIndexed(c: Record<string, any>, keyAt: (i: number) => any, max = 50): boolean {
  for (let i = 1; i <= max; i++) if (hasMeaningfulText(keyAt(i))) return true
  return false
}

// Détecteur par type de bloc — miroir EXACT du filtre public (même clé « significative »).
const DETECTORS: Record<string, (c: Record<string, any>) => boolean> = {
  values:                  c => anyIndexed(c, i => c[`v${i}_label`]),
  process_steps:           c => anyIndexed(c, i => c[`s${i}_title`]),
  business_certifications: c => anyIndexed(c, i => c[`c${i}_name`]),
  on_site_services:        c => anyIndexed(c, i => c[`s${i}_label`]),
  event_program:           c => anyIndexed(c, i => c[`s${i}_title`]),
  event_guests:            c => anyIndexed(c, i => c[`g${i}_name`]),
  lineup:                  c => anyIndexed(c, i => c[`a${i}_name`]),
  discography:             c => anyIndexed(c, i => c[`a${i}_title`]),
  concerts:                c => anyIndexed(c, i => c[`c${i}_city`]),
  merch:                   c => anyIndexed(c, i => c[`name${i}`]),
  trust_badge:             c => anyIndexed(c, i => c[`b${i}_label`]),
  info_table:              c => anyIndexed(c, i => c[`r${i}_label`]),
  // ── Vague 9 (renderer partagé) : ces quatre-là rendaient `null` en public sans
  // que la doctrine ne le déclare. L'aperçu remplissait donc la grille de cases
  // « Logo » factices, ou affichait un cadre vide, pour un bloc qui ne publiait rien.
  logo_wall:               c => anyIndexed(c, i => c[`logo${i}_name`]),
  partners:                c => anyIndexed(c, i => c[`logo${i}_name`]),
  certifications:          c => anyIndexed(c, i => c[`cert_${i}_name`]),
  legal_info:              c => ["company_name", "siret", "tva", "address", "capital", "rcs", "email"].some(k => hasMeaningfulText(c[k])),
  engagements:            c => anyIndexed(c, i => c[`e${i}`]),
  stats_block:             c => anyIndexed(c, i => c[`s${i}_value`]),
  grid_section:            c => anyIndexed(c, i => c[`c${i}_title`]),
  tabs_block:              c => anyIndexed(c, i => c[`tab${i}_label`]),
  accordion_block:         c => anyIndexed(c, i => c[`a${i}_title`]),
  two_columns:             c => hasMeaningfulText(c.col1_title) || hasMeaningfulText(c.col1_text) || hasMeaningfulText(c.col2_title) || hasMeaningfulText(c.col2_text),

  // ── Ajoutés le 6 septembre ────────────────────────────────────────────────
  // Ces dix blocs affichaient dans l'aperçu des chiffres et des noms INVENTÉS —
  // « 127 ventes », « 5.0 ★ », « 287 participants », « Jean Dupont, Fondateur »,
  // « 99€ », un code promo « PROMO10 », une citation entière — pendant que la page
  // publiée ne rendait rien. Le commerçant composait sa page devant des données qui
  // ressemblaient aux siennes, publiait, et le bloc disparaissait.
  // Chaque condition ci-dessous est le miroir EXACT du filtre public.
  promo_code:              c => hasMeaningfulText(c.code),
  sales_counter:           c => hasMeaningfulText(c.count),
  participants_count:      c => hasMeaningfulText(c.count),
  scan_counter:            c => hasMeaningfulText(c.count),   // un libellé seul ne compte rien
  featured_product:        c => hasMeaningfulText(c.name) || hasMeaningfulText(c.image),
  // Vague 10 : ces deux regles disaient « ou », et la page publiait alors une
  // citation vide suivie de son auteur, ou deux guillemets vides sous un nom de
  // fondateur. Ce qui porte le bloc, c'est le texte — pas la signature.
  quote_block:             c => hasMeaningfulText(c.quote),
  founder_message:         c => hasMeaningfulText(c.message),
  info_box:                c => hasMeaningfulText(c.message) || hasMeaningfulText(c.title),
  company:                 c => hasMeaningfulText(c.company_name) || hasMeaningfulText(c.logo_url),
  journey:                 c => [1, 2, 3, 4].some(i => hasMeaningfulText(c[`line_${i}`])),
  expertise:               c => anyIndexed(c, i => c[`s${i}_name`]),
  // Vague 11 — compteurs et offres. tickets_left et limited_offer manquaient a
  // l'appel : l'apercu leur inventait « 14 places restantes » et un bandeau
  // « Offre limitée » pour des blocs que la page ne publiait pas.
  tickets_left:            c => hasMeaningfulText(c.count),
  limited_offer:           c => hasMeaningfulText(c.title) || hasMeaningfulText(c.description),
  // La fiche de contact ne s'enregistre que s'il y a quelque chose a enregistrer.
  vcard:                   c => hasMeaningfulText(c.name) || hasMeaningfulText(c.phone) || hasMeaningfulText(c.email),
  google_reviews_block:    c => anyIndexed(c, i => c[`r${i}_name`]) || hasMeaningfulText(c.avg_rating),
  event_access:            c => hasMeaningfulText(c.embed_url) || hasMeaningfulText(c.address)
                              || hasMeaningfulText(c.transport1_label) || hasMeaningfulText(c.transport2_label) || hasMeaningfulText(c.transport3_label),
}

// Vrai si le bloc contient au moins un élément réellement publiable. Pour un type non
// géré ici, renvoie true (on ne masque jamais par erreur un bloc hors périmètre).
export function hasPublishableContent(type: string, content: Record<string, any> | undefined | null): boolean {
  const d = DETECTORS[type]
  if (!d) return true
  return d(content || {})
}

// Types dont l'aperçu éditeur affichait des données de démonstration trompeuses et
// dont le rendu public est `null` quand vide → doivent afficher un état vide explicite.
export const EMPTY_STATE_BLOCK_TYPES = Object.keys(DETECTORS)

// Mention courte affichée sous l'état vide : ces blocs disparaissent en ligne s'ils
// restent vides (cohérent avec le retour `null` du rendu public).
export const HIDDEN_WHEN_EMPTY_NOTE = "Invisible en ligne tant qu'il est vide"
