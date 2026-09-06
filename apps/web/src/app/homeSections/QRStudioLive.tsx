"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useInView, Eyebrow } from "../homeUi"

const QRCanvasLive = dynamic(() => import("../dashboard/qr-codes/QRCanvas"), {
  ssr: false,
  loading: () => <div style={{ width: 232, height: 232, borderRadius: 12, background: "rgba(0,0,0,0.05)" }} />,
})

const QRL_COLORS = [
  { name: "Or",       v: "#C9A84C" },
  { name: "Noir",     v: "#0A0A0A" },
  { name: "Océan",    v: "#2563EB" },
  { name: "Émeraude", v: "#059669" },
  { name: "Violet",   v: "#7C3AED" },
  { name: "Corail",   v: "#E11D48" },
] as const

const QRL_DOTS = [
  { name: "Arrondi", v: "rounded" },
  { name: "Carré",   v: "square" },
  { name: "Points",  v: "dot" },
  { name: "Élégant", v: "softSquare" },
] as const

type QrlDot = typeof QRL_DOTS[number]["v"]

const QRL_LABEL: React.CSSProperties = {
  color: "#8A8478", fontSize: 12, fontWeight: 700, letterSpacing: 1,
  textTransform: "uppercase", margin: "0 0 12px",
}

export function QRStudioLive() {
  const { ref, visible } = useInView(0.1)
  const [fg, setFg] = useState<string>("#C9A84C")
  const [dot, setDot] = useState<QrlDot>("rounded")

  return (
    <section id="qr-studio" ref={ref} aria-labelledby="qrlive-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .qrl-grid { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; max-width:1000px; margin:0 auto; }
        @media(max-width:820px){ .qrl-grid { grid-template-columns:1fr !important; gap:36px !important; } }
        @media(max-width:640px){ #qr-studio { padding:72px 24px !important; } }
        .qrl-sw { width:34px; height:34px; border-radius:9px; cursor:pointer; padding:0; transition:transform .18s ease, border-color .2s; }
        .qrl-sw:hover { transform:scale(1.1); }
        .qrl-sw:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:2px; }
        .qrl-chip { padding:9px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; transition:all .2s; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); color:rgba(188,182,166,0.85); }
        .qrl-chip:hover { border-color:rgba(201,168,76,0.4); color:#F5F0E8; }
        .qrl-chip[aria-pressed="true"] { background:rgba(201,168,76,0.14); border-color:rgba(201,168,76,0.5); color:#C9A84C; }
        .qrl-chip:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:2px; }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1000, margin: "0 auto 56px", textAlign: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>QR Studio</Eyebrow>
        <h2 id="qrlive-title" style={{
          fontFamily: "Fraunces, serif", fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto 20px",
          lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em",
        }}>
          Un QR code{" "}<span style={{ color: "#C9A84C" }}>à votre image.</span>
        </h2>
        <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
          Couleur, forme des modules : personnalisez, l'aperçu se met à jour en direct. Et c'est un vrai QR — scannez-le.
        </p>
      </div>

      {/* Grid : contrôles + aperçu live */}
      <div className="qrl-grid" style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
      }}>
        {/* Contrôles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <p style={QRL_LABEL}>Couleur</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {QRL_COLORS.map(c => (
                <button key={c.v} type="button" className="qrl-sw" onClick={() => setFg(c.v)}
                  aria-label={`Couleur ${c.name}`} aria-pressed={fg === c.v}
                  style={{ background: c.v, border: `2px solid ${fg === c.v ? "#F5F0E8" : "transparent"}` }} />
              ))}
            </div>
          </div>
          <div>
            <p style={QRL_LABEL}>Forme des modules</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {QRL_DOTS.map(d => (
                <button key={d.v} type="button" className="qrl-chip" aria-pressed={dot === d.v}
                  onClick={() => setDot(d.v)}>{d.name}</button>
              ))}
            </div>
          </div>
          <a href="/generateur-qr-code" style={{
            display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 4,
            background: "linear-gradient(135deg, #EBCE72, #C9A84C)", color: "#0A0A0A",
            fontWeight: 700, fontSize: 15, padding: "13px 24px", borderRadius: 12,
            textDecoration: "none", boxShadow: "0 8px 24px rgba(201,168,76,0.25)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>Créer mon QR code gratuit <span aria-hidden="true">→</span></a>
        </div>

        {/* Aperçu live */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            padding: 20, borderRadius: 20, background: "#FFFFFF",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.15)",
          }}>
            {visible
              ? <QRCanvasLive value="https://qrowg.com" size={232} fg={fg} bg="#FFFFFF" ecc="M" style={{ dotStyle: dot, cornerStyle: "rounded" }} />
              : <div style={{ width: 232, height: 232 }} />}
          </div>
          <p style={{ color: "rgba(188,182,166,0.6)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7, margin: 0 }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
            Aperçu en direct · vrai QR scannable
          </p>
        </div>
      </div>
    </section>
  )
}
