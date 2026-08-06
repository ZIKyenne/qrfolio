// templateEngine.ts — Moteur de composition de templates (plan docs/TEMPLATE-ENGINE-PLAN.md, T1).
// Découple structure(métier) × style(PageTheme) × layout, et compose un template prêt à appliquer
// (mêmes formes que PageTemplate → alimente applyPageTemplate). PUR : aucun React/Supabase, ne
// modifie aucune donnée. ADDITIF : `page-templates.ts` (galerie/builder/IA) reste la source, inchangé ;
// ce module généralise ses briques (thèmes déjà factorisés) et prouve la décomposition.

import { BLOCK_DEFS, type PageTheme } from "./types"
import { PAGE_TEMPLATES, AMBIANCE_THEMES, type PageTemplate } from "./page-templates"
import { EXTRA_STRUCTURES } from "./templateStructures.extra"

// ── Types du moteur ───────────────────────────────────────────────────────────
export interface TemplateBlock { type: string; content: Record<string, any> }

/** Structure métier = jeu de blocs ordonné + contenu, SANS thème. */
export interface TemplateStructure {
  key: string
  group: string        // métier, ex. "Restauration"
  label: string        // variante, ex. "Bistrot français"
  emoji: string
  desc: string
  blocks: TemplateBlock[]
}

/** Style = un PageTheme (palette/typo/effets/motion) nommé. */
export interface TemplateStyle {
  key: string
  label: string
  theme: PageTheme
}

/** Layout = modifieurs PURS de disposition (T2 étendra : densité, colonnes, ordre…). */
export interface TemplateLayout {
  key: string
  label: string
  /** Transforme la liste de blocs (identité par défaut). Doit rester pure. */
  transformBlocks?: (blocks: TemplateBlock[]) => TemplateBlock[]
}

/** Résultat composé — même forme utile que PageTemplate (theme + blocks). */
export interface ComposedTemplate {
  key: string
  group: string
  label: string
  emoji: string
  desc: string
  styleKey: string
  layoutKey: string
  theme: PageTheme
  blocks: TemplateBlock[]
}

// ── Registres ─────────────────────────────────────────────────────────────────
// Styles = les thèmes d'ambiance déjà factorisés dans page-templates.ts.
export const TEMPLATE_STYLES: Record<string, TemplateStyle> = Object.fromEntries(
  Object.entries(AMBIANCE_THEMES).map(([key, theme]) => [key, { key, label: theme.name, theme }]),
)
export const TEMPLATE_STYLE_LIST: TemplateStyle[] = Object.values(TEMPLATE_STYLES)

// ── Axe LAYOUT (T2) ─────────────────────────────────────────────────────────
// Modifieurs PURS de disposition. Ils n'écrivent que des clés universelles RÉELLES honorées par le
// renderer (`__space` ∈ BLOCK_SPACE_OPTIONS = "Défaut"/"Compact"/"Aéré"). Aucune donnée métier touchée.
function setDensity(space: string): (bs: TemplateBlock[]) => TemplateBlock[] {
  return bs => bs.map(b => ({ type: b.type, content: { ...b.content, __space: space } }))
}
export const DEFAULT_LAYOUT: TemplateLayout = { key: "default", label: "Standard" }
export const COMPACT_LAYOUT: TemplateLayout = { key: "compact", label: "Compact", transformBlocks: setDensity("Compact") }
export const AIRY_LAYOUT: TemplateLayout = { key: "airy", label: "Aéré", transformBlocks: setDensity("Aéré") }
export const TEMPLATE_LAYOUTS: Record<string, TemplateLayout> = {
  default: DEFAULT_LAYOUT, compact: COMPACT_LAYOUT, airy: AIRY_LAYOUT,
}
export const TEMPLATE_LAYOUT_LIST: TemplateLayout[] = Object.values(TEMPLATE_LAYOUTS)

// Structures dérivées des templates existants (réutilisables avec n'importe quel style).
export function structureFromTemplate(t: PageTemplate): TemplateStructure {
  return { key: t.key, group: t.group, label: t.label, emoji: t.emoji, desc: t.desc, blocks: t.blocks }
}
// Structures = celles dérivées des templates existants (rétrocompat) + les NOUVELLES verticales
// métier ajoutées en données (T5). La galerie legacy reste sur PAGE_TEMPLATES ; ces structures
// alimentent le moteur/composeur (TemplateComposer) sans toucher au flux galerie.
export const TEMPLATE_STRUCTURES: TemplateStructure[] = [
  ...PAGE_TEMPLATES.map(structureFromTemplate),
  ...EXTRA_STRUCTURES,
]

// ── Composition (pure, déterministe) ───────────────────────────────────────────
// Combine structure × style × layout → template prêt à appliquer. Ne mute jamais les entrées
// (contenu cloné). Le thème est renvoyé tel quel (la normalisation reste chez le consommateur,
// ex. /api/templates/use → normalizePageTheme), pour rester fidèle au comportement actuel.
export function composeTemplate(
  structure: TemplateStructure,
  style: TemplateStyle,
  layout: TemplateLayout = DEFAULT_LAYOUT,
): ComposedTemplate {
  const base: TemplateBlock[] = structure.blocks.map(b => ({ type: b.type, content: { ...b.content } }))
  const blocks = layout.transformBlocks ? layout.transformBlocks(base) : base
  const key = layout.key === "default"
    ? `${structure.key}__${style.key}`
    : `${structure.key}__${style.key}__${layout.key}`
  return {
    key,
    group: structure.group,
    label: structure.label,
    emoji: structure.emoji,
    desc: structure.desc,
    styleKey: style.key,
    layoutKey: layout.key,
    theme: style.theme,
    blocks,
  }
}

// Composition par clés (pratique côté galerie/API). Retourne null si une clé est inconnue.
export function composeByKeys(structureKey: string, styleKey: string, layoutKey = "default"): ComposedTemplate | null {
  const structure = TEMPLATE_STRUCTURES.find(s => s.key === structureKey)
  const style = TEMPLATE_STYLES[styleKey]
  const layout = TEMPLATE_LAYOUTS[layoutKey]
  if (!structure || !style || !layout) return null
  return composeTemplate(structure, style, layout)
}

// ── Validation (garde-fou : n'utiliser que des types de blocs réels) ────────────
export function unknownBlockTypes(structure: TemplateStructure): string[] {
  return structure.blocks.filter(b => !BLOCK_DEFS[b.type]).map(b => b.type)
}
