"use client"

// MobileBuilderShell.tsx — Coquille mobile complète du Builder (mission C05, Vague 5). Compose header,
// canvas (slot), barre contextuelle, bottom navigation et la bottom sheet UNIQUE hébergeant
// Ajouter (BlockLibrary C02), Structure (outline mobile), Modifier (BlockSettingsPanel C03), Publier.
// Gère l'état sheet (builderMobile), le clavier (Visual Viewport), le paysage/tablette et le retour
// arrière. Rendu derrière BUILDER_REDESIGN ou dans le harness. Ne duplique aucune logique métier.

import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react"
import { BUILDER_UI } from "./builderUi"
import {
  MOBILE_BOTTOM_NAV, openSheet, CLOSED_SHEET, setSnap, sheetForKeyboard, bottomNavVisible,
  safeAreaTargets, resolveBackAction, mobileChrome, afterAdd, editTabIntent, publishTabBadge,
  publishSummary, mobileContextActions, type MobileBuilderTab, type MobileSheetState, type MobileSnap,
} from "./builderMobile"
import { isBlockEmpty } from "./builderSettings"
import { MobileBuilderHeader } from "./MobileBuilderHeader"
import { MobileBottomNavigation } from "./MobileBottomNavigation"
import { MobileBottomSheet } from "./MobileBottomSheet"
import { MobileContextBar } from "./MobileContextBar"
import { BlockLibrary } from "./BlockLibrary"
import { BlockSettingsPanel } from "./BlockSettingsPanel"
import { type Block } from "./types"
import { BLOCK_DEFS } from "./blockDefs"
import type { BlockActionId } from "./builderUx"

const MUTED = BUILDER_UI.text.muted

export interface MobileBuilderShellProps {
  pageName: string
  saving: boolean; saved: boolean; saveError: boolean; saveErrorMsg?: string; hasUnsaved: boolean
  canUndo: boolean; canRedo: boolean
  onUndo: () => void; onRedo: () => void; onSave?: () => void; onRetry?: () => void; onBack: () => void
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  favorites: string[]; recents: string[]; onToggleFavorite: (t: string) => void
  onAddBlock: (type: string) => void
  onChange: (id: string, k: string, v: string) => void
  onDuplicate: (id: string) => void; onDelete: (id: string) => void
  onToggleVisible: (id: string) => void; onToggleLock: (id: string) => void; onToggleDraft: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void; onReset: (id: string) => void
  /** Confirmation, fournie par l'éditeur (useConfirm). La boîte native du
   *  navigateur bloquait le fil d'exécution, ignorait la charte et, sur iOS,
   *  s'ouvrait derrière la feuille de réglages. */
  confirm: (message: string) => Promise<boolean>
  /** Renommer la page (en-tête). Absent = nom en lecture seule. */
  onRename?: (nom: string) => void
  /** Contenu de l'onglet « Style » : le thème, et les modèles de page. Ces deux
   *  réglages n'avaient aucune porte sur téléphone. */
  renderTheme?: () => React.ReactNode
  renderTemplates?: () => React.ReactNode
  /** Le QR de la page, montré dans l'onglet « Publier ». */
  renderQr?: () => React.ReactNode
  pageStatus: string; publishing?: boolean; publishError?: string; onPublish?: () => void; publicUrl?: string
  /** Slot canvas (aperçu réel des blocs). */
  renderCanvas: () => ReactNode
  renderLegacyContent?: (block: Block) => ReactNode
  renderLegacyDesign?: (block: Block) => ReactNode
  viewport?: { w: number; h: number }
  /** Force l'état clavier (harness/tests) — sinon détecté via Visual Viewport. */
  keyboardOpenOverride?: boolean
}

