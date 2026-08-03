"use client"
import { eventProgramViewModel } from "../../models/eventProgram"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorEventProgram({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = eventProgramViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {!visible ? <BlockEmptyState icon="🗓️" label="Ajoutez une étape du programme" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : items.map((st, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,#EC4899,#F472B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{st.time}</div>
              {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(236,72,153,0.2)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{st.title}</p>
              {st.desc && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{st.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
