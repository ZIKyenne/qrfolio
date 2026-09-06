// diagnosticQr.ts — Le moteur de diagnostic de lisibilité de l'écran « QR de pages ».
//
// Il vivait à l'intérieur du composant QRStudio, en fermeture sur son état : 300
// lignes de règles métier — seuils de contraste, taille de logo, marge, correction
// d'erreur — qu'aucun test ne pouvait atteindre, dans un fichier de 4 268 lignes.
// Extrait tel quel : mêmes seuils, mêmes libellés, mêmes points retirés du score.
//
// À noter : ce dépôt contient un SECOND moteur, qrScannability.ts, utilisé par
// l'écran « QR à partir de zéro ». Les deux notent le même objet avec des règles
// différentes. Les réunir est un changement de comportement, pas un rangement :
// il faudra choisir lequel fait foi. Cette extraction rend au moins la
// contradiction visible et testable.
import type { QRStyleConfig } from "./QRStudio"

export type Ecc = "L" | "M" | "Q" | "H"

/** Tout ce que le diagnostic lit — rien d'autre. */
export type EntreeDiagnostic = {
  fg: string
  bg: string
  ecc: Ecc
  /** Correction réellement appliquée : un logo force le niveau H. */
  eccEffectif: Ecc
  style: QRStyleConfig
}

/** Ce que la correction automatique propose. Le composant l'applique, ou non. */
export type Correction = { fg: string; bg: string; ecc: Ecc; style: QRStyleConfig }

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relativeLuminance(r:number,g:number,b:number): number {
  const c = [r,g,b].map(v => { const s=v/255; return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4) })
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
}
export function contrasteWcag(hex1:string, hex2:string): number {
  const [r1,g1,b1] = hexToRgb(hex1)
  const [r2,g2,b2] = hexToRgb(hex2)
  const l1 = relativeLuminance(r1,g1,b1)
  const l2 = relativeLuminance(r2,g2,b2)
  const lMax = Math.max(l1,l2), lMin = Math.min(l1,l2)
  return (lMax+0.05)/(lMin+0.05)
}
// -- Moteur de scannabilité complet ------------------------------------------
export type ScanIssue = {
  id:       string
  severity: "critical"|"warning"|"info"
  title:    string
  detail:   string
  fix?:     string   // label du fix auto
  fixable:  boolean
}

export type ScanScore = {
  score:      number   // 0-100
  grade:      "Excellent"|"Bon"|"Moyen"|"Risque"
  gradeColor: string
  issues:     ScanIssue[]
  ratio:      string
  minSize:    string
  canAutoFix: boolean
}

