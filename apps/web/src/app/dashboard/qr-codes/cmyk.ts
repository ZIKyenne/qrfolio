// cmyk.ts — Aides couleur pour l'impression (PUR, testable). Conversions sRGB<->CMYK
// naïves (sans profil ICC) + détection HEURISTIQUE de couleurs « hors-gamut » CMYK
// (très vives) qui VIRENT à l'impression offset. Sert d'AVERTISSEMENT honnête au
// pré-vol — pas d'une conversion couleur garantie (le vrai CMYK/ICC exige une
// chaîne serveur). Voir docs/QR-STUDIO-PLAN.md §2.27.

import { hexToRgb } from "./colorTools"

export type CMYK = { c: number; m: number; y: number; k: number } // 0..1

// sRGB (0..255) -> CMYK (0..1). Conversion naïve (sans ICC).
export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 1 } // noir pur
  const c = (1 - rn - k) / (1 - k)
  const m = (1 - gn - k) / (1 - k)
  const y = (1 - bn - k) / (1 - k)
  return { c, m, y, k }
}

// CMYK (0..1) -> sRGB (0..255).
export function cmykToRgb({ c, m, y, k }: CMYK): { r: number; g: number; b: number } {
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  }
}

// HEURISTIQUE : une couleur très vive (saturation ET luminosité élevées) sort du
// gamut CMYK et virera à l'impression (néons, verts/oranges/cyans électriques).
// Ce n'est PAS un test ICC — c'est un signal d'alerte prudent.
export function outOfCmykGamut(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  const mx = Math.max(rgb.r, rgb.g, rgb.b) / 255
  const mn = Math.min(rgb.r, rgb.g, rgb.b) / 255
  const v = mx                         // valeur (HSV)
  const s = mx === 0 ? 0 : (mx - mn) / mx // saturation (HSV)
  return s >= 0.85 && v >= 0.85
}

// Nombre de couleurs (parmi celles fournies) à risque hors-gamut CMYK. Ignore les
// entrées invalides/vides.
export function countOutOfGamut(colors: (string | undefined | null)[]): number {
  return colors.filter((c): c is string => !!c && outOfCmykGamut(c)).length
}
