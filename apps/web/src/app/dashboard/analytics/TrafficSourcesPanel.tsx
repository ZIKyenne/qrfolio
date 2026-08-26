"use client"

import { useMemo, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import {
  QrCode, Globe, Camera as Instagram, Users as Facebook, Briefcase as Linkedin, Mail,
  ArrowUpRight, MessageCircle, ExternalLink, TrendingUp
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type View = {
  viewed_at: string
  source: string | null
  page_id: string
}

interface Props {
  views: View[]
  period?: number  // jours (7, 30, 90)
}

// ── Config sources ────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, {
  label: string
  emoji: string
  color: string
  icon: React.ReactNode
}> = {
  qr_scan:   { label: "QR Scan",    emoji: "◼",  color: "var(--accent)", icon: <QrCode size={13} /> },
  direct:    { label: "Direct",     emoji: "🔗", color: "var(--success)", icon: <Globe size={13} /> },
  interne:   { label: "Votre site", emoji: "🏠", color: "#A8A190", icon: <ExternalLink size={13} /> },
  instagram: { label: "Instagram",  emoji: "📸", color: "#E1306C", icon: <Instagram size={13} /> },
  tiktok:    { label: "TikTok",     emoji: "🎵", color: "#FF0050", icon: <span style={{ fontSize: 12, fontWeight: 700 }}>TT</span> },
  facebook:  { label: "Facebook",   emoji: "👤", color: "#1877F2", icon: <Facebook size={13} /> },
  linkedin:  { label: "LinkedIn",   emoji: "💼", color: "#0A66C2", icon: <Linkedin size={13} /> },
  twitter:   { label: "X / Twitter",emoji: "✖",  color: "#F5F0E8", icon: <span style={{ fontSize: 12, fontWeight: 800 }}>𝕏</span> },
  whatsapp:  { label: "WhatsApp",   emoji: "💬", color: "#25D366", icon: <MessageCircle size={13} /> },
  telegram:  { label: "Telegram",   emoji: "✈️", color: "#26A5E4", icon: <MessageCircle size={13} /> },
  email:     { label: "Email",      emoji: "📧", color: "#A78BFA", icon: <Mail size={13} /> },
  google:    { label: "Google",     emoji: "🔍", color: "#4285F4", icon: <Globe size={13} /> },
  referral:  { label: "Référent",   emoji: "🌐", color: "#A8A190", icon: <ExternalLink size={13} /> },
}

const PERIOD_OPTIONS = [
  { label: "7j",  value: 7  },
  { label: "30j", value: 30 },
  { label: "90j", value: 90 },
]

const G = "var(--accent)"
const MUTED = "#A8A190"
const BG = "#0F0E0B"
const SURFACE = "rgba(255,255,255,0.03)"
const BORDER = "rgba(255,255,255,0.07)"

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const cfg = SOURCE_CONFIG[label] || SOURCE_CONFIG.referral
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: cfg.color, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {cfg.emoji} {cfg.label}
      </p>
      <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700 }}>
        {payload[0].value} visite{payload[0].value > 1 ? "s" : ""}
      </p>
    </div>
  )
}

export default function TrafficSourcesPanel({ views, period: defaultPeriod = 30 }: Props) {
  const [period, setPeriod] = useState(defaultPeriod)
  const [view, setView] = useState<"chart" | "table">("chart")

  // ── Filtrage par période ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - period)
    return views.filter(v => new Date(v.viewed_at) >= cutoff)
  }, [views, period])

  // ── Agrégation sources ────────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(v => {
      const src = v.source || "direct"
      counts[src] = (counts[src] || 0) + 1
    })
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return Object.entries(counts)
      .map(([source, visits]) => ({
        source,
        visits,
        pct: total > 0 ? Math.round((visits / total) * 100) : 0,
        cfg: SOURCE_CONFIG[source] || SOURCE_CONFIG.referral,
      }))
      .sort((a, b) => b.visits - a.visits)
  }, [filtered])

  const total = sourceData.reduce((a, b) => a + b.visits, 0)
  const topSource = sourceData[0]

  return (
    <div style={{ background: BG, border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color={G} />
            <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Sources de trafic</h3>
          </div>
          {topSource && (
            <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
              Top : <span style={{ color: topSource.cfg.color, fontWeight: 600 }}>{topSource.cfg.label}</span>
              {" "}({topSource.pct}% des visites)
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {/* Sélecteur période */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setPeriod(opt.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: period === opt.value ? G : "transparent",
                  color: period === opt.value ? "#080808" : MUTED }}>
                {opt.label}
              </button>
            ))}
          </div>
          {/* Vue */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {(["chart", "table"] as const).map(v => (
              <button key={v} type="button" onClick={() => setView(v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: view === v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  color: view === v ? G : MUTED }}>
                {v === "chart" ? "Graphique" : "Tableau"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Total ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <ArrowUpRight size={14} color={G} />
          <div>
            <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Total</p>
            <p style={{ color: "#F5F0E8", fontSize: 18, fontWeight: 800, margin: 0 }}>{total.toLocaleString()}</p>
          </div>
          <span style={{ color: MUTED, fontSize: 11, marginLeft: 4 }}>sur {period}j</span>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{topSource?.cfg.emoji || "—"}</span>
          <div>
            <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Source #1</p>
            <p style={{ color: topSource?.cfg.color || MUTED, fontSize: 14, fontWeight: 700, margin: 0 }}>
              {topSource?.cfg.label || "—"}
            </p>
          </div>
        </div>
      </div>

      {sourceData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <p style={{ margin: 0, fontSize: 13 }}>Aucune visite sur cette période</p>
        </div>
      ) : view === "chart" ? (

        /* ── Graphique barres ──────────────────────────────────────────────── */
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
              <XAxis dataKey="source"
                tickFormatter={s => SOURCE_CONFIG[s]?.emoji || "🌐"}
                tick={{ fill: MUTED, fontSize: 16 }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "color-mix(in srgb, var(--accent) 5%, transparent)" }} />
              <Bar dataKey="visits" radius={[6, 6, 0, 0]}>
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.cfg.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      ) : (

        /* ── Tableau ──────────────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* En-têtes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 140px", gap: 8, padding: "0 8px 8px", borderBottom: "1px solid " + BORDER }}>
            {["Source", "Visites", "%", ""].map((h, i) => (
              <span key={i} style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
            ))}
          </div>
          {sourceData.map((row, i) => (
            <div key={row.source} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 140px", gap: 8, alignItems: "center", padding: "8px", background: i % 2 === 0 ? SURFACE : "transparent", borderRadius: 8 }}>
              {/* Source */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: row.cfg.color, display: "flex", alignItems: "center" }}>{row.cfg.icon}</span>
                <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 500 }}>{row.cfg.label}</span>
              </div>
              {/* Visites */}
              <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{row.visits.toLocaleString()}</span>
              {/* % */}
              <span style={{ color: row.cfg.color, fontSize: 13, fontWeight: 600 }}>{row.pct}%</span>
              {/* Barre */}
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: row.pct + "%", background: row.cfg.color, borderRadius: 3, opacity: 0.7, transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