export function diagnostiquer(e: EntreeDiagnostic): ScanScore {
  const issues: ScanIssue[] = []
  let score = 100

  const fgHex = e.fg || "#080808"
  const bgHex = e.bg || "#FFFFFF"

  // -- 1. Contraste QR/fond --------------------------------------------------
  const ratio = contrasteWcag(fgHex, bgHex)
  if (ratio < 2) {
    issues.push({ id:"contrast-critical", severity:"critical",
      title:"Contraste insuffisant", detail:`Ratio ${ratio.toFixed(1)}:1 -- le QR sera illisible sur la plupart des scanners.`,
      fix:"Passer en noir sur blanc", fixable:true })
    score -= 35
  } else if (ratio < 3) {
    issues.push({ id:"contrast-low", severity:"critical",
      title:"Contraste trop faible", detail:`Ratio ${ratio.toFixed(1)}:1 -- moins de 50% des scanners liront ce QR.`,
      fix:"Renforcer le contraste", fixable:true })
    score -= 25
  } else if (ratio < 4.5) {
    issues.push({ id:"contrast-warn", severity:"warning",
      title:"Contraste moyen", detail:`Ratio ${ratio.toFixed(1)}:1 -- privilegiez 4.5:1 minimum pour le print.`,
      fix:"Renforcer le contraste", fixable:true })
    score -= 12
  }

  // -- 2. Fond transparent risque --------------------------------------------
  if (e.style.transparent) {
    issues.push({ id:"transparent", severity:"warning",
      title:"Fond transparent", detail:"Le fond transparent peut rendre le QR illisible sur les surfaces colorees.",
      fix:"Ajouter un fond blanc", fixable:true })
    score -= 10
  }

  // -- 3. Logo trop grand ----------------------------------------------------
  if (e.style.logoUrl) {
    const logoSize = e.style.logoSize ?? 18
    if (logoSize > 25) {
      issues.push({ id:"logo-big", severity:"critical",
        title:"Logo trop grand", detail:`${logoSize}% du QR est masque -- max recommande : 25%.`,
        fix:"Reduire le logo a 20%", fixable:true })
      score -= 20
    } else if (logoSize > 20) {
      issues.push({ id:"logo-warn", severity:"warning",
        title:"Logo un peu grand", detail:`${logoSize}% -- recommande : 15-20%.`,
        fix:"Reduire le logo a 18%", fixable:true })
      score -= 8
    }
    // ECC insuffisant avec logo
    if (e.eccEffectif !== "H") {
      issues.push({ id:"ecc-logo", severity:"critical",
        title:"Correction insuffisante pour le logo", detail:"Avec un logo, la correction H est obligatoire.",
        fix:"Passer en ECC H", fixable:true })
      score -= 15
    }
  }

  // -- 4. Correction d'erreur faible sans logo -------------------------------
  if (!e.style.logoUrl) {
    if (e.ecc === "L") {
      issues.push({ id:"ecc-l", severity:"warning",
        title:"Correction L trop légère", detail:"ECC L (7%) est insuffisant pour l'impression ou les surfaces abimees.",
        fix:"Passer en ECC M", fixable:true })
      score -= 8
    }
  }

  // -- 5. Marge insuffisante -------------------------------------------------
  const margin = e.style.margin ?? 10
  if (margin < 4) {
    issues.push({ id:"margin-none", severity:"critical",
      title:"Marge trop petite", detail:`Marge ${margin}px -- minimum 4 modules (10px) requis pour la decouverte.`,
      fix:"Ajouter une marge de 12px", fixable:true })
    score -= 18
  } else if (margin < 8) {
    issues.push({ id:"margin-low", severity:"warning",
      title:"Marge réduite", detail:`Marge ${margin}px -- 10px+ recommande pour l'impression.`,
      fix:"Ajouter une marge de 10px", fixable:true })
    score -= 6
  }

  // -- 6. Style trop complexe ------------------------------------------------
  const dotStyle = e.style.dotStyle ?? "square"
  if (dotStyle === "neon" || dotStyle === "luxury") {
    issues.push({ id:"style-complex", severity:"warning",
      title:"Style QR complexe", detail:"Les styles Néon/Luxury peuvent perturber la détection par certains scanners anciens.",
      fix:undefined, fixable:false })
    score -= 6
  }

  // -- 7. Couleurs trop proches (QR ~ fond) ----------------------------------
  const fgComponents = hexToRgb(fgHex)
  const bgComponents = hexToRgb(bgHex)
  const colorDist = Math.sqrt(
    Math.pow(fgComponents[0]-bgComponents[0], 2) +
    Math.pow(fgComponents[1]-bgComponents[1], 2) +
    Math.pow(fgComponents[2]-bgComponents[2], 2)
  )
  if (colorDist < 60 && ratio >= 3) {
    issues.push({ id:"colors-close", severity:"info",
      title:"Couleurs proches", detail:"La distance chromatique est faible — peut poser problème sur écrans à faible gamme.",
      fix:undefined, fixable:false })
    score -= 4
  }

  // -- 8. Degrades risques ---------------------------------------------------
  if (e.style.gradient !== "none" && e.style.fg2) {
    const ratio2 = contrasteWcag(e.style.fg2, bgHex)
    if (ratio2 < 3) {
      issues.push({ id:"gradient-contrast", severity:"warning",
        title:"Dégradé — couleur secondaire peu contrastée",
        detail:`La couleur fin de degrade a un contraste de ${ratio2.toFixed(1)}:1 avec le fond.`,
        fix:"Supprimer le dégradé", fixable:true })
      score -= 10
    }
  }

  score = Math.max(0, Math.min(100, score))
  const grade: ScanScore["grade"] = score >= 85 ? "Excellent" : score >= 65 ? "Bon" : score >= 40 ? "Moyen" : "Risque"
  const gradeColor = score >= 85 ? "var(--success)" : score >= 65 ? "#C9A84C" : score >= 40 ? "#F97316" : "var(--danger)"
  const minSize = ratio >= 7 ? "15mm" : ratio >= 4.5 ? "20mm" : ratio >= 3 ? "25mm" : "30mm+"
  const canAutoFix = issues.some(i => i.fixable)

  return { score, grade, gradeColor, issues, ratio: ratio.toFixed(1), minSize, canAutoFix }
}

// Compat getDiagnostic (utilise dans la modal)
export function lireContraste(fgHex: string, bgHex: string) {
  if (!fgHex || !bgHex) return null
  const ratio   = contrasteWcag(fgHex, bgHex)
  const percent = Math.min(100, Math.round(((ratio-1)/(21-1))*100))
  const warnContrast = ratio < 3; const warnLow = ratio < 4.5
  const readability = ratio >= 7 ? "Excellente" : ratio >= 4.5 ? "Bonne" : ratio >= 3 ? "Moyenne" : "Risquee"
  const readColor   = ratio >= 7 ? "var(--success)" : ratio >= 4.5 ? "#C9A84C" : ratio >= 3 ? "#F97316" : "var(--danger)"
  const minSize = ratio >= 7 ? "15mm" : ratio >= 4.5 ? "20mm" : ratio >= 3 ? "25mm" : "30mm+"
  return { ratio: ratio.toFixed(1), percent, readability, readColor, minSize, warnContrast, warnLow }
}

export function correctionsAuto(score: ScanScore, e: EntreeDiagnostic): Correction {
  let newFg = e.fg; let newBg = e.bg; let newEc = e.ecc
  let newStyleConf = { ...e.style }

  for (const issue of score.issues) {
    if (!issue.fixable) continue
    switch (issue.id) {
      case "contrast-critical":
      case "contrast-low":
        newFg = "#080808"; newBg = "#FFFFFF"
        break
      case "contrast-warn":
        // Assombrir fg si fond clair, eclaircir si fond sombre
        newFg = parseInt(e.bg.replace("#","").slice(0,2),16) > 128 ? "#000000" : "#FFFFFF"
        break
      case "transparent":
        newStyleConf = { ...newStyleConf, transparent: false }
        break
      case "logo-big":
        newStyleConf = { ...newStyleConf, logoSize: 20 }
        break
      case "logo-warn":
        newStyleConf = { ...newStyleConf, logoSize: 18 }
        break
      case "ecc-logo":
      case "ecc-l":
        newEc = "H"
        break
      case "margin-none":
        newStyleConf = { ...newStyleConf, margin: 12 }
        break
      case "margin-low":
        newStyleConf = { ...newStyleConf, margin: 10 }
        break
      case "gradient-contrast":
        newStyleConf = { ...newStyleConf, gradient: "none", fg2: "" }
        break
    }
  }
  return { fg: newFg, bg: newBg, ecc: newEc, style: newStyleConf }
}
