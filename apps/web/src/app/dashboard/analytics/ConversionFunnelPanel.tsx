"use client"

import { Target, Lightbulb } from "lucide-react"
import type { FunnelStep } from "./analyticsAgg"

const GOLD = "var(--accent)"
const NEON = "var(--success)"
const MUTED = "#A8A190"

type Props = { steps: FunnelStep[]; conversionRate: number; hasEngagementData: boolean }

// Tunnel de conversion : Vues -> Engagés (défilement) -> Actions (clics).
// Montre où les visiteurs décrochent, pour savoir quoi améliorer (accroche, longueur, CTA).
export default function ConversionFunnelPanel({ steps, conversionRate, hasEngagementData }: Props) {
  const views = steps[0]?.count || 0
  const COLORS = [GOLD, "var(--action)", NEON]

  return (
    <div style={{ background: "#141210", border: "1px solid #221f1b", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Target size={16} color={GOLD} />
          <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Tunnel de conversion</h3>
        </div>
        {views > 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ color: NEON, fontSize: 20, fontWeight: 800 }}>{conversionRate}%</span>
            <span style={{ color: MUTED, fontSize: 11, marginLeft: 6 }}>taux de conversion</span>
          </div>
        )}
      </div>
      <p style={{ color: MUTED, fontSize: 12, margin: "0 0 16px" }}>De la vue à l&apos;action : où vos visiteurs décrochent.</p>

      {views === 0 ? (
        <p style={{ color: MUTED, fontSize: 12.5, textAlign: "center", padding: "18px 0" }}>Pas encore assez de trafic pour dessiner le tunnel.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={s.label}>
              {i > 0 && s.dropFromPrev > 0 && (
                <p style={{ color: "#FBBF24", fontSize: 10.5, margin: "0 0 4px", textAlign: "right", opacity: 0.9 }}>↓ −{s.dropFromPrev}% d&apos;abandon</p>
              )}
              <div style={{ position: "relative", height: 42, background: "rgba(255,255,255,0.04)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${Math.max(s.pctOfTop, 6)}%`, background: `linear-gradient(90deg, ${COLORS[i] || GOLD}, color-mix(in srgb, ${COLORS[i] || GOLD} 55%, #000))`, borderRadius: 10, transition: "width .45s" }} />
                <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
                  <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>{s.label}</span>
                  <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>{s.count}<span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 11 }}> · {s.pctOfTop}%</span></span>
                </div>
              </div>
            </div>
          ))}
          {!hasEngagementData && (
            <p style={{ color: MUTED, fontSize: 11, margin: "6px 0 0", lineHeight: 1.5 }}>
              <Lightbulb size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />L&apos;étape « engagés » se base sur le défilement — elle se remplit dès vos prochaines visites.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
