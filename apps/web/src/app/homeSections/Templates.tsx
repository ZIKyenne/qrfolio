"use client"

import { useState } from "react"
import { useInView, Eyebrow } from "../homeUi"
import { PLANS as PLANS_DEF } from "@/lib/plans"

const TEMPLATE_DATA = [
  {
    id: "restaurant",
    name: "Restaurant & Bar",
    category: "Food & Beverage",
    includes: ["Menu", "Réservation", "Avis Google"],
    blocks: 7,
    isPro: false,
    accent: "#F97316",
    icon: "🍽️",
    preview: [
      { type: "avatar", label: "Logo & Nom" },
      { type: "bar",    color: "rgba(249,115,22,0.5)", w: "85%" },
      { type: "bar",    color: "rgba(249,115,22,0.25)", w: "65%" },
      { type: "grid2",  color: "rgba(249,115,22,0.15)" },
      { type: "btn",    color: "rgba(249,115,22,0.35)", label: "Voir le menu" },
    ],
  },
  {
    id: "freelance",
    name: "Freelance Pro",
    category: "Services",
    includes: ["Portfolio", "Contact", "Réseaux"],
    blocks: 6,
    isPro: false,
    accent: "var(--action)",
    icon: "💼",
    preview: [
      { type: "avatar", label: "Photo & Titre" },
      { type: "bar",    color: "rgba(56,189,248,0.5)", w: "70%" },
      { type: "tags",   color: "rgba(56,189,248,0.2)" },
      { type: "bar",    color: "rgba(56,189,248,0.2)", w: "90%" },
      { type: "btn",    color: "rgba(56,189,248,0.35)", label: "Me contacter" },
    ],
  },
  {
    id: "coach",
    name: "Coach & Thérapeute",
    category: "Bien-être",
    includes: ["Prestations", "Prise de RDV", "Avis"],
    blocks: 8,
    isPro: false,
    accent: "var(--success)",
    icon: "🧘",
    preview: [
      { type: "avatar", label: "Portrait" },
      { type: "bar",    color: "rgba(57,255,143,0.45)", w: "80%" },
      { type: "bar",    color: "rgba(57,255,143,0.2)",  w: "60%" },
      { type: "bar",    color: "rgba(57,255,143,0.15)", w: "75%" },
      { type: "btn",    color: "rgba(57,255,143,0.3)", label: "Prendre RDV" },
    ],
  },
  {
    id: "artist",
    name: "Artiste & Musicien",
    category: "Créatif",
    includes: ["Musique", "Galerie", "Dates"],
    blocks: 7,
    isPro: true,
    accent: "#A78BFA",
    icon: "🎵",
    preview: [
      { type: "avatar", label: "Photo artistique" },
      { type: "bar",    color: "rgba(167,139,250,0.5)", w: "90%" },
      { type: "grid3",  color: "rgba(167,139,250,0.2)" },
      { type: "bar",    color: "rgba(167,139,250,0.2)", w: "60%" },
      { type: "btn",    color: "rgba(167,139,250,0.35)", label: "Ecouter" },
    ],
  },
  {
    id: "immo",
    name: "Agent Immobilier",
    category: "Immobilier",
    includes: ["Biens", "Estimation", "Contact"],
    blocks: 6,
    isPro: true,
    accent: "#C9A84C",
    icon: "🏠",
    preview: [
      { type: "avatar", label: "Agent" },
      { type: "bar",    color: "rgba(201,168,76,0.5)", w: "75%" },
      { type: "grid2",  color: "rgba(201,168,76,0.15)" },
      { type: "bar",    color: "rgba(201,168,76,0.2)", w: "55%" },
      { type: "btn",    color: "rgba(201,168,76,0.35)", label: "Estimer" },
    ],
  },
  {
    id: "boutique",
    name: "Boutique E-commerce",
    category: "Commerce",
    includes: ["Catalogue", "Paiement", "Promos"],
    blocks: 9,
    isPro: true,
    accent: "#F43F5E",
    icon: "🛍️",
    preview: [
      { type: "avatar", label: "Marque" },
      { type: "bar",    color: "rgba(244,63,94,0.45)", w: "80%" },
      { type: "grid3",  color: "rgba(244,63,94,0.2)" },
      { type: "bar",    color: "rgba(244,63,94,0.15)", w: "65%" },
      { type: "btn",    color: "rgba(244,63,94,0.35)", label: "Commander" },
    ],
  },
] as const

