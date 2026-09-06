"use client"

import { useMemo, useState, useEffect, type ReactNode } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { MousePointerClick, ArrowUpDown, TrendingUp, ExternalLink, Hash, Share2, Package, Tag, PartyPopper, Megaphone, Music, Calendar, Camera, MapPin, Link2, Play } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type Click = {
  block_id:     string
  click_target: string | null
  clicked_at:   string
  page_id:      string
  block_type?:  string
  block_label?: string
}

type PageView = {
  viewed_at: string
  page_id:   string
}

interface Props {
  clicks:    Click[]
  pageViews: PageView[]
  pages:     { id: string; title: string }[]
  page?:       string   // pilotés par la barre de contrôle unique (#2) : si fournis, masquent les sélecteurs internes
  periodDays?: number
}

// ── Config ────────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { label: "7j",  value: 7  },
  { label: "30j", value: 30 },
  { label: "90j", value: 90 },
]

const SORT_OPTIONS = [
  { label: "Clics",       value: "clicks"  },
  { label: "Taux",        value: "ctr"     },
  { label: "Récents",     value: "recent"  },
]

const BLOCK_TYPE_LABELS: Record<string, string> = {
  cta_button:      "Bouton CTA",
  social_links:    "Liens sociaux",
  product:         "Produit",
  pricing:         "Tarif",
  event_info:      "Événement",
  promo_banner:    "Bannière promo",
  spotify_player:  "Spotify",
  calendly:        "Calendly",
  instagram_feed:  "Instagram",
  google_maps:     "Google Maps",
  link_tree:       "Link Tree",
  video:           "Vidéo",
}

const BLOCK_TYPE_ICON: Record<string, ReactNode> = {
  cta_button:     <MousePointerClick size={13} />,
  social_links:   <Share2 size={13} />,
  product:        <Package size={13} />,
  pricing:        <Tag size={13} />,
  event_info:     <PartyPopper size={13} />,
  promo_banner:   <Megaphone size={13} />,
  spotify_player: <Music size={13} />,
  calendly:       <Calendar size={13} />,
  instagram_feed: <Camera size={13} />,
  google_maps:    <MapPin size={13} />,
  link_tree:      <Link2 size={13} />,
  video:          <Play size={13} />,
}

const CLICK_COLORS = [
  "var(--accent)", "var(--success)", "#7B61FF", "var(--danger)",
  "#4ECDC4", "#FFE66D", "#F97316", "#E1306C",
  "#26A5E4", "#A78BFA",
]

const G = "var(--accent)"
const MUTED = "#A8A190"
const SURFACE = "rgba(255,255,255,0.03)"
const BORDER = "rgba(255,255,255,0.07)"

function truncateUrl(url: string, max = 35): string {
  try {
    const u = new URL(url)
    const s = u.hostname + u.pathname
    return s.length > max ? s.slice(0, max) + "…" : s
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "10px 14px", maxWidth: 220 }}>
      <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 4px", wordBreak: "break-all" }}>
        {d.label}
      </p>
      <p style={{ color: G, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{d.clicks} clics</p>
      <p style={{ color: "var(--success)", fontSize: 11, margin: 0 }}>CTR : {d.ctr == null ? "—" : `${d.ctr}%`}</p>
    </div>
  )
}

