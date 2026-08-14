// =============================================================================
// qrRender.ts — Moteur de rendu QR base sur qr-code-styling
// Genere les QR cote client (plus de dependance a api.qrserver.com).
// Applique reellement : dotStyle, eyeColor, cornerColor, gradient, logo, marge.
// Export PNG / WEBP / SVG (natif lib) + PDF (via jsPDF).
// =============================================================================

import QRCodeStyling from "qr-code-styling"
import type {
  DotType, CornerSquareType, CornerDotType, GradientType,
} from "qr-code-styling"

export type QRStyleConfig = {
  fg2?:          string
  cornerColor?:  string
  eyeColor?:     string
  transparent?:  boolean
  gradient?:     "none" | "linear" | "radial" | "diagonal"
  gradientBg?:   string
  dotStyle?:     "square" | "rounded" | "dot" | "softSquare" | "pixel" | "minimal" | "neon" | "luxury"
  cornerStyle?:  "square" | "rounded" | "circle" | "diamond" | "luxury" | "minimal"
  margin?:       number
  density?:      "low" | "medium" | "high"
  logoUrl?:      string
  logoSize?:     number
  logoShape?:    "square" | "rounded" | "circle"
  logoBg?:       "transparent" | "white" | "black" | "custom"
  logoBgColor?:  string
  logoPadding?:  number
}

export type QROptions = {
  data:   string
  fg:     string
  bg:     string
  ecc:    "L" | "M" | "Q" | "H"
  style:  QRStyleConfig
  size?:  number
}

export function mapDotType(s?: string): DotType {
  switch (s) {
    case "dot":        return "dots"
    case "rounded":    return "rounded"
    case "softSquare": return "classy-rounded"
    case "pixel":      return "square"
    case "minimal":    return "dots"
    case "neon":       return "extra-rounded"
    case "luxury":     return "classy"
    default:           return "square"
  }
}

export function mapCornerSquareType(s?: string): CornerSquareType {
  switch (s) {
    case "rounded":  return "extra-rounded"
    case "circle":   return "dot"
    case "luxury":   return "extra-rounded"
    case "diamond":  return "square"
    case "minimal":  return "dot"
    default:         return "square"
  }
}

export function mapCornerDotType(s?: string): CornerDotType {
  switch (s) {
    case "circle":
    case "luxury":
    case "minimal":  return "dot"
    default:         return "square"
  }
}

// Exporte pour les tests : mapping pur QROptions -> options qr-code-styling
// (ne construit aucune instance, aucun canvas requis).
export function buildOptions(o: QROptions): any {
  const size   = o.size ?? 400
  const margin = o.style.margin ?? 10

  const hasGrad  = !!(o.style.gradient && o.style.gradient !== "none" && o.style.fg2)
  const gradType: GradientType = o.style.gradient === "radial" ? "radial" : "linear"
  const gradRotation =
    o.style.gradient === "diagonal" ? Math.PI / 4 :
    o.style.gradient === "linear"   ? Math.PI / 2 : 0

  const dotsGradient = hasGrad
    ? { type: gradType, rotation: gradRotation,
        colorStops: [ { offset: 0, color: o.fg }, { offset: 1, color: o.style.fg2! } ] }
    : undefined

  const bgHasGrad = !o.style.transparent && !!(o.style.gradient && o.style.gradient !== "none" && o.style.gradientBg)
  const bgGradient = bgHasGrad
    ? { type: gradType, rotation: gradRotation,
        colorStops: [ { offset: 0, color: o.bg }, { offset: 1, color: o.style.gradientBg! } ] }
    : undefined

  const opts: any = {
    width:  size,
    height: size,
    type:   "canvas",
    data:   o.data || "https://qrowg.com",
    margin,
    qrOptions: { errorCorrectionLevel: o.ecc },
    dotsOptions: {
      type: mapDotType(o.style.dotStyle),
      ...(dotsGradient ? { gradient: dotsGradient } : { color: o.fg }),
    },
    backgroundOptions: o.style.transparent
      ? { color: "rgba(0,0,0,0)" }
      : (bgGradient ? { gradient: bgGradient } : { color: o.bg }),
    cornersSquareOptions: {
      type:  mapCornerSquareType(o.style.cornerStyle),
      color: o.style.cornerColor || o.fg,
    },
    cornersDotOptions: {
      type:  mapCornerDotType(o.style.cornerStyle),
      color: o.style.eyeColor || o.style.cornerColor || o.fg,
    },
  }

  if (o.style.logoUrl) {
    const sizePct = Math.min((o.style.logoSize ?? 18) / 100, 0.30)
    opts.image = o.style.logoUrl
    opts.imageOptions = {
      hideBackgroundDots: true,
      imageSize: sizePct,
      margin: o.style.logoPadding ?? 4,
      crossOrigin: "anonymous",
    }
  }

  return opts
}

export function createQR(o: QROptions): QRCodeStyling {
  return new QRCodeStyling(buildOptions(o))
}

// Variante SVG (vectorielle) — pour un rendu net à l'impression (PDF prêt imprimeur).
export function createQRSvg(o: QROptions): QRCodeStyling {
  return new QRCodeStyling({ ...buildOptions(o), type: "svg" })
}

export function updateQR(qr: QRCodeStyling, o: QROptions): void {
  qr.update(buildOptions(o))
}

export async function getQRBlob(o: QROptions, ext: "png" | "webp" | "svg"): Promise<Blob | null> {
  const type = ext === "svg" ? "svg" : "canvas"
  const inst = new QRCodeStyling({ ...buildOptions(o), type })
  const data = await inst.getRawData(ext as any)
  return (data as Blob) ?? null
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export async function buildAndDownloadPdf(
  pngBlob: Blob,
  filename: string,
  opts: { title?: string; url?: string }
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const dataUrl = await blobToDataUrl(pngBlob)
  const pdf = new jsPDF({ unit: "pt", format: "a4" })
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()
  const imgSize = PW * 0.6
  const x = (PW - imgSize) / 2
  const y = (PH - imgSize) / 2
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, PW, PH, "F")
  pdf.addImage(dataUrl, "PNG", x, y, imgSize, imgSize)
  if (opts.title) {
    pdf.setFontSize(18); pdf.setTextColor(26, 26, 26)
    pdf.text(opts.title, PW / 2, y - 18, { align: "center" })
  }
  if (opts.url) {
    pdf.setFontSize(11); pdf.setTextColor(150, 130, 60)
    pdf.text(opts.url, PW / 2, y + imgSize + 28, { align: "center" })
  }
  pdf.save(filename)
}
