"use client"
// briquesProfil.tsx — Les trois briques d'affichage du profil : la carte de section,
// la pastille de statistique, et le compteur qui s'anime de zéro jusqu'à sa valeur.
//
// Sorties de page.tsx (3 294 lignes) : de l'affichage pur, sans lien avec le compte.
import { useEffect, useRef, useState, type ReactNode } from "react"

const G     = "var(--accent)"
const MUTED = "#A8A190"
const SURF  = "#111009"
const SURF2 = "#0F0E0B"

export function SectionCard({ title, icon: Icon, color = G, children, action, tag }: {
  title: string; icon: any; color?: string; children: React.ReactNode
  action?: React.ReactNode; tag?: string
}) {
  return (
    <div style={{ background: SURF, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={14} color={color}/>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
            {tag && <span style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 4, padding: "1px 6px", fontSize: 9, color: G, fontWeight: 700 }}>{tag}</span>}
          </div>
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  )
}

export function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: SURF2, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={color}/>
      </div>
      <div>
        <p style={{ color: "#F5F0E8", fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1, fontFamily: "Fraunces, serif" }}>{value}</p>
        <p style={{ color: MUTED, fontSize: 10, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
      </div>
    </div>
  )
}

// Compteur animé (s'incrémente de 0 à la valeur au montage) — donne de la vie au Hero
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!value) { setN(0); return }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{n.toLocaleString("fr-FR")}</>
}

// -- Page principale -----------------------------------------------------------

/** Le style commun des champs de saisie et de leurs étiquettes. */
export const inputStyle: React.CSSProperties = {
  width: "100%", background: SURF2, border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9, padding: "10px 13px", color: "#F5F0E8", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif",
  transition: "border-color 0.15s",
}

export const labelStyle: React.CSSProperties = {
  color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500
}

/** Une date en toutes lettres, en français : « 14 mars 2026 ». */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

/** L'écran d'attente : la forme de la page, en gris, pendant le chargement. */
export function SqueletteProfil() {
  return (
    <div style={{ minHeight: "100vh", background: "transparent", padding: "28px 28px 48px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Bandeau profil */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 92, height: 92, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 220, height: 30, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 300, height: 16 }} />
          </div>
        </div>
        {/* Stat pills */}
        <div style={{ display: "flex", gap: 12, marginBottom: 26, flexWrap: "wrap" }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 150, height: 54, borderRadius: 12 }} />)}
        </div>
        {/* 2 colonnes */}
        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  )
}

