"use client"
// Adapter ÉDITEUR de `values`. Reproduit builderPreview case "values" (état vide via
// primitive + grille de cartes éditables). Consomme le modèle pur partagé.
import { InlineEditable } from "../../../InlineEditable"
import { valuesViewModel } from "../../models/values"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorValues({ content, ctx }: EditorAdapterProps) {
  const vm = valuesViewModel(content)
  const { text, primary, muted, surfaceStyle, canEdit, edit } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {vm.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{vm.title}</p>}
      {!vm.visible ? <BlockEmptyState icon="🎯" label="Ajoutez une valeur" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {vm.items.map((v, pos) => (
            <div key={pos} style={{ background: primary + "08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{v.icon}</span>
              <InlineEditable as="p" editable={canEdit} value={v.label} onCommit={edit(`v${v.i}_label`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: v.desc ? "0 0 3px" : "0" }} />
              {v.desc && <InlineEditable as="p" editable={canEdit} value={v.desc} multiline onCommit={edit(`v${v.i}_desc`)} style={{ color: muted, fontSize: 12.5, margin: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
