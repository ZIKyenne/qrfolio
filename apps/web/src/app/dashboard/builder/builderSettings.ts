// builderSettings.ts — Modèle PUR des réglages de bloc (mission C03, Vague 3). Aucun React/Supabase.
// Décrit les sections visibles selon le mode simple/avancé, classe les champs des blocs pilotes,
// compte les valeurs modifiées (diff vs BLOCK_DEFS.defaultContent), et fournit les helpers de reset.
// S'appuie sur builderUx (SETTINGS_SECTIONS, settingsSectionsForMode, resolveMode). Testable.

import { BLOCK_DEFS, type Block, type BlockField } from "./types"
import { SETTINGS_SECTIONS, settingsSectionsForMode, type UxMode } from "./builderUx"

// Le libellé produit dit « Avancé » ; en interne c'est le mode "expert" de builderUx.
export type BlockSettingsMode = "simple" | "advanced"
export const SETTINGS_MODE_KEY = "qrowg_builder_settings_mode"

export function resolveSettingsMode(raw: string | null | undefined): BlockSettingsMode {
  return raw === "advanced" ? "advanced" : "simple"
}
// Pont vers builderUx (simple|expert).
export function toUxMode(mode: BlockSettingsMode): UxMode {
  return mode === "advanced" ? "expert" : "simple"
}

// ── Blocs pilotes couverts par le mode simple curaté (§9) ────────────────────
export const PILOT_BLOCKS = new Set<string>([
  "heading", "bio", "values", "pricing", "image", "video",
  "contact_form", "product_catalog", "timeline", "google_maps_embed",
])
export function isPilotBlock(type: string): boolean {
  return PILOT_BLOCKS.has(type)
}

// Champs ESSENTIELS affichés en mode simple pour chaque pilote (curaté). Les autres champs du bloc
// restent accessibles en mode avancé (aucune valeur masquée définitivement).
export const PILOT_SIMPLE_FIELDS: Record<string, string[]> = {
  heading: ["text", "subtitle", "align"],
  bio: ["text", "align"],
  values: ["title", "v1_label", "v2_label", "v3_label"],
  pricing: ["title", "title1", "price1", "title2", "price2", "title3", "price3", "cta_label", "cta_url"],
  image: ["src", "caption", "link"],
  video: ["url", "title"],
  contact_form: ["title", "button_label"],
  product_catalog: ["title", "p1_name", "p1_price", "p2_name", "p2_price", "p3_name", "p3_price", "cta_label"],
  timeline: ["title", "e1_date", "e1_title", "e2_date", "e2_title", "e3_date", "e3_title"],
  google_maps_embed: ["label", "address", "embed_url"],
}

// ── Champs de contenu à rendre selon le mode ─────────────────────────────────
// Simple = sous-ensemble curaté ; Avancé = tous les champs métier (def.fields). Pur.
export function contentFieldsFor(type: string, mode: BlockSettingsMode): BlockField[] {
  const def = BLOCK_DEFS[type]
  if (!def) return []
  if (mode === "advanced" || !isPilotBlock(type)) return def.fields
  const simple = new Set(PILOT_SIMPLE_FIELDS[type] ?? [])
  const picked = def.fields.filter(f => simple.has(f.key))
  // Si aucune correspondance (bloc pilote sans champs simples connus), retomber sur tous les champs.
  return picked.length ? picked : def.fields
}

// ── Classification d'un champ (UI seulement, ne touche pas le stockage) ───────
export interface SettingFieldMeta {
  field: string
  section: string        // id de SETTINGS_SECTIONS (content/design/layout/…)
  minimumMode: BlockSettingsMode
  priority: number
  glossaryKey?: string
}

export function fieldMeta(type: string, key: string): SettingFieldMeta {
  const def = BLOCK_DEFS[type]
  const idx = def ? def.fields.findIndex(f => f.key === key) : -1
  const simple = new Set(PILOT_SIMPLE_FIELDS[type] ?? [])
  const isSimple = isPilotBlock(type) ? simple.has(key) : false
  return {
    field: key,
    section: "content",
    minimumMode: isSimple ? "simple" : "advanced",
    priority: idx < 0 ? 999 : idx,
  }
}

// ── Comptage des valeurs modifiées (diff vs défaut connu) ────────────────────
// Une valeur est « modifiée » si elle diffère du defaultContent ET n'est pas vide. Pur.
export function contentChangedKeys(block: Block): string[] {
  const def = BLOCK_DEFS[block.type]
  if (!def) return []
  const content = block.content as Record<string, string>
  const defaults = def.defaultContent as Record<string, string>
  const keys = def.fields.map(f => f.key)
  return keys.filter(k => {
    const v = content[k]
    if (v == null || v === "") return false
    return v !== defaults[k]
  })
}

