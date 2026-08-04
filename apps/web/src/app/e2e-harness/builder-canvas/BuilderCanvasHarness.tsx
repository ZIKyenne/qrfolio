"use client"

// Harness client du canvas responsive (C04). Rend ResponsiveCanvas avec N blocs légers, l'insertion
// entre blocs, la sélection et la toolbar flottante — SANS Supabase. Compteurs (data-attributes)
// comme oracles Playwright. Le nombre de blocs (10/50/100) permet de mesurer les pages longues.

import { useState, useCallback } from "react"
import { ResponsiveCanvas } from "../../dashboard/builder/ResponsiveCanvas"
import { InsertBetweenBlocks } from "../../dashboard/builder/InsertBetweenBlocks"
import { FloatingBlockToolbar } from "../../dashboard/builder/FloatingBlockToolbar"
import { gapInsertIndex, type Rect } from "../../dashboard/builder/builderCanvas"
import type { Block } from "../../dashboard/builder/types"

const COUNTS = [10, 50, 100]
// Rect déterministe du bloc sélectionné (au centre) → placement "top" testable sans mesure flaky.
const BLOCK_RECT: Rect = { top: 200, bottom: 300, left: 20, right: 380, width: 360, height: 100 }
const CANVAS_RECT: Rect = { top: 0, bottom: 600, left: 0, right: 400, width: 400, height: 600 }

export function BuilderCanvasHarness() {
  const [count, setCount] = useState(10)
  const [selected, setSelected] = useState<number | null>(null)
  const [inserted, setInserted] = useState<number[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [focusMode, setFocusMode] = useState(false)

  const blocks = Array.from({ length: count }, (_, i) => i)
  const onInsert = useCallback((index: number) => setInserted(a => [...a, gapInsertIndex(count, index)]), [count])
  const act = (a: string) => setActions(l => [...l, a])

  const selBlock: Block | null = selected != null ? { id: "blk-" + selected, type: "heading", content: { text: "Bloc " + (selected + 1) }, visible: true } : null

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: focusMode ? "#000" : "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      <div data-testid="harness-bar" data-count={count} data-selected={selected ?? ""} data-inserted={inserted.join(",")} data-actions={actions.join(",")} data-focus={focusMode ? "1" : "0"}
        style={{ flexShrink: 0, padding: "8px 12px", borderBottom: "1px solid rgba(201,168,76,0.2)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
        {COUNTS.map(n => (
          <button key={n} data-count-btn={n} onClick={() => { setCount(n); setSelected(null) }}
            style={{ padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: count === n ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.04)", border: `1px solid ${count === n ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, color: count === n ? "#C9A84C" : "#8A8478" }}>{n} blocs</button>
        ))}
        <span style={{ marginLeft: "auto", color: "#8A8478" }}>sél=<b data-testid="sel">{selected ?? "—"}</b> · ins=<b data-testid="ins">{inserted.length}</b> · act=<b data-testid="act">{actions.length}</b></span>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", maxWidth: 1100, width: "100%", margin: "0 auto", borderInline: "1px solid rgba(255,255,255,0.06)" }}>
        <ResponsiveCanvas
          selectedIndex={selected}
          total={count}
          onModeChange={() => setSelected(null)}
          onFullscreen={() => setFocusMode(f => !f)}
          isFullscreen={focusMode}
        >
          <div style={{ position: "relative" }}>
            <InsertBetweenBlocks index={0} onInsert={onInsert} />
            {blocks.map(i => (
              <div key={i}>
                <button type="button" data-block-id={"blk-" + i} data-selected={selected === i ? "1" : "0"}
                  onClick={() => setSelected(i)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "16px 14px", margin: 0, cursor: "pointer",
                    background: selected === i ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                    border: "none", boxShadow: selected === i ? "inset 0 0 0 2px #C9A84C" : "none", color: "#F5F0E8", fontSize: 14 }}>
                  Bloc {i + 1}
                </button>
                <InsertBetweenBlocks index={i + 1} onInsert={onInsert} />
              </div>
            ))}

            {/* Toolbar flottante du bloc sélectionné (rects déterministes) */}
            {selBlock && (
              <FloatingBlockToolbar
                block={selBlock} index={selected!} total={count} blockRect={BLOCK_RECT} canvasRect={CANVAS_RECT}
                handlers={{
                  settings: () => act("settings"),
                  duplicate: () => act("duplicate"),
                  toggleVisible: () => act("toggleVisible"),
                  toggleLock: () => act("toggleLock"),
                  moveUp: () => act("moveUp"),
                  moveDown: () => act("moveDown"),
                  delete: () => { act("delete"); setSelected(null) },
                }}
              />
            )}
          </div>
        </ResponsiveCanvas>
      </div>
    </div>
  )
}
