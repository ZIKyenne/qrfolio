// blockContracts.ts — REGISTRE des divergences connues éditeur/public + métadonnées de
// contrat pour les familles critiques. Sert de « filet de sécurité » avant l'unification
// des renderers : toute NOUVELLE divergence non déclarée ici doit faire échouer un test.
// On ne duplique PAS BLOCK_DEFS (source de vérité des champs) ; on ajoute uniquement ce
// qui est utile à la sécurité du refactor.

// Blocs dont le rendu PUBLIC renvoie `null` de façon INCONDITIONNELLE alors que l'éditeur
// affiche un aperçu. Divergence ASSUMÉE (à traiter dans une mission dédiée, pas ici).
export const KNOWN_PUBLIC_NULL_BLOCKS = ["qr_code_block"] as const

// Divergences connues, qualifiées. severity: info = assumée, warn = à corriger un jour.
export type KnownDivergence = { type: string; kind: string; detail: string; status: "DIVERGENCE ACCEPTÉE" | "DIVERGENCE À CORRIGER"; severity: "info" | "warn" }

export const KNOWN_DIVERGENCES: KnownDivergence[] = [
  { type: "qr_code_block", kind: "présence", detail: "Aperçu QR dans l'éditeur, rendu public = null (le QR vit hors page).", status: "DIVERGENCE ACCEPTÉE", severity: "info" },
]

// Champs ORPHELINS connus : éditables (BLOCK_DEFS.fields) mais non rendus, ou rendus mais
// non éditables. Rendus VISIBLES ici pour ne pas les « perdre » lors de l'unification.
// (Constat figé — à corriger dans des missions ciblées, hors périmètre de celle-ci.)
export type OrphanField = { type: string; field: string; issue: "editable-non-rendu" | "rendu-non-editable"; note: string }

export const KNOWN_ORPHAN_FIELDS: OrphanField[] = [
  { type: "reservation_form", field: "phone", issue: "editable-non-rendu", note: "show_phone existe mais le champ téléphone n'est pas rendu publiquement." },
]

// Contrats de familles CRITIQUES (métadonnées utiles au refactor, dérivées à la main pour
// les blocs à plus fort risque). maxItems reflète la limite RÉELLE du renderer.
export type BlockContract = {
  type: string
  family: string
  hidesWhenEmpty: boolean
  hasLinks: boolean
  hasForm: boolean
  maxItems?: number
  criticalFields: string[]
}

export const CRITICAL_CONTRACTS: BlockContract[] = [
  { type: "contact_form", family: "form", hidesWhenEmpty: false, hasLinks: false, hasForm: true, criticalFields: ["title", "button_label", "show_phone"] },
  { type: "pricing", family: "commerce", hidesWhenEmpty: true, hasLinks: true, hasForm: false, maxItems: 3, criticalFields: ["title1", "price1", "cta_label", "cta_url"] },
  { type: "values", family: "repeater", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 50, criticalFields: ["v1_label"] },
  { type: "event_program", family: "event", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 50, criticalFields: ["s1_title"] },
  { type: "lineup", family: "event", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 4, criticalFields: ["a1_name"] },
  { type: "gallery", family: "media", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 12, criticalFields: ["img1"] },
  { type: "two_columns", family: "layout", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 2, criticalFields: ["col1_title", "col1_text"] },
  { type: "merch", family: "commerce", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 3, criticalFields: ["name1"] },
  { type: "trust_badge", family: "info", hidesWhenEmpty: true, hasLinks: false, hasForm: false, maxItems: 50, criticalFields: ["b1_label"] },
]
