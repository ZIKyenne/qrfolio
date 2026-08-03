// printPreflight.ts — Contrôle qualité AVANT impression (pré-vol) pour le QR Print Studio.
// Moteur PUR (aucun React, aucun canvas) -> entièrement testable (printPreflight.test.ts).
// L'adaptateur (PrintStudio) mesure le design réel et remplit PreflightMetrics ; ce moteur note.

export type CheckStatus = "ok" | "warn" | "fail" | "na"

export type PreflightCheck = {
  id: string
  label: string
  status: CheckStatus
  detail: string      // message court, orienté action
  weight: number      // poids dans le score (0 si na)
}

export type PreflightMetrics = {
  qrSizeMm?: number | null       // taille physique du QR (côté), en mm
  contrastRatio?: number | null  // ratio WCAG 1..21 entre modules et fond immédiat
  quietZoneMm?: number | null    // espace vide autour du QR, en mm
  logoPct?: number | null        // taille du logo en % de la largeur du QR (0 = pas de logo)
  dpi?: number | null            // résolution d'export
  edgeMarginMm?: number | null   // distance du bord le plus proche (élément ↔ bord), en mm
  isScreen?: boolean             // format écran (Story) -> les contrôles d'impression physique passent en info
  cmykRiskyColors?: number | null // nb de couleurs très vives risquant de virer en CMYK (avertissement, hors score)
}

export type PreflightResult = {
  score: number                  // 0..100 (sur les seuls contrôles applicables)
  stars: number                  // 1..5
  grade: string                  // libellé FR
  checks: PreflightCheck[]
  scanDistanceM: number | null   // portée de lecture estimée, en mètres
  applicable: number             // nb de contrôles applicables
}

