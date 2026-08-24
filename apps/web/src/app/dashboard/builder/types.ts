// QRowg Builder — Types & Definitions

// ── Types de base ─────────────────────────────────────────────────────────────
export type BlockContent = Record<string, string>

export interface Block {
  id: string
  type: string
  content: BlockContent
  visible: boolean
  draft?: boolean
  locked?: boolean
}

export interface PageTheme {
  name: string
  // ── Design tokens couleurs ────────────────────────────────────────────────
  bg: string           // Fond global de la page
  surface: string      // Fond des cartes / blocs
  primary: string      // Couleur primaire (boutons, CTA)
  secondary?: string   // Couleur secondaire
  accent: string       // Accent / highlights
  text: string         // Texte principal
  muted: string        // Texte secondaire / placeholder
  border?: string      // Couleur des bordures
  // ── Typographie ──────────────────────────────────────────────────────────
  fontDisplay: string
  fontBody: string
  // ── Fond ─────────────────────────────────────────────────────────────────
  bgMode: "solid" | "gradient" | "pattern" | "image" | "mesh" | "radial"
  bgGradient?: string
  bgPattern?: string
  bgImage?: string
  // ── Effets visuels (optionnels, utilisés par les presets) ──────────────────
  effect_glow?: boolean
  effect_noise?: boolean
  effect_vignette?: boolean
  glow_color?: string
  glow_intensity?: number
  glow_size?: number
  noise_opacity?: number
  vignette_intensity?: number
  mesh_c1?: string
  mesh_c2?: string
  mesh_c3?: string
  mesh_blur?: number
  pattern_color?: string
  pattern_opacity?: number
  pattern_size?: number
  // ── Style global des blocs ─────────────────────────────────────────────────
  // Défauts hérités par TOUS les blocs (clés réservées __), écrasés par le style propre à chaque bloc.
  // Ex : { __radius: "M", __shadow: "Douce", __glass: true, __anim: "Fondu" }. Absent = aucun style global.
  blockStyle?: Record<string, string | boolean>
  // ── Animation d'entrée (feature Pro+, gatée côté serveur au rendu public) ──
  intro_enabled?: boolean
  intro_style?: string      // "reveal" | "fade" | "curtain" | "pulse" | "ring" | "stack"
  intro_duration?: number   // ms (garde-fou 800–3000 côté builder)
  // ── Preset metadata ───────────────────────────────────────────────────────
  category?: string
  emoji?: string
  tags?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// THÈME DE PAGE — FORMAT UNIFIÉ (source de vérité)
// -----------------------------------------------------------------------------
// • Format CANONIQUE = l'interface PageTheme ci-dessus (camelCase : bg, fontDisplay,
//   bgMode…). C'est le SEUL format manipulé par le Builder et le rendu public.
// • Format de STOCKAGE = identique au canonique (Stratégie A : le JSON `pages.theme`
//   est écrit tel quel). Pas de conversion snake_case ↔ camelCase en base.
// • Compatibilité : `normalizePageTheme` accepte aussi d'anciens formats connus
//   (background/font_display/bg_mode… d'un ancien défaut de création, alias snake_case)
//   et les ramène au canonique À LA LECTURE. Une page ancienne se « migre » d'elle-même
//   à sa prochaine sauvegarde (aucune migration SQL nécessaire).
// • Défaut : `DEFAULT_PAGE_THEME`, UNIQUE source utilisée par la création, le Builder,
//   le rendu public et le normaliseur.
// • Ajouter une propriété : l'ajouter à l'interface PageTheme, à DEFAULT_PAGE_THEME si
//   elle a un défaut, et la préserver dans `normalizePageTheme` (sinon elle sera ignorée).
// -----------------------------------------------------------------------------

export const DEFAULT_PAGE_THEME: PageTheme = {
  name: "Midnight Gold",
  bg: "#080808", surface: "#111009", primary: "#C9A84C", accent: "#39FF8F",
  text: "#F5F0E8", muted: "#A8A190",
  fontDisplay: "Fraunces", fontBody: "DM Sans",
  bgMode: "solid",
}

const BG_MODES = ["solid", "gradient", "pattern", "image", "mesh", "radial"] as const

// Couleur sûre : hex / rgb(a) / hsl(a) / var(--…). Sinon → fallback.
function themeColor(v: any, fallback: string): string {
  if (typeof v !== "string") return fallback
  const s = v.trim()
  if (!s || s.length > 100) return fallback
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s
  if (/^(rgb|hsl)a?\([0-9.,%\s/-]+\)$/i.test(s)) return s
  if (/^var\(--[\w-]+\)$/.test(s)) return s
  return fallback
}
// Couleur optionnelle : renvoie undefined si absente/invalide (ne pose pas de défaut).
function themeColorOpt(v: any): string | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined
  const c = themeColor(v, "")
  return c || undefined
}
// Valeur CSS (gradient/mesh/image) : chaîne bornée, sans vecteur d'injection.
function themeCss(v: any): string | undefined {
  if (typeof v !== "string") return undefined
  const s = v.trim()
  if (!s || s.length > 400) return undefined
  if (/javascript:|<|expression\s*\(/i.test(s)) return undefined
  return s
}
// Nom de police : chaîne courte sans caractères CSS dangereux. Sinon → fallback.
function themeFont(v: any, fallback: string): string {
  if (typeof v !== "string") return fallback
  const s = v.trim()
  if (!s || s.length > 60 || /[<>{};"]/.test(s)) return fallback
  return s
}
function themeNum(v: any): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN
  return isFinite(n) ? n : undefined
}

// Normalise n'importe quelle entrée (canonique, ancien format, JSON, null, invalide…)
// en un PageTheme COMPLET et sûr. Ne lance jamais d'exception sur donnée malformée.
export function normalizePageTheme(input: unknown): PageTheme {
  let raw: any = input
  if (typeof raw === "string") { try { raw = JSON.parse(raw) } catch { raw = null } }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_PAGE_THEME }

  const d = DEFAULT_PAGE_THEME
  // Prend la 1re clé non vide parmi des alias (canonique d'abord, puis formats hérités).
  const pick = (...keys: string[]) => { for (const k of keys) { const v = raw[k]; if (v != null && v !== "") return v } return undefined }

  const bgModeRaw = pick("bgMode", "bg_mode")
  const bgMode = BG_MODES.includes(bgModeRaw) ? bgModeRaw : d.bgMode

  const t: PageTheme = {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : d.name,
    bg: themeColor(pick("bg", "background", "background_color"), d.bg),
    surface: themeColor(pick("surface", "surface_color"), d.surface),
    primary: themeColor(pick("primary", "primary_color"), d.primary),
    accent: themeColor(pick("accent", "accent_color"), d.accent),
    text: themeColor(pick("text", "text_color"), d.text),
    muted: themeColor(pick("muted", "muted_color"), d.muted),
    fontDisplay: themeFont(pick("fontDisplay", "font_display"), d.fontDisplay),
    fontBody: themeFont(pick("fontBody", "font_body", "font_family"), d.fontBody),
    bgMode,
  }

  // ── Optionnels : préservés uniquement si présents ET valides ──────────────
  const secondary = themeColorOpt(pick("secondary", "secondary_color")); if (secondary) t.secondary = secondary
  const border = themeColorOpt(pick("border", "border_color")); if (border) t.border = border
  const bgGradient = themeCss(pick("bgGradient", "bg_gradient")); if (bgGradient) t.bgGradient = bgGradient
  const bgImage = themeCss(pick("bgImage", "bg_image")); if (bgImage) t.bgImage = bgImage
  const bgPattern = pick("bgPattern", "bg_pattern"); if (typeof bgPattern === "string" && bgPattern.length <= 40) t.bgPattern = bgPattern

  // Effets visuels
  if (raw.effect_glow === true) t.effect_glow = true
  if (raw.effect_noise === true) t.effect_noise = true
  if (raw.effect_vignette === true) t.effect_vignette = true
  const glowColor = themeColorOpt(raw.glow_color); if (glowColor) t.glow_color = glowColor
  const glowIntensity = themeNum(raw.glow_intensity); if (glowIntensity !== undefined) t.glow_intensity = Math.max(0, Math.min(100, glowIntensity))
  const glowSize = themeNum(raw.glow_size); if (glowSize !== undefined) t.glow_size = Math.max(0, Math.min(2000, glowSize))
  const noiseOpacity = themeNum(raw.noise_opacity); if (noiseOpacity !== undefined) t.noise_opacity = Math.max(0, Math.min(100, noiseOpacity))
  const vignetteIntensity = themeNum(raw.vignette_intensity); if (vignetteIntensity !== undefined) t.vignette_intensity = Math.max(0, Math.min(100, vignetteIntensity))
  const meshC1 = themeColorOpt(raw.mesh_c1); if (meshC1) t.mesh_c1 = meshC1
  const meshC2 = themeColorOpt(raw.mesh_c2); if (meshC2) t.mesh_c2 = meshC2
  const meshC3 = themeColorOpt(raw.mesh_c3); if (meshC3) t.mesh_c3 = meshC3
  const meshBlur = themeNum(raw.mesh_blur); if (meshBlur !== undefined) t.mesh_blur = Math.max(0, Math.min(500, meshBlur))
  const patternColor = themeColorOpt(raw.pattern_color); if (patternColor) t.pattern_color = patternColor
  const patternOpacity = themeNum(raw.pattern_opacity); if (patternOpacity !== undefined) t.pattern_opacity = Math.max(0, Math.min(100, patternOpacity))
  const patternSize = themeNum(raw.pattern_size); if (patternSize !== undefined) t.pattern_size = Math.max(0, Math.min(500, patternSize))

  // Style global des blocs (Record de string|boolean)
  if (raw.blockStyle && typeof raw.blockStyle === "object" && !Array.isArray(raw.blockStyle)) {
    const bs: Record<string, string | boolean> = {}
    for (const [k, v] of Object.entries(raw.blockStyle)) if (typeof v === "string" || typeof v === "boolean") bs[k] = v
    if (Object.keys(bs).length) t.blockStyle = bs
  }

  // Animation d'entrée
  if (raw.intro_enabled === true) t.intro_enabled = true
  if (typeof raw.intro_style === "string" && raw.intro_style.length <= 40) t.intro_style = raw.intro_style
  const introDuration = themeNum(raw.intro_duration); if (introDuration !== undefined) t.intro_duration = Math.max(0, Math.min(10000, introDuration))

  // Métadonnées de preset
  if (typeof raw.category === "string") t.category = raw.category
  if (typeof raw.emoji === "string") t.emoji = raw.emoji
  if (Array.isArray(raw.tags)) t.tags = raw.tags.filter((x: any) => typeof x === "string")

  return t
}

// Fusionne un patch (préréglage partiel) sur une base, puis normalise le résultat.
export function mergePageTheme(base: unknown, patch: unknown): PageTheme {
  const b = normalizePageTheme(base)
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return b
  return normalizePageTheme({ ...b, ...(patch as object) })
}

// Utilitaires couleurs
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#","").match(/.{2}/g)
  if (!m || m.length < 3) return null
  return { r: parseInt(m[0],16), g: parseInt(m[1],16), b: parseInt(m[2],16) }
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max+min)/2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break
      case g: h = ((b-r)/d + 2)/6; break
      case b: h = ((r-g)/d + 4)/6; break
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) }
}

