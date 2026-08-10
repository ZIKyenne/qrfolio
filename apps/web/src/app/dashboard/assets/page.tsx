"use client"

import { useEffect, useState } from "react"
import { Images, FileText, Upload, Trash2, Link2, Check, ExternalLink, MoreHorizontal } from "lucide-react"
import { useImageUpload } from "../builder/useImageUpload"
import { useConfirm } from "@/components/ui/Confirm"

const G = "#C9A84C"
const MUTED = "#A8A190"

type Asset = { name: string; url: string }

// Nom lisible depuis un nom stocké "docs-mon-menu-1699999999.pdf" -> "mon-menu.pdf".
function pretty(name: string): string {
  const ext = name.includes(".") ? "." + name.split(".").pop() : ""
  return name.replace(/\.[^.]+$/, "").replace(/^(docs|blocks)-/, "").replace(/-\d{10,}$/, "") + ext
}

export default function AssetsPage() {
  const { uploadImage, uploadFile, listAssets, deleteAsset, uploading } = useImageUpload()
  const confirm = useConfirm()
  const [tab, setTab] = useState<"image" | "file">("image")
  const [images, setImages] = useState<Asset[] | null>(null)
  const [files, setFiles] = useState<Asset[] | null>(null)
  const [copied, setCopied] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [menuAsset, setMenuAsset] = useState<Asset | null>(null) // vignette -> menu "..." (bottom sheet)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // sélection multiple (par nom) pour tri/suppression en lot

  // Fonction simple (pas de useCallback) : listAssets a une identité instable, la mémoïser
  // ferait boucler l'effet. On charge au montage + après chaque upload/suppression.
  async function load() {
    const [imgs, fls] = await Promise.all([listAssets("image"), listAssets("file")])
    setImages(imgs); setFiles(fls)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const q = query.trim().toLowerCase()
  const assets = (tab === "image" ? images : files)?.filter(a => !q || pretty(a.name).toLowerCase().includes(q)) ?? null

  // ── Sélection multiple ────────────────────────────────────────────────────
  const selCount = selected.size
  const isSel = (a: Asset) => selected.has(a.name)
  const toggleSel = (a: Asset) => setSelected(prev => { const n = new Set(prev); n.has(a.name) ? n.delete(a.name) : n.add(a.name); return n })
  const clearSel = () => setSelected(new Set())
  const selectAllVisible = () => setSelected(new Set((assets || []).map(a => a.name)))
  const allSelected = !!assets && assets.length > 0 && assets.every(isSel)
  async function bulkDelete() {
    if (selCount === 0) return
    if (!(await confirm({ title: `Supprimer ${selCount} média${selCount > 1 ? "s" : ""} ?`, message: "Cette action est définitive. Si ces médias sont utilisés sur des pages publiées, ils n'y apparaîtront plus.", confirmLabel: `Supprimer (${selCount})`, danger: true }))) return
    setBusy(true)
    for (const name of Array.from(selected)) { await deleteAsset(name) }
    clearSel(); await load(); setBusy(false)
  }

  async function onUploadFiles(list: File[]) {
    if (!list.length) return
    setBusy(true)
    for (const file of list) {
      if (file.type.startsWith("image/")) await uploadImage(file, "blocks")
      else await uploadFile(file, "docs")
    }
    await load(); setBusy(false)
  }
  async function onDelete(a: Asset) {
    if (!(await confirm({ title: "Supprimer ce média ?", message: `Supprimer « ${pretty(a.name)} » ?\n\nSi ce média est utilisé sur une page publiée, il n'y apparaîtra plus.`, confirmLabel: "Supprimer", danger: true }))) return
    setBusy(true); const ok = await deleteAsset(a.name); if (ok) await load(); setBusy(false)
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(""), 1500) } catch {}
  }

  const total = (images?.length || 0) + (files?.length || 0)

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); onUploadFiles(Array.from(e.dataTransfer.files || [])) }}
      style={{ padding: "clamp(16px, 4vw, 34px)", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
      {dragOver && (
        <div style={{ position: "absolute", inset: 12, zIndex: 20, background: "rgba(201,168,76,0.08)", border: `2px dashed ${G}`, borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
          <Upload size={28} color={G} />
          <p style={{ color: G, fontSize: 15, fontWeight: 700, margin: 0 }}>Déposez vos fichiers pour les importer</p>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ color: "#F5F0E8", fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Images size={22} color={G} /> Médias
          </h1>
          <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Toutes vos images et fichiers, réutilisables sur toutes vos pages. {total > 0 ? `${total} média${total > 1 ? "s" : ""}.` : ""}</p>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: G, color: "#080808", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "10px 16px", cursor: uploading || busy ? "default" : "pointer", opacity: uploading || busy ? 0.6 : 1 }}>
          <Upload size={15} /> {uploading || busy ? "En cours…" : "Importer"}
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv" style={{ display: "none" }}
            disabled={uploading || busy}
            onChange={e => { onUploadFiles(Array.from(e.target.files || [])); e.target.value = "" }} />
        </label>
      </div>

      {/* Onglets + recherche */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 4, width: "fit-content" }}>
          {([["image", "Images", images?.length], ["file", "Fichiers", files?.length]] as const).map(([k, l, n]) => (
            <button key={k} onClick={() => { setTab(k); clearSel() }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? G : "transparent", color: tab === k ? "#080808" : MUTED, fontSize: 13, fontWeight: tab === k ? 700 : 500 }}>
              {k === "image" ? <Images size={14} /> : <FileText size={14} />}{l}{typeof n === "number" ? ` · ${n}` : ""}
            </button>
          ))}
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Rechercher un média…"
          style={{ flex: 1, minWidth: 180, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 13px", color: "#F5F0E8", fontSize: 13, outline: "none" }} />
      </div>

      {/* Barre d'actions groupées (sélection multiple) */}
      {selCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px", background: "rgba(201,168,76,0.08)", border: `1px solid ${G}40`, borderRadius: 12, position: "sticky", top: 8, zIndex: 15, backdropFilter: "blur(6px)" }}>
          <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{selCount} sélectionné{selCount > 1 ? "s" : ""}</span>
          <button onClick={allSelected ? clearSel : selectAllVisible} style={selBtn}>{allSelected ? "Tout désélectionner" : "Tout sélectionner"}</button>
          <button onClick={clearSel} style={selBtn}>Annuler</button>
          <button onClick={bulkDelete} disabled={busy}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,107,107,0.14)", border: "1px solid rgba(255,107,107,0.4)", color: "var(--danger)", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            <Trash2 size={15} /> Supprimer ({selCount})
          </button>
        </div>
      )}

      {assets === null ? (
        <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "50px 0" }}>Chargement…</p>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 0", border: "2px dashed rgba(201,168,76,0.15)", borderRadius: 16 }}>
          <p style={{ fontSize: 34, margin: "0 0 8px" }}>{q ? "🔍" : tab === "image" ? "🖼️" : "📄"}</p>
          <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{q ? "Aucun média ne correspond" : `Aucun ${tab === "image" ? "média image" : "fichier"} pour l'instant`}</p>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{q ? `Aucun résultat pour « ${query.trim()} ».` : "Cliquez sur « Importer » ou glissez-déposez vos fichiers ici."}</p>
        </div>
      ) : tab === "image" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {assets.map(a => (
            <div key={a.url} onClick={() => toggleSel(a)} title="Cliquez pour sélectionner"
              style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: isSel(a) ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.08)", background: "#0A0A0A", aspectRatio: "1", cursor: "pointer" }}>
              <img src={a.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {isSel(a) && <div style={{ position: "absolute", inset: 0, background: `${G}26`, pointerEvents: "none" }} />}
              {/* Case de sélection (clic sur la vignette = sélectionner) */}
              <div aria-hidden style={{ position: "absolute", top: 6, left: 6, width: 24, height: 24, borderRadius: "50%", background: isSel(a) ? G : "rgba(8,8,8,0.55)", backdropFilter: "blur(6px)", border: `1.5px solid ${isSel(a) ? G : "rgba(255,255,255,0.55)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#080808" }}>
                {isSel(a) && <Check size={15} />}
              </div>
              {/* Actions (…) — n'affecte pas la sélection */}
              <button onClick={e => { e.stopPropagation(); setMenuAsset(a) }} aria-label="Actions du média"
                style={{ position: "absolute", top: 6, right: 6, width: 34, height: 34, borderRadius: 9, background: "rgba(8,8,8,0.6)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
                <MoreHorizontal size={17} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assets.map(a => (
            <div key={a.url} onClick={() => toggleSel(a)} title="Cliquez pour sélectionner"
              style={{ display: "flex", alignItems: "center", gap: 11, background: isSel(a) ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${isSel(a) ? G + "66" : "rgba(255,255,255,0.07)"}`, borderRadius: 11, padding: "11px 14px", cursor: "pointer" }}>
              <div aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: isSel(a) ? G : "transparent", border: `1.5px solid ${isSel(a) ? G : "rgba(255,255,255,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#080808" }}>
                {isSel(a) && <Check size={14} />}
              </div>
              <FileText size={17} color={G} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, color: "#F5F0E8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pretty(a.name)}</span>
              <button onClick={e => { e.stopPropagation(); setMenuAsset(a) }} aria-label="Actions du fichier" style={{ ...rowBtn, width: 38, height: 38 }}><MoreHorizontal size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Menu d'un média (bottom sheet) : cibles tactiles pleines, une seule action visible sur la vignette */}
      {menuAsset && (
        <div onClick={() => setMenuAsset(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#141210", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", padding: "10px 12px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 10px" }} />
            <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 6px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pretty(menuAsset.name)}</p>
            {([
              { icon: copied === menuAsset.url ? <Check size={17} color="var(--success)" /> : <Link2 size={17} />, label: copied === menuAsset.url ? "Lien copié !" : "Copier le lien", onClick: () => copy(menuAsset.url) },
              { icon: <ExternalLink size={17} />, label: "Ouvrir", onClick: () => { window.open(menuAsset.url, "_blank"); setMenuAsset(null) } },
              { icon: <Trash2 size={17} color="var(--danger)" />, label: "Supprimer", danger: true, onClick: () => { const x = menuAsset; setMenuAsset(null); onDelete(x) } },
            ] as { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[]).map((it, i) => (
              <button key={i} onClick={it.onClick}
                style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", color: it.danger ? "var(--danger)" : "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{it.icon}</span> {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const rowBtn: any = { width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED, flexShrink: 0, textDecoration: "none" }
const selBtn: any = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F5F0E8", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }
