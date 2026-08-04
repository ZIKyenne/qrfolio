// SettingsFieldRenderer.tsx — Rendu générique d'une liste de champs (mission C03). Réutilise la
// mutation existante `onChange(key, val)` (identique à la coquille). Sert le mode SIMPLE des blocs
// pilotes (tous leurs champs sont des types de base). A11y : chaque champ a un <label htmlFor>
// (jamais décrit uniquement par un placeholder). Aucune dépendance Supabase.

import type { BlockField } from "./types"

const MUTED = "#8A8478"

export interface SettingsFieldRendererProps {
  blockId: string
  fields: BlockField[]
  content: Record<string, string>
  onChange: (key: string, val: string) => void
  mobile?: boolean
}

const inputStyle = (mobile?: boolean): React.CSSProperties => ({
  width: "100%", boxSizing: "border-box", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: 8, padding: mobile ? "11px 12px" : "9px 11px", color: "var(--ink, #F5F0E8)",
  fontSize: mobile ? 15 : 12.5, outline: "none", fontFamily: "DM Sans, sans-serif",
})

export function SettingsFieldRenderer({ blockId, fields, content, onChange, mobile }: SettingsFieldRendererProps) {
  if (fields.length === 0) {
    return <p style={{ color: MUTED, fontSize: 12, margin: "8px 0" }}>Ce bloc n’a pas de réglage de contenu.</p>
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 14 : 12 }}>
      {fields.map(f => {
        const id = `f-${blockId}-${f.key}`
        const val = content[f.key] ?? ""
        return (
          <div key={f.key}>
            <label htmlFor={id} style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea id={id} value={val} placeholder={f.placeholder} rows={mobile ? 4 : 3}
                onChange={e => onChange(f.key, e.target.value)} style={{ ...inputStyle(mobile), resize: "vertical", minHeight: mobile ? 90 : 70 }} />
            ) : f.type === "select" ? (
              <select id={id} value={val} onChange={e => onChange(f.key, e.target.value)} style={{ ...inputStyle(mobile), cursor: "pointer", minHeight: mobile ? 46 : undefined }}>
                {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "color" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id={id} type="color" value={val || "#000000"} onChange={e => onChange(f.key, e.target.value)} style={{ width: 44, height: 40, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "none", cursor: "pointer", flexShrink: 0 }} />
                <input aria-label={`${f.label} (valeur)`} value={val} placeholder="#RRGGBB" onChange={e => onChange(f.key, e.target.value)} style={inputStyle(mobile)} />
              </div>
            ) : (
              <input id={id} type={f.type === "url" || f.type === "image" ? "url" : f.type === "date" ? "date" : "text"}
                value={val} placeholder={f.placeholder ?? (f.type === "image" ? "URL de l’image (https://…)" : undefined)}
                inputMode={mobile ? "text" : undefined}
                onChange={e => onChange(f.key, e.target.value)} style={{ ...inputStyle(mobile), minHeight: mobile ? 46 : undefined }} />
            )}
            {f.hint && <p style={{ color: MUTED, fontSize: 10.5, margin: "4px 0 0", lineHeight: 1.4 }}>{f.hint}</p>}
          </div>
        )
      })}
    </div>
  )
}
