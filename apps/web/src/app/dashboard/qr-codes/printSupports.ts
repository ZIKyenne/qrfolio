// =============================================================================
// printSupports.ts — Catalogue PUR des supports imprimables (données + calculs).
// Aucun React, aucun canvas -> entièrement testable (printSupports.test.ts).
//
// C"est la brique fondatrice du Atelier d'impression : un « support » cesse d"être un
// {label, ratio, exportW} anémique pour devenir un vrai gabarit imprimeur
// (dimensions mm, fond perdu, marge de sécurité, DPI conseillé, forme, catégorie).
//
// RÉUTILISE les moteurs purs existants sans les réécrire :
//   - exportPlan.ts       (dimensions px/mm, gating, nom de fichier)
//   - printPreflight.ts   (score de pré-vol par 7 contrôles)
// PrintStudio dérive ses FORMATS / FORMAT_MM d'ici (source unique des formats).
// =============================================================================

import type { ExportPlanInput, ExportType } from "./exportPlan"
import type { PreflightMetrics } from "./printPreflight"
import { impositionLayout, type ImpoLayout } from "./impositionLayout"

export type SupportCategory =
  | "carte"    // carte de visite, carte postale
  | "sticker"  // autocollant rond / carré
  | "affiche"  // A4, A3, US Letter
  | "flyer"    // A5, A6
  | "chevalet" // carte de table, chevalet
  | "signet"   // marque-page
  | "reseau"   // post carré réseaux sociaux
  | "ecran"    // story / vertical écran (pas d'impression)

export type SupportShape = "rect" | "round" | "square"

export type PrintSupport = {
  id: string
  label: string
  category: SupportCategory
  ratio: number        // largeur / hauteur (aspect), indépendant des mm
  exportW: number       // largeur de référence en px à 300 DPI (px cible pour l'écran)
  mm: number            // largeur physique du support en mm (0 = format écran)
  bleedMm: number       // fond perdu conseillé (0 pour l'écran)
  safeMarginMm: number  // marge de sécurité intérieure (zone tranquille)
  dpi: number           // DPI conseillé pour ce support (72 pour l'écran)
  shape: SupportShape
  isScreen: boolean     // true = destiné à un écran, pas à l'impression
  hint: string          // aide courte orientée usage
}

const MM_PER_INCH = 25.4

// Largeur d'export en px pour un support à un DPI donné (miroir de exportWidthPx).
export function exportWFor(s: PrintSupport, dpi = 300): number {
  return Math.max(1, Math.round(s.exportW * (dpi / 300)))
}

// Largeur px « idéale » à 300 DPI pour une largeur physique (mm). Sert à vérifier
// que exportW d'un support d'impression correspond bien à sa taille réelle.
export function idealExportW300(mm: number): number {
  return Math.round((mm / MM_PER_INCH) * 300)
}

// Fond perdu en px pour une largeur de rendu donnée (miroir du calcul inline de
// l'export PDF : bleedMm normalisé -> px selon la largeur physique). 0 si écran.
export function bleedPx(s: PrintSupport, renderWidthPx: number): number {
  if (s.mm <= 0 || s.bleedMm <= 0) return 0
  return Math.round(s.bleedMm * (renderWidthPx / s.mm))
}

// Entrée prête pour exportPlan() (réutilise le moteur d'export tel quel).
export function supportExportInput(
  s: PrintSupport,
  dpi: number,
  type: ExportType,
  isPro: boolean,
): ExportPlanInput {
  return { format: s.id, exportW: s.exportW, ratio: s.ratio, widthMm: s.mm, dpi, type, isPro }
}

// Métriques de base pour printPreflight() attendues de CE support (le reste — QR
// mesuré, contraste, zone tranquille — vient de l'adaptateur canvas).
export function supportPreflightBaseline(s: PrintSupport): Partial<PreflightMetrics> {
  return { dpi: s.dpi, edgeMarginMm: s.safeMarginMm, isScreen: s.isScreen }
}

