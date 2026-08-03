// architecture.ts — CONTRATS PRÉPARATOIRES du renderer partagé (mission B09.1).
// INERTE : aucun renderer ne l'importe, aucun effet runtime, aucun bloc migré.
// Sert de référence typée pour B09.2 (infra + 3 pilotes derrière flag). Voir
// docs/SHARED-RENDERER-ARCHITECTURE.md.

import type { ComponentType, ReactNode } from "react"
import type { PageTheme } from "../types"

// ── Mode & statut de migration ──────────────────────────────────────────────
export type RenderMode = "editor" | "public"
// legacy = 2 renderers actuels ; pilot = migré mais derrière flag ; shared = activé.
export type RendererMigrationStatus = "legacy" | "pilot" | "shared"

// ── Contextes (capacités explicites, PAS 50 callbacks optionnels) ───────────
export type SharedBlockContext = {
  mode: RenderMode
  pageId: string
  blockId: string
  theme: PageTheme
}

// Capacité d'édition inline (fournie uniquement en mode éditeur).
export type InlineEditCapability = {
  editable: boolean
  commit: (key: string, value: string) => void
}

// Capacité de rendu de lien : l'adapter décide navigable (public) vs neutralisé (éditeur).
export type LinkRenderProps = { href: string | null; label: ReactNode; external?: boolean; trackKey?: string }
export type LinkRenderer = ComponentType<LinkRenderProps>

// Capacité de tracking (public uniquement ; jamais dans les models purs).
export type TrackingCapability = {
  onLinkClick?: (target: string) => void
  onImpression?: () => void
}

export type EditorBlockContext = SharedBlockContext & {
  mode: "editor"
  selected: boolean
  locked: boolean
  compact: boolean
  onSelect: () => void
  inlineEdit: InlineEditCapability
  Link: LinkRenderer            // rend un élément NON navigable
}

export type PublicBlockContext = SharedBlockContext & {
  mode: "public"
  ownerEmail?: string
  tracking: TrackingCapability
  Link: LinkRenderer            // rend un <a> réel sécurisé + tracké
}

export type AnyBlockContext = EditorBlockContext | PublicBlockContext

// ── View model : PUR, sans React. `visible` = décision d'état vide sémantique. ──
export type BlockViewModel = { visible: boolean }

// Contexte minimal passé au constructeur de view model (pur : thème + ids, pas de callbacks).
export type ViewModelContext = { theme: PageTheme; pageId: string; blockId: string }

// ── Enregistrement d'un bloc dans le registre partagé ───────────────────────
export type SharedViewProps<TViewModel extends BlockViewModel> = { model: TViewModel; ctx: AnyBlockContext }
export type BlockRendererRegistration<TContent = Record<string, any>, TViewModel extends BlockViewModel = BlockViewModel> = {
  type: string
  status: RendererMigrationStatus
  createViewModel: (content: TContent, ctx: ViewModelContext) => TViewModel
  SharedView?: ComponentType<SharedViewProps<TViewModel>>
  EditorAdapter?: ComponentType<SharedViewProps<TViewModel>>
  PublicAdapter?: ComponentType<SharedViewProps<TViewModel>>
}

// ── Flag de migration — pilotes ACTIVÉS (B09.3) ─────────────────────────────
// Parité prouvée par renderParity.test.tsx (HTML identique au legacy) + models/bundle.
// Rollback = retirer un type de ce set → retour legacy immédiat, aucune donnée touchée.
// Les `case` legacy restent conservés (statut « pilot activé », pas « legacy supprimable »).
export const SHARED_RENDERER_BLOCKS: ReadonlySet<string> = new Set<string>([
  // Pilotes B09.3
  "heading", "values", "pricing",
  // Vague 1 — blocs atomiques simples (B09.4)
  "divider", "spacer", "bio", "skills", "languages", "advantages",
])

// Blocs prévus comme pilotes en B09.2 (déclaratif, NON activé). Voir SHARED-RENDERER-PILOT.md.
export const PLANNED_PILOT_BLOCKS = ["heading", "values", "pricing"] as const

// Résout quel moteur utiliser. Par défaut LEGACY tant que le type n'est pas dans le flag.
export function resolveRendererStatus(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): RendererMigrationStatus {
  return active.has(type) ? "shared" : "legacy"
}

// Statut de migration à 3 états : shared si activé, pilot si prêt mais non activé, sinon legacy.
export function migrationStatusOf(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): RendererMigrationStatus {
  if (active.has(type)) return "shared"
  if ((PLANNED_PILOT_BLOCKS as readonly string[]).includes(type)) return "pilot"
  return "legacy"
}

// Un enregistrement `shared`/`pilot` DOIT fournir les 3 briques (view model + vue + adapters).
export function isRegistrationComplete(r: BlockRendererRegistration<any, any>): boolean {
  if (r.status === "legacy") return true
  return typeof r.createViewModel === "function" && !!r.SharedView && !!r.EditorAdapter && !!r.PublicAdapter
}
