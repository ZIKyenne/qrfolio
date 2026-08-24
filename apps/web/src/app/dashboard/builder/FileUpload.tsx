"use client"

import { useRef, useState } from "react"
import { FileText, X, Upload, FolderOpen, Trash2, Plus, ExternalLink } from "lucide-react"
import { useImageUpload } from "./useImageUpload"
import { useConfirm } from "@/components/ui/Confirm"

type Props = {
  value: string
  onChange: (url: string) => void
  hint?: string
}

// Nom lisible depuis un nom de fichier stocké "docs-mon-menu-1699999999.pdf" -> "mon-menu.pdf".
function prettyName(name: string): string {
  const ext = name.includes(".") ? "." + name.split(".").pop() : ""
  return name.replace(/\.[^.]+$/, "").replace(/^(docs|blocks)-/, "").replace(/-\d{10,}$/, "") + ext
}
function nameFromUrl(url: string): string {
  try { return prettyName(decodeURIComponent(url.split("/").pop() || "fichier")) } catch { return "fichier" }
}

const G = "#C9A84C"
const MUTED = "#A8A190"

export default function FileUpload({ value, onChange, hint }: Props) {
  const { uploadFile, uploading, listAssets, deleteAsset, lastError } = useImageUpload()
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [libOpen, setLibOpen] = useState(false)
  const [libAssets, setLibAssets] = useState<{ name: string; url: string }[] | null>(null)
  const [libBusy, setLibBusy] = useState(false)

  async function handleFile(file: File) {
    setError("")
    if (file.size > 20 * 1024 * 1024) { setError("Fichier trop lourd — max 20 Mo"); return }
    const url = await uploadFile(file, "docs")
    if (url) onChange(url); else setError(lastError === "no_account" ? "Créez un compte (gratuit) pour joindre vos fichiers — votre page est gardée." : "Erreur d'import — réessayez")
  }
  async function openLibrary() { setLibOpen(true); if (libAssets === null) setLibAssets(await listAssets("file")) }
  async function refreshLibrary() { setLibAssets(await listAssets("file")) }
  async function handleLibFile(file: File) {
    if (file.size > 20 * 1024 * 1024) { setError("Fichier trop lourd — max 20 Mo"); return }
    setLibBusy(true); const url = await uploadFile(file, "docs"); if (url) await refreshLibrary(); else setError(lastError === "no_account" ? "Créez un compte (gratuit) pour joindre vos fichiers — votre page est gardée." : "Erreur d'import — réessayez"); setLibBusy(false)
  }
  async function removeAsset(a: { name: string; url: string }) {
    if (!(await confirm({ title: "Supprimer ce fichier ?", message: "S'il est utilisé sur une page publiée, le lien ne fonctionnera plus.", confirmLabel: "Supprimer", danger: true }))) return
    setLibBusy(true); const ok = await deleteAsset(a.name); if (ok) { if (value === a.url) onChange(""); await refreshLibrary() } setLibBusy(false)
  }

  return (
    <div>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 9, padding: "9px 11px" }}>
          <FileText size={16} color={G} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, color: "#F5F0E8", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameFromUrl(value)}</span>
          <a href={value} target="_blank" rel="noopener noreferrer" title="Ouvrir" style={{ color: MUTED, display: "flex", flexShrink: 0 }}><ExternalLink size={13} /></a>
          <button onClick={() => onChange("")} title="Retirer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", flexShrink: 0, display: "flex" }}><X size={14} /></button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: "2px dashed rgba(201,168,76,0.25)", borderRadius: 9, padding: "12px", background: "transparent", color: uploading ? MUTED : "#F5F0E8", fontSize: 12, fontWeight: 600, cursor: uploading ? "default" : "pointer" }}>
            <Upload size={14} color={G} /> {uploading ? "Import en cours…" : "Importer un fichier (PDF…)"}
          </button>
          <input value="" onChange={e => onChange(e.target.value)} placeholder="…ou collez un lien https://"
            style={{ width: "100%", boxSizing: "border-box", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "8px 11px", color: "#F5F0E8", fontSize: 12, outline: "none" }} />
        </div>
      )}

      <button type="button" onClick={openLibrary}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7, background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = G} onMouseLeave={e => e.currentTarget.style.color = MUTED}>
        <FolderOpen size={12} /> Choisir dans ma bibliothèque
      </button>
      {hint && <p style={{ color: MUTED, fontSize: 11, margin: "4px 0 0", lineHeight: 1.4 }}>{hint}</p>}
      {error && <p style={{ color: "var(--danger)", fontSize: 11, margin: "6px 0 0" }}>{error}</p>}
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,application/pdf" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

      {libOpen && (
        <div onClick={() => setLibOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", background: "#141414", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 9 }}>
              <FolderOpen size={16} color={G} />
              <p style={{ margin: 0, color: "#F5F0E8", fontSize: 14, fontWeight: 700, flex: 1 }}>Mes fichiers{libAssets && libAssets.length > 0 ? <span style={{ color: MUTED, fontWeight: 400 }}> · {libAssets.length}</span> : ""}</p>
              {libBusy && <div style={{ width: 15, height: 15, border: "2px solid rgba(201,168,76,0.25)", borderTopColor: G, borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />}
              <button onClick={() => setLibOpen(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 28, height: 28 }}><X size={14} /></button>
            </div>
            <div style={{ padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => inputRef.current?.click()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "2px dashed rgba(201,168,76,0.3)", borderRadius: 9, background: "rgba(201,168,76,0.04)", color: G, cursor: "pointer", padding: "11px", fontSize: 12, fontWeight: 600 }}>
                <Plus size={15} /> Ajouter un fichier
              </button>
              {libAssets === null
                ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Skeletons realistes immediatement (#06) */}
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: 44, borderRadius: 9 }} />
                    ))}
                  </div>
                : libAssets.length === 0
                ? <p style={{ color: MUTED, fontSize: 12, textAlign: "center", padding: "14px 0" }}>Aucun fichier encore — utilisez « Ajouter ».</p>
                : libAssets.map(a => (
                    <div key={a.url} style={{ display: "flex", alignItems: "center", gap: 9, background: value === a.url ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${value === a.url ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 9, padding: "8px 11px" }}>
                      <FileText size={15} color={G} style={{ flexShrink: 0 }} />
                      <button onClick={() => { onChange(a.url); setLibOpen(false) }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", color: "#F5F0E8", fontSize: 12, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prettyName(a.name)}</button>
                      <button onClick={() => removeAsset(a)} aria-label="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", flexShrink: 0, display: "flex" }}><Trash2 size={13} /></button>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
      <style>{``}</style>
    </div>
  )
}
