// layoutStyle.ts — Modèle PUR des réglages de mise en page partagés par les blocs « libres »
// (vague Layout). Traduit des libellés utilisateur (français, tels qu'ils apparaissent dans
// BLOCK_DEFS) en valeurs CSS sûres. Aucune dépendance React/Supabase : testable seul.
//
// Règle de sécurité : toute valeur qui finit dans une propriété CSS est validée ici.
// Une couleur non reconnue retombe sur le fallback ; une URL d'image non http(s)/data:image
// est rejetée (chaîne vide) ; les caractères qui casseraient `url(...)` sont encodés.

// ── Couleur sûre (hex / rgb(a) / hsl(a)) ─────────────────────────────────────
export function safeColor(v: unknown, fallback = ""): string {
  if (typeof v !== "string") return fallback
  const s = v.trim()
  if (!s || s.length > 60) return fallback
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s
  if (/^(rgb|hsl)a?\([0-9.,%\s/-]+\)$/i.test(s)) return s
  return fallback
}

// ── URL d'image sûre pour `url(...)` et `src` ────────────────────────────────
export function safeImageUrl(v: unknown): string {
  if (typeof v !== "string") return ""
  const s = v.trim()
  if (!s || s.length > 2000) return ""
  // Autorisé : http(s), data:image, et chemin absolu same-origin (/mon-image.png).
  // Refusé : tout le reste, dont les URL relatives au protocole (//hote/x) qui
  // permettraient de pointer vers un hôte tiers sans que ce soit visible.
  const ok = /^https?:\/\//i.test(s)
    || /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(s)
    || (s.startsWith("/") && !s.startsWith("//"))
  if (!ok) return ""
  // Neutralise ce qui pourrait fermer `url(` ou une chaîne CSS.
  return s.replace(/[()"'\\]/g, c => encodeURIComponent(c))
}

// ── Opacité 0..1 depuis un pourcentage saisi en texte ────────────────────────
export function pct01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."))
  if (!isFinite(n)) return fallback
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n))
}

// ── Entier borné (hauteurs, colonnes…) ───────────────────────────────────────
export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? "").replace(/[^0-9-]/g, ""), 10)
  if (!isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// ── Alignement ───────────────────────────────────────────────────────────────
export type Align = "left" | "center" | "right"
export function alignOf(v: unknown, fallback: Align = "center"): Align {
  switch (String(v ?? "").trim().toLowerCase()) {
    case "gauche": case "left": return "left"
    case "droite": case "right": return "right"
    case "centre": case "center": return "center"
    default: return fallback
  }
}
export function flexAlign(a: Align): string {
  return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center"
}

// ── Espacement intérieur ─────────────────────────────────────────────────────
export type PadKey = "none" | "compact" | "normal" | "airy"
export function padOf(v: unknown, fallback: PadKey = "normal"): PadKey {
  switch (String(v ?? "").trim().toLowerCase()) {
    case "aucun": case "none": return "none"
    case "compact": return "compact"
    case "aéré": case "aere": case "airy": return "airy"
    case "normal": return "normal"
    default: return fallback
  }
}
const PAD_PX: Record<PadKey, [number, number]> = { none: [0, 0], compact: [12, 14], normal: [22, 18], airy: [38, 22] }
export function padCss(v: unknown, scale = 1, fallback: PadKey = "normal"): string {
  const [y, x] = PAD_PX[padOf(v, fallback)]
  return `${Math.round(y * scale)}px ${Math.round(x * scale)}px`
}

// ── Arrondi ──────────────────────────────────────────────────────────────────
export function radiusOf(v: unknown, fallback = 14): number {
  switch (String(v ?? "").trim().toLowerCase()) {
    case "aucun": case "none": return 0
    case "doux": return 10
    case "arrondi": return 18
    case "très arrondi": case "tres arrondi": return 28
    default: return fallback
  }
}

// ── Marges extérieures : « Bord à bord » colle le bloc aux bords de la page ──
export function edgeCss(v: unknown, scale = 1): string {
  const bleed = /bord/i.test(String(v ?? ""))
  return bleed ? "0" : `0 ${Math.round(24 * scale)}px`
}
export function isBleed(v: unknown): boolean {
  return /bord/i.test(String(v ?? ""))
}

// ── Fond d'une surface ───────────────────────────────────────────────────────
// Renvoie le style du conteneur + un éventuel calque d'assombrissement (overlay),
// séparé pour que le texte reste au-dessus sans être affecté par l'opacité.
export type SurfaceStyle = { container: Record<string, string | number>; overlay?: Record<string, string | number> }

export function surfaceStyle(
  c: Record<string, any> | null | undefined,
  opts: { accent: string; surface: string; radius: number },
): SurfaceStyle {
  const src = c || {}
  const kind = String(src.bg_type ?? "").trim().toLowerCase()
  const c1 = safeColor(src.bg_color, "")
  const c2 = safeColor(src.bg_color2, "")
  const img = safeImageUrl(src.bg_image)
  const base: Record<string, string | number> = { borderRadius: opts.radius, position: "relative", overflow: "hidden" }

  if (kind === "image" && img) {
    return {
      container: { ...base, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" },
      overlay: { position: "absolute", inset: 0, background: "#000", opacity: pct01(src.overlay, 0.45), pointerEvents: "none" },
    }
  }
  if (kind === "dégradé" || kind === "degrade" || kind === "gradient") {
    const a = c1 || opts.accent
    const b = c2 || opts.surface
    return { container: { ...base, backgroundImage: `linear-gradient(135deg, ${a}, ${b})` } }
  }
  if (kind === "couleur" || kind === "color") {
    return { container: { ...base, background: c1 || opts.surface } }
  }
  if (kind === "carte" || kind === "surface") {
    return { container: { ...base, background: opts.surface, border: "1px solid rgba(255,255,255,0.08)" } }
  }
  // « Aucun » / valeur inconnue : transparent, sans bord ni arrondi visible.
  return { container: { position: "relative", overflow: "hidden" } }
}

// ── Couleur de texte lisible au-dessus d'un fond ─────────────────────────────
// Sur une image ou un dégradé sombre, le texte du thème peut disparaître : on force
// un blanc cassé quand un fond « fort » est actif.
export function textOnSurface(c: Record<string, any> | null | undefined, themeText: string): string {
  const kind = String((c || {}).bg_type ?? "").trim().toLowerCase()
  const forced = safeColor((c || {}).text_color, "")
  if (forced) return forced
  if (kind === "image" || kind === "dégradé" || kind === "degrade" || kind === "gradient") return "#FFFFFF"
  return themeText
}

// ── Liste d'items séparés par virgule ou retour à la ligne ───────────────────
export function splitList(v: unknown, max = 30): string[] {
  if (typeof v !== "string") return []
  return v.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, max)
}

// ── Identifiant d'ancre : slug sûr pour un id HTML ───────────────────────────
export function anchorId(v: unknown): string {
  const s = String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const slug = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
  return slug ? `qf-${slug}` : ""
}
