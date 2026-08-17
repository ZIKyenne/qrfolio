"use client"

import { AlignLeft } from "lucide-react"
import type { ScrollStep } from "./analyticsAgg"

const GOLD = "var(--accent)"
const MUTED = "#A8A190"

type Props = { funnel: ScrollStep[] }

// Entonnoir de profondeur de scroll : quelle part des visiteurs atteint 25 / 50 / 75 / 100 % de la page.
// Aide à savoir si le contenu du bas est vu (sinon = remonter les blocs importants).
export default function ScrollDepthPanel({ funnel }: Props) {
  const base = funnel[0]?.count || 0
  return (
    <div style={{ background: "#141210", border: "1px solid #221f1b", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
        <AlignLeft size={16} color={GOLD} />
        <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Profondeur de lecture</h3>
      </div>
      <p style={{ color: MUTED, fontSize: 12, margin: "0 0 16px" }}>Jusqu&apos;où vos visiteurs font défiler la page.</p>

      {base === 0 ? (
        <p style={{ color: MUTED, fontSize: 12.5, textAlign: "center", padding: "18px 0" }}>
          Pas encore de données de défilement. Elles apparaîtront dès vos prochaines visites.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {funnel.map((s, i) => (
            <div key={s.depth}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600 }}>{s.depth} de la page</span>
                <span style={{ color: MUTED, fontSize: 12 }}>
                  <span style={{ color: GOLD, fontWeight: 700 }}>{s.pct}%</span> · {s.count} visite{s.count > 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, color-mix(in srgb, ${GOLD} 55%, #000))`, borderRadius: 6, transition: "width .4s", opacity: 1 - i * 0.12 }} />
              </div>
            </div>
          ))}
          {(() => {
            const drop = base > 0 ? Math.round((1 - (funnel[3]?.count || 0) / base) * 100) : 0
            return drop >= 40 ? (
              <p style={{ color: "#FBBF24", fontSize: 11.5, margin: "4px 0 0", lineHeight: 1.5 }}>
<AlignLeft size={12} style={{ verticalAlign: "-1px", marginRight: 4, opacity: .8 }} />{drop}% des visiteurs n&apos;atteignent pas le bas de page — placez vos blocs importants (CTA, contact) plus haut.
              </p>
            ) : null
          })()}
        </div>
      )}
    </div>
  )
}