// Clés universelles de style/disposition personnalisées (préfixe "__", non vides). Pur.
export function universalChangedKeys(block: Block): string[] {
  const content = block.content as Record<string, string>
  return Object.keys(content).filter(k => k.startsWith("__") && content[k] != null && content[k] !== "")
}

// ── Modèle de section (dérivé, déterministe) ─────────────────────────────────
export interface BlockSettingsSectionModel {
  id: string
  label: string
  description: string
  advancedOnly: boolean
  visible: boolean
  changedCount: number
  errorCount: number
}

// Sections visibles pour ce bloc dans ce mode, avec le nombre de valeurs modifiées.
export function blockSettingsSections(block: Block, mode: BlockSettingsMode): BlockSettingsSectionModel[] {
  const visibleIds = new Set(settingsSectionsForMode(toUxMode(mode)).map(s => s.id))
  const contentChanged = contentChangedKeys(block).length
  const universalChanged = universalChangedKeys(block).length
  return SETTINGS_SECTIONS.map(s => ({
    id: s.id,
    label: s.label,
    description: s.hint,
    advancedOnly: s.advancedOnly,
    visible: visibleIds.has(s.id),
    // Le contenu porte son propre compte ; les sections de style partagent le compte universel.
    changedCount: s.id === "content" ? contentChanged : (s.id === "advanced" ? 0 : universalChanged),
    errorCount: 0,
  })).filter(s => s.visible)
}

// Première section à ouvrir (ou conserve l'actuelle si encore visible dans le mode).
export function resolveActiveSection(block: Block, mode: BlockSettingsMode, current?: string): string {
  const sections = blockSettingsSections(block, mode)
  if (current && sections.some(s => s.id === current)) return current
  return sections[0]?.id ?? "content"
}

// ── Reset (pur — renvoie un NOUVEL objet content) ────────────────────────────
export function resetContentFields(block: Block, keys: string[]): Record<string, string> {
  const def = BLOCK_DEFS[block.type]
  const defaults = (def?.defaultContent ?? {}) as Record<string, string>
  const next = { ...(block.content as Record<string, string>) }
  for (const k of keys) {
    if (k in defaults) next[k] = defaults[k]
    else delete next[k]
  }
  return next
}

// Reset d'une section : contenu → tous les champs métier ; style → clés universelles "__".
export function resetSectionContent(block: Block, sectionId: string): Record<string, string> {
  if (sectionId === "content") {
    const def = BLOCK_DEFS[block.type]
    return resetContentFields(block, def ? def.fields.map(f => f.key) : [])
  }
  // sections de style : retirer les personnalisations universelles.
  const next = { ...(block.content as Record<string, string>) }
  for (const k of universalChangedKeys(block)) delete next[k]
  return next
}

// Reset complet du bloc → defaultContent (nouvel objet).
export function resetBlockContent(type: string): Record<string, string> {
  return { ...((BLOCK_DEFS[type]?.defaultContent ?? {}) as Record<string, string>) }
}

// ── États du bloc (badges priorisés, §20) ────────────────────────────────────
export type BlockStateId = "hidden" | "draft" | "locked" | "empty" | "premium" | "visible"
export interface BlockStateBadge { id: BlockStateId; label: string; tone: "neutral" | "warning" | "accent" | "success" }

export interface BlockStateContext { isPremium?: boolean; isEmpty?: boolean; max?: number }

// Retourne les états importants d'abord, limités (évite la multiplication de badges).
export function blockStateBadges(block: Block, ctx: BlockStateContext = {}): BlockStateBadge[] {
  const badges: BlockStateBadge[] = []
  if (block.locked) badges.push({ id: "locked", label: "Verrouillé", tone: "neutral" })
  if (!block.visible) badges.push({ id: "hidden", label: "Masqué", tone: "warning" })
  if (block.draft) badges.push({ id: "draft", label: "Brouillon", tone: "warning" })
  if (ctx.isEmpty) badges.push({ id: "empty", label: "Vide — invisible en ligne", tone: "warning" })
  if (ctx.isPremium) badges.push({ id: "premium", label: "Premium", tone: "accent" })
  if (badges.length === 0) badges.push({ id: "visible", label: "Visible", tone: "success" })
  return badges.slice(0, ctx.max ?? 3)
}

// Vrai si le bloc n'a aucun contenu publiable (tous les champs vides ou au défaut). Heuristique pure.
export function isBlockEmpty(block: Block): boolean {
  return contentChangedKeys(block).length === 0 &&
    Object.values(block.content as Record<string, string>).every(v => v == null || v === "")
}