export function MobileBuilderShell(p: MobileBuilderShellProps) {
  const [sheet, setSheet] = useState<MobileSheetState>(CLOSED_SHEET)
  const [preview, setPreview] = useState(false)
  const [keyboardOpenVV, setKeyboardOpenVV] = useState(false)
  const keyboardOpen = p.keyboardOpenOverride ?? keyboardOpenVV
  const [structureQuery, setStructureQuery] = useState("")

  const selected = p.selectedId ? p.blocks.find(b => b.id === p.selectedId) ?? null : null
  const selIndex = selected ? p.blocks.findIndex(b => b.id === selected.id) : -1

  // Clavier virtuel via Visual Viewport (§16).
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return
    const onResize = () => setKeyboardOpenVV(vv.height < window.innerHeight - 120)
    vv.addEventListener("resize", onResize)
    return () => vv.removeEventListener("resize", onResize)
  }, [])

  const chrome = useMemo(() => mobileChrome(p.viewport?.w ?? 390, p.viewport?.h ?? 844), [p.viewport])
  const effectiveSheet = sheetForKeyboard(sheet, keyboardOpen)
  const navVisible = bottomNavVisible(keyboardOpen) && !preview
  const safe = safeAreaTargets(effectiveSheet, keyboardOpen)

  const activeTab: MobileBuilderTab | null = preview ? "preview" : effectiveSheet.open ? effectiveSheet.tab : null

  const openTab = useCallback((tab: MobileBuilderTab) => {
    if (tab === "preview") { setSheet(CLOSED_SHEET); setPreview(true); return }
    setPreview(false)
    if (tab === "edit" && editTabIntent(!!p.selectedId) === "empty") { setSheet(openSheet("edit")); return }
    setSheet(openSheet(tab))
  }, [p.selectedId])

  const closeSheet = () => setSheet(CLOSED_SHEET)

  // Retour arrière (§20).
  const handleBack = useCallback(() => {
    const action = resolveBackAction({ sheetOpen: sheet.open, previewMode: preview })
    if (action === "closeSheet") closeSheet()
    else if (action === "exitPreview") setPreview(false)
    else p.onBack()
  }, [sheet.open, preview, p])

  // Sélection depuis le canvas → ouvrir Modifier.
  const selectAndEdit = (id: string) => { p.onSelect(id); setPreview(false); setSheet(openSheet("edit")) }

  // Ajout → afterAdd (sélection + ouverture Modifier gérées par le parent via onAddBlock + ici).
  const addBlock = (type: string) => {
    p.onAddBlock(type)
    const a = afterAdd()
    setSheet(a.sheet)
  }

  const blockHandlers = (b: Block, index: number): Partial<Record<BlockActionId, () => void>> => ({
    settings: () => { p.onSelect(b.id); setSheet(openSheet("edit")) },
    duplicate: () => p.onDuplicate(b.id),
    moveUp: () => p.onMove(b.id, -1),
    moveDown: () => p.onMove(b.id, 1),
    toggleVisible: () => p.onToggleVisible(b.id),
    toggleLock: () => p.onToggleLock(b.id),
    toggleDraft: () => p.onToggleDraft(b.id),
    delete: () => p.onDelete(b.id),
  })

  const summary = useMemo(() => publishSummary(p.blocks, isBlockEmpty), [p.blocks])
  const filteredStructure = useMemo(() => {
    const q = structureQuery.trim().toLowerCase()
    if (!q) return p.blocks
    return p.blocks.filter(b => (BLOCK_DEFS[b.type]?.label ?? b.type).toLowerCase().includes(q) || b.type.includes(q))
  }, [p.blocks, structureQuery])

  const sheetTitle: Record<MobileBuilderTab, string> = { add: "Ajouter un bloc", structure: "Structure de la page", edit: "Réglages du bloc", style: "Style de la page", preview: "Aperçu", publish: "Publier la page" }

  return (
    <div data-testid="mobile-shell" data-preview={preview ? "1" : "0"} data-keyboard={keyboardOpen ? "1" : "0"}
      onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); handleBack() } }}
      style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", background: "#080808", overflow: "hidden" }}>

      {!preview && (
        <MobileBuilderHeader
          pageName={p.pageName} saving={p.saving} saved={p.saved} saveError={p.saveError} saveErrorMsg={p.saveErrorMsg} hasUnsaved={p.hasUnsaved}
          canUndo={p.canUndo} canRedo={p.canRedo} onBack={handleBack} onUndo={p.onUndo} onRedo={p.onRedo} onSave={p.onSave} onRetry={p.onRetry}
          onRename={p.onRename} />
      )}

      {/* CANVAS (plein largeur, pas de frame téléphone dans un téléphone) */}
      <div data-testid="mobile-canvas" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: preview ? "calc(env(safe-area-inset-top) + 8px) 0 0" : "10px" }}
        onClick={e => { if (e.target === e.currentTarget) p.onSelect(null) }}>
        {preview && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px 10px" }}>
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }} data-testid="mobile-preview-banner">Aperçu</span>
            <div style={{ flex: 1 }} />
            <button type="button" data-testid="mobile-exit-preview" onClick={() => setPreview(false)} style={{ padding: "8px 14px", minHeight: 40, borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#F5F0E8", fontSize: 13, cursor: "pointer" }}>Éditer</button>
          </div>
        )}
        {p.renderCanvas()}
      </div>

      {/* Barre contextuelle du bloc sélectionné (hors aperçu, sheet fermée) */}
      {!preview && selected && !effectiveSheet.open && navVisible && (
        <MobileContextBar block={selected} index={selIndex} total={p.blocks.length}
          handlers={blockHandlers(selected, selIndex)} onMore={() => { p.onSelect(selected.id); setSheet(openSheet("edit")) }} />
      )}

      {/* Bottom navigation */}
      {navVisible && (
        <MobileBottomNavigation active={activeTab} compact={chrome.compactNav} badges={{ publish: publishTabBadge(p.saveError) ?? undefined }}
          onSelect={openTab} />
      )}

      {/* BOTTOM SHEET UNIQUE — seul l'onglet actif est monté (perf §27) */}
      <MobileBottomSheet
        open={effectiveSheet.open}
        title={effectiveSheet.open ? sheetTitle[effectiveSheet.tab] : ""}
        snap={effectiveSheet.open ? effectiveSheet.snap : "medium"}
        onSnap={(s: MobileSnap) => setSheet(cur => setSnap(cur, s))}
        onClose={closeSheet}
        safeAreaBottom={safe.sheet}
        side={chrome.sheetSide}
      >
        {effectiveSheet.open && effectiveSheet.tab === "add" && (
          <BlockLibrary favorites={p.favorites} recents={p.recents} recoContext="default" mobile hideHeader
            onAdd={addBlock} onToggleFavorite={p.onToggleFavorite} onRequestClose={closeSheet} />
        )}

        {effectiveSheet.open && effectiveSheet.tab === "edit" && (
          <BlockSettingsPanel block={selected} mobile index={selIndex < 0 ? 0 : selIndex} total={p.blocks.length}
            onChange={(k, v) => { if (selected) p.onChange(selected.id, k, v) }}
            onDuplicate={() => selected && p.onDuplicate(selected.id)}
            onDelete={() => selected && p.onDelete(selected.id)}
            onToggleVisible={() => selected && p.onToggleVisible(selected.id)}
            onToggleLock={() => selected && p.onToggleLock(selected.id)}
            onToggleDraft={() => selected && p.onToggleDraft(selected.id)}
            onResetBlock={() => selected && p.onReset(selected.id)}
            onRequestClose={closeSheet}
            onOpenLibrary={() => setSheet(openSheet("add"))}
            confirm={p.confirm}
            renderLegacyContent={p.renderLegacyContent}
            renderLegacyDesign={p.renderLegacyDesign} />
        )}

        {effectiveSheet.open && effectiveSheet.tab === "structure" && (
          <div style={{ padding: "0 12px 16px" }}>
            <input value={structureQuery} onChange={e => setStructureQuery(e.target.value)} type="search"
              aria-label="Rechercher un bloc" placeholder="Rechercher un bloc…"
              style={{ width: "100%", boxSizing: "border-box", height: 44, background: "#111", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10, padding: "0 12px", color: "var(--ink, #F5F0E8)", fontSize: 15, outline: "none", marginBottom: 10 }} />
            {filteredStructure.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Aucun bloc.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredStructure.map((b) => {
                const idx = p.blocks.findIndex(x => x.id === b.id)
                const def = BLOCK_DEFS[b.type]
                return (
                  <div key={b.id} data-structure-row={b.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: `1px solid ${b.id === p.selectedId ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.07)"}`, background: b.id === p.selectedId ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(255,255,255,0.02)", opacity: b.visible ? 1 : 0.5 }}>
                    <span style={{ width: 22, textAlign: "center", color: MUTED, fontSize: 10, fontWeight: 700 }}>{idx + 1}</span>
                    <button type="button" data-structure-select={b.id} onClick={() => selectAndEdit(b.id)}
                      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--ink, #F5F0E8)", textAlign: "left", padding: 0, minHeight: 40 }}>
                      <span aria-hidden="true" style={{ fontSize: 15 }}>{def?.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}>{def?.label ?? b.type}</span>
                      {b.draft && <span aria-label="Brouillon" style={{ fontSize: 11 }}>✏</span>}
                      {b.locked && <span aria-label="Verrouillé" style={{ fontSize: 11 }}>🔒</span>}
                      {!b.visible && <span aria-label="Masqué" style={{ fontSize: 11 }}>🚫</span>}
                    </button>
                    <button type="button" aria-label="Monter" disabled={idx === 0 || !!b.locked} onClick={() => p.onMove(b.id, -1)} style={miniBtn(idx === 0 || !!b.locked)}>↑</button>
                    <button type="button" aria-label="Descendre" disabled={idx === p.blocks.length - 1 || !!b.locked} onClick={() => p.onMove(b.id, 1)} style={miniBtn(idx === p.blocks.length - 1 || !!b.locked)}>↓</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {effectiveSheet.open && effectiveSheet.tab === "style" && (
          <div style={{ padding: "0 14px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
            {p.renderTheme
              ? p.renderTheme()
              : <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>Le thème n'est pas disponible ici.</p>}
            {p.renderTemplates && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: MUTED }}>Partir d'un modèle</p>
                {p.renderTemplates()}
              </div>
            )}
          </div>
        )}

        {effectiveSheet.open && effectiveSheet.tab === "publish" && (
          <div style={{ padding: "0 14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: p.pageStatus === "published" ? "color-mix(in srgb, var(--success) 10%, transparent)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink, #F5F0E8)" }}>{p.pageStatus === "published" ? "Page en ligne" : "Brouillon (non publié)"}</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <li style={{ fontSize: 12.5, color: MUTED }}>📦 {summary.blocks} bloc{summary.blocks > 1 ? "s" : ""}</li>
              {summary.warnings.map((w, i) => <li key={i} data-testid="publish-warning" style={{ fontSize: 12.5, color: "var(--warning)" }}>⚠ {w}</li>)}
              {p.saveError && <li data-testid="publish-save-error" style={{ fontSize: 12.5, color: "var(--danger)" }}>⚠ Sauvegarde en erreur — réessayez avant de publier.</li>}
            </ul>
            <button type="button" data-testid="mobile-publish" disabled={!p.onPublish || p.publishing || p.saveError} onClick={() => p.onPublish?.()}
              style={{ minHeight: 48, borderRadius: 12, border: "none", background: "var(--accent)", color: "#080808", fontSize: 14, fontWeight: 800, cursor: p.onPublish && !p.publishing && !p.saveError ? "pointer" : "not-allowed", opacity: p.onPublish && !p.saveError ? 1 : 0.5 }}>
              {p.publishing ? "Publication…" : p.pageStatus === "published" ? "Mettre à jour la page" : "Publier maintenant"}
            </button>
            {p.publishError && <p data-testid="publish-error" style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{p.publishError}</p>}
            {/* Le QR de la page : sur téléphone, il n'avait aucune porte. */}
            {p.renderQr && <div style={{ paddingTop: 4 }}>{p.renderQr()}</div>}
            {p.publicUrl && <a href={p.publicUrl} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", fontSize: 13, color: "var(--accent)", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Ouvrir la page ↗</a>}
          </div>
        )}
      </MobileBottomSheet>
    </div>
  )
}

const miniBtn = (disabled: boolean): React.CSSProperties => ({
  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
  color: disabled ? "rgba(255,255,255,0.2)" : "var(--ink, #F5F0E8)", cursor: disabled ? "default" : "pointer", flexShrink: 0,
})
