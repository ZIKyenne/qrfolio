"use client"
import { discographyViewModel } from "../../models/discography"
import { EditorSharedImage } from "../../primitives/EditorImage"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorDiscography({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = discographyViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!visible
          ? <BlockEmptyState icon="💿" label="Ajoutez un album ou single" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} />
          : items.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {a.cover.src
                ? <EditorSharedImage model={a.cover} style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, borderRadius: 8, background: "rgba(29,185,84,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>💿</div>}
              <div style={{ flex: 1 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{a.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 10, padding: "1px 7px", color: "#1DB954", fontSize: 9, fontWeight: 700 }}>{a.type}</span>
                  <span style={{ color: muted, fontSize: 11 }}>{a.year}</span>
                </div>
              </div>
              <span style={{ color: "#1DB954", fontSize: 18 }}>▶</span>
            </div>
          ))}
      </div>
    </div>
  )
}