// Luminance relative sRGB (WCAG) d'une couleur hex #rgb ou #rrggbb. null si invalide.
export function relLuminance(hex: string): number | null {
  if (typeof hex !== "string") return null
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const r = lin(parseInt(h.slice(0, 2), 16))
  const g = lin(parseInt(h.slice(2, 4), 16))
  const b = lin(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Ratio de contraste WCAG entre deux couleurs (1..21). null si l'une est invalide.
export function hexContrastRatio(a: string, b: string): number | null {
  const la = relLuminance(a), lb = relLuminance(b)
  if (la == null || lb == null) return null
  const hi = Math.max(la, lb), lo = Math.min(la, lb)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

// ── Géométrie (pure) pour la zone silencieuse & les marges ────────────────────
export type Rect = { left: number; top: number; width: number; height: number }

// Espacement libre entre deux rectangles sur chaque axe (0 s'ils se chevauchent sur cet axe).
function axisGaps(a: Rect, b: Rect): { gx: number; gy: number } {
  const gx = Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width), 0)
  const gy = Math.max(b.top - (a.top + a.height), a.top - (b.top + b.height), 0)
  return { gx, gy }
}

// Dégagement latéral de `b` autour de `a` : distance libre là où b longe un côté de a.
// Se touchent (chevauchent sur X ET Y) -> 0 ; b au-dessus/dessous (chevauche en X) -> gy ;
// b à gauche/droite (chevauche en Y) -> gx ; b en diagonale (aucun chevauchement) -> null.
export function sideClearance(a: Rect, b: Rect): number | null {
  const { gx, gy } = axisGaps(a, b)
  if (gx === 0 && gy === 0) return 0
  if (gx === 0) return gy
  if (gy === 0) return gx
  return null
}

// Un rectangle couvre-t-il quasi tout le support (fond plein cadre à ignorer) ?
function isFullBleed(o: Rect, w: number, h: number): boolean {
  return o.width >= w * 0.92 && o.height >= h * 0.92
}

// Zone silencieuse autour du QR (px) : plus petit dégagement latéral vers un autre élément,
// borné par la distance du QR aux bords. `others` = tous les objets SAUF le QR et sa carte.
export function quietZonePx(qr: Rect, others: Rect[], canvasW: number, canvasH: number): number {
  const edge = Math.min(qr.left, qr.top, canvasW - (qr.left + qr.width), canvasH - (qr.top + qr.height))
  let min = Math.max(0, edge)
  for (const o of others) {
    if (isFullBleed(o, canvasW, canvasH)) continue   // un fond plein cadre n'encombre pas le QR
    const c = sideClearance(qr, o)
    if (c != null && c < min) min = c
  }
  return min
}

// Marge de sécurité (px) : plus petite distance d'un élément « contenu » à un bord du canevas.
// Les fonds plein cadre sont ignorés (ils touchent volontairement les bords).
export function edgeMarginPx(objs: Rect[], canvasW: number, canvasH: number): number {
  let min = Infinity
  for (const o of objs) {
    if (isFullBleed(o, canvasW, canvasH)) continue
    const d = Math.min(o.left, o.top, canvasW - (o.left + o.width), canvasH - (o.top + o.height))
    if (d < min) min = d
  }
  return min === Infinity ? canvasW : min   // aucun contenu -> pas de risque de rognage
}

// Distance de lecture ≈ 10 × la taille du QR (règle 10:1 largement admise).
export function scanDistanceM(qrSizeMm?: number | null): number | null {
  if (typeof qrSizeMm !== "number" || !(qrSizeMm > 0)) return null
  return Math.round((qrSizeMm * 10) / 100) / 10   // mm ×10 -> mm de distance -> m, arrondi 0,1
}

// Contribution d'un contrôle : ok = plein poids, warn = moitié, fail/na = 0.
function contribution(c: PreflightCheck): number {
  if (c.status === "ok") return c.weight
  if (c.status === "warn") return c.weight * 0.5
  return 0
}

// Note un seuil décroissant : v >= okAt -> ok ; >= warnAt -> warn ; sinon fail.
// na si la valeur est absente.
function grade3(v: number | null | undefined, okAt: number, warnAt: number): CheckStatus {
  if (typeof v !== "number" || Number.isNaN(v)) return "na"
  if (v >= okAt) return "ok"
  if (v >= warnAt) return "warn"
  return "fail"
}

export function printPreflight(m: PreflightMetrics): PreflightResult {
  const screen = m.isScreen === true
  const checks: PreflightCheck[] = []

  // 1) Contraste QR / fond — le plus critique pour la lecture.
  {
    const s = grade3(m.contrastRatio, 4, 2.5)
    const r = m.contrastRatio
    checks.push({
      id: "contrast", label: "Contraste QR / fond", status: s, weight: 26,
      detail: s === "na" ? "Impossible à mesurer."
        : s === "ok" ? "Excellent — lecture garantie."
        : s === "warn" ? `Un peu faible (${r?.toFixed(1)}:1) — assombrir les modules ou éclaircir le fond.`
        : `Insuffisant (${r?.toFixed(1)}:1) — le QR risque de ne pas être lu.`,
    })
  }

  // 2) Taille physique du QR (impression) — sans objet en format écran.
  {
    if (screen) {
      checks.push({ id: "qrsize", label: "Taille du QR", status: "na", weight: 0, detail: "Format écran — pas d'impression physique." })
    } else {
      const s = grade3(m.qrSizeMm, 25, 15)   // ≥2,5 cm idéal ; 1,5–2,5 limite ; <1,5 trop petit
      const d = scanDistanceM(m.qrSizeMm)
      checks.push({
        id: "qrsize", label: "Taille du QR", status: s, weight: 24,
        detail: s === "na" ? "Taille inconnue."
          : s === "ok" ? `${((m.qrSizeMm as number) / 10).toFixed(1)} cm — lisible jusqu'à ~${d} m.`
          : s === "warn" ? `${(m.qrSizeMm! / 10).toFixed(1)} cm — un peu petit ; viser ≥ 2,5 cm.`
          : `${(m.qrSizeMm! / 10).toFixed(1)} cm — trop petit pour un scan fiable (viser ≥ 2,5 cm).`,
      })
    }
  }

  // 3) Zone silencieuse (marge blanche autour du QR).
  {
    const s = grade3(m.quietZoneMm, 4, 2)   // ≥4 mm ok ; 2–4 limite ; <2 fail
    checks.push({
      id: "quiet", label: "Zone silencieuse", status: s, weight: 16,
      detail: s === "na" ? "Non mesurée."
        : s === "ok" ? "Marge suffisante autour du QR."
        : s === "warn" ? "Marge un peu juste — laisser ≥ 4 mm de vide autour du QR."
        : "Trop d'éléments collés au QR — laisser du vide autour (≥ 4 mm).",
    })
  }

  // 4) Taille du logo (correction d'erreur). Pas de logo = ok.
  {
    const p = m.logoPct
    let s: CheckStatus
    if (typeof p !== "number") s = "na"
    else if (p <= 0) s = "ok"
    else if (p <= 20) s = "ok"
    else if (p <= 28) s = "warn"
    else s = "fail"
    checks.push({
      id: "logo", label: "Taille du logo", status: s, weight: 14,
      detail: s === "na" ? "Non mesurée."
        : (p ?? 0) <= 0 ? "Aucun logo au centre."
        : s === "ok" ? `Logo à ${Math.round(p!)} % — bien dimensionné.`
        : s === "warn" ? `Logo à ${Math.round(p!)} % — proche de la limite (≤ 28 %).`
        : `Logo à ${Math.round(p!)} % — trop grand, risque de non-lecture (≤ 25 % conseillé).`,
    })
  }

  // 5) Résolution d'export — sans objet en format écran.
  {
    if (screen) {
      checks.push({ id: "dpi", label: "Résolution", status: "na", weight: 0, detail: "Format écran — la résolution d'impression ne s'applique pas." })
    } else {
      const s = grade3(m.dpi, 300, 150)
      checks.push({
        id: "dpi", label: "Résolution", status: s, weight: 12,
        detail: s === "na" ? "Inconnue."
          : s === "ok" ? `${m.dpi} DPI — qualité imprimeur.`
          : s === "warn" ? `${m.dpi} DPI — correct pour un tirage rapide ; viser 300 DPI.`
          : `${m.dpi} DPI — trop faible pour l'impression (viser 300 DPI).`,
      })
    }
  }

  // 6) Marges de sécurité (éléments trop près du bord = risque de rognage).
  {
    if (screen) {
      checks.push({ id: "margin", label: "Marges de sécurité", status: "na", weight: 0, detail: "Format écran — pas de rognage." })
    } else {
      const s = grade3(m.edgeMarginMm, 3, 1)
      checks.push({
        id: "margin", label: "Marges de sécurité", status: s, weight: 8,
        detail: s === "na" ? "Non mesurées."
          : s === "ok" ? "Éléments à l'écart des bords."
          : s === "warn" ? "Un élément est proche du bord — risque de rognage."
          : "Élément au ras du bord — le rentrer dans la marge de sécurité.",
      })
    }
  }

  // 7) Couleurs imprimables (CMYK) — AVERTISSEMENT informatif (poids 0, hors score).
  // Le vrai rendu CMYK dépend de l'imprimeur ; on signale juste les couleurs à risque.
  {
    const n = m.cmykRiskyColors
    const s: CheckStatus = typeof n !== "number" ? "na" : n <= 0 ? "ok" : "warn"
    checks.push({
      id: "cmyk", label: "Couleurs imprimables (CMYK)", status: s, weight: 0,
      detail: s === "na" ? "Non évaluées."
        : n === 0 ? "Couleurs compatibles avec l'impression."
        : `${n} couleur(s) très vive(s) risquent de virer en CMYK — prévoyez une épreuve imprimeur.`,
    })
  }

  // Score : somme des contributions / somme des poids applicables.
  const applicableChecks = checks.filter(c => c.status !== "na" && c.weight > 0)
  const totalWeight = applicableChecks.reduce((a, c) => a + c.weight, 0)
  const gained = applicableChecks.reduce((a, c) => a + contribution(c), 0)
  const score = totalWeight > 0 ? Math.round((gained / totalWeight) * 100) : 0

  // Étoiles 1..5 (jamais 0 si au moins un contrôle applicable ; sinon 1 par défaut d'affichage).
  const stars = totalWeight === 0 ? 3 : Math.min(5, Math.max(1, Math.round(score / 20)))

  const grade =
    totalWeight === 0 ? "En attente de mesure"
    : score >= 90 ? "Prêt pour l'imprimeur"
    : score >= 75 ? "Bon — quelques réglages possibles"
    : score >= 55 ? "À améliorer avant impression"
    : "Risque à l'impression"

  return {
    score, stars, grade, checks,
    scanDistanceM: screen ? null : scanDistanceM(m.qrSizeMm),
    applicable: applicableChecks.length,
  }
}
