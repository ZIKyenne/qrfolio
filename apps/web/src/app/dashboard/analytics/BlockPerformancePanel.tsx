"use client"

import { useMemo, useState } from "react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { Layers, MousePointerClick, Eye, TrendingUp } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type BlockRow  = { id: string; type: string; page_id: string; position: number; is_visible: boolean }
type ClickRow  = { block_id: string; clicked_at: string; page_id: string; block_type?: string }
type ViewRow   = { viewed_at: string; page_id: string }
type PageRow   = { id: string; title: string }

interface Props {
  blocks:    BlockRow[]
  clicks:    ClickRow[]
  pageViews: ViewRow[]
  pages:     PageRow[]
  impressions?: Record<string, number>  // block_id -> nb de fois réellement vu (page_events)
  dwell?: Record<string, number>         // block_id -> temps d'attention moyen en secondes
}

// ── Config par type de bloc ───────────────────────────────────────────────────
const CFG: Record<string, { label: string; emoji: string; color: string; interactive: boolean }> = {
  cta_button:     { label: "Bouton CTA",    emoji: "🔘", color: "var(--accent)", interactive: true  },
  social_links:   { label: "Liens sociaux", emoji: "🔗", color: "var(--action)", interactive: true  },
  whatsapp:       { label: "WhatsApp",      emoji: "💬", color: "#25D366", interactive: true  },
  stripe_product: { label: "Produit",       emoji: "📦", color: "var(--success)", interactive: true  },
  calendly:       { label: "Réservation",   emoji: "📅", color: "#818CF8", interactive: true  },
  contact_form:   { label: "Contact",       emoji: "📬", color: "#4ADE80", interactive: true  },
  video:          { label: "Vidéo",         emoji: "▶️", color: "var(--danger)", interactive: true  },
  google_maps:    { label: "Maps",          emoji: "📍", color: "#34D399", interactive: true  },
  instagram_feed: { label: "Instagram",     emoji: "📸", color: "#E1306C", interactive: true  },
  gallery:        { label: "Galerie",       emoji: "🖼️", color: "#A78BFA", interactive: true  },
  profile:        { label: "Profil",        emoji: "👤", color: "var(--accent)", interactive: false },
  bio:            { label: "Bio",           emoji: "📝", color: "#A8A190", interactive: false },
  testimonials:   { label: "Avis",          emoji: "⭐", color: "#FFD700", interactive: false },
  visit_counter:  { label: "Compteur",      emoji: "📊", color: "#67E8F9", interactive: false },
  heading:        { label: "Titre",         emoji: "🔤", color: "#A8A190", interactive: false },
  rich_text:      { label: "Texte",         emoji: "📄", color: "#A8A190", interactive: false },
  spacer:         { label: "Espaceur",      emoji: "↕️", color: "#333",    interactive: false },
  divider:        { label: "Séparateur",    emoji: "—",  color: "#444",    interactive: false },
}

const getCfg = (type: string) => CFG[type] ?? { label: type, emoji: "📦", color: "var(--accent)", interactive: true }

const PERIODS = [{ v: 7, l: "7j" }, { v: 30, l: "30j" }, { v: 90, l: "90j" }]
const SORTS   = [{ v: "clicks", l: "Clics" }, { v: "ctr", l: "CTR" }, { v: "count", l: "Blocs" }]

const G     = "var(--accent)"
const MUTED = "#A8A190"

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const cfg = getCfg(label)
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: cfg.color, fontWeight: 700, fontSize: 12, margin: "0 0 6px" }}>
        {cfg.emoji} {cfg.label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "#F5F0E8", fontSize: 12, fontWeight: 600, margin: "2px 0" }}>
          {p.name} : {p.value}
        </p>
      ))}
    </div>
  )
}

