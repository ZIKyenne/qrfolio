// =============================================================================
// qrScannability.ts — Moteur PUR d'evaluation de la lisibilite d'un QR.
// Estime, a partir de la config (couleurs, correction d'erreur, logo, modules,
// marge), un score 0..100 + un niveau + des conseils FR ordonnes par priorite.
// Utilise pour la "jauge de scannabilite en direct" de l'editeur QR (PrintStudio).
// Aucune dependance au DOM / a Fabric -> entierement testable.
// =============================================================================

import { hexContrastRatio, relLuminance } from "./printPreflight"
import { CONTRASTE_INSUFFISANT, CONTRASTE_FAIBLE, CONTRASTE_JUSTE, CONTRASTE_FRANC } from "@/lib/contrasteQr"

export type Ecc = "L" | "M" | "Q" | "H"
export type QrScanLevel = "excellent" | "bon" | "moyen" | "risque"

export type QrScanInput = {
  fg: string                 // couleur des modules
  bg: string                 // couleur du fond
  transparent?: boolean      // fond transparent (imprime sur un support inconnu)
  ecc?: Ecc                  // niveau de correction d'erreur
  dotStyle?: string          // style des modules (square, dot, neon, luxury...)
  hasLogo?: boolean          // logo appose au centre
  margin?: number            // marge tranquille (unites qr-code-styling), 0 = aucune
}

export type QrScanResult = {
  score: number              // 0..100 (borne)
  level: QrScanLevel
  label: string              // libelle FR du niveau
  contrast: number | null    // ratio WCAG 1..21 (null si couleur invalide)
  inverted: boolean          // modules plus clairs que le fond (QR "en negatif")
  advices: string[]          // conseils, du plus prioritaire au moins prioritaire
}

const LEVEL_LABEL: Record<QrScanLevel, string> = {
  excellent: "Excellente lisibilité",
  bon:       "Bonne lisibilité",
  moyen:     "Lisibilité moyenne",
  risque:    "Lisibilité risquée",
}

// Modules dont le trace est fin / arrondi : moins de definition a petite taille.
const DELICATE_DOTS = new Set(["dot", "dots", "neon", "minimal", "luxury", "classy"])

// Evalue la scannabilite. Deterministe : memes entrees -> meme sortie.
export function qrScannability(input: QrScanInput): QrScanResult {
  const { fg, bg, transparent, ecc = "M", dotStyle, hasLogo, margin } = input
  const notes: { msg: string; penalty: number }[] = []

  // --- Contraste modules / fond (le facteur nº1) --------------------------
  const contrast = transparent ? null : hexContrastRatio(fg, bg)
  if (transparent) {
    notes.push({ msg: "Fond transparent : imprimez le QR sur un aplat clair et uni, jamais sur une photo.", penalty: 22 })
  } else if (contrast == null) {
    notes.push({ msg: "Couleur de QR ou de fond invalide.", penalty: 55 })
  } else if (contrast < CONTRASTE_INSUFFISANT) {
    notes.push({ msg: "Contraste insuffisant : le QR sera probablement illisible. Foncez les modules ou éclaircissez le fond.", penalty: 62 })
  } else if (contrast < CONTRASTE_FAIBLE) {
    notes.push({ msg: "Contraste faible : risque de non-lecture à l'impression. Visez un fond clair et des modules foncés.", penalty: 40 })
  } else if (contrast < CONTRASTE_JUSTE) {
    notes.push({ msg: "Contraste juste : acceptable, mais un fond plus clair fiabilisera le scan.", penalty: 18 })
  } else if (contrast < CONTRASTE_FRANC) {
    notes.push({ msg: "Bon contraste — idéalement noir sur blanc pour une marge maximale.", penalty: 5 })
  }

  // --- QR "en negatif" (modules clairs sur fond fonce) --------------------
  const lf = relLuminance(fg), lb = relLuminance(bg)
  const inverted = !transparent && lf != null && lb != null && lf > lb
  if (inverted) {
    notes.push({ msg: "QR en négatif (clair sur foncé) : certains lecteurs anciens échouent. Préférez foncé sur clair.", penalty: 15 })
  }

  // --- Correction d'erreur (robustesse) -----------------------------------
  if (hasLogo && (ecc === "L" || ecc === "M")) {
    notes.push({ msg: "Logo au centre : passez la correction d'erreur à Q ou H, sinon le code peut devenir illisible.", penalty: 20 })
  } else if (hasLogo && ecc === "Q") {
    notes.push({ msg: "Avec un logo, la correction d'erreur H offre la meilleure marge.", penalty: 5 })
  } else if (!hasLogo && ecc === "L") {
    notes.push({ msg: "Correction d'erreur basse (L) : passez au moins à M pour l'impression.", penalty: 8 })
  }

  // --- Style des modules ---------------------------------------------------
  if (dotStyle && DELICATE_DOTS.has(dotStyle)) {
    notes.push({ msg: "Modules fins ou arrondis : imprimez le QR assez grand pour qu'ils restent nets.", penalty: 6 })
  }

  // --- Marge tranquille ----------------------------------------------------
  if (typeof margin === "number" && margin <= 0) {
    notes.push({ msg: "Aucune marge tranquille : laissez une zone claire tout autour du QR.", penalty: 12 })
  }

  const totalPenalty = notes.reduce((s, n) => s + n.penalty, 0)
  const score = Math.max(0, Math.min(100, 100 - totalPenalty))

  const level: QrScanLevel =
    score >= 85 ? "excellent" :
    score >= 70 ? "bon" :
    score >= 50 ? "moyen" : "risque"

  const advices = notes
    .filter(n => n.penalty >= 5)
    .sort((a, b) => b.penalty - a.penalty)
    .map(n => n.msg)

  return { score, level, label: LEVEL_LABEL[level], contrast, inverted, advices }
}

// Couleur d'accent associee a un niveau (pour la jauge). Purement presentational
// mais garde ici pour rester la seule source de verite du mapping niveau -> sens.
export function scanLevelColor(level: QrScanLevel): string {
  switch (level) {
    case "excellent": return "#2FBF71"
    case "bon":       return "#7FB800"
    case "moyen":     return "#E8A33D"
    case "risque":    return "#E5484D"
  }
}
