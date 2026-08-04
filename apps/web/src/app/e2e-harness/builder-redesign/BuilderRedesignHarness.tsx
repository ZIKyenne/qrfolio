"use client"

// Harness d'INTÉGRATION du Builder refondu (C06). Monte ensemble la bibliothèque (C02), le canvas
// responsive (C04) et les réglages (C03) autour d'UNE seule source d'état (blocs + sélection), plus
// bascule vers le shell mobile (C05). Prouve que les vagues coexistent sans double état. Sans Supabase.

import { useState, useCallback, useMemo, useEffect } from "react"
import { BlockLibrary } from "../../dashboard/builder/BlockLibrary"
import { BlockSettingsPanel } from "../../dashboard/builder/BlockSettingsPanel"
import { ResponsiveCanvas } from "../../dashboard/builder/ResponsiveCanvas"
import { InsertBetweenBlocks } from "../../dashboard/builder/InsertBetweenBlocks"
import { MobileBuilderShell } from "../../dashboard/builder/MobileBuilderShell"
import { toggleFavorite, pushRecentType } from "../../dashboard/builder/builderLibrary"
import { reorderArray } from "../../dashboard/builder/builderHooks"
import { useBuilderRedesign } from "../../dashboard/builder/builderFlags"
import { BLOCK_DEFS, type Block } from "../../dashboard/builder/types"

const genId = (() => { let n = 0; return () => "blk-" + (++n) })()
const make = (type: string): Block => ({ id: genId(), type, content: { ...(BLOCK_DEFS[type]?.defaultContent as any) }, visible: true })