export function contrastRatio(hex1: string, hex2: string): number {
  function lum(hex: string) {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0
    const { r, g, b } = rgb
    const [R,G,B] = [r,g,b].map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4) })
    return 0.2126*R + 0.7152*G + 0.0722*B
  }
  const l1 = lum(hex1), l2 = lum(hex2)
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)
}

export function wcagLevel(ratio: number): "AAA" | "AA" | "fail" {
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  return "fail"
}

// Formes en découpe (clip-path) : le contour/glow doit passer par filter:drop-shadow, pas box-shadow.
export function isClipShape(shape?: string): boolean {
  return shape === "hexagone" || shape === "diamant"
}

// Fond de l'avatar quand il n'y a pas de photo (initiales). Partagé éditeur ↔ page publique.
export function avatarBgStyle(kind: string | undefined, c1: string, c2: string): Record<string, string> {
  switch (kind) {
    case "uni":  return { background: c1 }
    case "halo": return { background: `radial-gradient(circle at 50% 32%, ${c2}, ${c1})` }
    case "mesh": return { background: `radial-gradient(circle at 18% 20%, ${c1}, transparent 60%), radial-gradient(circle at 82% 72%, ${c2}, transparent 60%), ${c1}` }
    default:     return { background: `linear-gradient(135deg, ${c1}, ${c2})` } // dégradé
  }
}

// Contour + glow + ombre d'un avatar (partagé éditeur ↔ page publique). Gère clip-path via drop-shadow.
export function avatarDecoStyle(shape: string | undefined, borderKind: string | undefined, shadowKind: string | undefined, accent: string): Record<string, string> {
  const clip = isClipShape(shape)
  // 1) Contour + lueur
  let border = clip ? "" : `3px solid ${accent}55`, glowColor = `${accent}30`, glowPx = 9
  switch (borderKind) {
    case "aucun":    border = "none"; glowColor = ""; break
    case "or":       border = clip ? "" : "3px solid #D4AF37"; glowColor = "rgba(212,175,55,0.45)"; glowPx = 10; break
    case "neon":     border = clip ? "" : `2px solid ${accent}`; glowColor = accent; glowPx = 13; break
    case "lumineux": border = clip ? "" : "2px solid rgba(255,255,255,0.55)"; glowColor = "rgba(255,255,255,0.5)"; glowPx = 11; break
  }
  if (clip && border !== "none") border = ""
  if (!clip && glowColor) glowColor = borderKind === "neon" ? `${accent}66` : glowColor // glow un peu plus doux en box-shadow
  // 2) Ombre de profondeur
  const depth = shadowKind === "douce" ? "0 6px 16px rgba(0,0,0,0.25)"
    : shadowKind === "profonde" ? "0 14px 30px rgba(0,0,0,0.5)"
    : shadowKind === "flottante" ? "0 22px 40px rgba(0,0,0,0.45)" : ""
  const out: Record<string, string> = {}
  if (border) out.border = border
  else if (borderKind === "aucun") out.border = "none"
  if (clip) {
    const f: string[] = []
    if (glowColor) f.push(`drop-shadow(0 0 ${glowPx}px ${glowColor})`)
    if (depth) f.push(`drop-shadow(${depth})`)
    if (f.length) out.filter = f.join(" ")
  } else {
    const s: string[] = []
    if (glowColor) s.push(`0 0 ${glowPx + 4}px ${glowColor}`)
    if (depth) s.push(depth)
    if (s.length) out.boxShadow = s.join(", ")
  }
  return out
}

