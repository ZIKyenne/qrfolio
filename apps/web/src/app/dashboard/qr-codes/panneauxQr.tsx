"use client"
// panneauxQr.tsx — Les briques d'interface de l'écran « QR de pages » : les glyphes
// des sections, l'accordéon d'un panneau de réglages, et le sélecteur de couleur.
//
// Elles vivaient en tête de QRStudio.tsx, un fichier de 4 268 lignes où la logique
// métier, l'interface et les données de gabarits se mélangeaient — exactement ce qui
// rend un bug invisible. Déplacées telles quelles.
import { useState, useRef, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

const G = "#C9A84C"
const MUTED = "rgba(245,240,232,0.55)"

export const GLYPH_COULEURS = (
  <span style={{ width:16, height:16, borderRadius:"50%", border:"1.5px solid #e8c877", background:"linear-gradient(135deg, #e8c877 0 50%, transparent 50% 100%)" }} />
)
export const GLYPH_MODULES = (
  <span style={{ display:"grid", gridTemplateColumns:"repeat(3, 4px)", gridTemplateRows:"repeat(3, 4px)", gap:2 }}>
    <span style={{ background:"#e8c877", borderRadius:"50%" }}/><span style={{ background:"#e8c877", borderRadius:"50%" }}/><span style={{ background:"rgba(232,200,119,.3)", borderRadius:"50%" }}/>
    <span style={{ background:"#e8c877", borderRadius:1 }}/><span style={{ background:"rgba(232,200,119,.3)", borderRadius:1 }}/><span style={{ background:"#e8c877", borderRadius:1 }}/>
    <span style={{ background:"rgba(232,200,119,.3)", borderRadius:"50%" }}/><span style={{ background:"#e8c877", borderRadius:"50%" }}/><span style={{ background:"#e8c877", borderRadius:"50%" }}/>
  </span>
)
export const GLYPH_COINS = (<>
  <span style={{ position:"absolute", left:4, top:4, width:13, height:13, border:"2px solid #e8c877", borderRadius:3 }}/>
  <span style={{ position:"absolute", left:8, top:8, width:5, height:5, background:"#e8c877", borderRadius:1 }}/>
  <span style={{ position:"absolute", right:4, bottom:4, width:6, height:6, borderRight:"2px solid rgba(232,200,119,.5)", borderBottom:"2px solid rgba(232,200,119,.5)", borderBottomRightRadius:3 }}/>
</>)
export const GLYPH_AVANCES = (<>
  <span style={{ position:"absolute", left:5, top:10, width:16, height:1.5, background:"rgba(232,200,119,.55)" }}/>
  <span style={{ position:"absolute", left:9, top:7.5, width:6, height:6, borderRadius:"50%", background:"#e8c877" }}/>
  <span style={{ position:"absolute", left:5, top:18, width:16, height:1.5, background:"rgba(232,200,119,.55)" }}/>
  <span style={{ position:"absolute", left:15, top:15.5, width:6, height:6, borderRadius:"50%", background:"#e8c877" }}/>
</>)
export const GLYPH_LOGO = (
  <span style={{ position:"relative", width:17, height:14, border:"1.5px solid #e8c877", borderRadius:3, overflow:"hidden" }}>
    <span style={{ position:"absolute", left:2, top:2, width:3.5, height:3.5, borderRadius:"50%", background:"#e8c877" }}/>
    <span style={{ position:"absolute", left:2, bottom:0, width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderBottom:"7px solid #e8c877" }}/>
  </span>
)
export const GLYPH_MARGE = (<>
  <span style={{ position:"absolute", left:6, top:6, width:16, height:16, border:"1.5px dashed rgba(232,200,119,.6)", borderRadius:3 }}/>
  <span style={{ position:"absolute", left:10.5, top:10.5, width:7, height:7, background:"#e8c877", borderRadius:1 }}/>
</>)

export function AccSection({ id, title, icon, glyph, subtitle, openId, setOpenId, children }: {
  id: string; title: string; icon?: string; glyph?: ReactNode; subtitle?: string;
  openId: string; setOpenId: (v: string) => void; children: ReactNode
}) {
  const open = openId === id
  return (
    <div style={{ border:`1px solid ${open?"rgba(232,200,119,.42)":"#26211a"}`, borderRadius:11, overflow:"hidden", background:"rgba(255,255,255,0.025)", transition:"border-color 0.24s ease" }}>
      <button type="button" onClick={() => setOpenId(open ? "" : id)}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(232,200,119,.07)" }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent" }}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"12px 14px", background: open ? "rgba(232,200,119,.07)" : "transparent", border:"none", cursor:"pointer", transition:"background 0.24s ease" }}>
        <span style={{ display:"flex", alignItems:"center", gap:11, minWidth:0 }}>
          {glyph ? (
            <span aria-hidden="true" style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, flexShrink:0, borderRadius:8, background:"linear-gradient(135deg, rgba(232,200,119,.16), rgba(201,162,77,.05))", border:"1px solid rgba(232,200,119,.22)" }}>{glyph}</span>
          ) : icon ? (<span style={{ fontSize:14 }}>{icon}</span>) : null}
          <span style={{ display:"flex", flexDirection:"column", gap:2, minWidth:0, textAlign:"left" as const }}>
            <span style={{ fontSize:13.5, fontWeight:600, color:"#e8e3da", letterSpacing:"-.01em", whiteSpace:"nowrap" as const }}>{title}</span>
            {subtitle && <span style={{ fontSize:11, color:"#8a8177", whiteSpace:"nowrap" as const, overflow:"hidden", textOverflow:"ellipsis" }}>{subtitle}</span>}
          </span>
        </span>
        <ChevronRight size={15} color={open ? "#e8c877" : "#7d766c"} style={{ flexShrink:0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}/>
      </button>
      {open && (
        <div style={{ padding:"6px 13px 14px" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// -- Color picker premium integre --------------------------------------------
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function rgbToHex(r: number, g: number, b: number): string {
  const h = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

export function ColorField({ label, value, onChange, onClear }: {
  label: string; value: string; onChange: (hex: string) => void; onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const valid = /^#[0-9a-fA-F]{6}$/.test(value)
  const safe  = valid ? value : "#080808"
  const [hr, hg, hb] = hexToRgb(safe)
  const [h, s, v] = rgbToHsv(hr, hg, hb)
  const svRef  = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const onSV = (e: React.PointerEvent) => {
    const r = svRef.current?.getBoundingClientRect(); if (!r) return
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    onChange(hsvToHex(h, x, 1 - y))
  }
  const onHue = (e: React.PointerEvent) => {
    const r = hueRef.current?.getBoundingClientRect(); if (!r) return
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    onChange(hsvToHex(x * 360, s || 1, v || 1))
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <label style={{ color:"#A8A190", fontSize:11, flex:1 }}>{label}</label>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ width:28, height:28, borderRadius:6, border:`1px solid ${open?"#C9A84C":"rgba(255,255,255,0.15)"}`, background: valid ? safe : "transparent", cursor:"pointer", flexShrink:0, position:"relative", overflow:"hidden", padding:0 }}>
          {!valid && <span style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(45deg,#222,#222 3px,#444 3px,#444 6px)" }}/>}
        </button>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="#----"
          style={{ width:72, background:"#111009", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"5px 7px", color:valid?"#F5F0E8":"#A8A190", fontSize:10, fontFamily:"monospace", outline:"none" }}/>
        {onClear && (
          <button type="button" onClick={onClear} title="Effacer"
            style={{ width:24, height:24, borderRadius:6, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", color:"#A8A190", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, padding:0 }}>×</button>
        )}
      </div>

      {open && (
        <div style={{ padding:10, background:"rgba(255,255,255,0.02)", border:"1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius:10, display:"flex", flexDirection:"column", gap:9 }}>
          {/* Carre saturation / valeur */}
          <div ref={svRef} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onSV(e) }}
            onPointerMove={e => { if (e.buttons === 1) onSV(e) }}
            style={{ position:"relative", width:"100%", height:120, borderRadius:8, cursor:"crosshair", touchAction:"none",
              background:`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h,1,1)})` }}>
            <div style={{ position:"absolute", left:`${s*100}%`, top:`${(1-v)*100}%`, width:12, height:12, borderRadius:"50%", border:"2px solid #fff", boxShadow:"0 0 0 1px rgba(0,0,0,0.4)", transform:"translate(-50%,-50%)", pointerEvents:"none", background:safe }}/>
          </div>
          {/* Slider teinte */}
          <div ref={hueRef} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onHue(e) }}
            onPointerMove={e => { if (e.buttons === 1) onHue(e) }}
            style={{ position:"relative", width:"100%", height:14, borderRadius:7, cursor:"pointer", touchAction:"none",
              background:"linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)" }}>
            <div style={{ position:"absolute", left:`${(h/360)*100}%`, top:"50%", width:14, height:14, borderRadius:"50%", border:"2px solid #fff", boxShadow:"0 0 0 1px rgba(0,0,0,0.4)", transform:"translate(-50%,-50%)", pointerEvents:"none", background:hsvToHex(h,1,1) }}/>
          </div>
        </div>
      )}
    </div>
  )
}
