// =============================================================================
// exportPlan.ts — Moteur PUR de l'assistant d'export (critique #15).
// A partir du format, du DPI, du type de fichier et du plan, calcule le "plan"
// d'export affiche a l'utilisateur : dimensions en pixels, taille physique,
// qualite, disponibilite (PDF = Pro), nom de fichier. Aucune dependance DOM.
// =============================================================================

export type ExportType = "png" | "jpeg" | "pdf" | "svg"

// Largeur exportee en pixels. `exportW` est la largeur de reference a 300 DPI.
export function exportWidthPx(exportW: number, dpi: number): number {
  return Math.max(1, Math.round(exportW * (dpi / 300)))
}

// Hauteur exportee en pixels. `ratio` = largeur / hauteur.
export function exportHeightPx(widthPx: number, ratio: number): number {
  return Math.max(1, Math.round(widthPx / ratio))
}

// Libelle de qualite selon le DPI (usage vise).
export function qualityLabel(dpi: number): string {
  if (dpi >= 300) return "Impression pro"
  if (dpi >= 150) return "Bon (impression courante)"
  return "Écran / web"
}

// Le type de fichier est-il autorise pour ce plan ? (PDF et SVG reserves au Pro.)
export function canExportType(type: ExportType, isPro: boolean): boolean {
  return (type === "pdf" || type === "svg") ? isPro : true
}

// Raison du blocage, ou null si autorise.
export function exportBlockedReason(type: ExportType, isPro: boolean): string | null {
  if (type === "pdf" && !isPro) return "L'export PDF (traits de coupe, fond perdu) est réservé au plan Pro."
  if (type === "svg" && !isPro) return "L'export SVG (vectoriel, redimensionnable sans perte) est réservé au plan Pro."
  return null
}

// Nom de fichier telecharge.
export function exportFilename(format: string, dpi: number, type: ExportType): string {
  const ext = type === "jpeg" ? "jpg" : type
  return `qrowg-${format}-${dpi}dpi.${ext}`
}

// DPI conseille : 72 pour un format ecran (mm = 0), 300 pour l'impression.
export function recommendedDpi(widthMm: number): number {
  return widthMm > 0 ? 300 : 72
}

export type ExportPlanInput = {
  format: string
  exportW: number
  ratio: number       // largeur / hauteur
  widthMm: number     // largeur physique du support (0 = format ecran)
  dpi: number
  type: ExportType
  isPro: boolean
}

export type ExportPlan = {
  widthPx: number
  heightPx: number
  widthMm: number
  heightMm: number    // 0 si format ecran
  quality: string
  allowed: boolean
  blockedReason: string | null
  filename: string
}

// Plan d'export complet, pret a etre affiche a l'etape "recapitulatif".
export function exportPlan(i: ExportPlanInput): ExportPlan {
  const widthPx = exportWidthPx(i.exportW, i.dpi)
  const heightPx = exportHeightPx(widthPx, i.ratio)
  const heightMm = i.widthMm > 0 ? Math.round((i.widthMm / i.ratio) * 10) / 10 : 0
  return {
    widthPx,
    heightPx,
    widthMm: i.widthMm,
    heightMm,
    quality: qualityLabel(i.dpi),
    allowed: canExportType(i.type, i.isPro),
    blockedReason: exportBlockedReason(i.type, i.isPro),
    filename: exportFilename(i.format, i.dpi, i.type),
  }
}