function TemplateMiniPreview({ preview, accent, hovered = false }: { preview: readonly {type:string;color?:string;w?:string;label?:string}[]; accent: string; hovered?: boolean }) {
  return (
    <div style={{
      background: "#0c0a08",
      border: `1px solid ${hovered ? accent + "33" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 10, padding: "10px 10px",
      display: "flex", flexDirection: "column", gap: 6,
      height: 120, position: "relative", overflow: "hidden",
      transform: hovered ? "scale(1.02)" : "scale(1)",
      transformOrigin: "center",
      transition: "transform 0.3s var(--mo-ease-spring), border-color 0.25s",
    }}>
      {/* Balayage lumineux au survol : donne vie à l'aperçu (façon page réelle) */}
      {hovered && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
          <div className="tpl-sweep" style={{
            position: "absolute", top: 0, bottom: 0, width: "55%", left: "-60%",
            background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.10), transparent)",
          }} />
        </div>
      )}
      {preview.map((p, i) => {
        if (p.type === "avatar") return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accent}, ${accent}80)`, flexShrink: 0 }} />
            <div style={{ height: 5, width: "50%", borderRadius: 3,
              background: "rgba(245,240,232,0.18)" }} />
          </div>
        )
        if (p.type === "bar") return (
          <div key={i} style={{ height: 6, width: p.w ?? "100%", borderRadius: 3,
            background: p.color }} />
        )
        if (p.type === "btn") return (
          <div key={i} style={{ height: 20, borderRadius: 5,
            background: p.color, display: "flex", alignItems: "center",
            justifyContent: "center", marginTop: "auto" }}>
            <div style={{ height: 4, width: "45%", borderRadius: 2,
              background: "rgba(255,255,255,0.4)" }} />
          </div>
        )
        if (p.type === "grid2") return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[0,1].map(j => (
              <div key={j} style={{ height: 16, borderRadius: 4, background: p.color }} />
            ))}
          </div>
        )
        if (p.type === "grid3") return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ height: 14, borderRadius: 3, background: p.color }} />
            ))}
          </div>
        )
        if (p.type === "tags") return (
          <div key={i} style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ height: 12, width: 28 + j * 8, borderRadius: 6,
                background: p.color }} />
            ))}
          </div>
        )
        return null
      })}
    </div>
  )
}

