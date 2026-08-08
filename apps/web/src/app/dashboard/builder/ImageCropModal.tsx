"use client"

// Modale de recadrage/redimensionnement d'image (pan + zoom + ratio). L'utilisateur cadre l'image
// comme il le souhaite avant l'upload. Maths pures dans imageCrop.ts (testées). Export via canvas
// (JPEG), donc plus léger que l'original. Aucune dépendance externe.
import { useEffect, useMemo, useRef, useState } from "react"
import { X, ZoomIn, Check } from "lucide-react"
import { coverBaseScale, clampOffset, computeCropRect, displaySize, outputSize, CROP_ASPECTS, type Offset } from "./imageCrop"

const G = "#C9A84C", MUTED = "#A8A190"
const FRAME_MAX = 280 // plus grand côté du cadre à l'écran

export default function ImageCropModal({ file, onCancel, onConfirm }: {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const [url, setUrl] = useState("")
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [aspectKey, setAspectKey] = useState("free")
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = u
    return () => URL.revokeObjectURL(u)
  }, [file])

  // Cadre à l'écran selon le ratio choisi (libre = ratio de l'image).
  const frame = useMemo(() => {
    const a = CROP_ASPECTS.find(x => x.key === aspectKey)?.ratio ?? (natural.w && natural.h ? natural.w / natural.h : 1)
    return a >= 1 ? { w: FRAME_MAX, h: Math.round(FRAME_MAX / a) } : { w: Math.round(FRAME_MAX * a), h: FRAME_MAX }
  }, [aspectKey, natural])

  // Recentre quand ratio/zoom/image changent (offset borné → cadre couvert).
  const disp = useMemo(() => (natural.w ? displaySize(natural, frame, zoom) : { w: 0, h: 0 }), [natural, frame, zoom])
  useEffect(() => {
    if (!natural.w) return
    setOffset(o => clampOffset({ x: (frame.w - disp.w) / 2, y: (frame.h - disp.h) / 2 }, disp, frame))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectKey, natural.w, natural.h])
  const clamped = natural.w ? clampOffset(offset, disp, frame) : offset

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: clamped.x, oy: clamped.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const nx = drag.current.ox + (e.clientX - drag.current.x)
    const ny = drag.current.oy + (e.clientY - drag.current.y)
    setOffset(clampOffset({ x: nx, y: ny }, disp, frame))
  }
  const onPointerUp = () => { drag.current = null }

  async function apply() {
    if (!natural.w || busy) return
    setBusy(true)
    try {
      const crop = computeCropRect(natural, frame, zoom, clamped)
      const out = outputSize(crop)
      const canvas = document.createElement("canvas")
      canvas.width = out.w; canvas.height = out.h
      const ctx = canvas.getContext("2d")
      if (!ctx) { onCancel(); return }
      const img = new Image()
      img.src = url
      await img.decode().catch(() => {})
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, out.w, out.h)
      const type = file.type === "image/png" ? "image/png" : "image/jpeg"
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, type, 0.9))
      if (blob) onConfirm(blob); else onCancel()
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 18, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <p style={{ flex: 1, color: "#F5F0E8", fontSize: 14.5, fontWeight: 700, margin: 0 }}>Recadrer l'image</p>
          <button onClick={onCancel} aria-label="Annuler" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 28, height: 28 }}><X size={14} /></button>
        </div>

        {/* Cadre */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div data-testid="crop-frame"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            style={{ position: "relative", width: frame.w, height: frame.h, borderRadius: 10, overflow: "hidden", background: "#0A0A0A", cursor: "grab", touchAction: "none", boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset" }}>
            {url && <img src={url} alt="" draggable={false}
              style={{ position: "absolute", left: clamped.x, top: clamped.y, width: disp.w, height: disp.h, maxWidth: "none", userSelect: "none", display: "block" }} />}
            {/* Grille des tiers */}
            <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.18) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
          </div>
        </div>

        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "13px 2px 10px" }}>
          <ZoomIn size={16} color={MUTED} />
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))}
            aria-label="Zoom" style={{ flex: 1, accentColor: G }} />
        </div>

        {/* Ratios */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {CROP_ASPECTS.map(a => {
            const active = a.key === aspectKey
            return (
              <button key={a.key} type="button" data-testid={"aspect-" + a.key} onClick={() => setAspectKey(a.key)}
                style={{ padding: "5px 10px", borderRadius: 8, border: active ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.12)", background: active ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", color: active ? "#F5F0E8" : MUTED, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                {a.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          <button onClick={apply} disabled={!natural.w || busy} data-testid="crop-apply"
            style={{ flex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: natural.w ? "linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 75%,#000))" : "rgba(201,168,76,0.2)", border: "none", borderRadius: 10, padding: "11px", color: "#080808", fontSize: 13, fontWeight: 700, cursor: natural.w ? "pointer" : "not-allowed" }}>
            <Check size={15} /> {busy ? "Traitement…" : "Appliquer"}
          </button>
        </div>
      </div>
    </div>
  )
}
