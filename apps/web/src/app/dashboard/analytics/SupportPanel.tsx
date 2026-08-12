"use client"

// Panneau « Performance par support physique » : pour chaque QR (= vitrine, table, flyer…),
// l'entonnoir scan → vue → clic → conversion + comparaison entre supports. Utilise le moteur
// pur lib/supportFunnel. Les SCANS sont historiques (scans.qr_code_id) ; vues/clics/conversions
// démarrent à l'activation du pistage par support (qr_source), donc peuvent être à 0 au début.
import { useMemo } from "react"
import { Store, Eye, MousePointerClick, Target } from "lucide-react"
import { buildSupportFunnel, supportTotals, type SupportRow } from "@/lib/supportFunnel"

type Q = { id: string; short_code: string; label?: string | null; page_id?: string | null }
type ScanRow = { qr_code_id?: string | null }
type SrcRow = { qr_source?: string | null }

const GOLD = "var(--accent)"
const MUTED = "#A8A190"
const DIM = "#6E685E"
const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`)

const STAGES: { key: keyof Pick<SupportRow, "scans" | "views" | "clicks" | "conversions">; label: string; icon: any; color: string }[] = [
  { key: "scans", label: "Scans", icon: Store, color: GOLD },
  { key: "views", label: "Vues", icon: Eye, color: "#7B61FF" },
  { key: "clicks", label: "Clics", icon: MousePointerClick, color: "#4ECDC4" },
  { key: "conversions", label: "Conversions", icon: Target, color: "var(--success)" },
]

export default function SupportPanel({ qrs, scans, views, clicks, leads }: {
  qrs: Q[]; scans: ScanRow[]; views: SrcRow[]; clicks: SrcRow[]; leads: SrcRow[]
}) {
  const rows = useMemo(() => buildSupportFunnel({ qrs, scans, views, clicks, conversions: leads }), [qrs, scans, views, clicks, leads])
  const totals = useMemo(() => supportTotals(rows), [rows])
  const maxScans = Math.max(1, ...rows.map(r => r.scans))

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 18, padding: 20 }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div>
          <p style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Store size={17} color={GOLD} /> Performance par support
          </p>
          <p style={{ color: MUTED, fontSize: 12.5, margin: "4px 0 0", lineHeight: 1.5 }}>
            Le ROI de chaque support physique : scan → vue → clic → conversion. Nommez vos QR dans le QR Studio (« Vitrine », « Table 4 »…).
          </p>
        </div>
        {totals.scans > 0 && (
          <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
            {STAGES.map(s => (
              <div key={s.key} style={{ textAlign: "right" }}>
                <p style={{ color: s.color, fontSize: 18, fontWeight: 800, margin: 0, fontVariantNumeric: "tabular-nums" }}>{(totals as any)[s.key].toLocaleString("fr-FR")}</p>
                <p style={{ color: DIM, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13, margin: "16px 0 2px", textAlign: "center", padding: "20px 0" }}>
          Aucun QR pour cette sélection. Créez un QR par support (un pour la vitrine, un pour les tables…) et nommez-le dans le QR Studio.
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Support</th>
                {STAGES.map(s => (
                  <th key={s.key} style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED, borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap" }}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: "11px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", maxWidth: 220 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</p>
                    {/* barre relative de scans */}
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((r.scans / maxScans) * 100)}%`, background: GOLD, borderRadius: 2 }} />
                    </div>
                  </td>
                  {STAGES.map((s, i) => {
                    const val = r[s.key]
                    // taux de passage depuis l'étape précédente (vues/scans, clics/vues, conv/clics)
                    const rate = i === 1 ? r.viewRate : i === 2 ? r.clickRate : i === 3 ? r.convRate : null
                    return (
                      <td key={s.key} style={{ padding: "11px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ color: val > 0 ? "#F5F0E8" : DIM, fontSize: 14, fontWeight: 700 }}>{val.toLocaleString("fr-FR")}</span>
                        {i > 0 && <span style={{ color: DIM, fontSize: 10.5, marginLeft: 6 }}>{pct(rate)}</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {totals.views === 0 && totals.scans > 0 && (
            <p style={{ color: DIM, fontSize: 11.5, margin: "12px 2px 0", lineHeight: 1.5 }}>
              Les scans par support sont historiques. Les <b style={{ color: MUTED }}>vues / clics / conversions</b> par support démarrent à l'activation du pistage — ils se rempliront aux prochains scans.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