function TemplateCard({ tpl, i, visible }: { tpl: typeof TEMPLATE_DATA[number]; i: number; visible: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${hovered ? tpl.accent + "40" : "rgba(201,168,76,0.1)"}`,
        borderRadius: 18, padding: "20px",
        display: "flex", flexDirection: "column", gap: 14,
        position: "relative", overflow: "hidden",
        transform: visible ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(28px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 0.5s ease ${i * 80}ms, transform ${hovered ? "0.3s var(--mo-ease-spring)" : "0.5s ease " + i * 80 + "ms"}, border-color 0.25s, background 0.25s`,
        boxShadow: hovered ? `0 8px 28px rgba(0,0,0,0.35), 0 0 0 1px ${tpl.accent}18` : "none",
        cursor: "default",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: hovered
          ? `linear-gradient(90deg, transparent, ${tpl.accent}60, transparent)`
          : "linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent)",
        transition: "background 0.3s",
      }} />

      {/* Badge Pro/Free */}
      <div style={{ position: "absolute", top: 14, right: 14 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
          padding: "3px 8px", borderRadius: 20,
          background: tpl.isPro ? "rgba(167,139,250,0.15)" : "rgba(57,255,143,0.12)",
          border: `1px solid ${tpl.isPro ? "rgba(167,139,250,0.35)" : "rgba(57,255,143,0.3)"}`,
          color: tpl.isPro ? "#A78BFA" : "var(--success)",
        }}>{tpl.isPro ? PLANS_DEF.pro.label.toUpperCase() : PLANS_DEF.free.label.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${tpl.accent}14`, border: `1px solid ${tpl.accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          transition: "background 0.2s, border-color 0.2s",
          ...(hovered && { background: `${tpl.accent}22`, borderColor: `${tpl.accent}50` }),
        }}>{tpl.icon}</div>
        <div>
          <h3 style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
            {tpl.name}
          </h3>
          <span style={{ color: tpl.accent, fontSize: 10, fontWeight: 600,
            letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.75 }}>
            {tpl.category}
          </span>
        </div>
      </div>

      {/* Mini preview */}
      <TemplateMiniPreview preview={tpl.preview} accent={tpl.accent} hovered={hovered} />

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "rgba(188,182,166,0.8)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
          {tpl.includes.join(" · ")}
        </span>
        <a href="/creer" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          color: hovered ? tpl.accent : "#C9A84C",
          textDecoration: "none", fontSize: 12, fontWeight: 600,
          // 16 px de haut pour le lien qui mène à la création : on l'épaissit
          // sans décaler la carte (marge négative compensatoire).
          minHeight: 40, padding: "0 4px", margin: "-12px -4px",
          transition: "color 0.2s",
        }}>
          Utiliser <span style={{ fontSize: 13 }}>→</span>
        </a>
      </div>
    </div>
  )
}

// QRCanvas (qr-code-styling) chargé à la demande (chunk séparé) : garde la landing légère.

export function TemplatesSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section id="templates" ref={ref} aria-labelledby="templates-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .tpl-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media(max-width:900px){ .tpl-grid { grid-template-columns:repeat(2,1fr) !important; } }
        @media(max-width:580px){
          .tpl-grid { display:flex !important; gap:14px !important;
            overflow-x:auto !important; scroll-snap-type:x mandatory !important;
            padding-bottom:16px !important; -webkit-overflow-scrolling:touch !important; }
          .tpl-grid > * { min-width:280px !important; scroll-snap-align:start !important; }
        }
        .tpl-grid::-webkit-scrollbar { height:4px; }
        .tpl-grid::-webkit-scrollbar-track { background:rgba(255,255,255,0.04); border-radius:2px; }
        .tpl-grid::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.3); border-radius:2px; }
        @media(max-width:640px){ #templates { padding:72px 24px !important; } }
        .tpl-sweep { animation: tpl-sweep 0.9s ease forwards; }
        @keyframes tpl-sweep { to { left: 120%; } }
        @media(prefers-reduced-motion:reduce){ .tpl-sweep { animation: none !important; display:none !important; } }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Modèles</Eyebrow>
        <h2 id="templates-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto 20px",
          lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em",
        }}>
          Des modèles prêts{" "}
          <span style={{ color: "#C9A84C" }}>pour votre métier.</span>
        </h2>
        <p style={{
          color: "rgba(188,182,166,0.85)", fontSize: 16,
          maxWidth: 540, margin: "0 auto", lineHeight: 1.7,
        }}>
          Restaurant, indépendant, coach, artiste, immobilier, commerce :{" "}
          partez d'une page déjà structurée.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div className="tpl-grid">
          {TEMPLATE_DATA.map((tpl, i) => (
            <TemplateCard key={tpl.id} tpl={tpl} i={i} visible={visible} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        textAlign: "center", marginTop: 52,
        opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.65s",
      }}>
        <a href="/creer" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "transparent",
          border: "1px solid rgba(201,168,76,0.25)",
          color: "#C9A84C", textDecoration: "none",
          fontSize: 14, fontWeight: 600,
          padding: "12px 28px", borderRadius: 10,
          transition: "all 0.2s ease",
        }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "rgba(201,168,76,0.08)"
            el.style.borderColor = "rgba(201,168,76,0.5)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "transparent"
            el.style.borderColor = "rgba(201,168,76,0.25)"
          }}>
          Voir tous les modèles
          <span style={{ fontSize: 16 }}>→</span>
        </a>
      </div>
    </section>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
