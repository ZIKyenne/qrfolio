"use client"
import { InlineEditable } from "../../../InlineEditable"
import { timelineViewModel } from "../../models/timeline"
import { BlockEmptyState } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorTimeline({ content, ctx }: EditorAdapterProps) {
  const { visible, title, horizontal, items } = timelineViewModel(content)
  const { text, muted, primary, surfaceStyle, canEdit, edit } = ctx
  if (!visible) return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <BlockEmptyState icon="📅" label="Ajoutez une étape" muted={muted} />
    </div>
  )
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 14px" }}>{title}</p>}
      {horizontal ? (
        <div style={{ display: "flex", gap: 9, overflowX: "auto", padding: "2px 0 6px" }}>
          {items.map((e, pos) => (
            <div key={e.i} style={{ flexShrink: 0, width: 150, background: "rgba(255,255,255,0.03)", border: `1px solid ${pos === items.length - 1 ? "var(--success)30" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: `${primary}12`, border: `1px solid ${primary}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{e.icon || "•"}</div>
                <InlineEditable as="p" editable={canEdit} value={e.date} onCommit={edit(`e${e.i}_date`)} style={{ color: primary, fontSize: 11, fontWeight: 700, margin: 0 }} />
              </div>
              <InlineEditable as="p" editable={canEdit} value={e.title} onCommit={edit(`e${e.i}_title`)} style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }} />
              {e.desc && <InlineEditable as="p" editable={canEdit} value={e.desc} multiline onCommit={edit(`e${e.i}_desc`)} style={{ color: muted, fontSize: 12.5, margin: 0 }} />}
              {e.link && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5, color: primary, fontSize: 10, fontWeight: 700 }}>{e.link.label} ↗</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 20 }}>
          <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${primary},${primary}40)`, borderRadius: 1 }} />
          {items.map((e, pos) => (
            <div key={e.i} style={{ position: "relative", marginBottom: pos < items.length - 1 ? 16 : 0 }}>
              <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%", background: pos === items.length - 1 ? "var(--success)" : primary, border: `2px solid ${pos === items.length - 1 ? "var(--success)40" : primary + "40"}` }} />
              <InlineEditable as="p" editable={canEdit} value={e.date} onCommit={edit(`e${e.i}_date`)} style={{ color: primary, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }} />
              <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 5 }}>{e.icon && <span style={{ fontSize: 13 }}>{e.icon}</span>}<InlineEditable as="span" editable={canEdit} value={e.title} onCommit={edit(`e${e.i}_title`)} /></p>
              {e.desc && <InlineEditable as="p" editable={canEdit} value={e.desc} multiline onCommit={edit(`e${e.i}_desc`)} style={{ color: muted, fontSize: 12.5, margin: 0 }} />}
              {e.link && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5, color: primary, fontSize: 10.5, fontWeight: 700 }}>{e.link.label} ↗</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
