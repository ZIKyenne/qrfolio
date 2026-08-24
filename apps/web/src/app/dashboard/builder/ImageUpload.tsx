"use client"

import { useRef, useState, useEffect } from "react"
import { Upload, X, Image as ImageIcon, FolderOpen, Trash2, Plus, Search, Star } from "lucide-react"
import { useImageUpload } from "./useImageUpload"
import { useConfirm } from "@/components/ui/Confirm"
import ImageCropModal from "./ImageCropModal"

type Props = {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
  cropAspect?: string   // ratio présélectionné dans le recadrage (ex : "wide" bannière, "square" avatar)
}

export default function ImageUpload({ value, onChange, label, hint, cropAspect }: Props) {
  const { uploadImage, uploading, listAssets, deleteAsset, lastError } = useImageUpload()
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement>(null)
  const libInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState("")
  const [libOpen, setLibOpen] = useState(false)
  const [libAssets, setLibAssets] = useState<{ name: string; url: string }[] | null>(null)
  const [libBusy, setLibBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false) // #05 : bottom sheet de choix de source
  const [libQuery, setLibQuery] = useState("") // #07 : recherche dans la bibliotheque
  // Recadrage avant upload : toute image sélectionnée passe par la modale de recadrage (pan/zoom/ratio).
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropDest, setCropDest] = useState<"block" | "lib">("block")
  // #07 : favoris (persistes par URL). Les images favorites remontent en tete.
  // Defaut vide (= SSR) puis lecture apres montage -> pas de mismatch d'hydratation (cf review #2).
  const [favs, setFavs] = useState<Set<string>>(new Set())
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("qrfolio_media_favs") || "[]"); if (Array.isArray(s) && s.length) setFavs(new Set(s)) } catch {} }, [])
  const toggleFav = (url: string) => setFavs(prev => { const n = new Set(prev); if (n.has(url)) n.delete(url); else n.add(url); try { localStorage.setItem("qrfolio_media_favs", JSON.stringify([...n])) } catch {} return n })

  async function openLibrary() {
    setLibOpen(true)
    if (libAssets === null) setLibAssets(await listAssets())
  }
  async function refreshLibrary() { setLibAssets(await listAssets()) }

  // Upload depuis la modale : ajoute à la bibliothèque puis rafraîchit (l'utilisateur clique pour choisir).
  function handleLibFile(file: File) {
    setError("")
    if (!file.type.startsWith("image/")) { setError("Fichier invalide — image uniquement"); return }
    if (file.size > 5 * 1024 * 1024) { setError("Fichier trop lourd — max 5MB"); return }
    setCropDest("lib"); setCropFile(file) // recadrage puis ajout à la bibliothèque
  }
  async function removeAsset(a: { name: string; url: string }) {
    if (!(await confirm({ title: "Supprimer cette image ?", message: "Si elle est utilisée sur une page publiée, elle n'y apparaîtra plus.", confirmLabel: "Supprimer", danger: true }))) return
    setLibBusy(true)
    const ok = await deleteAsset(a.name)
    if (ok) { if (value === a.url) onChange(""); await refreshLibrary() }
    setLibBusy(false)
  }

  function handleFile(file: File) {
    setError("")
    if (!file.type.startsWith("image/")) { setError("Fichier invalide — image uniquement"); return }
    if (file.size > 5 * 1024 * 1024) { setError("Fichier trop lourd — max 5MB"); return }
    setCropDest("block"); setCropFile(file) // recadrage puis upload + sélection
  }

  // Recadrage confirmé → upload du blob recadré (JPEG/PNG), plus léger que l'original.
  async function onCropConfirm(blob: Blob) {
    const src = cropFile
    setCropFile(null)
    if (!src) return
    const type = blob.type || src.type
    const ext = type === "image/png" ? ".png" : ".jpg"
    const named = new File([blob], (src.name.replace(/\.[^.]+$/, "") || "image") + ext, { type })
    if (cropDest === "lib") {
      setLibBusy(true)
      const url = await uploadImage(named, "blocks")
      if (url) await refreshLibrary()
      else setError(lastError === "no_account" ? "Créez un compte (gratuit) pour ajouter vos propres photos — votre page est gardée." : "Erreur upload — réessaie")
      setLibBusy(false)
    } else {
      const url = await uploadImage(named, "blocks")
      if (url) onChange(url)
      else setError(lastError === "no_account" ? "Créez un compte (gratuit) pour ajouter vos propres photos — votre page est gardée." : "Erreur upload — réessaie")
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const G = "#C9A84C"
  const MUTED = "#A8A190"

  return (
    <div>
      {label && <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>}

      {value ? (
        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,168,76,0.3)" }}>
          <img src={value} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(8,8,8,0.8)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--danger)" }}>
            <X size={14} />
          </button>
          <button onClick={() => setPickerOpen(true)}
            style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(201,168,76,0.9)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#080808", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <Upload size={11} /> Changer
          </button>
        </div>
      ) : (
        <div
          onClick={() => setPickerOpen(true)}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{ border: `2px dashed ${dragOver ? G : "rgba(201,168,76,0.2)"}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(201,168,76,0.05)" : "transparent", transition: "all 0.2s" }}>
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, border: "2px solid rgba(201,168,76,0.2)", borderTopColor: G, borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Upload en cours...</p>
            </div>
          ) : (
            <>
              <div style={{ width: 40, height: 40, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <ImageIcon size={18} color={G} />
              </div>
              <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Clique ou glisse une image</p>
              <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{hint || "JPG, PNG, WebP — max 5MB"}</p>
            </>
          )}
        </div>
      )}

      <button type="button" onClick={() => setPickerOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7, background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = G} onMouseLeave={e => e.currentTarget.style.color = MUTED}>
        <FolderOpen size={12} /> Changer d'image…
      </button>

      {/* Bottom sheet : choix de la source (#05) */}
      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 420, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#141210", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", padding: "10px 12px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 10px" }} />
            <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 6px 6px" }}>Ajouter une image</p>
            <button type="button" onClick={() => { setPickerOpen(false); inputRef.current?.click() }}
              style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "14px 12px", background: "none", border: "none", color: "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: G }}><Upload size={19} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span>Depuis mon téléphone</span>
                <span style={{ color: MUTED, fontSize: 12 }}>Photo, photothèque ou fichier</span>
              </span>
            </button>
            <button type="button" onClick={() => { setPickerOpen(false); openLibrary() }}
              style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "14px 12px", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: G }}><FolderOpen size={19} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span>Ma bibliothèque QRowg</span>
                <span style={{ color: MUTED, fontSize: 12 }}>Images déjà importées</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 11, margin: "6px 0 0" }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

      {/* Bibliothèque d'images : réutiliser une image déjà uploadée (pas de ré-upload) */}
      {libOpen && (
        <div onClick={() => setLibOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 620, maxHeight: "80vh", background: "#141414", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 9 }}>
              <FolderOpen size={16} color={G} />
              <p style={{ margin: 0, color: "#F5F0E8", fontSize: 14, fontWeight: 700, flex: 1 }}>Ma bibliothèque{libAssets && libAssets.length > 0 ? <span style={{ color: MUTED, fontWeight: 400 }}> · {libAssets.length}</span> : ""}</p>
              {libBusy && <div style={{ width: 15, height: 15, border: "2px solid rgba(201,168,76,0.25)", borderTopColor: G, borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />}
              <button onClick={() => setLibOpen(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 28, height: 28 }}><X size={14} /></button>
            </div>
            {/* Recherche (#07) — visible des qu'il y a des images */}
            {libAssets && libAssets.length > 0 && (
              <div style={{ padding: "0 14px 10px", position: "relative" }}>
                <Search size={14} color={MUTED} style={{ position: "absolute", left: 25, top: "50%", transform: "translateY(-50%)" }} />
                <input value={libQuery} onChange={e => setLibQuery(e.target.value)} placeholder="Rechercher une image…"
                  style={{ width: "100%", height: 42, boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "0 12px 0 34px", color: "#F5F0E8", fontSize: 14, outline: "none" }} />
              </div>
            )}
            <div style={{ padding: 14, paddingTop: 0, overflowY: "auto" }}>
              {libAssets === null
                ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                    {/* Skeletons realistes immediatement (au lieu d'un texte "Chargement") — #06 */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: 9 }} />
                    ))}
                  </div>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                    {/* Tuile d'ajout : upload direct dans la bibliothèque */}
                    {!libQuery && <button onClick={() => libInputRef.current?.click()} title="Ajouter une image"
                      style={{ aspectRatio: "1", border: "2px dashed rgba(201,168,76,0.3)", borderRadius: 9, background: "rgba(201,168,76,0.04)", color: G, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 10, fontWeight: 600 }}>
                      <Plus size={18} /> Ajouter
                    </button>}
                    {libAssets.filter(a => !libQuery || a.name.toLowerCase().includes(libQuery.toLowerCase()))
                      .slice().sort((a, b) => (favs.has(b.url) ? 1 : 0) - (favs.has(a.url) ? 1 : 0))
                      .map(a => (
                      <div key={a.url} style={{ position: "relative", aspectRatio: "1" }}
                        onMouseEnter={e => { const b = e.currentTarget.querySelector(".del") as HTMLElement; if (b) b.style.opacity = "1" }}
                        onMouseLeave={e => { const b = e.currentTarget.querySelector(".del") as HTMLElement; if (b) b.style.opacity = "0" }}>
                        <button onClick={() => { onChange(a.url); setLibOpen(false) }} title={a.name}
                          style={{ width: "100%", height: "100%", padding: 0, border: value === a.url ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 9, overflow: "hidden", cursor: "pointer", background: "#0A0A0A" }}>
                          <img src={a.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleFav(a.url) }} aria-label={favs.has(a.url) ? "Retirer des favoris" : "Ajouter aux favoris"} title={favs.has(a.url) ? "Retirer des favoris" : "Favori"}
                          style={{ position: "absolute", top: 4, left: 4, background: "rgba(8,8,8,0.82)", border: "none", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: favs.has(a.url) ? "#FFD700" : "rgba(255,255,255,0.6)" }}>
                          <Star size={12} fill={favs.has(a.url) ? "#FFD700" : "none"} />
                        </button>
                        <button className="del" onClick={e => { e.stopPropagation(); removeAsset(a) }} aria-label="Supprimer"
                          style={{ position: "absolute", top: 4, right: 4, opacity: 0, transition: "opacity .15s", background: "rgba(8,8,8,0.82)", border: "none", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--danger)" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {libAssets.length === 0 && (
                      <p style={{ gridColumn: "1 / -1", color: MUTED, fontSize: 12, textAlign: "center", padding: "18px 0 4px", margin: 0 }}>Aucune image encore — utilisez « Ajouter » ci-dessus.</p>
                    )}
                    {libAssets.length > 0 && libQuery && libAssets.filter(a => a.name.toLowerCase().includes(libQuery.toLowerCase())).length === 0 && (
                      <p style={{ gridColumn: "1 / -1", color: MUTED, fontSize: 12, textAlign: "center", padding: "18px 0 4px", margin: 0 }}>Aucun résultat pour « {libQuery} ».</p>
                    )}
                  </div>}
            </div>
            <input ref={libInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLibFile(f); e.target.value = "" }} />
          </div>
        </div>
      )}
      {cropFile && <ImageCropModal file={cropFile} initialAspect={cropAspect} onCancel={() => setCropFile(null)} onConfirm={onCropConfirm} />}
      <style>{``}</style>
    </div>
  )
}