// -----------------------------------------------------------------------------
// LE CATALOGUE
// Les 6 premiers reprennent À L'IDENTIQUE les FORMATS/FORMAT_MM historiques de
// PrintStudio (ratio, exportW, mm inchangés) -> zéro régression. Les suivants
// sont des ajouts purs (données), tous bien dimensionnés pour l'export navigateur.
// -----------------------------------------------------------------------------
export const PRINT_SUPPORTS: PrintSupport[] = [
  // ---- Historiques (valeurs identiques) -------------------------------------
  { id: "a4",     label: "A4",              category: "affiche",  ratio: 210 / 297,   exportW: 2480, mm: 210, bleedMm: 3, safeMarginMm: 5, dpi: 300, shape: "rect",   isScreen: false, hint: "Affiche A4 (210 × 297 mm)" },
  { id: "square", label: "Carré",           category: "reseau",   ratio: 1,           exportW: 2000, mm: 100, bleedMm: 0, safeMarginMm: 4, dpi: 72,  shape: "square", isScreen: false, hint: "Post carré pour les réseaux" },
  { id: "story",  label: "Story",           category: "ecran",    ratio: 1080 / 1920, exportW: 1080, mm: 0,   bleedMm: 0, safeMarginMm: 0, dpi: 72,  shape: "rect",   isScreen: true,  hint: "Format vertical 9:16 (écran)" },
  { id: "carte",  label: "Carte",           category: "carte",    ratio: 85 / 55,     exportW: 1004, mm: 85,  bleedMm: 2, safeMarginMm: 3, dpi: 300, shape: "rect",   isScreen: false, hint: "Carte de visite paysage (85 × 55 mm)" },
  { id: "flyer",  label: "Flyer",           category: "flyer",    ratio: 148 / 210,   exportW: 1748, mm: 148, bleedMm: 3, safeMarginMm: 4, dpi: 300, shape: "rect",   isScreen: false, hint: "Flyer A5 portrait (148 × 210 mm)" },
  { id: "table",  label: "Table",           category: "chevalet", ratio: 100 / 70,    exportW: 1181, mm: 100, bleedMm: 3, safeMarginMm: 4, dpi: 300, shape: "rect",   isScreen: false, hint: "Carte de table (100 × 70 mm)" },

  // ---- Ajouts (nouveaux supports imprimables) -------------------------------
  { id: "a3",             label: "A3",             category: "affiche", ratio: 297 / 420,  exportW: 3508, mm: 297, bleedMm: 3, safeMarginMm: 6, dpi: 200, shape: "rect",   isScreen: false, hint: "Grande affiche A3 (297 × 420 mm)" },
  { id: "a6",             label: "A6 · Carte postale", category: "flyer", ratio: 105 / 148, exportW: 1240, mm: 105, bleedMm: 3, safeMarginMm: 4, dpi: 300, shape: "rect", isScreen: false, hint: "Carte postale A6 (105 × 148 mm)" },
  { id: "us_letter",      label: "US Letter",      category: "affiche", ratio: 8.5 / 11,   exportW: 2550, mm: 216, bleedMm: 3, safeMarginMm: 6, dpi: 300, shape: "rect",   isScreen: false, hint: "Format US Letter (8,5 × 11 in)" },
  { id: "carte_portrait", label: "Carte portrait", category: "carte",   ratio: 55 / 85,    exportW: 650,  mm: 55,  bleedMm: 2, safeMarginMm: 3, dpi: 300, shape: "rect",   isScreen: false, hint: "Carte de visite portrait (55 × 85 mm)" },
  { id: "sticker_square", label: "Sticker carré",  category: "sticker", ratio: 1,          exportW: 591,  mm: 50,  bleedMm: 2, safeMarginMm: 3, dpi: 300, shape: "square", isScreen: false, hint: "Autocollant carré (50 × 50 mm)" },
  { id: "sticker_round",  label: "Sticker rond",   category: "sticker", ratio: 1,          exportW: 591,  mm: 50,  bleedMm: 2, safeMarginMm: 4, dpi: 300, shape: "round",  isScreen: false, hint: "Autocollant rond Ø 50 mm (zone utile ronde)" },
  { id: "marque_page",    label: "Marque-page",    category: "signet",  ratio: 55 / 160,   exportW: 650,  mm: 55,  bleedMm: 2, safeMarginMm: 4, dpi: 300, shape: "rect",   isScreen: false, hint: "Marque-page (55 × 160 mm)" },
]