export function BuilderRedesignHarness() {
  const [blocks, setBlocks] = useState<Block[]>(() => ["heading", "pricing", "bio"].map(make))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const [surface, setSurface] = useState<"desktop" | "mobile">("desktop")
  const [gap, setGap] = useState<number | null>(null)
  const [vp, setVp] = useState({ w: 1280, h: 900 })
  const rd = useBuilderRedesign()

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    onResize(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize)
  }, [])

  const selected = selectedId ? blocks.find(b => b.id === selectedId) ?? null : null
  const selIndex = selected ? blocks.findIndex(b => b.id === selected.id) : -1
  const mut = useCallback((id: string, fn: (b: Block) => Block) => setBlocks(p => p.map(b => b.id === id ? fn(b) : b)), [])

  const addAt = useCallback((type: string, at: number | null) => {
    const b = make(type)
    setBlocks(p => { if (at == null) return [...p, b]; const n = p.slice(); n.splice(Math.max(0, Math.min(p.length, at)), 0, b); return n })
    setSelectedId(b.id); setRecents(r => pushRecentType(r, type))
  }, [])
  const addFromLibrary = useCallback((type: string) => { addAt(type, gap); setGap(null) }, [addAt, gap])
  const onMove = useCallback((id: string, dir: -1 | 1) => setBlocks(p => { const i = p.findIndex(b => b.id === id); return i < 0 ? p : reorderArray(p, i, dir === -1 ? i - 1 : i + 2) }), [])

  const settingsPanel = (mobile: boolean) => (
    <BlockSettingsPanel block={selected} mobile={mobile} index={selIndex < 0 ? 0 : selIndex} total={blocks.length}
      onChange={(k, v) => selected && mut(selected.id, b => ({ ...b, content: { ...b.content, [k]: v } }))}
      onDuplicate={() => selected && setBlocks(p => [...p, { ...selected, id: genId() }])}
      onDelete={() => { if (selected) { setBlocks(p => p.filter(b => b.id !== selected.id)); setSelectedId(null) } }}
      onToggleVisible={() => selected && mut(selected.id, b => ({ ...b, visible: !b.visible }))}
      onToggleLock={() => selected && mut(selected.id, b => ({ ...b, locked: !b.locked }))}
      onToggleDraft={() => selected && mut(selected.id, b => ({ ...b, draft: !b.draft }))}
      onResetBlock={() => selected && mut(selected.id, b => ({ ...b, content: { ...(BLOCK_DEFS[b.type]?.defaultContent as any) } }))}
      onRequestClose={() => setSelectedId(null)}
      confirm={() => true}
      renderLegacyContent={(b) => <div data-testid="legacy-content" style={{ padding: 12 }}>Réglages complets — {b.type}</div>}
      renderLegacyDesign={(b) => <div data-testid="legacy-design" style={{ padding: 12 }}>Design — {b.type}</div>} />
  )

  const canvasChildren = (
    <div>
      {blocks.map((b, i) => (
        <div key={b.id} style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: -9, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 5 }}>
            <InsertBetweenBlocks index={i} onInsert={(idx) => setGap(idx)} />
          </div>
          <button type="button" data-block-id={b.id} data-selected={selectedId === b.id ? "1" : "0"} onClick={() => setSelectedId(b.id)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "18px 14px", border: "none", cursor: "pointer", opacity: b.visible ? 1 : 0.4,
              background: selectedId === b.id ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", boxShadow: selectedId === b.id ? "inset 0 0 0 2px #C9A84C" : "none", color: "#F5F0E8", fontSize: 14 }}>
            {(BLOCK_DEFS[b.type]?.icon ?? "▫") + " " + (BLOCK_DEFS[b.type]?.label ?? b.type)}
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      {/* Diagnostic (dev seulement) §20 */}
      <div data-testid="diagnostic" data-flag={rd ? "1" : "0"} data-surface={surface} data-selected={selectedId ?? ""} data-count={blocks.length} data-gap={gap ?? ""}
        style={{ flexShrink: 0, padding: "6px 10px", borderBottom: "1px solid rgba(201,168,76,0.2)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
        <button data-testid="to-desktop" onClick={() => setSurface("desktop")} style={ctl(surface === "desktop")}>Desktop</button>
        <button data-testid="to-mobile" onClick={() => setSurface("mobile")} style={ctl(surface === "mobile")}>Mobile</button>
        <span style={{ marginLeft: "auto", color: "#8A8478" }}>flag=<b data-testid="flag">{rd ? "on" : "off"}</b> · vp={vp.w}×{vp.h} · sel=<b data-testid="sel">{selectedId ?? "—"}</b> · n=<b data-testid="count">{blocks.length}</b></span>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {surface === "mobile" ? (
          <MobileBuilderShell
            pageName="Page intégrée" saving={false} saved hasUnsaved={false} saveError={false}
            canUndo={false} canRedo={false} onUndo={() => {}} onRedo={() => {}} onBack={() => {}}
            blocks={blocks} selectedId={selectedId} onSelect={setSelectedId}
            favorites={favorites} recents={recents} onToggleFavorite={t => setFavorites(f => toggleFavorite(f, t))}
            onAddBlock={t => addAt(t, null)}
            onChange={(id, k, v) => mut(id, b => ({ ...b, content: { ...b.content, [k]: v } }))}
            onDuplicate={id => { const s = blocks.find(b => b.id === id); if (s) setBlocks(p => [...p, { ...s, id: genId() }]) }}
            onDelete={id => { setBlocks(p => p.filter(b => b.id !== id)); setSelectedId(null) }}
            onToggleVisible={id => mut(id, b => ({ ...b, visible: !b.visible }))}
            onToggleLock={id => mut(id, b => ({ ...b, locked: !b.locked }))}
            onToggleDraft={id => mut(id, b => ({ ...b, draft: !b.draft }))}
            onMove={onMove} onReset={id => mut(id, b => ({ ...b, content: { ...(BLOCK_DEFS[b.type]?.defaultContent as any) } }))}
            pageStatus="draft" onPublish={() => {}} publicUrl="/page-integree"
            renderCanvas={() => canvasChildren} viewport={vp} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", minHeight: 0 }}>
            <div data-testid="library-col" style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", minHeight: 0 }}>
              <BlockLibrary favorites={favorites} recents={recents} recoContext="pro" onAdd={addFromLibrary} onToggleFavorite={t => setFavorites(f => toggleFavorite(f, t))} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ResponsiveCanvas selectedIndex={selIndex < 0 ? null : selIndex} total={blocks.length}>{canvasChildren}</ResponsiveCanvas>
            </div>
            <div data-testid="settings-col" style={{ width: 340, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.06)", minHeight: 0 }}>
              {settingsPanel(false)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ctl = (on: boolean): React.CSSProperties => ({
  padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11,
  background: on ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.04)",
  border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, color: on ? "#C9A84C" : "#8A8478",
})
