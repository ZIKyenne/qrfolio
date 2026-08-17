"use client"

import { useMemo, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts"
import { Smartphone, Monitor, Tablet, Globe, Cpu } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type ScanRow = { device: string; os: string | null; browser: string | null; page_id: string; scanned_at: string }
type ViewRow = { device: string; page_id: string; viewed_at: string }
type PageRow = { id: string; title: string }

interface Props {
  scans:     ScanRow[]
  pageViews: ViewRow[]
  pages:     PageRow[]
}

// ── Config ────────────────────────────────────────────────────────────────────
const DEVICE_CFG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  mobile:  { label: "Mobile",  icon: <Smartphone size={14} />, color: "var(--accent)" },
  tablet:  { label: "Tablette",icon: <Tablet size={14} />,     color: "#7B61FF" },
  desktop: { label: "Desktop", icon: <Monitor size={14} />,    color: "var(--success)" },
  unknown: { label: "Inconnu", icon: <Cpu size={14} />,        color: "#A8A190" },
}

const OS_COLORS: Record<string, string> = {
  ios:       "var(--accent)",
  android:   "var(--success)",
  windows:   "var(--action)",
  macos:     "#A78BFA",
  linux:     "#F97316",
  other:     "#A8A190",
}

const BROWSER_COLORS: Record<string, string> = {
  chrome:  "#F97316",
  safari:  "var(--action)",
  firefox: "var(--danger)",
  edge:    "#4ADE80",
  samsung: "var(--accent)",
  other:   "#A8A190",
}

const PERIODS = [{ v: 7, l: "7j" }, { v: 30, l: "30j" }, { v: 90, l: "90j" }]

const G     = "var(--accent)"
const MUTED = "#A8A190"

// Normalise OS/browser vers une clé propre
function normalizeOs(raw: string | null): string {
  if (!raw) return "other"
  const s = raw.toLowerCase()
  if (s.includes("ios") || s.includes("iphone") || s.includes("ipad")) return "ios"
  if (s.includes("android"))  return "android"
  if (s.includes("windows"))  return "windows"
  if (s.includes("mac"))      return "macos"
  if (s.includes("linux"))    return "linux"
  return "other"
}

function normalizeBrowser(raw: string | null): string {
  if (!raw) return "other"
  const s = raw.toLowerCase()
  if (s.includes("samsung"))  return "samsung"
  if (s.includes("chrome"))   return "chrome"
  if (s.includes("safari"))   return "safari"
  if (s.includes("firefox"))  return "firefox"
  if (s.includes("edge"))     return "edge"
  return "other"
}

const OS_LABELS: Record<string, string>      = { ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux", other: "Autre" }
const BROWSER_LABELS: Record<string, string> = { chrome: "Chrome", safari: "Safari", firefox: "Firefox", edge: "Edge", samsung: "Samsung", other: "Autre" }

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  if (pct < 5) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#080808" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
      {pct}%
    </text>
  )
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "8px 12px" }}>
      <p style={{ color: d.payload.color || G, fontSize: 12, fontWeight: 700, margin: "0 0 3px" }}>{d.name}</p>
      <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0 }}>{d.value} · {d.payload.pct}%</p>
    </div>
  )
}

function BarTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "8px 12px" }}>
      <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 3px" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 600, margin: "2px 0" }}>
          {p.name} : {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function DevicePanel({ scans, pageViews, pages }: Props) {
  const [period, setPeriod] = useState(30)
  const [pageId, setPageId] = useState("all")
  const [tab,    setTab]    = useState<"device" | "os" | "browser">("device")

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - period); return d
  }, [period])

  const fScans = useMemo(() =>
    scans.filter(s => new Date(s.scanned_at) >= cutoff && (pageId === "all" || s.page_id === pageId)),
    [scans, cutoff, pageId])

  const fViews = useMemo(() =>
    pageViews.filter(v => new Date(v.viewed_at) >= cutoff && (pageId === "all" || v.page_id === pageId)),
    [pageViews, cutoff, pageId])

  const total = fScans.length + fViews.length || 1

  // ── Agréger device (scans + views combinés) ───────────────────────────────
  const deviceData = useMemo(() => {
    const map: Record<string, number> = {}
    fScans.forEach(s => { map[s.device] = (map[s.device] || 0) + 1 })
    fViews.forEach(v => { map[v.device] = (map[v.device] || 0) + 1 })
    return Object.entries(map)
      .map(([key, count]) => ({
        key, count,
        pct:   Math.round((count / total) * 100),
        name:  DEVICE_CFG[key]?.label ?? key,
        color: DEVICE_CFG[key]?.color ?? MUTED,
        icon:  DEVICE_CFG[key]?.icon,
      }))
      .sort((a, b) => b.count - a.count)
  }, [fScans, fViews, total])

  // ── Agréger OS (scans uniquement — page_views n'a pas os) ─────────────────
  const osData = useMemo(() => {
    const map: Record<string, number> = {}
    fScans.forEach(s => {
      const k = normalizeOs(s.os)
      map[k] = (map[k] || 0) + 1
    })
    const t = fScans.length || 1
    return Object.entries(map)
      .map(([k, count]) => ({
        key: k, count,
        pct:   Math.round((count / t) * 100),
        name:  OS_LABELS[k] ?? k,
        color: OS_COLORS[k] ?? MUTED,
      }))
      .sort((a, b) => b.count - a.count)
  }, [fScans])

  // ── Agréger navigateur ────────────────────────────────────────────────────
  const browserData = useMemo(() => {
    const map: Record<string, number> = {}
    fScans.forEach(s => {
      const k = normalizeBrowser(s.browser)
      map[k] = (map[k] || 0) + 1
    })
    const t = fScans.length || 1
    return Object.entries(map)
      .map(([k, count]) => ({
        key: k, count,
        pct:   Math.round((count / t) * 100),
        name:  BROWSER_LABELS[k] ?? k,
        color: BROWSER_COLORS[k] ?? MUTED,
      }))
      .sort((a, b) => b.count - a.count)
  }, [fScans])

  // Données selon onglet actif
  const activeData = tab === "device" ? deviceData : tab === "os" ? osData : browserData

  // Top device pour le résumé
  const topDevice = deviceData[0]

  return (
    <div style={{ background: "#0F0E0B", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Smartphone size={16} color={G} />
            <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Appareils</h3>
          </div>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            {total.toLocaleString()} visites
            {topDevice && (
              <span> · <span style={{ color: topDevice.color, fontWeight: 600 }}>{topDevice.name}</span> {topDevice.pct}%</span>
            )}
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
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, marginBottom: 20, width: "fit-content" }}>
        {([
          { v: "device",  l: "Appareil", icon: <Smartphone size={12} /> },
          { v: "os",      l: "OS",       icon: <Cpu size={12} /> },
          { v: "browser", l: "Navigateur", icon: <Globe size={12} /> },
        ] as const).map(o => (
          <button key={o.v} type="button" onClick={() => setTab(o.v)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: tab === o.v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: tab === o.v ? G : MUTED }}>
            {o.icon}{o.l}
          </button>
        ))}
      </div>

      {activeData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: MUTED }}>
          <div style={{ marginBottom: 10, color: "#5c554b" }}><Smartphone size={34} /></div>
          <p style={{ margin: 0, fontSize: 14 }}>Aucune donnée sur cette période</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Donut */}
          <div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    dataKey="count"
                    nameKey="name"
                    labelLine={false}
                    label={(props) => <PieLabel {...props} pct={props.payload.pct} />}>
                    {activeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Légende donut */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {activeData.map(d => (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ color: "#F5F0E8", fontSize: 12, flex: 1 }}>{d.name}</span>
                  <span style={{ color: d.color, fontSize: 12, fontWeight: 700 }}>{d.pct}%</span>
                  <span style={{ color: MUTED, fontSize: 11 }}>{d.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Barres horizontales */}
          <div>
            <div style={{ height: Math.max(activeData.length * 44 + 20, 180) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeData.map(d => ({ name: d.name, Visites: d.count, color: d.color }))}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={58} tick={{ fill: "#F5F0E8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTip />} cursor={{ fill: "color-mix(in srgb, var(--accent) 5%, transparent)" }} />
                  <Bar dataKey="Visites" radius={[0, 6, 6, 0]}>
                    {activeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.82} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Note OS/browser */}
            {tab !== "device" && (
              <p style={{ color: MUTED, fontSize: 10, margin: "12px 0 0", textAlign: "center", fontStyle: "italic" }}>
                Basé sur les scans QR · {fScans.length} événements
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
