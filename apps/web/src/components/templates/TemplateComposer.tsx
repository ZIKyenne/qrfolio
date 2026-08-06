"use client"

// TemplateComposer — composant RÉUTILISABLE de composition de templates (T3). Sélecteurs
// structure(métier) × style × layout → composeTemplate (moteur) → aperçu LIVE avec le vrai renderer
// de blocs (BlockPreview) + fond de page du thème. Émet le template composé via onCreate.
// Aucun Supabase : la création réelle (galerie → /api/templates/use, ou builder → applyPageTemplate)
// est fournie par le PARENT via onCreate → intégration sûre sans toucher au flux métier.

import { Component, useMemo, useState, type ReactNode } from "react"
import {
  TEMPLATE_STRUCTURES, TEMPLATE_STYLE_LIST, TEMPLATE_LAYOUT_LIST, composeTemplate,
  type ComposedTemplate,
} from "@/app/dashboard/builder/templateEngine"
import { BlockPreview } from "@/app/dashboard/builder/builderPreview"
import { normalizePageTheme, themeBackgroundStyle, type Block } from "@/app/dashboard/builder/types"

class BlockBoundary extends Component<{ children: ReactNode; label: string }, { err: boolean }> {
  constructor(p: any) { super(p); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return <div data-block-error style={{ padding: 10, color: "var(--danger, #EF4444)", fontSize: 12 }}>⚠ bloc « {this.props.label} » non rendu</div>
    return this.props.children
  }
}

const MUTED = "#8A8478"

export interface TemplateComposerProps {
  initialStructureKey?: string
  initialStyleKey?: string
  initialLayoutKey?: string
  /** Reçoit le template composé (theme + blocks + clés) pour création par le parent. */
  onCreate?: (composed: ComposedTemplate) => void
  createLabel?: string
}

export function TemplateComposer({ initialStructureKey, initialStyleKey = "gold", initialLayoutKey = "default", onCreate, createLabel = "Créer cette page" }: TemplateComposerProps) {
  const first = TEMPLATE_STRUCTURES.find(s => s.key === initialStructureKey) ?? TEMPLATE_STRUCTURES.find(s => s.group === "Restauration") ?? TEMPLATE_STRUCTURES[0]
  const [structureKey, setStructureKey] = useState(first.key)
  const [styleKey, setStyleKey] = useState(initialStyleKey)
  const [layoutKey, setLayoutKey] = useState(initialLayoutKey)

  const structure = TEMPLATE_STRUCTURES.find(s => s.key === structureKey) ?? first
  const style = TEMPLATE_STYLE_LIST.find(s => s.key === styleKey) ?? TEMPLATE_STYLE_LIST[0]
  const layout = TEMPLATE_LAYOUT_LIST.find(l => l.key === layoutKey) ?? TEMPLATE_LAYOUT_LIST[0]

  const composed = useMemo(() => composeTemplate(structure, style, layout), [structure, style, layout])
  const theme = useMemo(() => normalizePageTheme(composed.theme), [composed.theme])
  const blocks: Block[] = useMemo(
    () => composed.blocks.map((b, i) => ({ id: `${b.type}-${i}`, type: b.type, content: b.content, visible: true })),
    [composed.blocks],
  )

  const sel = (label: string, value: string, onChange: (v: string) => void, opts: { key: string; label: string }[], testid: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: MUTED }}>
      {label}
      <select data-testid={testid} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "#111", color: "var(--ink, #F5F0E8)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "6px 8px", fontSize: 12, minWidth: 150 }}>
        {opts.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <div data-testid="template-composer" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#080808", color: "var(--ink, #F5F0E8)", fontFamily: "DM Sans, sans-serif" }}>
      <div data-testid="composer-controls" data-key={composed.key} data-blocks={blocks.length}
        style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", padding: "10px 14px", background: "rgba(12,12,12,0.95)", borderBottom: "1px solid rgba(201,168,76,0.2)", backdropFilter: "blur(8px)" }}>
        {sel("Structure (métier)", structureKey, setStructureKey, TEMPLATE_STRUCTURES.map(s => ({ key: s.key, label: `${s.emoji} ${s.group} — ${s.label}` })), "sel-structure")}
        {sel("Style", styleKey, setStyleKey, TEMPLATE_STYLE_LIST.map(s => ({ key: s.key, label: s.label })), "sel-style")}
        {sel("Layout", layoutKey, setLayoutKey, TEMPLATE_LAYOUT_LIST.map(l => ({ key: l.key, label: l.label })), "sel-layout")}
        <div style={{ flex: 1 }} />
        {onCreate && (
          <button type="button" data-testid="composer-create" onClick={() => onCreate(composed)}
            style={{ minHeight: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--accent, #C9A84C)", color: "#080808", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {createLabel}
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", justifyContent: "center", padding: "20px 0 60px" }}>
        <div data-testid="composer-preview" data-style={styleKey} data-layout={layoutKey}
          style={{ width: "100%", maxWidth: 480, minHeight: 400, borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.55)", alignSelf: "flex-start", ...(themeBackgroundStyle(theme) as any) }}>
          {blocks.map(b => (
            <div key={b.id} data-block-type={b.type}>
              <BlockBoundary label={b.type}><BlockPreview block={b} theme={theme} dayMode={false} editable={false} /></BlockBoundary>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
