"use client"

// Harness client du shell Builder mobile (C05). État complet en mémoire (blocs, sélection,
// sauvegarde/publication simulées, clavier simulé) — SANS Supabase. Contrôles de test en haut.

import { useState, useCallback, useMemo, useEffect } from "react"
import { MobileBuilderShell } from "../../dashboard/builder/MobileBuilderShell"
import { toggleFavorite, pushRecentType } from "../../dashboard/builder/builderLibrary"
import { reorderArray } from "../../dashboard/builder/builderHooks"
import { BLOCK_DEFS, type Block } from "../../dashboard/builder/types"

const genId = (() => { let n = 0; return () => "blk-" + (++n) })()
function make(type: string): Block { return { id: genId(), type, content: { ...(BLOCK_DEFS[type]?.defaultContent as any) }, visible: true } }
const INITIAL = ["heading", "bio", "pricing"].map(make)

export function BuilderMobileHarness() {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const [saveError, setSaveError] = useState(false)
  const [published, setPublished] = useState(false)
  const [kb, setKb] = useState(false)
  const [vp, setVp] = useState({ w: 390, h: 844 })
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    onResize(); window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const mut = useCallback((id: string, fn: (b: Block) => Block) => setBlocks(p => p.map(b => b.id === id ? fn(b) : b)), [])

  const onAddBlock = useCallback((type: string) => {
    const b = make(type)
    setBlocks(p => [...p, b]); setSelectedId(b.id); setRecents(r => pushRecentType(r, type))
  }, [])
  const onMove = useCallback((id: string, dir: -1 | 1) => setBlocks(p => { const i = p.findIndex(b => b.id === id); return i < 0 ? p : reorderArray(p, i, dir === -1 ? i - 1 : i + 2) }), [])

  const bulk = (n: number) => { setBlocks(Array.from({ length: n }, () => make("heading"))); setSelectedId(null) }

  const renderCanvas = useMemo(() => () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {blocks.map(b => (
        <button key={b.id} type="button" data-block-id={b.id} data-selected={selectedId === b.id ? "1" : "0"}
          onClick={() => setSelectedId(b.id)}
          style={{ textAlign: "left", padding: "18px 14px", border: "none", cursor: "pointer", opacity: b.visible ? 1 : 0.4,
            background: selectedId === b.id ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
            boxShadow: selectedId === b.id ? "inset 0 0 0 2px #C9A84C" : "none", color: "#F5F0E8", fontSize: 15 }}>
          {(BLOCK_DEFS[b.type]?.icon ?? "▫") + " " + (BLOCK_DEFS[b.type]?.label ?? b.type)}
        </button>
      ))}
    </div>
  ), [blocks, selectedId])

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      <div data-testid="harness-bar" data-count={blocks.length} data-selected={selectedId ?? ""} data-published={published ? "1" : "0"}
        style={{ flexShrink: 0, padding: "6px 10px", borderBottom: "1px solid rgba(201,168,76,0.2)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
        <button data-testid="toggle-save-error" onClick={() => setSaveError(v => !v)} style={ctl(saveError)}>err save</button>
        <button data-testid="toggle-keyboard" onClick={() => setKb(v => !v)} style={ctl(kb)}>clavier</button>
        <button data-testid="bulk-50" onClick={() => bulk(50)} style={ctl(false)}>50</button>
        <button data-testid="bulk-100" onClick={() => bulk(100)} style={ctl(false)}>100</button>
        <span style={{ marginLeft: "auto", color: "#8A8478" }}>n=<b data-testid="count">{blocks.length}</b> sel=<b data-testid="sel">{selectedId ?? "—"}</b></span>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MobileBuilderShell
          pageName="Ma page de test" saving={false} saved={!saveError} saveError={saveError} hasUnsaved={false}
          canUndo canRedo onUndo={() => {}} onRedo={() => {}} onBack={() => {}}
          blocks={blocks} selectedId={selectedId} onSelect={setSelectedId}
          favorites={favorites} recents={recents} onToggleFavorite={t => setFavorites(f => toggleFavorite(f, t))}
          onAddBlock={onAddBlock}
          onChange={(id, k, v) => mut(id, b => ({ ...b, content: { ...b.content, [k]: v } }))}
          onDuplicate={id => { const src = blocks.find(b => b.id === id); if (src) setBlocks(p => [...p, { ...src, id: genId() }]) }}
          onDelete={id => { setBlocks(p => p.filter(b => b.id !== id)); setSelectedId(null) }}
          onToggleVisible={id => mut(id, b => ({ ...b, visible: !b.visible }))}
          onToggleLock={id => mut(id, b => ({ ...b, locked: !b.locked }))}
          onToggleDraft={id => mut(id, b => ({ ...b, draft: !b.draft }))}
          onMove={onMove}
          onReset={id => mut(id, b => ({ ...b, content: { ...(BLOCK_DEFS[b.type]?.defaultContent as any) } }))}
          pageStatus={published ? "published" : "draft"} onPublish={() => setPublished(true)} publicUrl="/ma-page-test"
          renderCanvas={renderCanvas}
          viewport={vp}
          renderLegacyContent={(b) => <div data-testid="legacy-content" style={{ padding: 12 }}>Réglages complets — {b.type}</div>}
          renderLegacyDesign={(b) => <div data-testid="legacy-design" style={{ padding: 12 }}>Design — {b.type}</div>}
          keyboardOpenOverride={kb || undefined}
        />
      </div>
    </div>
  )
}

const ctl = (on: boolean): React.CSSProperties => ({
  padding: "5px 9px", borderRadius: 7, cursor: "pointer", fontSize: 11,
  background: on ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.04)",
  border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, color: on ? "#C9A84C" : "#8A8478",
})