export default function TopLinksPanel({ clicks, pageViews, pages, page, periodDays }: Props) {
  const [period,   setPeriod]   = useState(30)
  const [sortBy,   setSortBy]   = useState<"clicks"|"ctr"|"recent">("clicks")
  const [pageFilter, setPageFilter] = useState("all")
  useEffect(() => { if (page != null) setPageFilter(page) }, [page])        // dedup #2 : la barre du haut pilote
  useEffect(() => { if (periodDays != null) setPeriod(periodDays) }, [periodDays])
  const [view,     setView]     = useState<"chart"|"table">("table")

  // ── Filtrage temporel ─────────────────────────────────────────────────────
  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - period); return d
  }, [period])

  const filteredClicks = useMemo(() =>
    clicks.filter(c =>
      new Date(c.clicked_at) >= cutoff &&
      (pageFilter === "all" || c.page_id === pageFilter)
    ), [clicks, cutoff, pageFilter])

  const filteredViews = useMemo(() =>
    pageViews.filter(v =>
      new Date(v.viewed_at) >= cutoff &&
      (pageFilter === "all" || v.page_id === pageFilter)
    ), [pageViews, cutoff, pageFilter])

  const totalViews = filteredViews.length   // VRAIE valeur (pas de « || 1 » : 0 vue ≠ 1 vue, sinon CTR faux)

  // ── Agrégation par lien ───────────────────────────────────────────────────
  const linkData = useMemo(() => {
    const map: Record<string, {
      key: string; target: string; blockType: string; clicks: number; lastClick: string
    }> = {}

    filteredClicks.forEach(c => {
      const target = c.click_target || "—"
      const key = `${c.block_id}::${target}`
      if (!map[key]) {
        map[key] = {
          key, target, blockType: c.block_type || "cta_button",
          clicks: 0, lastClick: c.clicked_at
        }
      }
      map[key].clicks++
      if (c.clicked_at > map[key].lastClick) map[key].lastClick = c.clicked_at
    })

    const items = Object.values(map).map(item => ({
      ...item,
      // CTR = clics / vues : INDÉFINI si 0 vue pistée (jamais ÷0 → « — », pas 500 %).
      ctr:   totalViews > 0 ? parseFloat(((item.clicks / totalViews) * 100).toFixed(1)) : null as number | null,
      label: truncateUrl(item.target),
      icon: BLOCK_TYPE_ICON[item.blockType] || <Share2 size={13} />,
      typeLabel: BLOCK_TYPE_LABELS[item.blockType] || item.blockType,
    }))

    // Tri
    items.sort((a, b) => {
      if (sortBy === "clicks") return b.clicks - a.clicks
      if (sortBy === "ctr")    return (b.ctr ?? -1) - (a.ctr ?? -1)
      return b.lastClick.localeCompare(a.lastClick)
    })

    return items.slice(0, 10)
  }, [filteredClicks, totalViews, sortBy])

  const totalClicks = filteredClicks.length

  return (
    <div style={{ background: "#0F0E0B", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MousePointerClick size={16} color={G} />
            <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Top 10 liens</h3>
          </div>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            {totalClicks} clics · CTR global {totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : "— (aucune vue pistée)"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Filtre page (masqué si piloté par la barre du haut) */}
          {pages.length > 1 && page == null && (
            <select aria-label="Filtrer par page" value={pageFilter} onChange={e => setPageFilter(e.target.value)}
              style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 9, color: "#F5F0E8", padding: "5px 10px", fontSize: 11, cursor: "pointer", outline: "none" }}>
              <option value="all">Toutes les pages</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          {/* Période (masquée si pilotée par la barre du haut) */}
          {periodDays == null && (
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setPeriod(opt.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: period === opt.value ? G : "transparent",
                  color:      period === opt.value ? "#080808" : MUTED }}>
                {opt.label}
              </button>
            ))}
          </div>
          )}

          {/* Tri */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setSortBy(opt.value as any)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: sortBy === opt.value ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  color:      sortBy === opt.value ? G : MUTED }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Vue */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {(["table","chart"] as const).map(v => (
              <button key={v} type="button" onClick={() => setView(v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: view === v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  color:      view === v ? G : MUTED }}>
                {v === "table" ? "Tableau" : "Graphique"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats rapides ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Clics totaux",  value: totalClicks.toLocaleString(),                    icon: <MousePointerClick size={13} color={G} /> },
          { label: "Vues totales",  value: totalViews.toLocaleString(), icon: <TrendingUp size={13} color="var(--success)" /> },
          { label: "Liens uniques", value: linkData.length,                                  icon: <Hash size={13} color="#7B61FF" /> },
        ].map((stat, i) => (
          <div key={i} style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flex: "1 1 120px" }}>
            {stat.icon}
            <div>
              <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>{stat.label}</p>
              <p style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 800, margin: 0 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {linkData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: MUTED }}>
          <div style={{ marginBottom: 10, color: "#5c554b" }}><MousePointerClick size={34} /></div>
          <p style={{ margin: "0 0 6px", fontSize: 14 }}>Aucun clic sur cette période</p>
          <p style={{ margin: 0, fontSize: 12 }}>Les clics apparaissent en temps réel</p>
        </div>
      ) : view === "chart" ? (

        /* ── Graphique ──────────────────────────────────────────────────── */
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={linkData} margin={{ top: 4, right: 4, bottom: 40, left: -20 }} barCategoryGap="25%">
              <XAxis dataKey="label"
                tick={{ fill: MUTED, fontSize: 10 }}
                angle={-30} textAnchor="end" interval={0}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "color-mix(in srgb, var(--accent) 5%, transparent)" }} />
              <Bar dataKey="clicks" radius={[6,6,0,0]}>
                {linkData.map((_, i) => (
                  <Cell key={i} fill={CLICK_COLORS[i % CLICK_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      ) : (
        <>
        {/* ── Tableau ─────────────────────────────────────────────────── */}
        <div>
          {/* En-têtes */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 80px 80px 120px", gap: 8, padding: "0 8px 8px", borderBottom: "1px solid " + BORDER }}>
            {["#", "Lien", "Type", "Clics", "CTR", ""].map((h, i) => (
              <span key={i} style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
            ))}
          </div>

          {linkData.map((row, i) => (
            <div key={row.key}
              style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 80px 80px 120px", gap: 8, alignItems: "center", padding: "10px 8px", background: i % 2 === 0 ? SURFACE : "transparent", borderRadius: 8, marginTop: 3 }}>

              {/* Rang */}
              <span style={{ color: i < 3 ? G : MUTED, fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                {`#${i + 1}`}
              </span>

              {/* Lien */}
              <div style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <a href={row.target.startsWith("http") ? row.target : "#"} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.label}
                  </a>
                  {row.target.startsWith("http") && <ExternalLink size={10} color={MUTED} style={{ flexShrink: 0 }} />}
                </div>
              </div>

              {/* Type bloc */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-flex", color: "#8a8177", flexShrink: 0 }}>{row.icon}</span>
                <span style={{ color: MUTED, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.typeLabel}</span>
              </div>

              {/* Clics */}
              <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{row.clicks.toLocaleString()}</span>

              {/* CTR — « — » quand aucune vue pistée (jamais un pourcentage inventé) */}
              <span title={row.ctr == null ? "CTR non calculable : aucune vue de page pistée" : undefined} style={{ color: row.ctr == null ? MUTED : row.ctr >= 10 ? "var(--success)" : row.ctr >= 5 ? G : MUTED, fontSize: 12, fontWeight: 600 }}>
                {row.ctr == null ? "—" : `${row.ctr}%`}
              </span>

              {/* Barre */}
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: linkData[0]?.clicks > 0 ? `${(row.clicks / linkData[0].clicks) * 100}%` : "0%",
                  background: CLICK_COLORS[i % CLICK_COLORS.length],
                  borderRadius: 3, opacity: 0.75,
                  transition: "width 0.6s ease"
                }} />
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}
