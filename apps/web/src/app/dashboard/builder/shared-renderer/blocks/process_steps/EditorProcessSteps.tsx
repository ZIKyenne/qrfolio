"use client"
import { InlineEditable } from "../../../InlineEditable"
import { processStepsViewModel } from "../../models/processSteps"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorProcessSteps({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = processStepsViewModel(content)
  const { text, primary, accent, muted, surfaceStyle, canEdit, edit } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!visible
          ? <BlockEmptyState icon="🪜" label="Ajoutez une étape" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} />
          : items.map((st, pos) => (
            <div key={st.i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: st.icon ? 16 : 13, fontWeight: 700, flexShrink: 0 }}>{st.icon || pos + 1}</div>
              <div style={{ flex: 1 }}>
                <InlineEditable as="p" editable={canEdit} value={st.title} onCommit={edit(`s${st.i}_title`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: "4px 0 2px" }} />
                {st.desc && <InlineEditable as="p" editable={canEdit} value={st.desc} multiline onCommit={edit(`s${st.i}_desc`)} style={{ color: muted, fontSize: 12.5, margin: 0 }} />}
              </div>
              {pos < items.length - 1 && <div style={{ position: "absolute", left: 31, marginTop: 32, width: 2, height: 16, background: primary + "30" }} />}
            </div>
          ))}
      </div>
    </div>
  )
}