export default function BlockPerformancePanel({ blocks, clicks, pageViews, pages, impressions = {}, dwell = {} }: Props) {
  const [period, setPeriod] = useState(30)
  const [sortBy, setSortBy] = useState("clicks")
  const [pageId, setPageId] = useState("all")
  const [mode,   setMode]   = useState<"ranking" | "radar">("ranking")

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    return d
  }, [period])

  const fClicks = useMemo(() =>
    clicks.filter(c => new Date(c.clicked_at) >= cutoff && (pageId === "all" || c.page_id === pageId)),
    [clicks, cutoff, pageId])

  const fViews = useMemo(() =>
    pageViews.filter(v => new Date(v.viewed_at) >= cutoff && (pageId === "all" || v.page_id === pageId)),
    [pageViews, cutoff, pageId])

  const fBlocks = useMemo(() =>
    blocks.filter(b => pageId === "all" || b.page_id === pageId),
    [blocks, pageId])

  const totalViews = fViews.length || 1

  const stats = useMemo(() => {
    const clicksById: Record<string, number> = {}
    const clicksByType: Record<string, number> = {}

    fClicks.forEach(c => {
      clicksById[c.block_id] = (clicksById[c.block_id] || 0) + 1
      const t = c.block_type || "cta_button"
      clicksByType[t] = (clicksByType[t] || 0) + 1
    })

    const byType: Record<string, { count: number; directClicks: number; impr: number; dwellSum: number; dwellN: number }> = {}
    fBlocks.forEach(b => {
      if (!byType[b.type]) byType[b.type] = { count: 0, directClicks: 0, impr: 0, dwellSum: 0, dwellN: 0 }
      byType[b.type].count++
      byType[b.type].directClicks += clicksById[b.id] || 0
      byType[b.type].impr += impressions[b.id] || 0
      if (dwell[b.id]) { byType[b.type].dwellSum += dwell[b.id]; byType[b.type].dwellN++ }
    })

    return Object.entries(byType).map(([type, d]) => {
      const cfg = getCfg(type)
      const clics = Math.max(d.directClicks, clicksByType[type] || 0)
      const ctr   = parseFloat(((clics / totalViews) * 100).toFixed(1))
      // CTR réel = clics / impressions (bloc réellement vu). null si pas encore d'impression.
      const realCtr = d.impr > 0 ? Math.min(100, parseFloat(((clics / d.impr) * 100).toFixed(1))) : null
      const dwellAvg = d.dwellN > 0 ? Math.round(d.dwellSum / d.dwellN) : null
      return { type, cfg, count: d.count, clics, ctr, impr: d.impr, realCtr, dwellAvg }
    }).filter(s => s.cfg.interactive)
  }, [fBlocks, fClicks, totalViews, impressions, dwell])

  const sorted = useMemo(() => {
    const arr = [...stats]
    if (sortBy === "clicks") arr.sort((a, b) => b.clics - a.clics)
    if (sortBy === "ctr")    arr.sort((a, b) => b.ctr - a.ctr)
    if (sortBy === "count")  arr.sort((a, b) => b.count - a.count)
    return arr
  }, [stats, sortBy])

  const totalClicks   = fClicks.length
  const interactCount = fBlocks.filter(b => getCfg(b.type).interactive).length
  const best          = sorted[0]
  const mostRead      = [...stats].filter(s => s.dwellAvg != null).sort((a, b) => (b.dwellAvg || 0) - (a.dwellAvg || 0))[0]

  const maxClics = sorted[0]?.clics || 1
  const radarMax = Math.max(...stats.map(s => s.clics), 1)
  const radarData = stats
    .sort((a, b) => b.clics - a.clics)
    .slice(0, 6)
    .map(s => ({
      subject: s.cfg.label,
      Clics:   Math.round((s.clics / radarMax) * 100),
      CTR:     Math.min(Math.round(s.ctr * 4), 100),
    }))

  return (
    <div style={{ background: "#0F0E0B", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Layers size={16} color={G} />
            <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Performance des blocs
            </h3>
          </div>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            {interactCount} blocs interactifs
            {best && <span> · Top : <span style={{ color: best.cfg.color, fontWeight: 600 }}>{best.cfg.emoji} {best.cfg.label}</span>{best.realCtr != null && <span> ({best.realCtr}% de CTR réel)</span>}</span>}
            {mostRead?.dwellAvg != null && <span> · Le plus lu : <span style={{ color: mostRead.cfg.color, fontWeight: 600 }}>{mostRead.cfg.emoji} {mostRead.cfg.label}</span> ({mostRead.dwellAvg}s)</span>}
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {pages.length > 1 && (
            <select value={pageId} onChange={e => setPageId(e.target.value)}
              style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 9, color: "#F5F0E8", padding: "5px 10px", fontSize: 11, cursor: "pointer", outline: "none" }}>
              <option value="all">Toutes les pages</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {PERIODS.map(o => (
              <button key={o.v} type="button" onClick={() => setPeriod(o.v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: period === o.v ? G : "transparent", color: period === o.v ? "#080808" : MUTED }}>
                {o.l}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {SORTS.map(o => (
              <button key={o.v} type="button" onClick={() => setSortBy(o.v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: sortBy === o.v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: sortBy === o.v ? G : MUTED }}>
                {o.l}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {(["ranking", "radar"] as const).map(v => (
              <button key={v} type="button" onClick={() => setMode(v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: mode === v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: mode === v ? G : MUTED }}>
                {v === "ranking" ? "Classement" : "Radar"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { icon: <MousePointerClick size={13} color={G} />,   label: "Interactions",    value: totalClicks.toLocaleString() },
          { icon: <Eye size={13} color="var(--success)" />,           label: "Vues",            value: fViews.length.toLocaleString() },
          { icon: <Layers size={13} color="#A78BFA" />,        label: "Interactifs",     value: String(interactCount) },
          { icon: <TrendingUp size={13} color="#67E8F9" />,    label: "CTR global",      value: ((totalClicks / totalViews) * 100).toFixed(1) + "%" },
        ].map((k, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            {k.icon}
            <div>
              <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>{k.label}</p>
              <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 800, margin: 0 }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: MUTED }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧱</div>
          <p style={{ margin: "0 0 6px", fontSize: 14 }}>Aucune interaction enregistrée</p>
          <p style={{ margin: 0, fontSize: 12 }}>Les données apparaissent après les premiers clics</p>
        </div>
      ) : mode === "ranking" ? (
        <div>
          {/* Graphique barres */}
          <div style={{ height: Math.min(sorted.length, 8) * 44 + 20, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted.slice(0, 8).map(s => ({ name: s.type, Clics: s.clics }))}
                layout="vertical"
                margin={{ top: 0, right: 32, bottom: 0, left: 82 }}>
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80}
                  tickFormatter={n => { const c = getCfg(n); return c.emoji + " " + c.label }}
                  tick={{ fill: "#F5F0E8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: "color-mix(in srgb, var(--accent) 5%, transparent)" }} />
                <Bar dataKey="Clics" radius={[0, 6, 6, 0]}>
                  {sorted.slice(0, 8).map((s, i) => (
                    <Cell key={i} fill={s.cfg.color} fillOpacity={0.82} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 70px 70px 110px", gap: 8, padding: "0 8px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["#", "Bloc", "Nbr", "Clics", "CTR", ""].map((h, i) => (
                <span key={i} style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {sorted.slice(0, 8).map((row, i) => (
              <div key={row.type} style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 70px 70px 110px", gap: 8, alignItems: "center", padding: "9px 8px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderRadius: 8, marginTop: 2 }}>
                <span style={{ color: i < 3 ? G : MUTED, fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{row.cfg.emoji}</span>
                  <span style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.cfg.label}</span>
                </div>
                <span style={{ color: MUTED, fontSize: 11 }}>{row.count}x</span>
                <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{row.clics}</span>
                <span style={{ color: row.ctr >= 10 ? "var(--success)" : row.ctr >= 5 ? G : MUTED, fontSize: 12, fontWeight: 600 }}>
                  {row.ctr}%
                </span>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (row.clics / maxClics * 100) + "%", background: row.cfg.color, borderRadius: 3, opacity: 0.75, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: MUTED, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: MUTED, fontSize: 9 }} />
                <Radar name="Clics" dataKey="Clics" stroke={G} fill={G} fillOpacity={0.25} strokeWidth={2} />
                <Radar name="CTR"   dataKey="CTR"   stroke="var(--success)" fill="var(--success)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
            {[{ color: G, label: "Clics (normalisé)" }, { color: "var(--success)", label: "CTR (amplifié x4)" }].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                <span style={{ color: MUTED, fontSize: 11 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
