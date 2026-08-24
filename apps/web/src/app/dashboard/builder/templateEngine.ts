// templateEngine.ts — Moteur de composition de templates (plan docs/TEMPLATE-ENGINE-PLAN.md, T1).
// Découple structure(métier) × style(PageTheme) × layout, et compose un template prêt à appliquer
// (mêmes formes que PageTemplate → alimente applyPageTemplate). PUR : aucun React/Supabase, ne
// modifie aucune donnée. ADDITIF : `page-templates.ts` (galerie/builder/IA) reste la source, inchangé ;
// ce module généralise ses briques (thèmes déjà factorisés) et prouve la décomposition.

import { type PageTheme } from "./types"
import { BLOCK_DEFS } from "./blockDefs"
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

// ── Pont galerie (T3.b) : restyler un template de la galerie via le moteur ──────
// La galerie (`dashboard/templates`) liste DEUX familles : (1) 14 modèles curés historiques (clés
// inline `freelance`/`restaurant`/… ABSENTES de TEMPLATE_STRUCTURES) et (2) les 20 PageTemplates
// partagés (clés = structures du moteur). Seuls (2) sont restylables par le moteur ; pour (1) les
// helpers renvoient null/false → l'appelant conserve le thème+blocs legacy (zéro régression).

// Clé de style « natif » d'un template partagé (le thème avec lequel il a été livré), par identité de
// référence : `PAGE_TEMPLATE.theme` pointe sur un `AMBIANCE_THEMES` = `TEMPLATE_STYLES[k].theme`.
export function nativeStyleKeyFor(structureKey: string): string | null {
  const t = PAGE_TEMPLATES.find(p => p.key === structureKey)
  if (!t) return null
  const found = TEMPLATE_STYLE_LIST.find(s => s.theme === t.theme)
  return found ? found.key : null
}

// Un template de galerie est-il restylable par le moteur (⇒ c'est une structure connue) ?
export function isGalleryRestylable(templateId: string): boolean {
  return TEMPLATE_STRUCTURES.some(s => s.key === templateId)
}

// Restyle un template de galerie : renvoie {theme, blocks} pour le style/layout demandés, ou null si
// `templateId` n'est pas une structure connue (⇒ l'appelant garde le legacy). Ne mute rien.
export function galleryRestyle(
  templateId: string, styleKey: string, layoutKey = "default",
): { theme: PageTheme; blocks: TemplateBlock[] } | null {
  const composed = composeByKeys(templateId, styleKey, layoutKey)
  return composed ? { theme: composed.theme, blocks: composed.blocks } : null
}

// ── Restyle UNIVERSEL (T3.b étendu) : marche pour N'IMPORTE quel template de galerie ─────────────
// La galerie possède déjà les blocs de CHAQUE carte (partagée ou « signature » historique). Le moteur
// n'a alors qu'à appliquer un thème (style) + une densité (layout) sur ces blocs. Les templates
// « signature » ont un thème bespoke (hors presets d'ambiance) : on l'expose comme option « original »
// (clé NATIVE_STYLE_KEY) pour le reproduire à l'identique. Ainsi TOUTES les cartes deviennent
// restylables, et le choix par défaut = look d'origine exact ⇒ zéro régression si l'utilisateur n'y
// touche pas. Pur, ne mute rien.
export const NATIVE_STYLE_KEY = "__native"

// Le thème courant correspond-il à un preset d'ambiance (par identité de référence) ?
function ambianceKeyOfTheme(currentTheme: PageTheme | undefined): string | null {
  const found = currentTheme ? TEMPLATE_STYLE_LIST.find(s => s.theme === currentTheme) : undefined
  return found ? found.key : null
}

// Clé de style à présélectionner pour reproduire le look actuel : le preset d'ambiance si le thème en
// est un (cas partagé), sinon la clé « original » (cas signature bespoke).
export function nativeGalleryStyleKey(currentTheme: PageTheme | undefined): string {
  return ambianceKeyOfTheme(currentTheme) ?? NATIVE_STYLE_KEY
}

// Options du sélecteur de style pour une carte de galerie : les 14 ambiances, précédées de l'option
// « original » UNIQUEMENT si le thème courant est bespoke (sinon il est déjà dans la liste).
export function galleryStyleChoices(
  currentTheme: PageTheme | undefined,
): { key: string; label: string; color: string }[] {
  const ambiances = TEMPLATE_STYLE_LIST.map(s => ({ key: s.key, label: s.label, color: s.theme.primary }))
  if (ambianceKeyOfTheme(currentTheme)) return ambiances // partagé : natif déjà présent
  const label = currentTheme?.name ? `${currentTheme.name} (original)` : "Original"
  return [{ key: NATIVE_STYLE_KEY, label, color: currentTheme?.primary ?? "var(--accent)" }, ...ambiances]
}

// Applique style + layout sur des blocs quelconques (structure ad-hoc). `NATIVE_STYLE_KEY` conserve le
// thème bespoke `currentTheme`. Renvoie toujours {theme, blocks} (jamais null : layout inconnu ⇒ défaut).
export function galleryComposeBlocks(
  blocks: TemplateBlock[], currentTheme: PageTheme, styleKey: string, layoutKey = "default",
): { theme: PageTheme; blocks: TemplateBlock[] } {
  const layout = TEMPLATE_LAYOUTS[layoutKey] ?? DEFAULT_LAYOUT
  const base = blocks.map(b => ({ type: b.type, content: { ...b.content } }))
  const outBlocks = layout.transformBlocks ? layout.transformBlocks(base) : base
  const theme = styleKey === NATIVE_STYLE_KEY
    ? currentTheme
    : (TEMPLATE_STYLES[styleKey]?.theme ?? currentTheme)
  return { theme, blocks: outBlocks }
}

// ── Validation (garde-fou : n'utiliser que des types de blocs réels) ────────────
export function unknownBlockTypes(structure: TemplateStructure): string[] {
  return structure.blocks.filter(b => !BLOCK_DEFS[b.type]).map(b => b.type)
}
