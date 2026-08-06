"use client"

// Harness de preview des templates composés (T2). Sélecteurs structure × style × layout →
// composeTemplate → rendu avec le VRAI renderer de blocs (BlockPreview) et le fond de page du thème.
// SANS Supabase. Sert à vérifier visuellement la qualité premium des combinaisons (captures).

import { Component, useMemo, useState, type ReactNode } from "react"
import {
  TEMPLATE_STRUCTURES, TEMPLATE_STYLE_LIST, TEMPLATE_LAYOUT_LIST, composeTemplate,
} from "../../dashboard/builder/templateEngine"
import { BlockPreview } from "../../dashboard/builder/builderPreview"
import { normalizePageTheme, themeBackgroundStyle, type Block } from "../../dashboard/builder/types"

// Isole un bloc défaillant (un template composé ne doit pas crasher toute la preview).
class BlockBoundary extends Component<{ children: ReactNode; label: string }, { err: boolean }> {
  constructor(p: any) { super(p); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return <div data-block-error style={{ padding: 10, color: "#EF4444", fontSize: 12 }}>⚠ bloc « {this.props.label} » non rendu</div>
    return this.props.children
  }
}

const RESTO = TEMPLATE_STRUCTURES.find(s => s.group === "Restauration") ?? TEMPLATE_STRUCTURES[0]

export function TemplatePreviewHarness() {
  const [structureKey, setStructureKey] = useState(RESTO.key)
  const [styleKey, setStyleKey] = useState("gold")
  const [layoutKey, setLayoutKey] = useState("default")

  const structure = TEMPLATE_STRUCTURES.find(s => s.key === structureKey) ?? RESTO
  const style = TEMPLATE_STYLE_LIST.find(s => s.key === styleKey) ?? TEMPLATE_STYLE_LIST[0]
  const layout = TEMPLATE_LAYOUT_LIST.find(l => l.key === layoutKey) ?? TEMPLATE_LAYOUT_LIST[0]

  const composed = useMemo(() => composeTemplate(structure, style, layout), [structure, style, layout])
  const theme = useMemo(() => normalizePageTheme(composed.theme), [composed.theme])
  const blocks: Block[] = useMemo(
    () => composed.blocks.map((b, i) => ({ id: `${b.type}-${i}`, type: b.type, content: b.content, visible: true })),
    [composed.blocks],
  )

  const sel = (label: string, value: string, onChange: (v: string) => void, opts: { key: string; label: string }[], testid: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#8A8478" }}>
      {label}
      <select data-testid={testid} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "#111", color: "#F5F0E8", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "6px 8px", fontSize: 12, minWidth: 150 }}>
        {opts.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      {/* Contrôles */}
      <div data-testid="preview-controls" data-key={composed.key} data-blocks={blocks.length}
        style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", padding: "10px 14px", background: "rgba(12,12,12,0.95)", borderBottom: "1px solid rgba(201,168,76,0.2)", backdropFilter: "blur(8px)" }}>
        {sel("Structure (métier)", structureKey, setStructureKey, TEMPLATE_STRUCTURES.map(s => ({ key: s.key, label: `${s.emoji} ${s.group} — ${s.label}` })), "sel-structure")}
        {sel("Style", styleKey, setStyleKey, TEMPLATE_STYLE_LIST.map(s => ({ key: s.key, label: s.label })), "sel-style")}
        {sel("Layout", layoutKey, setLayoutKey, TEMPLATE_LAYOUT_LIST.map(l => ({ key: l.key, label: l.label })), "sel-layout")}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8A8478" }}>{blocks.length} blocs · <b>{composed.key}</b></span>
      </div>

      {/* Page composée — fond du thème + blocs réels */}
      <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 60px" }}>
        <div data-testid="preview-page" data-style={styleKey} data-layout={layoutKey}
          style={{ width: "100%", maxWidth: 480, minHeight: 400, borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.55)", ...(themeBackgroundStyle(theme) as any) }}>
          {blocks.map((b, i) => (
            <div key={b.id} data-block-type={b.type}>
              <BlockBoundary label={b.type}>
                <BlockPreview block={b} theme={theme} dayMode={false} editable={false} />
              </BlockBoundary>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
