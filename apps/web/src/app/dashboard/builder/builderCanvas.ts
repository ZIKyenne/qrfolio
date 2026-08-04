// builderCanvas.ts — Modèle PUR du canvas responsive (mission C04, Vague 4). Aucun React/Supabase,
// ne modifie aucun bloc. Modélise appareils, orientation, zoom, ajustement, centrage, index
// d'insertion, position de la toolbar flottante, débordement et raccourcis. Déterministe, testable.
// Réutilise `resolveInsertIndex` livré en C02 (builderLibrary).

import { resolveInsertIndex } from "./builderLibrary"
export { resolveInsertIndex }

export type CanvasDevice = "mobile" | "tablet" | "desktop" | "fluid"
export type CanvasOrientation = "portrait" | "landscape"
export type CanvasMode = "edit" | "preview"

export interface DeviceDim { w: number; h: number }

// Dimensions de RÉFÉRENCE (générales, pas un modèle exact). fluid = pas de largeur fixe.
export const DEVICE_DIMS: Record<CanvasDevice, DeviceDim> = {
  mobile: { w: 390, h: 844 },
  tablet: { w: 768, h: 1024 },
  desktop: { w: 1280, h: 800 },
  fluid: { w: 0, h: 0 },
}

export const DEVICE_LABEL: Record<CanvasDevice, string> = {
  mobile: "Mobile", tablet: "Tablette", desktop: "Bureau", fluid: "Fluide",
}

// L'orientation ne s'applique qu'au mobile et à la tablette.
export function orientationApplies(device: CanvasDevice): boolean {
  return device === "mobile" || device === "tablet"
}

// Largeur de rendu du cadre. fluid → largeur disponible (bornée). paysage → échange w/h.
export function deviceFrameWidth(device: CanvasDevice, orientation: CanvasOrientation, available: number, maxFluid = 900): number {
  if (device === "fluid") return Math.max(280, Math.min(available, maxFluid))
  const d = DEVICE_DIMS[device]
  const w = orientationApplies(device) && orientation === "landscape" ? d.h : d.w
  return w
}

export function deviceLabel(device: CanvasDevice, orientation: CanvasOrientation, available: number): string {
  const w = Math.round(deviceFrameWidth(device, orientation, available))
  return `${DEVICE_LABEL[device]} · ${w} px`
}

// ── Zoom ─────────────────────────────────────────────────────────────────────
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 1.5
export const ZOOM_STEP = 0.1
export const ZOOM_DEFAULT = 1

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return ZOOM_DEFAULT
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

// Zoom suivant/précédent, arrondi au pas pour éviter les dérives flottantes.
export function stepZoom(z: number, dir: -1 | 1): number {
  const next = Math.round((z + dir * ZOOM_STEP) * 100) / 100
  return clampZoom(next)
}

export function zoomPercent(z: number): number {
  return Math.round(clampZoom(z) * 100)
}

// ── Ajuster à la largeur ─────────────────────────────────────────────────────
// Zoom optimal pour que le cadre tienne dans la largeur disponible (moins les marges).
// fluid → 1 (le cadre suit déjà la largeur). Borné.
export function fitZoom(device: CanvasDevice, orientation: CanvasOrientation, available: number, margin = 24): number {
  if (device === "fluid") return ZOOM_DEFAULT
  const frame = deviceFrameWidth(device, orientation, available)
  if (frame <= 0) return ZOOM_DEFAULT
  const usable = Math.max(0, available - margin * 2)
  return clampZoom(Math.floor((usable / frame) * 100) / 100)
}

// ── Basculer l'orientation ───────────────────────────────────────────────────
export function toggleOrientation(o: CanvasOrientation): CanvasOrientation {
  return o === "portrait" ? "landscape" : "portrait"
}

// ── Débordement ──────────────────────────────────────────────────────────────
// Vrai si le contenu (cadre × zoom) dépasse le conteneur → il faudra scroller/ajuster.
export function isOverflowing(frameWidth: number, zoom: number, containerWidth: number): boolean {
  return frameWidth * clampZoom(zoom) > containerWidth + 1
}

// ── Position de la toolbar flottante ─────────────────────────────────────────
export interface Rect { top: number; bottom: number; left: number; right: number; width: number; height: number }
export type ToolbarPlacement = "top" | "bottom" | "inside-top"
export interface ToolbarPosition { placement: ToolbarPlacement; top: number; left: number }

// Choisit au-dessus si la place existe, sinon en dessous, sinon à l'intérieur en haut.
// Coordonnées relatives au conteneur canvas. Déterministe.
export function resolveFloatingToolbarPosition(block: Rect, canvas: Rect, toolbarHeight = 34, gap = 8): ToolbarPosition {
  const spaceAbove = block.top - canvas.top
  const spaceBelow = canvas.bottom - block.bottom
  const left = Math.max(canvas.left, Math.min(block.left, canvas.right - 40))
  if (spaceAbove >= toolbarHeight + gap) return { placement: "top", top: block.top - toolbarHeight - gap, left }
  if (spaceBelow >= toolbarHeight + gap) return { placement: "bottom", top: block.bottom + gap, left }
  return { placement: "inside-top", top: block.top + gap, left }
}

// ── Insertion entre blocs ────────────────────────────────────────────────────
// Index d'insertion à partir d'une "position de gap" (0..total). Anti-double partagé (builderLibrary).
export function gapInsertIndex(total: number, gap: number): number {
  return resolveInsertIndex(total, gap)
}

// ── Position dans une page longue ────────────────────────────────────────────
export function pagePositionLabel(selectedIndex: number | null, total: number): string {
  if (total <= 0) return "0 bloc"
  if (selectedIndex == null || selectedIndex < 0) return `${total} bloc${total > 1 ? "s" : ""}`
  return `Bloc ${selectedIndex + 1} / ${total}`
}

// ── Raccourcis clavier ───────────────────────────────────────────────────────
export type CanvasShortcut = "zoomIn" | "zoomOut" | "reset" | "focus" | "escape" | null
export interface ShortcutInput { key: string; mod: boolean; editing: boolean }

// Ne déclenche jamais de raccourci pendant la saisie dans un champ (sauf Escape).
export function resolveCanvasShortcut({ key, mod, editing }: ShortcutInput): CanvasShortcut {
  if (key === "Escape") return "escape"
  if (editing) return null
  if (mod && (key === "0")) return "reset"
  if (mod && (key === "+" || key === "=")) return "zoomIn"
  if (mod && (key === "-" || key === "_")) return "zoomOut"
  if (!mod && (key === "f" || key === "F")) return "focus"
  return null
}

// ── État responsive du chrome canvas ─────────────────────────────────────────
export interface CanvasChrome {
  showDeviceFrame: boolean
  showOrientation: boolean
  showZoom: boolean
  centeredFrame: boolean
}

// Sur mobile réel, on simplifie : pas de cadre appareil (redondant), pas de zoom fin.
export function canvasChrome(device: CanvasDevice, isMobileViewport: boolean, mode: CanvasMode): CanvasChrome {
  if (mode === "preview") return { showDeviceFrame: device !== "fluid" && !isMobileViewport, showOrientation: false, showZoom: false, centeredFrame: true }
  if (isMobileViewport) return { showDeviceFrame: false, showOrientation: false, showZoom: false, centeredFrame: false }
  return {
    showDeviceFrame: device !== "fluid",
    showOrientation: orientationApplies(device),
    showZoom: true,
    centeredFrame: true,
  }
}