const BY_ID: Record<string, PrintSupport> = Object.fromEntries(PRINT_SUPPORTS.map(s => [s.id, s]))

export function supportById(id: string): PrintSupport | undefined {
  return BY_ID[id]
}

export function supportsByCategory(cat: SupportCategory): PrintSupport[] {
  return PRINT_SUPPORTS.filter(s => s.category === cat)
}

// -----------------------------------------------------------------------------
// PLANCHES (imposition N-up) — tile un support « pièce » sur un support « planche ».
// Réutilise impositionLayout (moteur pur testé) : le catalogue fournit les mm.
// Ex. : imprimer une planche A4/A3 de stickers 50 mm ou de cartes de visite.
// -----------------------------------------------------------------------------

// Dimensions physiques (mm) d'un support, orientation optionnelle. Renvoie
// { w: 0, h: 0 } pour un format écran (pas de taille physique).
export function pageMmOf(
  s: PrintSupport,
  orientation?: "portrait" | "landscape",
): { w: number; h: number } {
  if (s.mm <= 0) return { w: 0, h: 0 }
  const w = s.mm
  const h = Math.round((s.mm / s.ratio) * 10) / 10
  const long = Math.max(w, h), short = Math.min(w, h)
  if (orientation === "portrait") return { w: short, h: long }
  if (orientation === "landscape") return { w: long, h: short }
  return { w, h }
}

// -----------------------------------------------------------------------------
// GUIDES D'ÉCRAN — géométrie du repère « zone de sécurité » affiché sur le canvas.
// Pur (px) -> testable ; l'adaptateur (PrintStudio) dessine le Rect/Ellipse.
// -----------------------------------------------------------------------------
export type OverlayGuide = { insetPx: number; shape: SupportShape }

// Repère de marge de sécurité pour un support, en px, selon la largeur du canvas.
// Inset = safeMarginMm converti via la largeur physique ; repli 4 % en format écran.
export function safeAreaGuide(support: PrintSupport | undefined, canvasW: number): OverlayGuide {
  const mm = support?.mm ?? 0
  const safeMm = support?.safeMarginMm ?? 5
  const insetPx = mm > 0 ? Math.round((safeMm / mm) * canvasW) : Math.round(canvasW * 0.04)
  return { insetPx: Math.max(0, insetPx), shape: support?.shape ?? "rect" }
}

export type SheetImpoInput = {
  item: PrintSupport   // support à répéter (pièce)
  sheet: PrintSupport  // support-planche (A4, A3, US Letter…)
  count: number
  gutterMm?: number    // gouttière entre pièces (massicot) ; défaut 4
  marginMm?: number    // marge de la planche ; défaut = marge de sécurité de la planche
  sheetOrientation?: "portrait" | "landscape"
}

// Peut-on imposer cette pièce sur cette planche ? (les deux doivent être physiques.)
export function canImpose(item: PrintSupport, sheet: PrintSupport): boolean {
  return item.mm > 0 && sheet.mm > 0
}

// Plan d'imposition (grille, pages, positions mm) pour tiler `item` sur `sheet`.
export function sheetImposition(i: SheetImpoInput): ImpoLayout {
  const page = pageMmOf(i.sheet, i.sheetOrientation)
  const item = pageMmOf(i.item)
  return impositionLayout({
    count: i.count,
    pageW: page.w,
    pageH: page.h,
    cellW: item.w,
    cellH: item.h,
    margin: i.marginMm ?? i.sheet.safeMarginMm,
    gutter: i.gutterMm ?? 4,
  })
}

// Enregistrements dérivés pour PrintStudio (compat avec le code existant qui lit
// FORMATS[id].{label,ratio,exportW} et FORMAT_MM[id]). Ordre = ordre du catalogue,
// donc les 6 formats historiques restent en tête, dans le même ordre.
export function legacyFormats(): Record<string, { label: string; ratio: number; exportW: number }> {
  return Object.fromEntries(PRINT_SUPPORTS.map(s => [s.id, { label: s.label, ratio: s.ratio, exportW: s.exportW }]))
}

export function legacyFormatMm(): Record<string, number> {
  return Object.fromEntries(PRINT_SUPPORTS.map(s => [s.id, s.mm]))
}