// Forme d'un avatar (source unique partagée éditeur ↔ page publique).
export function avatarShapeStyle(shape?: string): Record<string, string | number> {
  switch (shape) {
    case "carré":    return { borderRadius: "8%" }
    case "arrondi":  return { borderRadius: "22%" }
    case "squircle": return { borderRadius: "32%" }
    case "hexagone": return { clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", borderRadius: "0" }
    case "diamant":  return { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", borderRadius: "0" }
    default:         return { borderRadius: "50%" } // cercle
  }
}

// Style de fond d'une page selon son bgMode + effets.
// Source unique partagée éditeur (aperçu) ↔ page publique pour garantir le WYSIWYG.
// Dégradés nommés pour le studio de bannière (parité builder <-> public)
export const BANNER_GRADIENTS: Record<string, [string, string, number]> = {
  or_nuit: ["#C9A84C", "#1a1206", 135],
  aurore: ["#7c3aed", "#ec4899", 135],
  ocean: ["#0ea5e9", "#1e3a8a", 135],
  coucher: ["#f97316", "#be123c", 135],
  violet: ["#8b5cf6", "#4c1d95", 135],
  menthe: ["#39FF8F", "#065f46", 135],
  corail: ["#fb7185", "#f43f5e", 135],
}

// Style de fond d'une bannière (image / gradient / color) — partagé builder & public
export function bannerBackgroundStyle(c: any, accent = "#C9A84C"): Record<string, string> {
  const type = c.banner_type || (c.src ? "image" : "gradient")
  if (type === "color") return { background: c.bg_color || "#1a1a1a" }
  if (type === "gradient") {
    if (c.grad_preset === "personnalise") {
      return { background: `linear-gradient(135deg, ${c.grad_c1 || accent}, ${c.grad_c2 || "#1a1206"})` }
    }
    const g = BANNER_GRADIENTS[c.grad_preset as string] || BANNER_GRADIENTS.or_nuit
    return { background: `linear-gradient(${g[2]}deg, ${g[0]}, ${g[1]})` }
  }
  return {} // image géré par une balise <img> séparée
}

// Hauteur d'une bannière : slider en px prioritaire, sinon fallback sur les presets sm/md/lg/xl
export function bannerHeight(c: any, base: "editor" | "public" = "public"): number {
  const px = parseInt(c.height_px)
  if (px && px >= 40) return px
  const map: Record<string, [number, number]> = { sm: [70, 120], md: [100, 180], lg: [140, 260], xl: [180, 340] }
  const [ed, pub] = map[c.height as string] || map.md
  return base === "editor" ? ed : pub
}

// Style de l'image de bannière : cadrage (focus rapide OU position précise x/y) + zoom.
// Parité builder <-> public. Le conteneur doit être en overflow:hidden.
export function bannerImageStyle(c: any): Record<string, any> {
  const zoom = Math.max(1, parseFloat(c.img_zoom) || 1)
  const hasPos = c.img_pos_x !== undefined && c.img_pos_x !== "" && c.img_pos_x !== null
  let objectPosition: string
  let px = 50, py = 50
  if (hasPos) {
    px = Math.min(100, Math.max(0, parseFloat(c.img_pos_x)))
    py = (c.img_pos_y !== undefined && c.img_pos_y !== "" && c.img_pos_y !== null) ? Math.min(100, Math.max(0, parseFloat(c.img_pos_y))) : 50
    objectPosition = `${px}% ${py}%`
  } else {
    objectPosition = c.img_focus === "top" ? "center top" : c.img_focus === "bottom" ? "center bottom" : "center"
    py = c.img_focus === "top" ? 0 : c.img_focus === "bottom" ? 100 : 50
  }
  const st: Record<string, any> = { objectFit: "cover", objectPosition, transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: `${px}% ${py}%` }
  const f: string[] = []
  const br = parseInt(c.img_brightness); if (br && br !== 100) f.push(`brightness(${br}%)`)
  const co = parseInt(c.img_contrast); if (co && co !== 100) f.push(`contrast(${co}%)`)
  const sa = parseInt(c.img_saturate); if ((c.img_saturate !== undefined && c.img_saturate !== "") && sa !== 100) f.push(`saturate(${sa}%)`)
  const gr = parseInt(c.img_grayscale); if (gr) f.push(`grayscale(${gr}%)`)
  const se = parseInt(c.img_sepia); if (se) f.push(`sepia(${se}%)`)
  const bl = parseFloat(c.img_blur); if (bl) f.push(`blur(${bl}px)`)
  if (f.length) st.filter = f.join(" ")
  return st
}

// Filtres image prédéfinis : appliquent plusieurs valeurs d'un coup
export const BANNER_IMG_FILTERS: { key: string; label: string; v: Record<string, string> }[] = [
  { key: "none", label: "Aucun", v: { img_brightness: "100", img_contrast: "100", img_saturate: "100", img_grayscale: "0", img_sepia: "0" } },
  { key: "nb", label: "N&B", v: { img_grayscale: "100", img_contrast: "108", img_saturate: "100", img_sepia: "0", img_brightness: "100" } },
  { key: "vintage", label: "Vintage", v: { img_sepia: "38", img_contrast: "110", img_saturate: "88", img_brightness: "104", img_grayscale: "0" } },
  { key: "vif", label: "Vif", v: { img_saturate: "155", img_contrast: "116", img_brightness: "102", img_grayscale: "0", img_sepia: "0" } },
  { key: "doux", label: "Doux", v: { img_saturate: "92", img_contrast: "94", img_brightness: "106", img_grayscale: "0", img_sepia: "8" } },
  { key: "chaud", label: "Chaud", v: { img_sepia: "22", img_saturate: "120", img_brightness: "103", img_contrast: "104", img_grayscale: "0" } },
]

// Typographie du titre de bannière (parité builder <-> public). Polices déjà chargées côté public.
export const BANNER_FONTS: Record<string, string> = {
  serif: "Fraunces, serif",
  sans: "DM Sans, sans-serif",
  display: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
}
export function bannerTitleStyle(c: any, base: "editor" | "public", color: string, fontDisplay: string): Record<string, any> {
  const fam = c.title_font && c.title_font !== "auto" ? (BANNER_FONTS[c.title_font as string] || fontDisplay) : fontDisplay
  const size = parseInt(c.title_size) || (base === "editor" ? 16 : 24)
  const weight = parseInt(c.title_weight) || 700
  const track = (c.title_tracking !== undefined && c.title_tracking !== "") ? parseFloat(c.title_tracking) : 0
  const st: Record<string, any> = { color, fontFamily: fam, fontSize: size, fontWeight: weight, letterSpacing: track, margin: 0, lineHeight: 1.15 }
  if (c.title_transform && c.title_transform !== "none") st.textTransform = c.title_transform
  const eff = c.title_effect
  if (eff === "glow") st.textShadow = `0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.5)`
  else if (eff === "outline") { st.WebkitTextStroke = "1px rgba(0,0,0,0.55)"; st.textShadow = "0 1px 3px rgba(0,0,0,0.4)" }
  else if (eff === "none") st.textShadow = "none"
  else st.textShadow = "0 2px 8px rgba(0,0,0,0.5)" // défaut : lisibilité
  return st
}

// Animations de bannière (parité builder <-> public). Classe sur le conteneur : `qfb qfb-<anim>`.
// Éléments enfants : .qfb-media (image/dégradé), .qfb-content (texte), .qfb-shine (reflet shimmer).
export const BANNER_ANIM_CSS = `
@keyframes qfbKen{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.14) translate(-2.5%,-2.5%)}}
@keyframes qfbZoom{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes qfbShimmer{0%{transform:translateX(-130%) skewX(-12deg)}100%{transform:translateX(130%) skewX(-12deg)}}
@keyframes qfbFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes qfbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes qfbPulse{0%,100%{opacity:.82}50%{opacity:1}}
@keyframes qfbAurora{0%{transform:translate(-8%,-6%) rotate(0deg) scale(1.1)}100%{transform:translate(8%,6%) rotate(24deg) scale(1.25)}}
.qfb-aurora-layer{animation:qfbAurora 14s ease-in-out infinite alternate}
.qfb-kenburns .qfb-media{animation:qfbKen 20s ease-in-out infinite alternate;transform-origin:center}
.qfb-zoom .qfb-media{animation:qfbZoom 10s ease-in-out infinite}
.qfb-gradient_flow .qfb-media{background-size:220% 220%!important;animation:qfbFlow 9s linear infinite}
.qfb-shimmer .qfb-shine{position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.28) 50%,transparent 65%);animation:qfbShimmer 3.8s ease-in-out infinite;pointer-events:none}
.qfb-floating .qfb-content{animation:qfbFloat 5.5s ease-in-out infinite}
.qfb-pulse .qfb-content{animation:qfbPulse 3.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.qfb-media,.qfb-content,.qfb-shine,.qfb-aurora-layer{animation:none!important}}
`

// Texture de grain cinématographique (SVG inline, aucune requête réseau)
export const BANNER_NOISE_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

// Calques d'overlay d'une bannière (parité builder <-> public). Empilés sur le média.
// fx : verre / grain / mesh / aurora ; voile de lisibilité ; teinte couleur + mode de fusion.
export function bannerOverlayLayers(c: any, accent = "#C9A84C"): { className?: string; style: Record<string, any> }[] {
  const layers: { className?: string; style: Record<string, any> }[] = []
  const abs = { position: "absolute" as const, inset: 0 }
  const fx = c.fx_overlay
  if (fx === "glass") layers.push({ style: { ...abs, backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", background: "linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)" } })
  else if (fx === "noise") layers.push({ style: { ...abs, backgroundImage: `url("${BANNER_NOISE_URL}")`, opacity: 0.14, mixBlendMode: "overlay" } })
  else if (fx === "mesh") layers.push({ style: { ...abs, background: `radial-gradient(at 18% 20%, ${accent}66, transparent 48%),radial-gradient(at 82% 12%, #9146FF55, transparent 50%),radial-gradient(at 55% 92%, #38BDF855, transparent 55%)`, mixBlendMode: "screen" } })
  else if (fx === "aurora") layers.push({ className: "qfb-aurora-layer", style: { position: "absolute", inset: "-35%", background: "linear-gradient(120deg,rgba(57,255,143,0.28),rgba(145,70,255,0.22),rgba(56,189,248,0.26))", filter: "blur(26px)", mixBlendMode: "screen" } })
  const voile = c.overlay_gradient === "bottom" ? "linear-gradient(to top, rgba(0,0,0,0.55), transparent 65%)"
    : c.overlay_gradient === "full" ? "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.15))" : null
  if (voile) layers.push({ style: { ...abs, background: voile } })
  if (c.overlay_color && parseFloat(c.overlay_opacity || "0") > 0) layers.push({ style: { ...abs, background: c.overlay_color, opacity: parseFloat(c.overlay_opacity || "0.3"), mixBlendMode: c.blend_mode && c.blend_mode !== "normal" ? c.blend_mode : undefined } })
  return layers
}

// Cadre & ombre du bloc bannière (parité builder <-> public).
// Retourne le boxShadow du conteneur + un calque de bordure (ligne/dégradé) posé par-dessus.
export function bannerFrame(c: any, accent: string, radius: string | number): { boxShadow?: string; borderLayer?: { style: Record<string, any> } } {
  const shadows: string[] = []
  const bs = c.block_shadow
  if (bs === "soft") shadows.push("0 10px 30px rgba(0,0,0,0.35)")
  else if (bs === "strong") shadows.push("0 20px 50px rgba(0,0,0,0.55)")
  else if (bs === "glow") shadows.push(`0 8px 40px ${accent}55`)
  const bb = c.block_border
  if (bb === "glow") shadows.push(`0 0 0 1.5px ${accent}, 0 0 22px ${accent}66`)
  const boxShadow = shadows.length ? shadows.join(", ") : undefined
  const bc = c.border_color || accent
  let borderLayer: { style: Record<string, any> } | undefined
  if (bb === "line") borderLayer = { style: { position: "absolute", inset: 0, border: `1.5px solid ${bc}`, borderRadius: radius, pointerEvents: "none" } }
  else if (bb === "gradient") borderLayer = { style: { position: "absolute", inset: 0, borderRadius: radius, border: "2px solid transparent", background: `linear-gradient(#0000,#0000) padding-box, linear-gradient(135deg, ${bc}, ${accent}44) border-box`, pointerEvents: "none" } }
  return { boxShadow, borderLayer }
}

// Style d'un badge de profil selon son libellé (parité builder <-> public).
// Colore automatiquement les badges connus (Vérifié, Premium, Éco…) et ajoute une icône si absente.
export function profileBadgeStyle(label: string, accent: string): { color: string; bg: string; border: string; icon: string } {
  const l = (label || "").toLowerCase()
  const map: { kw: string[]; color: string; icon: string }[] = [
    { kw: ["vérifié", "verifie", "verified"], color: "#38BDF8", icon: "✓" },
    { kw: ["premium"], color: "#C9A84C", icon: "👑" },
    { kw: ["certifié", "certifie", "certified"], color: "#39FF8F", icon: "✓" },
    { kw: ["éco", "eco-", "responsable"], color: "#39FF8F", icon: "🌿" },
    { kw: ["france", "local"], color: "#EF4444", icon: "📍" },
    { kw: ["populaire", "top "], color: "#F97316", icon: "🔥" },
    { kw: ["nouveau", "new"], color: "#39FF8F", icon: "✨" },
    { kw: ["rapide", "24h", "réponse", "reponse"], color: "#38BDF8", icon: "⚡" },
    { kw: ["recommand"], color: "#C9A84C", icon: "★" },
    { kw: ["partenaire", "partner"], color: "#9146FF", icon: "🤝" },
    { kw: ["créateur", "createur", "creator"], color: "#EC4899", icon: "🎨" },
    { kw: ["disponible", "ouvert"], color: "#39FF8F", icon: "🟢" },
    { kw: ["expert"], color: "#C9A84C", icon: "🎯" },
    { kw: ["pro"], color: "#C9A84C", icon: "" },
  ]
  const found = map.find(m => m.kw.some(k => l.includes(k)))
  const color = found?.color || accent
  const first = (label || "").trim().codePointAt(0) || 0
  const hasSymbol = first > 0x2000 // le libellé commence déjà par une icône / symbole
  const icon = (found?.icon && !hasSymbol) ? found.icon : ""
  return { color, bg: `${color}16`, border: `${color}33`, icon }
}

// Téléphone : normalisation pour liens tel: et wa.me (parité builder <-> public, testé).
// countryCode = indicatif pays saisi (ex "33"). Si le numéro est déjà international (+…) on le respecte.
export function normalizePhoneDigits(raw?: string, countryCode?: string): string {
  const src = (raw || "").trim()
  if (!src) return ""
  const hasPlus = src.startsWith("+")
  const digits = src.replace(/\D/g, "")
  if (!digits) return ""
  if (hasPlus) return digits // l'utilisateur a saisi l'international complet
  const cc = (countryCode || "").replace(/\D/g, "")
  if (cc) {
    if (digits.startsWith(cc)) return digits
    return cc + digits.replace(/^0+/, "") // retire le 0 national avant l'indicatif
  }
  return digits
}
export function waLink(phone?: string, message?: string, countryCode?: string): string {
  const d = normalizePhoneDigits(phone, countryCode)
  if (!d) return ""
  return `https://wa.me/${d}${message ? `?text=${encodeURIComponent(message)}` : ""}`
}
// Styles prédéfinis de bouton d'action (parité builder <-> public). Le dégradé animé utilise une classe.
export const CTA_ANIM_CSS = "@keyframes qctaFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}.qcta-flow{background-size:220% 220%!important;animation:qctaFlow 4s linear infinite}@media (prefers-reduced-motion:reduce){.qcta-flow{animation:none!important}}"
export const CTA_STYLE_OPTIONS = ["gold", "luxe", "neon", "glass", "gradient", "outline", "ghost", "dark", "white", "red"]
export function ctaButtonStyle(style: string | undefined, opt: { G: string; accent?: string; text?: string }): { style: Record<string, any>; className?: string } {
  const G = opt.G, acc = opt.accent || "#39FF8F", text = opt.text || "#F5F0E8"
  const map: Record<string, { style: Record<string, any>; className?: string }> = {
    gold: { style: { background: `linear-gradient(90deg,${G},${G}cc)`, color: "#080808", border: "none", boxShadow: `0 4px 20px ${G}35` } },
    luxe: { style: { background: "#0b0b0f", color: G, border: `1.5px solid ${G}`, boxShadow: `inset 0 0 0 1px ${G}22, 0 4px 18px rgba(0,0,0,0.5)` } },
    neon: { style: { background: `${acc}12`, border: `1.5px solid ${acc}`, color: acc, boxShadow: `0 0 18px ${acc}40` } },
    glass: { style: { background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: text } },
    gradient: { className: "qcta-flow", style: { background: `linear-gradient(90deg,${G},${acc},${G})`, color: "#080808", border: "none", boxShadow: `0 4px 20px ${G}30` } },
    outline: { style: { background: "transparent", border: `2px solid ${G}`, color: G } },
    ghost: { style: { background: "rgba(255,255,255,0.06)", color: text, border: "1px solid rgba(255,255,255,0.1)" } },
    dark: { style: { background: "#141414", color: text, border: "1px solid rgba(255,255,255,0.12)" } },
    white: { style: { background: "#ffffff", color: "#080808", border: "none", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" } },
    red: { style: { background: "rgba(239,68,68,0.12)", border: "1.5px solid #EF4444", color: "#EF4444" } },
  }
  return map[style || "gold"] || map.gold
}

// Résout une action de la barre flottante -> lien + icône + libellé (parité builder <-> public, testé).
export function stickyActionHref(type?: string, value?: string): { href?: string; share?: boolean; icon: string; label: string; color: string } {
  const v = (value || "").trim()
  switch (type) {
    case "call": return { href: telLink(v), icon: "📞", label: "Appeler", color: "#39FF8F" }
    case "whatsapp": return { href: waLink(v, undefined, "33"), icon: "💬", label: "WhatsApp", color: "#25D366" }
    case "directions": return { href: directionsLink(v), icon: "🧭", label: "Itinéraire", color: "#4285F4" }
    case "email": return { href: v ? `mailto:${v}` : "", icon: "✉️", label: "Email", color: "#38BDF8" }
    case "reserve": return { href: extHref(v), icon: "📅", label: "Réserver", color: "#C9A84C" }
    case "menu": return { href: extHref(v), icon: "📖", label: "Menu", color: "#F97316" }
    case "pay": return { href: extHref(v), icon: "💳", label: "Payer", color: "#39FF8F" }
    case "link": return { href: extHref(v), icon: "🔗", label: "Lien", color: "#C9A84C" }
    case "share": return { share: true, icon: "↗", label: "Partager", color: "#C9A84C" }
    default: return { icon: "", label: "", color: "#C9A84C" }
  }
}

// Lien d'itinéraire vers une adresse (parité builder <-> public, testé).
export function directionsLink(address?: string, provider?: string): string {
  const enc = encodeURIComponent((address || "").trim())
  if (!enc) return ""
  switch (provider) {
    case "apple": return `https://maps.apple.com/?daddr=${enc}`
    case "waze": return `https://waze.com/ul?q=${enc}&navigate=yes`
    default: return `https://www.google.com/maps/dir/?api=1&destination=${enc}` // google / auto
  }
}
// Transforme un lien vidéo (YouTube/Vimeo/Dailymotion, toutes formes) en URL d'intégration propre.
export function embedVideoUrl(raw?: string): string {
  const u = (raw || "").trim()
  if (!u) return ""
  // youtube-nocookie.com : lecteur identique mais sans cookie de tracking avant lecture (RGPD).
  // Frontière d'hôte (début / `//` du schéma / sous-domaine `.`) : refuse les domaines
  // ressemblants (evil-youtube.com, youtube.com.evil.com, youtu.be.evil.com…).
  let m = u.match(/(?:^|\/\/|\.)(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([\w-]+)/i)
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`
  m = u.match(/(?:^|\/\/|\.)(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return `https://player.vimeo.com/video/${m[1]}`
  m = u.match(/(?:^|\/\/|\.)(?:dailymotion\.com\/video|dai\.ly)\/([\w]+)/i)
  if (m) return `https://www.dailymotion.com/embed/video/${m[1]}`
  // Sécurité (B09.11) : aucun repli sur l'URL brute — une URL non reconnue ne doit JAMAIS
  // atteindre un iframe.src (sinon iframe arbitraire / domaine ressemblant / phishing).
  return ""
}

// Extrait l'ID d'une video YouTube (watch, youtu.be, shorts, embed, live) en ignorant les
// parametres (?si=, &t=...). Pour les vignettes img.youtube.com/vi/ID/... -> "" si non trouve.
export function youtubeId(url?: string): string {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([\w-]+)/)
  return m ? m[1] : ""
}
export function telLink(phone?: string): string {
  const raw = (phone || "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`
}

// Style d'un badge produit (Nouveau, Promo, Signature, Épuisé…) selon son libellé. Parité builder <-> public.
export function productBadgeStyle(label: string, accent: string): { color: string; fg: string; icon: string } {
  const l = (label || "").toLowerCase()
  const map: { kw: string[]; color: string; icon: string }[] = [
    { kw: ["promo", "solde", "réduction", "reduction"], color: "#EF4444", icon: "🏷️" },
    { kw: ["nouveau", "new "], color: "#39FF8F", icon: "✨" },
    { kw: ["populaire", "best", "meilleur"], color: "#F97316", icon: "🔥" },
    { kw: ["signature", "coup de c"], color: "#C9A84C", icon: "⭐" },
    { kw: ["épuisé", "epuise", "rupture", "complet"], color: "#A8A190", icon: "⛔" },
    { kw: ["bientôt", "bientot"], color: "#38BDF8", icon: "⏳" },
    { kw: ["limité", "limite", "dernièr", "dernier", "stock"], color: "#F97316", icon: "⏰" },
    { kw: ["fait maison", "maison"], color: "#FBBF24", icon: "🏠" },
    { kw: ["local"], color: "#39FF8F", icon: "📍" },
    { kw: ["bio", "vegan", "végan"], color: "#39FF8F", icon: "🌿" },
    { kw: ["offre"], color: "#EF4444", icon: "⚡" },
  ]
  const found = map.find(m => m.kw.some(k => l.includes(k)))
  const color = found?.color || accent
  const first = (label || "").trim().codePointAt(0) || 0
  const icon = (found?.icon && first < 0x2000) ? found.icon : ""
  const fg = (color === "#A8A190" || color === "#EF4444") ? "#fff" : "#080808"
  return { color, fg, icon }
}

// Extrait la valeur numerique d'un prix ecrit librement : "29,90 €", "$29", "1 299.00€",
// "29.9", "gratuit" -> nombre ou null. Gere separateur decimal , ou . et espaces/milliers.
export function parsePrice(raw?: string): number | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  if (/(gratuit|offert|free|sur devis|nous consulter)/.test(s)) return null
  // Retire tout sauf chiffres, virgule, point. On garde le dernier separateur comme decimal.
  let cleaned = s.replace(/[^0-9.,]/g, "")
  if (!cleaned) return null
  const decPos = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."))
  if (decPos >= 0) {
    const intPart = cleaned.slice(0, decPos).replace(/[.,]/g, "")
    const decPart = cleaned.slice(decPos + 1).replace(/[.,]/g, "")
    // Un dernier separateur suivi de 3 chiffres = separateur de milliers (ex "1,299"),
    // sinon c'est le separateur decimal (ex "29,90" ou "1 299,00").
    cleaned = decPart.length === 3 ? intPart + decPart : intPart + "." + decPart
  } else {
    cleaned = cleaned.replace(/[.,]/g, "")
  }
  const n = parseFloat(cleaned)
  return isFinite(n) ? n : null
}

// Calcule la reduction entre un prix courant et un ancien prix (tous deux ecrits librement).
// Renvoie le pourcentage arrondi (-XX%) et l'economie formatee, ou null si non applicable
// (ancien prix absent/<=  prix, valeurs non numeriques, devises differentes).
export function priceDiscount(price?: string, oldPrice?: string): { percent: number; label: string; saved: string } | null {
  const now = parsePrice(price)
  const was = parsePrice(oldPrice)
  if (now === null || was === null) return null
  if (was <= now || now < 0) return null
  const percent = Math.round((1 - now / was) * 100)
  if (percent <= 0 || percent >= 100) return null
  // Suffixe de devise repris de l'ancien prix (ex "€", "$", " USD") pour l'economie.
  const suffix = (String(oldPrice).match(/[^\d\s.,]+\s*$/)?.[0] || "").trim()
  const savedNum = Math.round((was - now) * 100) / 100
  const savedStr = Number.isInteger(savedNum) ? String(savedNum) : savedNum.toFixed(2).replace(".", ",")
  return { percent, label: `-${percent}%`, saved: suffix ? `${savedStr}${/^[€$£]/.test(suffix) ? "" : " "}${suffix}` : savedStr }
}

// Decompose le temps restant jusqu'a une echeance en jours/heures/minutes/secondes.
// Pur et testable : le now est injecte par l'appelant (Date.now() cote UI).
// targetMs NaN (aucune date) -> non expire, zeros. targetMs depasse -> expired.
export function countdownParts(targetMs: number, nowMs: number): { days: number; hours: number; mins: number; secs: number; expired: boolean; totalMs: number } {
  if (!isFinite(targetMs)) return { days: 0, hours: 0, mins: 0, secs: 0, expired: false, totalMs: NaN }
  const diff = targetMs - nowMs
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true, totalMs: 0 }
  const s = Math.floor(diff / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
    expired: false,
    totalMs: diff,
  }
}

// Statut de stock a partir d'un champ libre (entier). Vide/non numerique -> null (rien affiche).
// 0 ou moins -> epuise (CTA a griser). 1..seuil -> rarete (urgence). > seuil -> en stock (rassurance).
export function stockStatus(raw?: string, lowThreshold = 5): { state: "out" | "low" | "in"; label: string; color: string; soldOut: boolean } | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null
  const n = parseInt(String(raw).replace(/[^0-9-]/g, ""), 10)
  if (!isFinite(n)) return null
  if (n <= 0) return { state: "out", label: "Epuise", color: "#A8A190", soldOut: true }
  if (n <= lowThreshold) return { state: "low", label: `Plus que ${n} en stock`, color: "#F97316", soldOut: false }
  return { state: "in", label: "En stock", color: "#39FF8F", soldOut: false }
}

// Paiement direct : couleurs/icones de marque + mode de saisie (URL vs pseudo).
// handleBased = l'utilisateur saisit juste son pseudo, on construit l'URL.
export const PAYMENT_BRANDS: Record<string, { color: string; icon: string; label: string; handleBased: boolean }> = {
  Stripe:  { color: "#635BFF", icon: "💳", label: "Stripe",  handleBased: false },
  PayPal:  { color: "#009CDE", icon: "🅿️", label: "PayPal",  handleBased: true },
  Lydia:   { color: "#0068FF", icon: "💸", label: "Lydia",   handleBased: false },
  Revolut: { color: "#0666EB", icon: "🔷", label: "Revolut", handleBased: true },
  SumUp:   { color: "#1E3A8A", icon: "🧾", label: "SumUp",   handleBased: false },
}
export function paymentBrand(platform?: string): { color: string; icon: string; label: string; handleBased: boolean } {
  return PAYMENT_BRANDS[platform || "Stripe"] || PAYMENT_BRANDS.Stripe
}

// Construit le lien de paiement final. Priorite a l'URL collee ; sinon, pour les
// plateformes a pseudo (PayPal.me, Revolut.me), on assemble l'URL depuis le handle
// (+ montant pour PayPal). Renvoie "" si rien d'exploitable.
export function paymentLink(c: { platform?: string; url?: string; handle?: string; amount?: string }): string {
  const url = (c?.url || "").trim()
  if (/^https?:\/\//i.test(url)) return url
  const handle = (c?.handle || "").trim().replace(/^@/, "").replace(/\s+/g, "")
  if (!handle) return ""
  const platform = c?.platform || "Stripe"
  if (platform === "PayPal") {
    const amt = parsePrice(c?.amount)
    return `https://paypal.me/${handle}${amt !== null ? "/" + amt : ""}`
  }
  if (platform === "Revolut") return `https://revolut.me/${handle}`
  return ""
}

// Rangee d'etoiles precise : renvoie `max` fractions de remplissage (0..1) par etoile.
// Ex : starRow(4.9) -> [1,1,1,1,0.9] ; starRow("3,5") -> [1,1,1,0.5,0]. Accepte virgule ou point.
export function starRow(score: number | string | undefined | null, max = 5): number[] {
  const raw = typeof score === "number" ? score : parseFloat(String(score ?? "").replace(",", "."))
  const val = isFinite(raw) ? Math.max(0, Math.min(max, raw)) : 0
  return Array.from({ length: max }, (_, i) => Math.max(0, Math.min(1, val - i)))
}

// ── Horaires d'ouverture : statut "ouvert / ferme" calcule en direct ─────────
// Minutes depuis minuit -> "9h" / "18h30". 0..1439.
export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60), mn = m % 60
  return mn === 0 ? `${h}h` : `${h}h${String(mn).padStart(2, "0")}`
}

// Parse un horaire libre en minutes depuis minuit. "9h", "9h30", "9:30", "18h00", "9.30" -> nb.
// Renvoie null si non exploitable.
function parseTime(raw: string): number | null {
  const m = raw.trim().match(/(\d{1,2})\s*[h:.]?\s*(\d{2})?/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mn = m[2] ? parseInt(m[2], 10) : 0
  if (h > 23 || mn > 59) return null
  return h * 60 + mn
}

// Parse un champ jour ("9h - 18h", "9h-12h, 14h-18h", "Ferme") en plages {start,end} (minutes).
// Gere plusieurs plages (coupure) et separateurs -,–,à,to ; end<=start (nuit) -> +24h ignore ici.
export function parseHourRanges(text?: string): { start: number; end: number }[] {
  const s = (text || "").trim()
  if (!s || /(ferm|closed|repos)/i.test(s)) return []
  const ranges: { start: number; end: number }[] = []
  for (const part of s.split(/[,;&]|\bet\b/i)) {
    const seg = part.split(/\s*(?:-|–|—|à|to)\s*/i)
    if (seg.length < 2) continue
    const start = parseTime(seg[0]), end = parseTime(seg[1])
    if (start === null || end === null || end <= start) continue
    ranges.push({ start, end })
  }
  return ranges
}

// Clés jour par jour (index JS getDay : 0=dimanche) + libellés FR.
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
export const DAY_LABELS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
export const DAY_LABELS_FR_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

// Horaires bruts d'un jour donné (0=dim). Priorité au mode jour-par-jour (mon/tue/…),
// repli sur le mode simple hérité (mon_fri / saturday / sunday). undefined = pas d'info.
export function dayField(c: any, day: number): string | undefined {
  const perDay = c?.[DAY_KEYS[day]]
  const hasAnyPerDay = DAY_KEYS.some(k => c?.[k] && String(c[k]).trim())
  if (hasAnyPerDay) return perDay && String(perDay).trim() ? String(perDay) : undefined
  if (day === 0) return c?.sunday
  if (day === 6) return c?.saturday
  return c?.mon_fri
}

// Statut d'ouverture au moment `now`. Supporte le mode jour-par-jour ET le mode simple hérité.
// Gère : ouvert, ferme bientôt (<= 30 min), fermé/ouvre à X aujourd'hui, ouvre demain / tel jour.
// Renvoie { open, label, color } ou null si aucune info pour aujourd'hui. `now` injectable (testabilité).
export function openStatus(
  c: { mon_fri?: string; saturday?: string; sunday?: string; mon?: string; tue?: string; wed?: string; thu?: string; fri?: string; sat?: string; sun?: string },
  now: Date
): { open: boolean; label: string; color: string } | null {
  const day = now.getDay() // 0=dim, 6=sam
  const field = dayField(c, day)
  if (!field || !field.trim()) return null // pas d'info pour aujourd'hui -> pas de badge
  const ranges = parseHourRanges(field)
  const mins = now.getHours() * 60 + now.getMinutes()

  const current = ranges.find(r => mins >= r.start && mins < r.end)
  if (current) {
    if (current.end - mins <= 30) return { open: true, label: `Ferme bientôt · à ${fmtMinutes(current.end)}`, color: "#FBBF24" }
    return { open: true, label: `Ouvert · ferme à ${fmtMinutes(current.end)}`, color: "#39FF8F" }
  }
  // Fermé : prochaine ouverture aujourd'hui ?
  const next = ranges.filter(r => r.start > mins).sort((a, b) => a.start - b.start)[0]
  if (next) {
    return { open: false, label: `Fermé · ouvre à ${fmtMinutes(next.start)}`, color: "#EF4444" }
  }
  // Sinon : chercher la prochaine ouverture sur les 7 jours suivants.
  for (let i = 1; i <= 7; i++) {
    const d2 = (day + i) % 7
    const r2 = parseHourRanges(dayField(c, d2)).sort((a, b) => a.start - b.start)
    if (r2.length) {
      const when = i === 1 ? "demain" : DAY_LABELS_FR[d2]
      return { open: false, label: `Fermé · ouvre ${when} à ${fmtMinutes(r2[0].start)}`, color: "#EF4444" }
    }
  }
  return { open: false, label: "Fermé", color: "#EF4444" }
}

// ── vCard (fiche contact .vcf) conforme RFC 6350 / 2426 ──────────────────────
// Echappe les caracteres reserves d'une valeur vCard : \ , ; et retours ligne.
export function vcardEscape(v: string): string {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

// Separe un nom complet en prenom(s) / nom pour le champ structure N.
export function splitName(full?: string): { given: string; family: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { given: "", family: "" }
  if (parts.length === 1) return { given: parts[0], family: "" }
  return { given: parts.slice(0, -1).join(" "), family: parts[parts.length - 1] }
}

// Genere une vCard 3.0 valide (CRLF, FN obligatoire, N, ORG, TEL/EMAIL types, URL, ADR).
export function buildVCard(d: { name?: string; phone?: string; email?: string; company?: string; website?: string; address?: string; title?: string }): string {
  const name = (d.name || "").trim()
  const fn = name || (d.company || "").trim() || "Contact"
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vcardEscape(fn)}`]
  if (name) {
    const { given, family } = splitName(name)
    lines.push(`N:${vcardEscape(family)};${vcardEscape(given)};;;`)
  }
  if (d.company) lines.push(`ORG:${vcardEscape(d.company)}`)
  if (d.title)   lines.push(`TITLE:${vcardEscape(d.title)}`)
  if (d.phone)   lines.push(`TEL;TYPE=CELL:${vcardEscape(d.phone)}`)
  if (d.email)   lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(d.email)}`)
  if (d.website) lines.push(`URL:${vcardEscape(d.website)}`)
  if (d.address) lines.push(`ADR;TYPE=WORK:;;${vcardEscape(d.address)};;;;`)
  lines.push("END:VCARD")
  return lines.join("\r\n")
}

// URL d'iframe Google Maps. Priorite a une URL embed personnalisee (pb=...) ; sinon
// on construit une carte interactive depuis l'adresse SANS cle API (output=embed).
// Renvoie "" si rien d'exploitable.
export function mapEmbedUrl(address?: string, embedUrl?: string, zoom?: string): string {
  const custom = (embedUrl || "").trim()
  // Sécurité (B09.11) : un embed personnalisé n'est accepté QUE s'il provient d'un domaine
  // Google Maps (https, hôte google.<tld>, chemin /maps). Toute autre URL (iframe arbitraire,
  // faux domaine « google.com.evil.com », schéma dangereux) est ignorée → repli sur l'adresse.
  if (/^https:\/\/(?:www\.|maps\.)?google\.[a-z.]{2,7}\/maps[/?]/i.test(custom)) return custom
  const enc = encodeURIComponent((address || "").trim())
  if (!enc) return ""
  const z = /^\d{1,2}$/.test(String(zoom || "")) ? String(zoom) : "15"
  return `https://maps.google.com/maps?q=${enc}&z=${z}&output=embed`
}

// URL d'embed Spotify robuste : detecte type + id depuis une URL (gere le prefixe de
// locale /intl-fr/ tres courant, les parametres, l'URI spotify:...) ou une URL d'embed deja
// prete. Renvoie "" si rien d'exploitable. Le type est deduit de l'URL (pas d'un champ a part).
export function spotifyEmbedUrl(url?: string): string {
  const u = (url || "").trim()
  if (!u) return ""
  if (/open\.spotify\.com\/embed\//i.test(u)) return u // deja un embed
  const web = u.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i)
  if (web) return `https://open.spotify.com/embed/${web[1].toLowerCase()}/${web[2]}?utm_source=generator&theme=0`
  const uri = u.match(/spotify:(track|album|playlist|artist|episode|show):([a-zA-Z0-9]+)/i)
  if (uri) return `https://open.spotify.com/embed/${uri[1].toLowerCase()}/${uri[2]}?utm_source=generator&theme=0`
  return ""
}

// ── Ajouter au calendrier : Google Agenda + fichier .ics (Apple/Outlook/tous) ──
// Convertit "2025-06-15T19:00[:00]" (ou date seule) en tampon calendrier "20250615T190000"
// en HEURE FLOTTANTE (aucun decalage de fuseau -> l'evenement s'affiche a l'heure saisie).
export function toCalStamp(raw?: string): string | null {
  const t = (raw || "").trim()
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (m) return `${m[1]}${m[2]}${m[3]}T${m[4].padStart(2, "0")}${m[5]}${m[6] || "00"}`
  const d = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (d) return `${d[1]}${d[2]}${d[3]}T090000` // date seule -> 9h par defaut
  return null
}

// Ajoute des heures a un tampon calendrier (gere les debordements jour/mois). Reste flottant.
function addHoursToStamp(stamp: string, hours: number): string {
  const m = stamp.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (!m) return stamp
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
  d.setUTCHours(d.getUTCHours() + hours)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

// Renvoie un lien Google Agenda + un data-URI .ics a partir des champs d'evenement.
// null si la date de debut n'est pas exploitable.
export function calendarLinks(e: { name?: string; start?: string; end?: string; location?: string; description?: string }): { google: string; ics: string } | null {
  const start = toCalStamp(e.start)
  if (!start) return null
  const end = toCalStamp(e.end) || addHoursToStamp(start, 1) // defaut : +1h
  const name = (e.name || "Événement").trim()

  const params = new URLSearchParams({ action: "TEMPLATE", text: name, dates: `${start}/${end}` })
  if (e.location) params.set("location", e.location)
  if (e.description) params.set("details", e.description)
  const google = `https://calendar.google.com/calendar/render?${params.toString()}`

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QRowg//Calendar//FR", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${start}-qrowg@qrowg.com`,
    `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${vcardEscape(name)}`,
    e.location ? `LOCATION:${vcardEscape(e.location)}` : "",
    e.description ? `DESCRIPTION:${vcardEscape(e.description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean)
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`
  return { google, ics }
}

// ── Partage : liens de partage par reseau a partir d'une URL (+ texte optionnel) ─
export type ShareTarget = { key: string; label: string; icon: string; color: string; href: string }
// Ajoute utm_source/utm_medium a l'URL partagee pour l'attribution analytics
// (WhatsApp/Telegram effacent le referrer -> sans utm, les partages tombent en "direct").
function withUtm(url: string, source: string): string {
  if (!url) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}utm_source=${source}&utm_medium=share`
}
export function shareLinks(url: string, text = ""): ShareTarget[] {
  const t = encodeURIComponent(text || "")
  const enc = (source: string) => encodeURIComponent(withUtm(url || "", source))
  return [
    { key: "whatsapp", label: "WhatsApp", icon: "🟢", color: "#25D366", href: `https://wa.me/?text=${t ? t + "%20" : ""}${enc("whatsapp")}` },
    { key: "facebook", label: "Facebook", icon: "🔵", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${enc("facebook")}` },
    { key: "x",        label: "X",        icon: "✖️", color: "#000000", href: `https://twitter.com/intent/tweet?url=${enc("x")}${t ? "&text=" + t : ""}` },
    { key: "linkedin", label: "LinkedIn", icon: "🔗", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc("linkedin")}` },
    { key: "telegram", label: "Telegram", icon: "✈️", color: "#26A5E4", href: `https://t.me/share/url?url=${enc("telegram")}${t ? "&text=" + t : ""}` },
    { key: "email",    label: "Email",    icon: "✉️", color: "#A8A190", href: `mailto:?subject=${t}&body=${enc("email")}` },
  ]
}

// Statuts de disponibilité (parité builder <-> public). Couleur personnalisable via dot_color.
export const AVAILABILITY_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "available", label: "Disponible", color: "#39FF8F" },
  { key: "busy", label: "En mission", color: "#F97316" },
  { key: "appointment", label: "Sur rendez-vous", color: "#38BDF8" },
  { key: "full", label: "Complet ce mois-ci", color: "#F97316" },
  { key: "hiring", label: "Je recrute", color: "#39FF8F" },
  { key: "collab", label: "Ouvert aux collaborations", color: "#C9A84C" },
  { key: "booking", label: "Ouvert aux réservations", color: "#39FF8F" },
  { key: "tour", label: "En tournée", color: "#9146FF" },
  { key: "works", label: "En travaux", color: "#FBBF24" },
  { key: "fast_reply", label: "Réponse sous 24h", color: "#38BDF8" },
  { key: "temp_closed", label: "Fermé temporairement", color: "#EF4444" },
  { key: "closed", label: "Indisponible", color: "#EF4444" },
]
export function availabilityStatus(status?: string, customColor?: string): { color: string; label: string; bg: string; border: string } {
  const found = AVAILABILITY_STATUSES.find(s => s.key === status) || AVAILABILITY_STATUSES[0]
  const color = (customColor && /^#([0-9a-fA-F]{6})$/.test(customColor)) ? customColor : found.color
  return { color, label: found.label, bg: `${color}14`, border: `${color}40` }
}
export const SOCIAL_URL_TEMPLATES: Record<string, string> = {
  instagram: "https://instagram.com/", tiktok: "https://tiktok.com/@", youtube: "https://youtube.com/@",
  twitch: "https://twitch.tv/", discord: "https://discord.gg/", facebook: "https://facebook.com/",
  linkedin: "https://linkedin.com/in/", twitter: "https://x.com/", threads: "https://threads.net/@",
  spotify: "https://open.spotify.com/artist/", apple_music: "https://music.apple.com/", deezer: "https://deezer.com/",
  soundcloud: "https://soundcloud.com/", bandcamp: "https://bandcamp.com/", github: "https://github.com/",
  behance: "https://behance.net/", dribbble: "https://dribbble.com/", whatsapp: "https://wa.me/", email: "mailto:",
}

// Garantit un lien externe cliquable : prefixe https:// si l'utilisateur a oublie le protocole
// (ex "www.site.com", "site.com/x"). Laisse intacts http/mailto/tel, les ancres et les chemins
// relatifs. Idempotent -> sans effet sur une URL deja valide. Evite les liens relatifs casses.
export function extHref(url?: string): string {
  const u = (url || "").trim()
  if (!u || u === "#") return u
  if (/^(https?:\/\/|mailto:|tel:|sms:|\/|#)/i.test(u)) return u
  return `https://${u.replace(/^\/+/, "")}`
}

// Normalise ce que l'utilisateur saisit pour un reseau en URL cliquable valide :
//  - URL complete (http/mailto/tel) -> telle quelle
//  - domaine sans protocole ("instagram.com/jean", "www.x.com") -> prefixe https://
//  - pseudo ("jean", "@jean") -> modele du reseau (SOCIAL_URL_TEMPLATES) + pseudo
// Evite les liens casses quand l'utilisateur oublie https:// ou tape juste son pseudo.
export function socialHref(key: string, value?: string): string {
  const v = (value || "").trim()
  if (!v) return ""
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v
  if (/^www\./i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v)) return `https://${v.replace(/^\/+/, "")}`
  const tpl = SOCIAL_URL_TEMPLATES[key]
  return tpl ? tpl + v.replace(/^@+/, "") : `https://${v}`
}

// Modèles Réseaux par métier : un clic crée un bloc "Liens sociaux" pré-rempli.
export const SOCIAL_PRESETS: { key: string; label: string; emoji: string; networks: string[] }[] = [
  { key: "createur", label: "Créateur de contenu", emoji: "✨", networks: ["tiktok", "instagram", "youtube", "twitch", "discord"] },
  { key: "artiste", label: "Artiste / Musicien", emoji: "🎤", networks: ["spotify", "apple_music", "deezer", "soundcloud", "youtube", "instagram"] },
  { key: "restaurant", label: "Restaurant / Bar", emoji: "🍽️", networks: ["instagram", "tiktok", "facebook", "whatsapp"] },
  { key: "immobilier", label: "Immobilier", emoji: "🏡", networks: ["linkedin", "instagram", "facebook", "whatsapp"] },
  { key: "coach", label: "Coach / Formation", emoji: "🎓", networks: ["linkedin", "instagram", "youtube"] },
  { key: "entreprise", label: "Entreprise", emoji: "🏢", networks: ["linkedin", "youtube", "email"] },
  { key: "freelance", label: "Freelance / Portfolio", emoji: "💼", networks: ["linkedin", "github", "behance", "dribbble"] },
  { key: "evenement", label: "Événement", emoji: "🎫", networks: ["instagram", "tiktok", "facebook"] },
]
export function themeBackgroundStyle(theme: PageTheme): Record<string, string | number> {
  const t = theme as any
  if (t.bgMode === "pattern") {
    const patSize = t.pattern_size || 20
    const patOpacity = t.pattern_opacity ?? 0.15
    const patColor = t.pattern_color || "#C9A84C"
    const c = patColor + Math.round(patOpacity * 255).toString(16).padStart(2, "0")
    let bgImg: string
    switch (t.bgPattern || "dots") {
      case "grid":      bgImg = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; break
      case "lines":     bgImg = `linear-gradient(0deg, ${c} 1px, transparent 1px)`; break
      case "diagonals": bgImg = `linear-gradient(45deg, ${c} 1px, transparent 1px)`; break
      case "hexagons":  bgImg = `radial-gradient(circle, ${c} 2px, transparent 2px)`; break
      case "circles":   bgImg = `radial-gradient(circle, transparent ${patSize * 0.3}px, ${c} ${patSize * 0.3}px, ${c} ${patSize * 0.32}px, transparent ${patSize * 0.32}px)`; break
      case "zigzag":    bgImg = `linear-gradient(135deg, ${c} 25%, transparent 25%), linear-gradient(225deg, ${c} 25%, transparent 25%)`; break
      default:          bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`
    }
    return { background: theme.bg, backgroundImage: bgImg, backgroundSize: `${patSize}px ${patSize}px` }
  }
  if (t.bgMode === "radial") {
    return { background: t.bgGradient || `radial-gradient(circle at 50% 50%, ${theme.primary}, ${theme.bg})` }
  }
  if (t.bgMode === "mesh") {
    const c1 = t.mesh_c1 || "#C9A84C", c2 = t.mesh_c2 || "#39FF8F", c3 = t.mesh_c3 || "#7B2FBE"
    return { background: `radial-gradient(ellipse at 10% 20%, ${c1}90, transparent 55%), radial-gradient(ellipse at 90% 80%, ${c2}90, transparent 55%), radial-gradient(ellipse at 80% 10%, ${c3}70, transparent 55%), ${theme.bg}` }
  }
  if (t.bgMode === "image" && t.bgImage) {
    return { backgroundImage: `url(${t.bgImage})`, backgroundSize: t.bgImageSize || "cover", backgroundPosition: "center" }
  }
  return { background: theme.bgGradient || theme.bg }
}

// ── Catégories de presets ─────────────────────────────────────────────────────
export const PRESET_CATEGORIES = [
  { id: "Minimal",      icon: "◻️", color: "#A8A190" },
  { id: "Business",     icon: "💼", color: "#3B82F6" },
  { id: "Luxury",       icon: "💎", color: "#C9A84C" },
  { id: "Creator",      icon: "🎨", color: "#EC4899" },
  { id: "Startup",      icon: "🚀", color: "#8B5CF6" },
  { id: "Restaurant",   icon: "🍽️", color: "#F97316" },
  { id: "Immobilier",   icon: "🏠", color: "#10B981" },
  { id: "Fitness",      icon: "💪", color: "#EF4444" },
  { id: "Event",        icon: "🎉", color: "#F59E0B" },
  { id: "Music",        icon: "🎵", color: "#1DB954" },
  { id: "Portfolio",        icon: "📐", color: "#6366F1" },
  { id: "QRowg Signature", icon: "✦",  color: "#C9A84C" },
] as const

// ── 50+ Google Fonts ──────────────────────────────────────────────────────────
export const GOOGLE_FONTS = [
  // Serif display
  "Fraunces", "Playfair Display", "Lora", "Merriweather", "EB Garamond",
  "Libre Baskerville", "Crimson Text", "DM Serif Display", "Spectral", "Bitter",
  // Sans-serif moderne
  "DM Sans", "Inter", "Outfit", "Plus Jakarta Sans", "Nunito",
  "Poppins", "Raleway", "Montserrat", "Work Sans", "Mulish",
  // Display / Titre
  "Syne", "Space Grotesk", "Manrope", "Bricolage Grotesque", "Cabinet Grotesk",
  "Clash Display", "Unbounded", "Epilogue", "Oswald", "Barlow Condensed",
  // Mono
  "JetBrains Mono", "Fira Code", "Space Mono", "Roboto Mono", "IBM Plex Mono",
  // Handwriting / Script
  "Dancing Script", "Pacifico", "Caveat", "Sacramento", "Great Vibes",
  "Kaushan Script", "Satisfy", "Lobster",
  // Fun / Unique
  "Abril Fatface", "Righteous", "Russo One", "Bangers", "Bebas Neue",
  "Anton", "Black Han Sans", "Fredoka One",
]
export const SOCIAL_NETWORKS = [
  // Réseaux sociaux
  { key: "instagram", label: "Instagram", icon: "📸", color: "#E1306C", group: "social" },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "#F5F0E8", group: "social" },
  { key: "facebook", label: "Facebook", icon: "👥", color: "#1877F2", group: "social" },
  { key: "linkedin", label: "LinkedIn", icon: "💼", color: "#0A66C2", group: "social" },
  { key: "twitter", label: "X / Twitter", icon: "🐦", color: "#1DA1F2", group: "social" },
  { key: "threads", label: "Threads", icon: "🧵", color: "#F5F0E8", group: "social" },
  { key: "bluesky", label: "Bluesky", icon: "🦋", color: "#0085FF", group: "social" },
  { key: "mastodon", label: "Mastodon", icon: "🐘", color: "#6364FF", group: "social" },
  { key: "pinterest", label: "Pinterest", icon: "📌", color: "#E60023", group: "social" },
  { key: "snapchat", label: "Snapchat", icon: "👻", color: "#FFFC00", group: "social" },
  { key: "reddit", label: "Reddit", icon: "🤖", color: "#FF4500", group: "social" },
  // Vidéo & Streaming
  { key: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000", group: "video" },
  { key: "vimeo", label: "Vimeo", icon: "🎬", color: "#1AB7EA", group: "video" },
  { key: "dailymotion", label: "Dailymotion", icon: "📹", color: "#003F6C", group: "video" },
  { key: "twitch", label: "Twitch", icon: "🎮", color: "#9146FF", group: "video" },
  { key: "kick", label: "Kick", icon: "🟢", color: "#53FC18", group: "video" },
  { key: "rumble", label: "Rumble", icon: "📺", color: "#85C742", group: "video" },
  // Messagerie
  { key: "whatsapp", label: "WhatsApp", icon: "💬", color: "#25D366", group: "messaging" },
  { key: "telegram", label: "Telegram", icon: "✈️", color: "#26A5E4", group: "messaging" },
  { key: "discord", label: "Discord", icon: "🎮", color: "#5865F2", group: "messaging" },
  { key: "signal", label: "Signal", icon: "🔒", color: "#3A76F0", group: "messaging" },
  { key: "messenger", label: "Messenger", icon: "💬", color: "#0084FF", group: "messaging" },
  { key: "skype", label: "Skype", icon: "📞", color: "#00AFF0", group: "messaging" },
  { key: "wechat", label: "WeChat", icon: "💚", color: "#07C160", group: "messaging" },
  { key: "line", label: "Line", icon: "🟢", color: "#00B900", group: "messaging" },
  { key: "viber", label: "Viber", icon: "📱", color: "#7360F2", group: "messaging" },
  // Musique
  { key: "spotify", label: "Spotify", icon: "🎧", color: "#1DB954", group: "music" },
  { key: "apple_music", label: "Apple Music", icon: "🍎", color: "#FC3C44", group: "music" },
  { key: "deezer", label: "Deezer", icon: "🎶", color: "#A238FF", group: "music" },
  { key: "soundcloud", label: "SoundCloud", icon: "☁️", color: "#FF5500", group: "music" },
  { key: "bandcamp", label: "Bandcamp", icon: "🎸", color: "#1DA0C3", group: "music" },
  { key: "audiomack", label: "Audiomack", icon: "🎵", color: "#FFA200", group: "music" },
  { key: "tidal", label: "Tidal", icon: "🌊", color: "#00FFFF", group: "music" },
  { key: "amazon_music", label: "Amazon Music", icon: "🎵", color: "#00A8E1", group: "music" },
  { key: "youtube_music", label: "YouTube Music", icon: "▶️", color: "#FF0000", group: "music" },
  // Podcast
  { key: "spotify_podcast", label: "Spotify Podcasts", icon: "🎙️", color: "#1DB954", group: "podcast" },
  { key: "apple_podcast", label: "Apple Podcasts", icon: "🎙️", color: "#B150E2", group: "podcast" },
  { key: "podcast_addict", label: "Podcast Addict", icon: "🎧", color: "#F4842B", group: "podcast" },
  { key: "pocket_casts", label: "Pocket Casts", icon: "📻", color: "#F43E37", group: "podcast" },
  { key: "castbox", label: "Castbox", icon: "📦", color: "#F55B23", group: "podcast" },
  { key: "overcast", label: "Overcast", icon: "🌤️", color: "#FC7E0F", group: "podcast" },
  // Développeurs
  { key: "github", label: "GitHub", icon: "💻", color: "#F5F0E8", group: "dev" },
  { key: "gitlab", label: "GitLab", icon: "🦊", color: "#FC6D26", group: "dev" },
  { key: "bitbucket", label: "Bitbucket", icon: "🪣", color: "#0052CC", group: "dev" },
  { key: "stackoverflow", label: "Stack Overflow", icon: "📚", color: "#F58025", group: "dev" },
  { key: "devto", label: "Dev.to", icon: "💡", color: "#F5F0E8", group: "dev" },
  { key: "hashnode", label: "Hashnode", icon: "✏️", color: "#2962FF", group: "dev" },
  { key: "codepen", label: "CodePen", icon: "🖊️", color: "#F5F0E8", group: "dev" },
  // Design & Créatifs
  { key: "behance", label: "Behance", icon: "🎨", color: "#1769FF", group: "creative" },
  { key: "dribbble", label: "Dribbble", icon: "🏀", color: "#EA4C89", group: "creative" },
  { key: "artstation", label: "ArtStation", icon: "🎭", color: "#13AFF0", group: "creative" },
  { key: "deviantart", label: "DeviantArt", icon: "🎪", color: "#05CC47", group: "creative" },
  { key: "pixiv", label: "Pixiv", icon: "🖼️", color: "#0096FA", group: "creative" },
  { key: "flickr", label: "Flickr", icon: "📷", color: "#FF0084", group: "creative" },
  // Freelance
  { key: "malt", label: "Malt", icon: "🌾", color: "#FF5C57", group: "freelance" },
  { key: "fiverr", label: "Fiverr", icon: "💚", color: "#1DBF73", group: "freelance" },
  { key: "upwork", label: "Upwork", icon: "💼", color: "#14A800", group: "freelance" },
  { key: "comeup", label: "ComeUp", icon: "🚀", color: "#7C3AED", group: "freelance" },
  { key: "freelancer", label: "Freelancer.com", icon: "🖊️", color: "#29B2FE", group: "freelance" },
  // E-commerce
  { key: "shopify", label: "Shopify", icon: "🛍️", color: "#96BF48", group: "ecommerce" },
  { key: "etsy", label: "Etsy", icon: "🧶", color: "#F56400", group: "ecommerce" },
  { key: "amazon_store", label: "Amazon Store", icon: "📦", color: "#FF9900", group: "ecommerce" },
  { key: "vinted", label: "Vinted", icon: "👗", color: "#09B1BA", group: "ecommerce" },
  { key: "leboncoin", label: "Leboncoin", icon: "🏷️", color: "#F56B2A", group: "ecommerce" },
  // Paiement & Soutien
  { key: "paypal", label: "PayPal", icon: "💙", color: "#009CDE", group: "payment" },
  { key: "kofi", label: "Ko-fi", icon: "☕", color: "#FF5E5B", group: "payment" },
  { key: "buymeacoffee", label: "Buy Me A Coffee", icon: "☕", color: "#FFDD00", group: "payment" },
  { key: "patreon", label: "Patreon", icon: "🎨", color: "#FF424D", group: "payment" },
  { key: "tipeee", label: "Tipeee", icon: "💜", color: "#E55100", group: "payment" },
  // Restaurant & Local
  { key: "google_business", label: "Google Business", icon: "📍", color: "#4285F4", group: "local" },
  { key: "tripadvisor", label: "Tripadvisor", icon: "🦉", color: "#34E0A1", group: "local" },
  { key: "thefork", label: "TheFork", icon: "🍽️", color: "#00B183", group: "local" },
  { key: "airbnb", label: "Airbnb", icon: "🏠", color: "#FF5A5F", group: "local" },
  // Liens génériques
  { key: "website", label: "Site web", icon: "🌐", color: "#C9A84C", group: "generic" },
  { key: "blog", label: "Blog", icon: "✏️", color: "#C9A84C", group: "generic" },
  { key: "portfolio", label: "Portfolio", icon: "🗂️", color: "#C9A84C", group: "generic" },
  { key: "email", label: "Email", icon: "✉️", color: "#39FF8F", group: "generic" },
  { key: "phone", label: "Téléphone", icon: "📞", color: "#4ADE80", group: "generic" },
]

// Map réseau -> { icon, color, label } dérivée de la liste ci-dessus.
// Source unique de vérité : garantit que TOUS les réseaux de l'éditeur s'affichent aussi en public.
export const SOCIAL_NETWORKS_MAP: Record<string, { icon: string; color: string; label: string }> =
  Object.fromEntries(SOCIAL_NETWORKS.map(n => [n.key, { icon: n.icon, color: n.color, label: n.label }]))

// Libellés FR affichés pour les valeurs de select techniques (héritées, en anglais).
// AFFICHAGE UNIQUEMENT : la valeur stockée reste inchangée (aucune migration, aucune régression).
export const OPTION_LABELS: Record<string, string> = {
  // Tailles
  xs: "Très petit", sm: "Petit", md: "Moyen", lg: "Grand", xl: "Très grand",
  small: "Petit", medium: "Moyen", large: "Grand", normal: "Normal",
  // Alignements
  left: "Gauche", center: "Centré", right: "Droite", justify: "Justifié",
  // Couleurs sémantiques
  default: "Défaut", primary: "Principale", accent: "Accent", muted: "Discrète",
  // Types d'annonce / statut
  warning: "Attention", info: "Information", success: "Succès", promo: "Promo", error: "Erreur", danger: "Urgent",
  // Oui / Non
  yes: "Oui", no: "Non",
  // Dispositions
  list: "Liste", grid: "Grille", cards: "Cartes", carousel: "Carrousel", columns: "Colonnes",
  // Styles de bouton / séparateur
  outline: "Contour", solid: "Plein", ghost: "Discret", gold: "Or", line: "Ligne", dots: "Points", stars: "Étoiles",
}

// Libellé FR d'une option de select (repli sur la valeur brute si non traduite).
export function optionLabel(value: string): string {
  return OPTION_LABELS[value] ?? value
}

// ── Documents : types + icônes (bloc bibliothèque) ────────────────────────────
export const DOC_TYPES = ["PDF", "Menu", "Brochure", "Notice", "Catalogue", "Guide", "Tarifs", "Contrat / CGV", "Autre"]

// Icône + couleur associées à un type de document (pur, testé).
export function docTypeMeta(type?: string): { icon: string; color: string } {
  switch ((type || "").trim().toLowerCase()) {
    case "menu":          return { icon: "🍽️", color: "#F97316" }
    case "brochure":      return { icon: "📘", color: "#3B82F6" }
    case "notice":        return { icon: "📋", color: "#8B5CF6" }
    case "catalogue":     return { icon: "📚", color: "#EC4899" }
    case "guide":         return { icon: "📖", color: "#10B981" }
    case "tarifs":        return { icon: "💶", color: "#C9A84C" }
    case "contrat / cgv":
    case "contrat":
    case "cgv":           return { icon: "📝", color: "#64748B" }
    case "autre":         return { icon: "📎", color: "#A8A190" }
    case "pdf":
    default:              return { icon: "📄", color: "#EF4444" }
  }
}

// Libellé du bouton d'action selon le type (consultation vs téléchargement).
export function docActionLabel(type?: string): string {
  const t = (type || "").trim().toLowerCase()
  return (t === "menu" || t === "catalogue" || t === "autre") ? "Consulter" : "Télécharger"
}

// ── Annonce / Alerte : icône + couleur automatiques selon le type (pur, testé) ─
// Couleurs lisibles mais volontairement douces (jamais agressives) — l'opacité est appliquée au rendu.
export const ANNOUNCEMENT_TYPES = ["Information", "Succès", "Attention", "Urgent", "Promo"]
export function announcementMeta(type?: string): { icon: string; color: string; label: string } {
  switch ((type || "").trim().toLowerCase()) {
    case "info": case "information":       return { icon: "ℹ️", color: "#38BDF8", label: "Information" }
    case "success": case "succès": case "succes": return { icon: "✅", color: "#39FF8F", label: "Succès" }
    case "urgent": case "urgence":         return { icon: "🚨", color: "#EF4444", label: "Urgent" }
    case "promo":                          return { icon: "🎉", color: "#C9A84C", label: "Promo" }
    case "warning": case "attention": default: return { icon: "⚠️", color: "#FBBF24", label: "Attention" }
  }
}

// ── Apparence par bloc (système de style universel, opt-in) ───────────────────
// Dégradés nommés réutilisables pour le fond d'un bloc.
export const BLOCK_GRADIENTS: Record<string, string> = {
  "Or nuit":    "linear-gradient(135deg,#1c1608,#0a0a0a)",
  "Océan":      "linear-gradient(135deg,#0c4a6e,#082f49)",
  "Nuit bleue": "linear-gradient(135deg,#0f172a,#020617)",
  "Sunset":     "linear-gradient(135deg,#7c2d12,#431407)",
  "Cuivre":     "linear-gradient(135deg,#3a2410,#170d04)",
  "Violet":     "linear-gradient(135deg,#4c1d95,#2e1065)",
  "Menthe":     "linear-gradient(135deg,#065f46,#022c22)",
  "Émeraude":   "linear-gradient(135deg,#134e4a,#042f2e)",
  "Rose":       "linear-gradient(135deg,#831843,#4a044e)",
  "Bordeaux":   "linear-gradient(135deg,#4a0e1a,#1a0508)",
  "Ardoise":    "linear-gradient(135deg,#1e293b,#0f172a)",
  "Charbon":    "linear-gradient(135deg,#1a1a1d,#0a0a0a)",
}
export const BLOCK_RADIUS_OPTIONS = ["Défaut", "S", "M", "L", "XL"]
export const BLOCK_SHADOW_OPTIONS = ["Non", "Douce", "Forte"]
export const BLOCK_SPACE_OPTIONS = ["Défaut", "Compact", "Aéré"]
export const BLOCK_WIDTH_OPTIONS = ["Normale", "Étroite"]
export const BLOCK_ANIM_OPTIONS = ["Aucune", "Fondu", "Glissé ↑", "Glissé ↓", "Glissé ←", "Glissé →", "Zoom avant", "Zoom arrière", "Rotation", "Flou", "Bascule"]
export const BLOCK_ANIM_SPEED_OPTIONS = ["Normal", "Lent", "Rapide"]
export const BLOCK_HOVER_OPTIONS = ["Aucun", "Élévation", "Zoom", "Lueur"]
export const BLOCK_LOOP_OPTIONS = ["Aucune", "Flottement", "Pulsation", "Battement"]
export const BLOCK_INTENSITY_OPTIONS = ["Plein", "Moyen", "Léger"]

export function blockDecoration(
  content: any,
  theme: { primary?: string; accent?: string; bg?: string; blockStyle?: Record<string, any> }
): { style: Record<string, any>; animClass: string } {
  // Style global des blocs : les défauts du thème remplissent les clés __ que le bloc ne définit pas.
  // Le style propre au bloc prime toujours. Inerte si aucun défaut global n'est posé.
  const own = content || {}
  const gs = theme?.blockStyle && typeof theme.blockStyle === "object" ? theme.blockStyle : null
  let c: any = own
  if (gs) {
    c = {}
    for (const k in gs) if (k.charCodeAt(0) === 95 && k.charCodeAt(1) === 95) c[k] = gs[k]  // que les clés réservées __
    for (const k in own) c[k] = own[k]
  }
  const g = theme?.primary || "#C9A84C"
  const style: Record<string, any> = {}
  let surface = false

  // Intensité : superpose une couche du fond de page pour adoucir le fond du bloc (jamais agressif),
  // sans jamais toucher l'opacité du CONTENU. Calcul paresseux : rien pour un bloc inerte.
  const ovAlpha = c.__intensity === "Léger" ? 0.62 : c.__intensity === "Moyen" ? 0.34 : 0

  const grad = c.__grad && c.__grad !== "Aucun" ? BLOCK_GRADIENTS[c.__grad] : null
  if (grad) {
    if (ovAlpha > 0) {
      const bgRgb = hexToRgb(theme?.bg || "#080808") || { r: 8, g: 8, b: 8 }
      const overlay = `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${ovAlpha})`
      style.background = `linear-gradient(0deg, ${overlay}, ${overlay}), ${grad}`
    } else {
      style.background = grad
    }
    surface = true
  } else if (c.__bg && String(c.__bg).trim()) {
    const raw = String(c.__bg).trim()
    // Normalise le hex court (#abc -> #aabbcc) pour que l'intensité s'applique aussi.
    const hex6 = /^#[0-9a-fA-F]{3}$/.test(raw) ? "#" + raw.slice(1).split("").map(ch => ch + ch).join("") : raw
    const alphaHex = c.__intensity === "Léger" ? "9e" : c.__intensity === "Moyen" ? "d9" : ""
    style.background = (alphaHex && /^#[0-9a-fA-F]{6}$/.test(hex6)) ? hex6 + alphaHex : raw
    surface = true
  }

  if (c.__border === "Oui") { style.border = `1px solid ${g}33`; surface = true }
  else if (typeof c.__border === "string" && c.__border.startsWith("#")) { style.border = `1px solid ${c.__border}`; surface = true }

  const radMap: Record<string, number> = { S: 10, M: 16, L: 22, XL: 30 }
  if (c.__radius && radMap[c.__radius]) { style.borderRadius = radMap[c.__radius]; surface = true }

  if (c.__shadow === "Douce") { style.boxShadow = "0 6px 22px rgba(0,0,0,0.28)"; surface = true }
  else if (c.__shadow === "Forte") { style.boxShadow = "0 16px 44px rgba(0,0,0,0.48)"; surface = true }

  if (c.__glow === "Oui") {
    const glow = `0 0 26px ${g}44`
    style.boxShadow = style.boxShadow ? `${style.boxShadow}, ${glow}` : glow
    surface = true
  }

  if (c.__glass === "Oui") {
    if (!style.background) style.background = "rgba(255,255,255,0.06)"
    style.backdropFilter = "blur(12px)"
    ;(style as any).WebkitBackdropFilter = "blur(12px)"
    if (!style.border) style.border = "1px solid rgba(255,255,255,0.12)"
    surface = true
  }

  // Dès qu'une surface est active : on insère le bloc (marge latérale) et on arrondit par défaut.
  if (surface) {
    style.marginLeft = 14
    style.marginRight = 14
    style.overflow = "hidden"
    if (style.borderRadius === undefined) style.borderRadius = 16
  }

  const spaceMap: Record<string, number> = { Compact: 0, Aéré: 22 }
  if (c.__space && spaceMap[c.__space] !== undefined) { style.marginTop = spaceMap[c.__space]; style.marginBottom = spaceMap[c.__space] }

  if (c.__width === "Étroite") { style.maxWidth = 360; style.marginLeft = "auto"; style.marginRight = "auto" }

  // Taille du texte (curseur) : met à l'échelle le contenu du bloc via `zoom` (reflux → jamais de
  // chevauchement). Valeur en % (80–140) ; 100 (ou absent) = inerte → zéro régression.
  const tsRaw = parseFloat(c.__text_scale)
  if (tsRaw && tsRaw !== 100 && tsRaw >= 50 && tsRaw <= 200) style.zoom = tsRaw / 100

  // Animation d'apparition = révélation au scroll (classe .qf-reveal + variante). Voir le CSS public.
  // Rétrocompat : anciennes valeurs "Glissé"/"Zoom" mappées vers les nouvelles variantes.
  const animMap: Record<string, string> = {
    "Fondu": "qf-reveal",
    "Glissé": "qf-reveal qf-a-up", "Glissé ↑": "qf-reveal qf-a-up", "Glissé ↓": "qf-reveal qf-a-down",
    "Glissé ←": "qf-reveal qf-a-left", "Glissé →": "qf-reveal qf-a-right",
    "Zoom": "qf-reveal qf-a-zoom", "Zoom avant": "qf-reveal qf-a-zoom", "Zoom arrière": "qf-reveal qf-a-zoomout",
    "Rotation": "qf-reveal qf-a-rotate", "Flou": "qf-reveal qf-a-blur", "Bascule": "qf-reveal qf-a-flip",
  }
  const speedMap: Record<string, string> = { "Lent": "qf-sp-slow", "Rapide": "qf-sp-fast" }
  const hoverMap: Record<string, string> = { "Élévation": "qf-hv-lift", "Zoom": "qf-hv-zoom", "Lueur": "qf-hv-glow" }
  const loopMap: Record<string, string> = { "Flottement": "qf-loop-float", "Pulsation": "qf-loop-pulse", "Battement": "qf-loop-beat" }
  const animClass = [
    c.__anim && animMap[c.__anim],
    c.__anim && animMap[c.__anim] && c.__anim_speed && speedMap[c.__anim_speed], // vitesse : seulement avec une anim d'apparition
    c.__hover && hoverMap[c.__hover],
    c.__loop && loopMap[c.__loop],
  ].filter(Boolean).join(" ")

  return { style, animClass }
}

// ── Categories de blocs ───────────────────────────────────────────────────────
// Categories de blocs. `desc` = OBJECTIF utilisateur (pas une liste de features) pour guider
// le choix ("Je veux…"), cf audit #8. `id` reste la cle technique (matching), ne pas la changer.
export const BLOCK_CATEGORIES = [
  { id: "identity", label: "Identité", icon: "👤", color: "#C9A84C", desc: "Me présenter" },
  { id: "actions", label: "Actions", icon: "⚡", color: "#39FF8F", desc: "Être contacté et passer à l'action" },
  { id: "social", label: "Réseaux", icon: "📲", color: "#1DA1F2", desc: "Relier mes réseaux sociaux" },
  { id: "commerce", label: "Commerce", icon: "🛍️", color: "#F97316", desc: "Vendre mes produits et services" },
  { id: "media", label: "Médias", icon: "🎬", color: "#A78BFA", desc: "Montrer mon travail" },
  { id: "info", label: "Infos", icon: "📋", color: "#38BDF8", desc: "Informer et rassurer" },
  { id: "business", label: "Business", icon: "🏢", color: "#EC4899", desc: "Infos pratiques : adresse, horaires" },
  { id: "music", label: "Musique", icon: "🎵", color: "#1DB954", desc: "Partager ma musique" },
  { id: "event", label: "Event", icon: "🎉", color: "#F472B6", desc: "Annoncer un événement" },
  { id: "freeform", label: "Création libre", icon: "🎨", color: "#C9A84C", desc: "Composer ma page comme je veux" },
  { id: "layout", label: "Mise en page", icon: "📐", color: "#A8A190", desc: "Structurer ma page" },
]

// ── Definitions des blocs ─────────────────────────────────────────────────────
export interface BlockField {
  key: string
  label: string
  type: "text" | "textarea" | "url" | "select" | "color" | "image" | "file" | "date" | "datetime"
  placeholder?: string
  options?: string[]
  hint?: string
  suggestions?: string[]   // exemples curés tappables (pour ne jamais partir d'un champ vide)
  suggestionsMode?: "append"  // "append" = sélecteur multiple (toggle, séparé par virgules) ; défaut = remplace
  maxRecommended?: number  // longueur conseillée -> compteur + score (Excellent/Correct/Trop long)
  showIf?: { key: string; equals?: string; in?: string[] }  // n'affiche ce champ que si content[key] correspond
  cropAspect?: string  // ratio présélectionné au recadrage d'un champ image (ex : "square" avatar, "wide" bannière)
}

export interface BlockDef {
  label: string
  description: string
  icon: string
  color: string
  category: string
  defaultContent: BlockContent
  fields: BlockField[]
  hint?: string    // Cas d usage court (1 ligne)
  preview?: string // Aperçu textuel exemple
}
export const LAYOUT_BG_FIELDS: BlockField[] = [
  { key: "bg_type", label: "Fond du bloc", type: "select", options: ["Aucun", "Carte", "Couleur", "Dégradé", "Image"], hint: "« Carte » reprend la couleur de surface de votre thème." },
  { key: "bg_color", label: "Couleur de fond", type: "color", showIf: { key: "bg_type", in: ["Couleur", "Dégradé"] } },
  { key: "bg_color2", label: "Seconde couleur", type: "color", showIf: { key: "bg_type", equals: "Dégradé" } },
  { key: "bg_image", label: "Image de fond", type: "image", cropAspect: "wide", showIf: { key: "bg_type", equals: "Image" } },
  { key: "overlay", label: "Assombrir l'image (%)", type: "text", placeholder: "45", hint: "0 = image nette, 100 = fond noir. Sert à garder le texte lisible.", showIf: { key: "bg_type", equals: "Image" } },
  { key: "text_color", label: "Couleur du texte", type: "color", hint: "Vide = couleur du thème (blanc automatique sur image ou dégradé)." },
]

export const LAYOUT_BOX_FIELDS: BlockField[] = [
  { key: "pad", label: "Espace intérieur", type: "select", options: ["Aucun", "Compact", "Normal", "Aéré"] },
  { key: "radius", label: "Coins", type: "select", options: ["Aucun", "Doux", "Arrondi", "Très arrondi"] },
  { key: "edge", label: "Largeur", type: "select", options: ["Marges", "Bord à bord"], hint: "« Bord à bord » colle le bloc aux bords de la page." },
]

export const LAYOUT_STYLE_FIELDS: BlockField[] = [...LAYOUT_BG_FIELDS, ...LAYOUT_BOX_FIELDS]
