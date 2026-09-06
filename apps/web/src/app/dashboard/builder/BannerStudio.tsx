"use client"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, LayoutGrid, Type, Palette, Sparkles, Layers, ChevronDown, Wand2, Crop, Move, X, AArrowUp } from "lucide-react"
import ImageUpload from "./ImageUpload"
import { BANNER_GRADIENTS, BANNER_ANIM_CSS, BANNER_FONTS, BANNER_IMG_FILTERS, BANNER_NOISE_URL as NOISE_URL, bannerBackgroundStyle, bannerImageStyle } from "./types"
import { BANNER_PRESETS } from "./editorPresets"

const G = "#C9A84C"
const MUTED = "#A8A190"
const TEXT = "#F5F0E8"

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

// ── Section repliable (accordéon) avec hiérarchie visuelle optionnelle ───────
function Section({ title, icon, open, onToggle, children, hero }: { title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode; hero?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${open ? "rgba(201,168,76,0.35)" : hero ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, overflow: "hidden",
      background: open ? "rgba(201,168,76,0.06)" : hero ? "rgba(201,168,76,0.03)" : "transparent",
      transition: "border-color .2s, background .2s",
      boxShadow: open ? "0 4px 18px rgba(0,0,0,0.25)" : "none",
    }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", background: "transparent", border: "none", cursor: "pointer", color: open || hero ? G : TEXT, textAlign: "left" }}>
        <span style={{ display: "flex", color: open ? G : hero ? G : MUTED, transition: "color .2s" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</span>
        {hero && !open && <span style={{ background: `${G}22`, color: G, fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, padding: "2px 7px", borderRadius: 20, textTransform: "uppercase" }}>Démarrer</span>}
        <ChevronDown size={15} style={{ color: MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform .22s" }} />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .24s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "2px 13px 15px", display: "flex", flexDirection: "column", gap: 13 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── Slider premium : molette (shift = ×10), double-clic = reset, valeur en chip ─
function Slider({ label, value, min, max, step = 1, unit = "", def, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; def: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <label style={{ color: MUTED, fontSize: 11, fontWeight: 500 }}>{label}</label>
        <span style={{ color: G, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", background: `${G}14`, border: `1px solid ${G}30`, borderRadius: 6, padding: "2px 8px" }}>{value}{unit}</span>
      </div>
      <div
        onWheel={e => { e.preventDefault(); const d = e.deltaY < 0 ? 1 : -1; const mult = e.shiftKey ? 10 : 1; onChange(clamp(value + d * step * mult, min, max)) }}
        onDoubleClick={() => onChange(def)}
        title="Molette pour ajuster · Shift = ×10 · Double-clic = réinitialiser"
        style={{ position: "relative", height: 26, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0 10px", cursor: "ew-resize" }}>
        <div style={{ position: "absolute", left: 10, right: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", left: 10, width: `calc((100% - 20px) * ${pct / 100})`, height: 4, borderRadius: 2, background: `linear-gradient(90deg,${G},${G}bb)` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: "relative", width: "100%", accentColor: G, cursor: "pointer", background: "transparent", zIndex: 1, margin: 0 }} />
      </div>
    </div>
  )
}

const POS_GRID = [["top-left", "top-center", "top-right"], ["left", "center", "right"], ["bottom-left", "bottom-center", "bottom-right"]]
function PositionGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Position du texte</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, width: 108 }}>
        {POS_GRID.flat().map(p => {
          const active = value === p
          return (
            <button key={p} onClick={() => onChange(p)} title={p} style={{ aspectRatio: "1", borderRadius: 6, background: active ? G : "rgba(255,255,255,0.05)", border: `1px solid ${active ? G : "rgba(255,255,255,0.1)"}`, cursor: "pointer", transition: "all .15s", position: "relative" }}>
              <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: active ? "#080808" : "rgba(255,255,255,0.35)" }} />
            </button>
          )
        })}
      </div>
      <p style={{ color: MUTED, fontSize: 9.5, margin: "6px 0 0" }}>Rendu optimisé : bas-gauche, bas-centre, centre.</p>
    </div>
  )
}

function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
      {options.map(o => {
        const on = value === o.key
        return <button key={o.key} onClick={() => onChange(o.key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, background: on ? G : "transparent", border: "none", color: on ? "#080808" : MUTED, fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>{o.label}</button>
      })}
    </div>
  )
}

// ── Color Studio (lite) : HEX + pipette + palette thème + couleurs récentes ──
const PALETTE = ["#C9A84C", "var(--success)", "#F5F0E8", "#ffffff", "#080808", "#0b0b0f", "#EC4899", "#9146FF", "var(--action)", "#EF4444", "#FBBF24", "#1DB954"]
function ColorStudio({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string) => void }) {
  const [recent, setRecent] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem("qfb_recent_colors") || "[]")) } catch {} }, [])
  const commit = (v: string) => {
    onChange(v)
    try {
      const next = [v, ...recent.filter(c => c.toLowerCase() !== v.toLowerCase())].slice(0, 8)
      setRecent(next); localStorage.setItem("qfb_recent_colors", JSON.stringify(next))
    } catch {}
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <label style={{ color: MUTED, fontSize: 11, fontWeight: 500 }}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <input value={value || ""} placeholder={fallback} onChange={e => onChange(e.target.value)} onBlur={e => e.target.value && commit(e.target.value)} style={{ width: 82, background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 7, padding: "6px 8px", color: TEXT, fontSize: 11, outline: "none", fontFamily: "monospace" }} />
          <label style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: value || fallback, cursor: "pointer", flexShrink: 0, position: "relative", overflow: "hidden" }} title="Pipette / roue chromatique">
            <input type="color" value={value || fallback} onChange={e => commit(e.target.value)} style={{ position: "absolute", inset: -4, width: 40, height: 40, border: "none", padding: 0, cursor: "pointer", opacity: 0 }} />
          </label>
          <button onClick={() => setOpen(o => !o)} title="Palette" style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${open ? G : "rgba(255,255,255,0.15)"}`, background: open ? `${G}18` : "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: open ? G : MUTED }}><Palette size={13} /></button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <p style={{ color: MUTED, fontSize: 9.5, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1 }}>Palette</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {PALETTE.map(col => <button key={col} onClick={() => commit(col)} title={col} style={{ width: 22, height: 22, borderRadius: 6, background: col, border: (value || "").toLowerCase() === col.toLowerCase() ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }} />)}
            </div>
          </div>
          {recent.length > 0 && (
            <div>
              <p style={{ color: MUTED, fontSize: 9.5, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1 }}>Récentes</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {recent.map(col => <button key={col} onClick={() => commit(col)} title={col} style={{ width: 22, height: 22, borderRadius: 6, background: col, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const GRAD_OPTS = [...Object.keys(BANNER_GRADIENTS).map(k => ({ key: k, label: k.replace("_", " ") })), { key: "personnalise", label: "perso" }]
const ANIM_OPTS = [
  { key: "none", label: "Aucune" }, { key: "shimmer", label: "Shimmer" }, { key: "gradient_flow", label: "Flux" },
  { key: "floating", label: "Flottant" }, { key: "kenburns", label: "Ken Burns" }, { key: "zoom", label: "Zoom" }, { key: "pulse", label: "Pulse" },
]

// ── Éditeur de recadrage interactif (déplacement souris + zoom + presets) ────
function CropEditor({ content, set, onClose }: { content: Record<string, any>; set: (k: string, v: any) => void; onClose: () => void }) {
  const c = content
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const zoom = Math.max(1, parseFloat(c.img_zoom) || 1)
  const px = (c.img_pos_x !== undefined && c.img_pos_x !== "") ? parseFloat(c.img_pos_x) : 50
  const py = (c.img_pos_y !== undefined && c.img_pos_y !== "") ? parseFloat(c.img_pos_y) : (c.img_focus === "top" ? 0 : c.img_focus === "bottom" ? 100 : 50)
  const previewH = clamp(Math.round(300 * (parseInt(c.height_px) || 180) / 320), 130, 380)

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, px, py }; e.currentTarget.setPointerCapture(e.pointerId) }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !boxRef.current) return
    const b = boxRef.current.getBoundingClientRect()
    const nx = clamp(drag.current.px - (e.clientX - drag.current.x) / b.width * 100, 0, 100)
    const ny = clamp(drag.current.py - (e.clientY - drag.current.y) / b.height * 100, 0, 100)
    set("img_pos_x", nx.toFixed(1)); set("img_pos_y", ny.toFixed(1))
  }
  const onUp = () => { drag.current = null }
  const reset = () => { set("img_pos_x", "50"); set("img_pos_y", "50"); set("img_zoom", "1") }
  const quick = (yy: number) => { set("img_pos_x", "50"); set("img_pos_y", String(yy)) }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111009", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, padding: 18, width: 340, maxWidth: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Crop size={16} color={G} />
          <span style={{ color: G, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", flex: 1 }}>Recadrage</span>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "transparent", border: "none", cursor: "pointer", color: MUTED, display: "flex" }}><X size={17} /></button>
        </div>
        {/* Zone draggable */}
        <div ref={boxRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ position: "relative", width: "100%", height: previewH, borderRadius: 12, overflow: "hidden", cursor: drag.current ? "grabbing" : "grab", background: "#000", touchAction: "none", border: "1px solid rgba(255,255,255,0.1)" }}>
          {c.src ? <img src={c.src} alt="" draggable={false} style={{ width: "100%", height: "100%", pointerEvents: "none", ...bannerImageStyle(c) }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Aucune image</div>}
          {/* Repère grille (règle des tiers) */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.18) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "4px 10px", color: "#fff", fontSize: 10, fontWeight: 600, pointerEvents: "none" }}><Move size={11} /> Glissez pour cadrer</div>
        </div>
        {/* Zoom */}
        <div style={{ marginTop: 14 }}>
          <Slider label="Zoom" value={Number(zoom.toFixed(2))} min={1} max={3} step={0.05} unit="×" def={1} onChange={v => set("img_zoom", String(v))} />
        </div>
        {/* Presets rapides + reset */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button onClick={() => quick(0)} style={miniBtn}>Haut</button>
          <button onClick={() => quick(50)} style={miniBtn}>Centre</button>
          <button onClick={() => quick(100)} style={miniBtn}>Bas</button>
          <button onClick={reset} style={{ ...miniBtn, color: MUTED }}>Reset</button>
        </div>
        <button onClick={onClose} className="da-btn-primary da-btn-primary--sm" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}><span>Terminé</span></button>
      </div>
    </div>
  )
}
const miniBtn: React.CSSProperties = { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 4px", color: TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer" }
const styleBtn: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 10px", color: TEXT, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }

// Clés de "style" de la bannière (tout sauf le contenu réel : titre/sous-titre/badge/image/lien)
const BANNER_STYLE_KEYS = [
  "banner_type", "grad_preset", "grad_c1", "grad_c2", "bg_color", "height_px", "block_radius", "text_position", "text_color",
  "overlay_gradient", "overlay_color", "overlay_opacity", "blend_mode", "fx_overlay", "animation",
  "block_shadow", "block_border", "border_color",
  "title_font", "title_size", "title_weight", "title_tracking", "title_transform", "title_effect", "subtitle_size",
  "img_zoom", "img_focus", "img_pos_x", "img_pos_y", "img_brightness", "img_contrast", "img_saturate", "img_grayscale", "img_sepia", "img_blur",
]

export default function BannerStudio({ content, onChange }: { content: Record<string, any>; onChange: (key: string, val: string) => void }) {
  const c = content
  const [open, setOpen] = useState<string>("image")
  const [crop, setCrop] = useState(false)
  const [hasClip, setHasClip] = useState(false)
  const [flash, setFlash] = useState("")
  const toggle = (id: string) => setOpen(o => o === id ? "" : id)
  useEffect(() => { try { setHasClip(!!localStorage.getItem("qfb_banner_style")) } catch {} }, [])
  const notify = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 1600) }
  const copyStyle = () => { try { const o: Record<string, string> = {}; BANNER_STYLE_KEYS.forEach(k => { if (c[k] !== undefined && c[k] !== "") o[k] = String(c[k]) }); localStorage.setItem("qfb_banner_style", JSON.stringify(o)); setHasClip(true); notify("Style copié") } catch {} }
  const pasteStyle = () => { try { const o = JSON.parse(localStorage.getItem("qfb_banner_style") || "{}"); Object.entries(o).forEach(([k, v]) => onChange(k, String(v))); notify("Style appliqué") } catch {} }
  const resetStyle = () => { BANNER_STYLE_KEYS.forEach(k => onChange(k, "")); notify("Style réinitialisé") }
  const set = (k: string, v: any) => onChange(k, String(v))
  const applyPreset = (preset: Record<string, any>) => Object.entries(preset).forEach(([k, v]) => onChange(k, String(v)))

  const type = c.banner_type || (c.src ? "image" : "gradient")
  const anim = c.animation || "none"
  const heightPx = parseInt(c.height_px) || 180

  // ── Score de qualité visuelle + conseils ──────────────────────────────────
  const hasBg = type === "image" ? !!c.src : true
  const hasOverlayOnImage = type === "image" && (c.overlay_gradient && c.overlay_gradient !== "none")
  let score = 0
  if (hasBg) score += 30
  if (c.cover_title) score += 22
  if (c.cover_subtitle) score += 12
  if (type !== "image" || hasOverlayOnImage) score += 16
  if (anim !== "none") score += 12
  if (c.badge) score += 8
  score = Math.min(100, score)
  const tips: string[] = []
  if (type === "image" && !c.src) tips.push("Ajoutez une image de fond.")
  if (type === "image" && c.src && !hasOverlayOnImage) tips.push("Ajoutez un voile pour la lisibilité du texte.")
  if (!c.cover_title) tips.push("Ajoutez un titre percutant.")
  if ((c.cover_title || "").length > 40) tips.push("Titre un peu long, raccourcissez pour l'impact.")
  if (anim === "none") tips.push("Une animation légère renforce l'effet premium.")
  const stars = Math.round(score / 20)

  const typeLabel = type === "image" ? "Image" : type === "gradient" ? "Dégradé" : "Couleur"
  const animLabel = ANIM_OPTS.find(a => a.key === anim)?.label || "Aucune"

  // Mini-aperçu de fond (presets & preview d'en-tête)
  const bgPreview = (cc: Record<string, any>): React.CSSProperties => {
    const t = cc.banner_type || (cc.src ? "image" : "gradient")
    if (t === "image" && cc.src) return { backgroundImage: `url(${cc.src})`, backgroundSize: "cover", backgroundPosition: "center" }
    return bannerBackgroundStyle(cc, G) as React.CSSProperties
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <style>{BANNER_ANIM_CSS}</style>
      {crop && <CropEditor content={c} set={set} onClose={() => setCrop(false)} />}

      {/* EN-TÊTE STUDIO */}
      <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,0.14),rgba(201,168,76,0.03))", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 13, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <span style={{ display: "flex", color: G, animation: "qfbFloat 4s ease-in-out infinite" }}><Wand2 size={16} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ color: G, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.5, margin: 0, textTransform: "uppercase" }}>Banner Studio</p>
            <p style={{ color: MUTED, fontSize: 10, margin: "1px 0 0" }}>{typeLabel} · {heightPx}px · {animLabel}</p>
          </div>
          {/* aperçu miniature live */}
          <div className={anim !== "none" ? `qfb qfb-${anim}` : undefined} style={{ width: 58, height: 34, borderRadius: 7, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
            <div className="qfb-media" style={{ position: "absolute", inset: 0, ...bgPreview(c) }} />
            {anim === "shimmer" && <div className="qfb-shine" />}
          </div>
        </div>
        {/* Score qualité */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: MUTED, fontSize: 10, fontWeight: 600 }}>Qualité visuelle</span>
            <span style={{ color: score >= 80 ? "var(--success)" : score >= 55 ? G : "#FBBF24", fontSize: 11, fontWeight: 700 }}>{score}% · {"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg,${G},var(--success))`, borderRadius: 3, transition: "width .3s ease" }} />
          </div>
          {tips[0] && <p style={{ color: MUTED, fontSize: 10, margin: "7px 0 0", display: "flex", gap: 5 }}><span style={{ color: G }}>💡</span>{tips[0]}</p>}
        </div>
        {/* Style : copier / coller / réinitialiser */}
        <div style={{ display: "flex", gap: 6, marginTop: 11, alignItems: "center" }}>
          <button onClick={copyStyle} title="Copier le style de cette bannière" style={styleBtn}>Copier</button>
          <button onClick={pasteStyle} disabled={!hasClip} title={hasClip ? "Appliquer le style copié" : "Copiez d'abord un style"} style={{ ...styleBtn, opacity: hasClip ? 1 : 0.4, cursor: hasClip ? "pointer" : "not-allowed" }}>Coller</button>
          <button onClick={resetStyle} title="Réinitialiser le style" style={{ ...styleBtn, color: MUTED }}>Réinitialiser</button>
          {flash && <span style={{ marginLeft: "auto", color: "var(--success)", fontSize: 10, fontWeight: 700 }}>✓ {flash}</span>}
        </div>
      </div>

      {/* IMAGE & FOND (héros) */}
      <Section title="Image & Fond" icon={<ImageIcon size={15} />} open={open === "image"} onToggle={() => toggle("image")} hero>
        <Segmented value={type} onChange={v => set("banner_type", v)} options={[{ key: "image", label: "Image" }, { key: "gradient", label: "Dégradé" }, { key: "color", label: "Couleur" }]} />
        {type === "image" && (
          <>
            <ImageUpload value={c.src || ""} onChange={url => set("src", url)} cropAspect="wide" hint="Glissez-déposez, collez ou importez une URL" />
            {c.src && (
              <button onClick={() => setCrop(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 9, padding: "10px", color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.18)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}>
                <Crop size={14} /> Recadrer &amp; Zoomer{(parseFloat(c.img_zoom) > 1 || (c.img_pos_x && c.img_pos_x !== "50")) ? " ✓" : ""}
              </button>
            )}
            {c.src && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Filtres</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {BANNER_IMG_FILTERS.map(fl => {
                      const on = (parseInt(c.img_grayscale) || 0) === (parseInt(fl.v.img_grayscale) || 0) && (parseInt(c.img_sepia) || 0) === (parseInt(fl.v.img_sepia) || 0) && (parseInt(c.img_saturate) || 100) === (parseInt(fl.v.img_saturate) || 100)
                      return (
                        <button key={fl.key} onClick={() => Object.entries(fl.v).forEach(([k, v]) => set(k, v))} style={{ borderRadius: 9, overflow: "hidden", border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, cursor: "pointer", background: "transparent", padding: 0 }}>
                          <div style={{ height: 28, backgroundImage: `url(${c.src})`, backgroundSize: "cover", backgroundPosition: "center", filter: [fl.v.img_grayscale && +fl.v.img_grayscale ? `grayscale(${fl.v.img_grayscale}%)` : "", fl.v.img_sepia && +fl.v.img_sepia ? `sepia(${fl.v.img_sepia}%)` : "", fl.v.img_saturate ? `saturate(${fl.v.img_saturate}%)` : "", fl.v.img_contrast ? `contrast(${fl.v.img_contrast}%)` : "", fl.v.img_brightness ? `brightness(${fl.v.img_brightness}%)` : ""].filter(Boolean).join(" ") }} />
                          <div style={{ fontSize: 9.5, color: on ? G : MUTED, fontWeight: on ? 700 : 500, padding: "3px 2px", textAlign: "center" }}>{fl.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Slider label="Luminosité" value={parseInt(c.img_brightness) || 100} min={50} max={160} unit=" %" def={100} onChange={v => set("img_brightness", v)} />
                <Slider label="Contraste" value={parseInt(c.img_contrast) || 100} min={50} max={160} unit=" %" def={100} onChange={v => set("img_contrast", v)} />
                <Slider label="Saturation" value={parseInt(c.img_saturate) || 100} min={0} max={200} unit=" %" def={100} onChange={v => set("img_saturate", v)} />
              </div>
            )}
          </>
        )}
        {type === "gradient" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {GRAD_OPTS.map(o => {
                const on = (c.grad_preset || "or_nuit") === o.key
                const prevStyle = o.key === "personnalise" ? { background: `linear-gradient(135deg,${c.grad_c1 || G},${c.grad_c2 || "#1a1206"})` } : bannerBackgroundStyle({ banner_type: "gradient", grad_preset: o.key }, G) as React.CSSProperties
                return (
                  <button key={o.key} onClick={() => set("grad_preset", o.key)} style={{ borderRadius: 9, overflow: "hidden", border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, cursor: "pointer", background: "transparent", padding: 0 }}>
                    <div style={{ height: 30, ...prevStyle }} />
                    <div style={{ fontSize: 9.5, color: on ? G : MUTED, fontWeight: on ? 700 : 500, padding: "3px 2px", textAlign: "center" }}>{o.label}</div>
                  </button>
                )
              })}
            </div>
            {c.grad_preset === "personnalise" && (
              <>
                <ColorStudio label="Couleur 1" value={c.grad_c1} fallback={G} onChange={v => set("grad_c1", v)} />
                <ColorStudio label="Couleur 2" value={c.grad_c2} fallback="#1a1206" onChange={v => set("grad_c2", v)} />
              </>
            )}
          </>
        )}
        {type === "color" && <ColorStudio label="Couleur de fond" value={c.bg_color} fallback="#1a1a1a" onChange={v => set("bg_color", v)} />}
      </Section>

      {/* MISE EN PAGE */}
      <Section title="Mise en page" icon={<LayoutGrid size={15} />} open={open === "layout"} onToggle={() => toggle("layout")}>
        <Slider label="Hauteur" value={heightPx} min={80} max={420} unit=" px" def={180} onChange={v => set("height_px", v)} />
        <Slider label="Coins arrondis" value={parseInt(c.block_radius) || 0} min={0} max={32} unit=" px" def={0} onChange={v => set("block_radius", v)} />
        <PositionGrid value={c.text_position || "bottom-left"} onChange={v => set("text_position", v)} />
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Ombre du bloc</label>
          <Segmented value={c.block_shadow || "none"} onChange={v => set("block_shadow", v)} options={[{ key: "none", label: "Aucune" }, { key: "soft", label: "Douce" }, { key: "strong", label: "Forte" }, { key: "glow", label: "Glow" }]} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Bordure</label>
          <Segmented value={c.block_border || "none"} onChange={v => set("block_border", v)} options={[{ key: "none", label: "Aucune" }, { key: "line", label: "Ligne" }, { key: "glow", label: "Lumineuse" }, { key: "gradient", label: "Dégradée" }]} />
        </div>
        {(c.block_border === "line" || c.block_border === "gradient") && <ColorStudio label="Couleur de bordure" value={c.border_color} fallback={G} onChange={v => set("border_color", v)} />}
      </Section>

      {/* CONTENU */}
      <Section title="Contenu" icon={<Type size={15} />} open={open === "content"} onToggle={() => toggle("content")}>
        <Field label="Badge (optionnel)" value={c.badge} placeholder="Nouveau · Premium…" onChange={v => set("badge", v)} />
        <Field label="Titre" value={c.cover_title} placeholder="Mon titre…" max={40} onChange={v => set("cover_title", v)} />
        <Field label="Sous-titre" value={c.cover_subtitle} placeholder="Une phrase d'accroche…" max={70} onChange={v => set("cover_subtitle", v)} />
        <ColorStudio label="Couleur du texte" value={c.text_color} fallback="#ffffff" onChange={v => set("text_color", v)} />
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          <Field label="🔗 Lien au clic (optionnel)" value={c.link_url} placeholder="https://… ou mailto: / tel:" onChange={v => set("link_url", v)} />
          {c.link_url && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={c.link_blank !== "no"} onChange={e => set("link_blank", e.target.checked ? "yes" : "no")} style={{ accentColor: G, width: 15, height: 15 }} />
              <span style={{ color: MUTED, fontSize: 11 }}>Ouvrir dans un nouvel onglet</span>
            </label>
          )}
          {c.link_url && <p style={{ color: G, fontSize: 10, margin: "7px 0 0", display: "flex", gap: 5 }}><span>👆</span>Toute la bannière devient cliquable (clic tracké dans les stats).</p>}
        </div>
      </Section>

      {/* TYPOGRAPHIE */}
      <Section title="Typographie" icon={<AArrowUp size={15} />} open={open === "type"} onToggle={() => toggle("type")}>
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Police du titre</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[{ key: "auto", label: "Auto", ff: "inherit" }, { key: "serif", label: "Serif", ff: BANNER_FONTS.serif }, { key: "sans", label: "Sans", ff: BANNER_FONTS.sans }, { key: "display", label: "Display", ff: BANNER_FONTS.display }, { key: "mono", label: "Mono", ff: BANNER_FONTS.mono }].map(o => {
              const on = (c.title_font || "auto") === o.key
              return (
                <button key={o.key} onClick={() => set("title_font", o.key)} style={{ borderRadius: 9, border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, background: on ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", cursor: "pointer", padding: "8px 4px" }}>
                  <div style={{ fontFamily: o.ff, color: on ? G : TEXT, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Ag</div>
                  <div style={{ fontSize: 9, color: on ? G : MUTED, marginTop: 3 }}>{o.label}</div>
                </button>
              )
            })}
          </div>
        </div>
        <Slider label="Taille du titre" value={parseInt(c.title_size) || 24} min={13} max={48} unit=" px" def={24} onChange={v => set("title_size", v)} />
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Graisse</label>
          <Segmented value={String(parseInt(c.title_weight) || 700)} onChange={v => set("title_weight", v)} options={[{ key: "400", label: "Léger" }, { key: "600", label: "Semi" }, { key: "700", label: "Gras" }, { key: "800", label: "Black" }]} />
        </div>
        <Slider label="Interlettrage" value={parseFloat(c.title_tracking) || 0} min={-2} max={10} step={0.5} unit=" px" def={0} onChange={v => set("title_tracking", v)} />
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Casse</label>
          <Segmented value={c.title_transform || "none"} onChange={v => set("title_transform", v)} options={[{ key: "none", label: "Aa" }, { key: "uppercase", label: "AA" }, { key: "capitalize", label: "Aa Bb" }]} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Effet de texte</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {[{ key: "shadow", label: "Ombre", sh: "0 2px 6px rgba(0,0,0,0.9)" }, { key: "glow", label: "Glow", sh: `0 0 10px ${G}` }, { key: "outline", label: "Contour", stroke: true }, { key: "none", label: "Aucun" }].map(o => {
              const cur = c.title_effect || "shadow"
              const on = cur === o.key
              return (
                <button key={o.key} onClick={() => set("title_effect", o.key)} style={{ borderRadius: 9, border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, background: on ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", cursor: "pointer", padding: "9px 2px" }}>
                  <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1, textShadow: (o as any).sh || "none", WebkitTextStroke: (o as any).stroke ? "0.8px rgba(0,0,0,0.7)" : undefined }}>Ag</div>
                  <div style={{ fontSize: 8.5, color: on ? G : MUTED, marginTop: 4 }}>{o.label}</div>
                </button>
              )
            })}
          </div>
        </div>
        <Slider label="Taille du sous-titre" value={parseInt(c.subtitle_size) || 14} min={10} max={24} unit=" px" def={14} onChange={v => set("subtitle_size", v)} />
      </Section>

      {/* COULEURS & OVERLAY — cartes illustrées */}
      <Section title="Couleurs & Overlay" icon={<Palette size={15} />} open={open === "overlay"} onToggle={() => toggle("overlay")}>
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Voile de lisibilité</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[
              { key: "none", label: "Aucun", grad: "linear-gradient(135deg,#3a3a3a,#555)" },
              { key: "bottom", label: "Dégradé", grad: "linear-gradient(to top,rgba(0,0,0,0.7),#555 70%)" },
              { key: "full", label: "Plein", grad: "linear-gradient(#333,#222)" },
            ].map(o => {
              const on = (c.overlay_gradient || "none") === o.key
              return (
                <button key={o.key} onClick={() => set("overlay_gradient", o.key)} style={{ borderRadius: 9, overflow: "hidden", border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, cursor: "pointer", background: "transparent", padding: 0 }}>
                  <div style={{ height: 34, background: o.grad, position: "relative" }}><span style={{ position: "absolute", bottom: 4, left: 5, color: "#fff", fontSize: 8, fontWeight: 700, textShadow: "0 1px 2px #000" }}>Texte</span></div>
                  <div style={{ fontSize: 10, color: on ? G : MUTED, fontWeight: on ? 700 : 500, padding: "4px 2px", textAlign: "center" }}>{o.label}</div>
                </button>
              )
            })}
          </div>
        </div>
        <ColorStudio label="Couleur voile" value={c.overlay_color} fallback="#000000" onChange={v => set("overlay_color", v)} />
        <Slider label="Opacité voile" value={Math.round((parseFloat(c.overlay_opacity ?? "0") || 0) * 100)} min={0} max={90} unit=" %" def={0} onChange={v => set("overlay_opacity", (v / 100).toFixed(2))} />
        {(parseFloat(c.overlay_opacity || "0") > 0) && (
          <div>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 6 }}>Mode de fusion de la teinte</label>
            <select value={c.blend_mode || "normal"} onChange={e => set("blend_mode", e.target.value)} style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 12, outline: "none" }}>
              {["normal", "multiply", "screen", "overlay", "soft-light", "color-burn", "darken", "lighten"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ color: MUTED, fontSize: 11, fontWeight: 500, display: "block", marginBottom: 7 }}>Effet d'overlay</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[
              { key: "none", label: "Aucun", prev: <div style={{ position: "absolute", inset: 0, background: "#2a2a2a" }} /> },
              { key: "glass", label: "Verre", prev: <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(3px)", background: "linear-gradient(135deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05))" }} /> },
              { key: "noise", label: "Grain", prev: <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${NOISE_URL}")`, opacity: 0.35 }} /> },
              { key: "mesh", label: "Mesh", prev: <div style={{ position: "absolute", inset: 0, background: `radial-gradient(at 20% 20%,${G}99,transparent 50%),radial-gradient(at 80% 80%,#9146FF99,transparent 50%)` }} /> },
              { key: "aurora", label: "Aurora", prev: <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,rgba(57,255,143,0.6),rgba(145,70,255,0.5),rgba(56,189,248,0.6))", filter: "blur(3px)" }} /> },
            ].map(o => {
              const on = (c.fx_overlay || "none") === o.key
              return (
                <button key={o.key} onClick={() => set("fx_overlay", o.key)} style={{ borderRadius: 9, overflow: "hidden", border: `1.5px solid ${on ? G : "rgba(255,255,255,0.1)"}`, cursor: "pointer", background: "transparent", padding: 0 }}>
                  <div style={{ height: 32, position: "relative", background: "#1a1a1a" }}>{o.prev}</div>
                  <div style={{ fontSize: 9.5, color: on ? G : MUTED, fontWeight: on ? 700 : 500, padding: "3px 2px", textAlign: "center" }}>{o.label}</div>
                </button>
              )
            })}
          </div>
          <p style={{ color: MUTED, fontSize: 9.5, margin: "6px 0 0" }}>Verre = flou dépoli · Grain = texture ciné · Mesh = halos colorés · Aurora = lueur animée.</p>
        </div>
      </Section>

      {/* EFFETS & ANIMATION — galerie prévisualisée en direct */}
      <Section title="Effets & Animation" icon={<Sparkles size={15} />} open={open === "anim"} onToggle={() => toggle("anim")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 7 }}>
          {ANIM_OPTS.map(o => {
            const on = anim === o.key
            return (
              <button key={o.key} onClick={() => set("animation", o.key)} style={{ borderRadius: 10, overflow: "hidden", border: `1.5px solid ${on ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.09)"}`, background: on ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)", cursor: "pointer", padding: 0 }}>
                <div className={o.key !== "none" ? `qfb qfb-${o.key}` : undefined} style={{ height: 38, position: "relative", overflow: "hidden" }}>
                  <div className="qfb-media" style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${G},#1a1206)` }} />
                  {o.key === "shimmer" && <div className="qfb-shine" />}
                  <div className="qfb-content" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 16, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.7)" }} />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: on ? G : MUTED, fontWeight: on ? 700 : 500, padding: "5px 2px", textAlign: "center" }}>{o.label}</div>
              </button>
            )
          })}
        </div>
        <p style={{ color: MUTED, fontSize: 10, margin: 0, lineHeight: 1.5 }}>Les animations s'affichent sur la page publiée (aperçu réel ci-dessus).</p>
      </Section>

      {/* MODELES — galerie avec mini-aperçus */}
      <Section title="Modèles" icon={<Layers size={15} />} open={open === "presets"} onToggle={() => toggle("presets")}>
        <p style={{ color: MUTED, fontSize: 10.5, margin: 0 }}>Un clic configure toute la bannière. Ajoutez ensuite votre image.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {BANNER_PRESETS.map(p => {
            const anim2 = p.content.animation && p.content.animation !== "none" ? p.content.animation : null
            return (
              <button key={p.key} onClick={() => applyPreset(p.content)} style={{ borderRadius: 11, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.03)", cursor: "pointer", padding: 0, transition: "border-color .15s, transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.45)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.transform = "none" }}>
                <div className={anim2 ? `qfb qfb-${anim2}` : undefined} style={{ height: 46, position: "relative", overflow: "hidden" }}>
                  <div className="qfb-media" style={{ position: "absolute", inset: 0, ...bgPreview(p.content) }} />
                  {anim2 === "shimmer" && <div className="qfb-shine" />}
                  {(p.content.overlay_gradient === "bottom" || p.content.overlay_gradient === "full") && <div style={{ position: "absolute", inset: 0, background: p.content.overlay_gradient === "full" ? "rgba(0,0,0,0.35)" : "linear-gradient(to top,rgba(0,0,0,0.6),transparent 70%)" }} />}
                  <span style={{ position: "absolute", top: 5, left: 6, fontSize: 13 }}>{p.emoji}</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT, fontWeight: 600, padding: "6px 8px", textAlign: "left" }}>{p.label}</div>
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function Field({ label, value, placeholder, max, onChange }: { label: string; value?: string; placeholder?: string; max?: number; onChange: (v: string) => void }) {
  const len = (value || "").length
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <label style={{ color: MUTED, fontSize: 11, fontWeight: 500 }}>{label}</label>
        {max && <span style={{ color: len > max ? "#EF4444" : MUTED, fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{len}/{max}</span>}
      </div>
      <input value={value || ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif", transition: "border-color .15s" }}
        onFocus={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"} />
    </div>
  )
}
