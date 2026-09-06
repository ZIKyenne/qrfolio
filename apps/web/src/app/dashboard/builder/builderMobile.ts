// builderMobile.ts — Modèle PUR du Builder mobile (mission C05, Vague 5). Aucun React/Supabase, ne
// modifie aucun bloc. Modélise la navigation (6 onglets), la bottom sheet unique (3 snaps), les
// comportements après ajout/sélection, le clavier virtuel, les safe areas, la hiérarchie de retour
// arrière et les actions contextuelles. Déterministe, testé. Réutilise blockContextActions (C03).

import { blockContextActions, type BlockActionId } from "./builderUx"
import type { Block } from "./types"

// « style » ouvre le thème et les modèles de page : montée par-dessus la barre
// du haut, la coquille mobile laissait ces deux réglages — et le QR, et le nom
// de la page — hors d'atteinte.
export type MobileBuilderTab = "add" | "structure" | "edit" | "style" | "preview" | "publish"
export type MobileSnap = "compact" | "medium" | "expanded"

export type MobileSheetState =
  | { open: false }
  | { open: true; tab: MobileBuilderTab; snap: MobileSnap }

// ── Bottom navigation (max 6, §6) ────────────────────────────────────────────
export interface MobileNavItem { id: MobileBuilderTab; label: string; icon: string }
export const MOBILE_BOTTOM_NAV: MobileNavItem[] = [
  { id: "add", label: "Ajouter", icon: "➕" },
  { id: "structure", label: "Structure", icon: "🗂️" },
  { id: "edit", label: "Modifier", icon: "✏️" },
  { id: "style", label: "Style", icon: "🎨" },
  { id: "preview", label: "Aperçu", icon: "👁️" },
  { id: "publish", label: "Publier", icon: "🚀" },
]

// Onglets ouvrant une bottom sheet (preview = mode plein écran, pas une sheet).
export function opensSheet(tab: MobileBuilderTab): boolean {
  return tab !== "preview"
}

// Snap par défaut selon l'onglet (§9).
export function defaultSnap(tab: MobileBuilderTab): MobileSnap {
  if (tab === "add") return "expanded"       // recherche + longues listes
  if (tab === "structure") return "medium"
  if (tab === "publish") return "medium"
  return "medium"                             // edit
}

export function openSheet(tab: MobileBuilderTab): MobileSheetState {
  return { open: true, tab, snap: defaultSnap(tab) }
}
export const CLOSED_SHEET: MobileSheetState = { open: false }

export function setSnap(state: MobileSheetState, snap: MobileSnap): MobileSheetState {
  return state.open ? { ...state, snap } : state
}

// Hauteur d'une sheet selon le snap et la hauteur dispo (§9). Bornée.
export const SNAP_FRACTION: Record<MobileSnap, number> = { compact: 0.42, medium: 0.66, expanded: 0.94 }
export function snapHeight(snap: MobileSnap, available: number): number {
  const h = Math.round(available * SNAP_FRACTION[snap])
  return Math.max(160, Math.min(available, h))
}

// ── Priorité contextuelle (§7) ───────────────────────────────────────────────
// Onglet Modifier : ouvre les réglages si un bloc est sélectionné, sinon invite à sélectionner.
export function editTabIntent(hasSelection: boolean): "settings" | "empty" {
  return hasSelection ? "settings" : "empty"
}

// Après sélection d'un bloc → ouvrir la sheet Modifier (medium).
export function afterSelect(): MobileSheetState {
  return openSheet("edit")
}

export interface AfterAdd { select: true; sheet: MobileSheetState; scrollToNew: true }
// Après ajout d'un bloc : fermer la bibliothèque, sélectionner, ouvrir Modifier, scroller.
export function afterAdd(): AfterAdd {
  return { select: true, sheet: openSheet("edit"), scrollToNew: true }
}

// ── Clavier virtuel (§16) ────────────────────────────────────────────────────
// Clavier ouvert : la sheet passe en expanded (le champ reste visible), la bottom nav se masque.
export function sheetForKeyboard(state: MobileSheetState, keyboardOpen: boolean): MobileSheetState {
  if (!keyboardOpen || !state.open) return state
  return { ...state, snap: "expanded" }
}
export function bottomNavVisible(keyboardOpen: boolean): boolean {
  return !keyboardOpen
}
// Hauteur utile de la zone d'édition sous le clavier (Visual Viewport). Bornée ≥ 0.
export function usableHeight(viewportHeight: number, keyboardHeight: number): number {
  return Math.max(0, viewportHeight - Math.max(0, keyboardHeight))
}

