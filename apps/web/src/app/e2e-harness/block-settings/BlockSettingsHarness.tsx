"use client"

// Harness client du panneau de réglages (C03). État de bloc en mémoire (contenu, visibilité,
// verrouillage, brouillon, suppression) — comme la coquille — pour tester Simple/Avancé, sections,
// toolbar, reset et suppression SANS Supabase. Le legacy est simulé par un placeholder injecté.

import { useState, useCallback } from "react"
import { BLOCK_DEFS, type Block } from "../../dashboard/builder/types"
import { BlockSettingsPanel } from "../../dashboard/builder/BlockSettingsPanel"
import { resetBlockContent } from "../../dashboard/builder/builderSettings"

const PICKS = ["heading", "pricing", "timeline", "contact_form", "cta_button"] // pilotes + 1 fallback (cta_button)

function make(type: string): Block {
  return { id: "blk-" + type, type, content: { ...(BLOCK_DEFS[type]?.defaultContent as any) }, visible: true }
}

export function BlockSettingsHarness() {
  const [selected, setSelected] = useState<string | null>("heading")
  const [blocks, setBlocks] = useState<Record<string, Block>>(() => Object.fromEntries(PICKS.map(t => [t, make(t)])))
  const [deleted, setDeleted] = useState<string[]>([])

  const block = selected ? blocks[selected] ?? null : null

  const mutate = useCallback((id: string, fn: (b: Block) => Block) => {
    setBlocks(prev => ({ ...prev, [id]: fn(prev[id]) }))
  }, [])

  const onChange = useCallback((k: string, v: string) => {
    if (!selected) return
    mutate(selected, b => ({ ...b, content: { ...b.content, [k]: v } }))
  }, [selected, mutate])

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      <div data-testid="harness-bar" data-selected={selected ?? ""} data-deleted={deleted.join(",")}
        style={{ flexShrink: 0, padding: "8px 12px", borderBottom: "1px solid rgba(201,168,76,0.2)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button data-testid="select-none" onClick={() => setSelected(null)} style={pill(selected === null)}>Aucun</button>
        {PICKS.map(t => (
          <button key={t} data-select={t} onClick={() => setSelected(t)} style={pill(selected === t)}>{t}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8A8478" }} data-testid="heading-text">text=«{blocks.heading?.content.text ?? ""}»</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", maxWidth: 460, width: "100%", margin: "0 auto", borderInline: "1px solid rgba(255,255,255,0.06)" }}>
        <BlockSettingsPanel
          block={block}
          index={0}
          total={PICKS.length}
          onChange={onChange}
          onDuplicate={() => { /* simulé */ }}
          onToggleVisible={() => selected && mutate(selected, b => ({ ...b, visible: !b.visible }))}
          onToggleLock={() => selected && mutate(selected, b => ({ ...b, locked: !b.locked }))}
          onToggleDraft={() => selected && mutate(selected, b => ({ ...b, draft: !b.draft }))}
          onResetBlock={() => selected && mutate(selected, b => ({ ...b, content: resetBlockContent(b.type) }))}
          onDelete={() => { if (selected) { setDeleted(d => [...d, selected]); setSelected(null) } }}
          onRequestClose={() => setSelected(null)}
          onOpenLibrary={() => setSelected("heading")}
          confirm={() => true}
          renderLegacyContent={(b) => <div data-testid="legacy-content">Réglages complets (legacy) — {b.type}</div>}
          renderLegacyDesign={(b) => <div data-testid="legacy-design">Design & disposition (legacy) — {b.type}</div>}
        />
      </div>
    </div>
  )
}

const pill = (on: boolean): React.CSSProperties => ({
  padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
  background: on ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.04)",
  border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
  color: on ? "#C9A84C" : "#8A8478",
})