// ── Safe areas (§17) ─────────────────────────────────────────────────────────
// La safe area basse ne s'applique qu'une fois : à la bottom nav si visible, sinon à la sheet.
export interface SafeAreaTargets { header: boolean; bottomNav: boolean; sheet: boolean }
export function safeAreaTargets(sheet: MobileSheetState, keyboardOpen: boolean): SafeAreaTargets {
  const navVisible = bottomNavVisible(keyboardOpen)
  return { header: true, bottomNav: navVisible, sheet: sheet.open && !navVisible }
}

// ── Hiérarchie de retour arrière (§20) ───────────────────────────────────────
export type BackAction = "closeMenu" | "closeSubView" | "closeSheet" | "exitPreview" | "leave"
export interface BackContext { menuOpen?: boolean; subViewOpen?: boolean; sheetOpen?: boolean; previewMode?: boolean }
export function resolveBackAction(ctx: BackContext): BackAction {
  if (ctx.menuOpen) return "closeMenu"
  if (ctx.subViewOpen) return "closeSubView"
  if (ctx.sheetOpen) return "closeSheet"
  if (ctx.previewMode) return "exitPreview"
  return "leave"
}

// ── Paysage / tablette (§18-19) ──────────────────────────────────────────────
export const TABLET_MIN_WIDTH = 700
export interface MobileChrome { compactNav: boolean; sheetSide: boolean; useTabletRail: boolean }
export function mobileChrome(width: number, height: number): MobileChrome {
  const landscape = width > height
  const tablet = Math.min(width, height) >= TABLET_MIN_WIDTH || width >= TABLET_MIN_WIDTH * 1.4
  return {
    compactNav: landscape && !tablet,          // paysage téléphone : nav réduite
    sheetSide: landscape && !tablet,           // sheet latérale pour garder le canvas visible
    useTabletRail: tablet,                      // tablette : rail/panneau latéral, pas l'UI téléphone
  }
}

// ── Statut de sauvegarde / publication (badges, §22-23) ──────────────────────
export function mobileSaveError(saveError: boolean): boolean { return !!saveError }
// Badge sur l'onglet Publier : erreur de sauvegarde à corriger avant publication.
export function publishTabBadge(saveError: boolean): "error" | null {
  return saveError ? "error" : null
}

export interface PublishSummary { blocks: number; hiddenEmpty: number; warnings: string[] }
// Résumé fiable avant publication (§23) — uniquement des données connues.
export function publishSummary(blocks: Block[], isEmpty: (b: Block) => boolean): PublishSummary {
  const hiddenEmpty = blocks.filter(b => b.visible && isEmpty(b)).length
  const warnings: string[] = []
  if (blocks.length === 0) warnings.push("La page ne contient aucun bloc.")
  if (hiddenEmpty > 0) warnings.push(`${hiddenEmpty} bloc${hiddenEmpty > 1 ? "s" : ""} vide${hiddenEmpty > 1 ? "s" : ""} — invisible${hiddenEmpty > 1 ? "s" : ""} en ligne.`)
  return { blocks: blocks.length, hiddenEmpty, warnings }
}

// ── Actions contextuelles (barre mobile, §14) ────────────────────────────────
export interface MobileContextActions { primary: BlockActionId[]; more: BlockActionId[] }
export const MOBILE_PRIMARY_ACTIONS: BlockActionId[] = ["settings", "duplicate", "moveUp", "moveDown"]
export const MOBILE_MORE_ACTIONS: BlockActionId[] = ["toggleVisible", "toggleLock", "toggleDraft", "delete"]

// Actions disponibles pour un bloc (respecte verrouillage via blockContextActions).
export function mobileContextActions(block: Block, index: number, total: number): { id: BlockActionId; disabled: boolean }[] {
  const all = blockContextActions(block, { index, total, mobile: true })
  const wanted = new Set([...MOBILE_PRIMARY_ACTIONS, ...MOBILE_MORE_ACTIONS])
  return all.filter(a => wanted.has(a.id)).map(a => ({ id: a.id, disabled: a.disabled }))
}

// ── Restauration d'état (§4) ─────────────────────────────────────────────────
// Rouvre la sheet précédente si l'onglet ouvre une sheet ; preview reste un mode.
export function restoreSheet(tab: MobileBuilderTab | null): MobileSheetState {
  if (!tab || !opensSheet(tab)) return CLOSED_SHEET
  return openSheet(tab)
}
