"use client"

import { useMemo, useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { QrCode, Eye, TrendingUp, Smartphone, Globe, BarChart2, ChevronDown, Layers, Users, Printer, Calendar } from "lucide-react"
import TrafficSourcesPanel from "./TrafficSourcesPanel"
import TopLinksPanel from "./TopLinksPanel"
import BlockPerformancePanel from "./BlockPerformancePanel"
import GeoPanel from "./GeoPanel"
import DevicePanel from "./DevicePanel"
import ExportPanel from "./ExportPanel"
import ReportSubscriptionPanel from "./ReportSubscriptionPanel"
import { buildDailyData, buildDeviceData, buildSourceData, buildScrollFunnel, buildFunnel, buildTapGrid, buildTapsByBlock, countTaps } from "./analyticsAgg"
import ScrollDepthPanel from "./ScrollDepthPanel"
import ConversionFunnelPanel from "./ConversionFunnelPanel"
import HeatmapPanel from "./HeatmapPanel"
import SupportPanel from "./SupportPanel"
import Particles from "@/components/Particles"

type Profile = { total_pages: number; total_scans: number; plan: string; email?: string; full_name?: string } | null
type Page = { id: string; title: string; slug: string; total_views: number; unique_views: number; status: string }
type Scan = { scanned_at: string; device: string; country: string | null; page_id: string; qr_code_id?: string | null }
type SupportQr = { id: string; short_code: string; label?: string | null; page_id?: string | null }
type SrcRow = { qr_source?: string | null }
type View = { viewed_at: string; device: string; source: string | null; country: string | null; page_id: string }
type Click = { block_id: string; click_target: string | null; clicked_at: string; page_id: string; block_type?: string }
type BRow    = { id: string; type: string; page_id: string; position: number; is_visible: boolean }
type GeoScan    = { country: string | null; city: string | null; page_id: string; scanned_at: string }
type DeviceScan = { device: string; os: string | null; browser: string | null; page_id: string; scanned_at: string }
type PageEv     = { kind: "scroll" | "impression" | "dwell" | "tap"; ref: string; value?: number | null; x?: number | null; y?: number | null; page_id: string; created_at: string }

interface Props {
  profile: Profile
  pages: Page[]
  recentScans: Scan[]
  recentViews: View[]
  clicks?: Click[]
  blocks?: BRow[]
  geoScans?: GeoScan[]
  deviceScans?: DeviceScan[]
  pageEvents?: PageEv[]
  userEmail?: string
  supportQrs?: SupportQr[]
  supportViews?: SrcRow[]
  supportClicks?: SrcRow[]
  supportLeads?: SrcRow[]
}

const GOLD = "var(--accent)"
const NEON = "var(--success)"
const MUTED = "#A8A190"
const COLORS = [GOLD, NEON, "#7B61FF", "var(--danger)", "#4ECDC4", "#FFE66D"]

function formatAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 5) return "à l'instant"
  if (s < 60) return `il y a ${s}s`
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#A8A190", fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name} : {p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsClient({ profile, pages, recentScans, recentViews, clicks = [], blocks = [], geoScans = [], deviceScans = [], pageEvents = [], userEmail = "", supportQrs = [], supportViews = [], supportClicks = [], supportLeads = [] }: Props) {
  const [selectedPage, setSelectedPage] = useState<string>("all")
  // Onglets (handoff Analytics #1) : remplacent le scroll infini de 11 panneaux empilés.
  const [tab, setTab] = useState<"overview" | "content" | "audience" | "supports" | "reports">("overview")

  const filteredScans = useMemo(() =>
    selectedPage === "all" ? recentScans : recentScans.filter(s => s.page_id === selectedPage),
    [recentScans, selectedPage]
  )
  const filteredViews = useMemo(() =>
    selectedPage === "all" ? recentViews : recentViews.filter(v => v.page_id === selectedPage),
    [recentViews, selectedPage]
  )

  // QR de la sélection = supports (vitrine/table/flyer…). Le funnel par support est calculé
  // dans SupportPanel via lib/supportFunnel (scans par qr_code_id, vue/clic/conv par qr_source).
  const filteredSupportQrs = useMemo(() =>
    selectedPage === "all" ? supportQrs : supportQrs.filter(q => q.page_id === selectedPage),
    [supportQrs, selectedPage]
  )

  const dailyData = useMemo(() => buildDailyData(filteredScans, filteredViews), [filteredScans, filteredViews])
  const deviceData = useMemo(() => buildDeviceData(filteredScans), [filteredScans])
  const sourceData = useMemo(() => buildSourceData(filteredViews), [filteredViews])

  // Engagement (scroll + impressions de blocs) filtré par page sélectionnée.
  const filteredEvents = useMemo(() =>
    selectedPage === "all" ? pageEvents : pageEvents.filter(e => e.page_id === selectedPage),
    [pageEvents, selectedPage]
  )
  const scrollFunnel = useMemo(() => buildScrollFunnel(filteredEvents), [filteredEvents])
  const tapGrid = useMemo(() => buildTapGrid(filteredEvents, 8, 16), [filteredEvents])
  const tapsByBlock = useMemo(() => buildTapsByBlock(filteredEvents), [filteredEvents])
  const tapTotal = useMemo(() => countTaps(filteredEvents), [filteredEvents])

  // Tunnel de conversion : Vues -> Engagés (défilement ≥50%) -> Actions (clics sur 30j, même page).
  const funnel = useMemo(() => {
    const views = filteredViews.length
    const engaged = filteredEvents.filter(e => e.kind === "scroll" && e.ref === "50").length
    const since30 = Date.now() - 30 * 864e5
    const clicked = clicks.filter(c =>
      (selectedPage === "all" || c.page_id === selectedPage) && new Date(c.clicked_at).getTime() >= since30
    ).length
    const steps = buildFunnel([
      { label: "Vues de la page", count: views },
      { label: "Ont fait défiler (≥50%)", count: engaged },
      { label: "Ont cliqué (action)", count: clicked },
    ])
    const conversionRate = views > 0 ? Math.round((clicked / views) * 100) : 0
    const hasEngagementData = filteredEvents.some(e => e.kind === "scroll")
    return { steps, conversionRate, hasEngagementData }
  }, [filteredViews, filteredEvents, clicks, selectedPage])

  const totalScans30 = filteredScans.length
  const totalViews30 = filteredViews.length
  // Aucune donnée : on masque les sections détaillées (sinon = pile de cartes vides)
  const noData = totalScans30 === 0 && totalViews30 === 0 && (profile?.total_scans || 0) === 0

  // ── Temps réel : visiteurs actifs (10 min), aujourd'hui vs hier, dernier événement ──
  const live = useMemo(() => {
    const nowMs = Date.now()
    const allT = [
      ...filteredScans.map(s => ({ t: s.scanned_at, kind: "Scan QR" })),
      ...filteredViews.map(v => ({ t: v.viewed_at, kind: "Vue page" })),
    ].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime())
    const active = filteredViews.filter(v => nowMs - new Date(v.viewed_at).getTime() < 10 * 60000).length
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
    const startY = new Date(startToday); startY.setDate(startY.getDate() - 1)
    const ms = (t: string) => new Date(t).getTime()
    const times = [...filteredScans.map(s => s.scanned_at), ...filteredViews.map(v => v.viewed_at)]
    const todayN = times.filter(t => ms(t) >= startToday.getTime()).length
    const ydayN = times.filter(t => ms(t) >= startY.getTime() && ms(t) < startToday.getTime()).length
    const evo = ydayN ? Math.round(((todayN - ydayN) / ydayN) * 100) : (todayN > 0 ? 100 : 0)
    return { active, todayN, ydayN, evo, last: allT[0] as { t: string; kind: string } | undefined }
  }, [filteredScans, filteredViews])

  // ── Storytelling : une phrase de synthèse plutôt qu'un tableau de chiffres ──
  const story = useMemo(() => {
    if (noData) return null
    const topSource = sourceData[0]?.name || null
    const topDevice = deviceData[0]?.name || null
    const times = [...filteredScans.map(s => s.scanned_at), ...filteredViews.map(v => v.viewed_at)]
    const hourCount: Record<number, number> = {}
    times.forEach(t => { const h = new Date(t).getHours(); hourCount[h] = (hourCount[h] || 0) + 1 })
    const peakEntry = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]
    return { topSource, topDevice, peakHour: peakEntry ? Number(peakEntry[0]) : null }
  }, [noData, sourceData, deviceData, filteredScans, filteredViews])

  return (
    <div className="analytics-root" style={{ minHeight: "100dvh", background: "radial-gradient(1100px 520px at 75% -8%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%)", padding: "22px 24px 44px", fontFamily: "DM Sans, sans-serif", position: "relative", overflowX: "clip", maxWidth: "100%", boxSizing: "border-box" as const }}>
      <Particles />
      <style>{`
        @keyframes ring{0%{box-shadow:0 0 0 0 rgba(57,255,143,0.5)}70%{box-shadow:0 0 0 8px rgba(57,255,143,0)}100%{box-shadow:0 0 0 0 rgba(57,255,143,0)}}
        .az{animation:mo-fade-up .5s var(--mo-ease-standard) backwards}
        .az-card{transition:transform .2s var(--mo-ease-standard), box-shadow .2s, border-color .2s}
        .az-card:hover{transform:translateY(-3px);box-shadow:0 16px 38px rgba(0,0,0,0.5)}
        /* Anti-debordement horizontal sur mobile : rien ne sort du cadre, scroll
           vertical uniquement. On empile TOUTES les grilles en 1 colonne (les
           panneaux geo/blocs/appareils utilisent des grilles inline 2 colonnes)
           et on garde les charts/medias dans la largeur. */
        .analytics-root img, .analytics-root svg, .analytics-root canvas,
        .analytics-root .recharts-responsive-container { max-width: 100%; }
        @media (max-width: 860px){
          .analytics-root { padding-left: 14px !important; padding-right: 14px !important; }
          .analytics-root [style*="grid-template-columns"]{ grid-template-columns: 1fr !important; }
          .analytics-root [style*="grid-template-columns"]{ gap: 14px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="az" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(26px,3.6vw,36px)", lineHeight: 1, color: "#F5F0E8", fontWeight: 700, margin: 0, letterSpacing: "-0.4px" }}>
                Analytics
              </h1>
              {/* Badge EN DIRECT masque tant qu'aucune donnee (audit #04 : pas de "live" trompeur) */}
              {!noData && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(57,255,143,0.1)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 999, padding: "3px 10px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", animation: "mo-pulse 1.8s ease-in-out infinite" }} />
                  <span style={{ color: "var(--success)", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>EN DIRECT</span>
                </span>
              )}
            </div>
            <p style={{ color: "#A8A190", margin: 0, fontSize: 13.5 }}>30 derniers jours · {live.last ? `dernier événement ${formatAgo(live.last.t)}` : "en attente de données"}</p>
          </div>
          {/* Filtre page */}
          <select
            value={selectedPage}
            onChange={e => setSelectedPage(e.target.value)}
            style={{
              background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              borderRadius: 10, color: "#F5F0E8", padding: "9px 14px", fontSize: 13.5, cursor: "pointer"
            }}
          >
            <option value="all">Toutes les pages</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        {/* ── Onglets (handoff #1) : Vue d'ensemble · Contenu · Audience · Supports · Rapports ── */}
        {!noData && (
          <div role="tablist" aria-label="Sections analytics" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #1c1917", marginBottom: 16 }}>
            {[
              { id: "overview" as const, label: "Vue d'ensemble", icon: <BarChart2 size={14} /> },
              { id: "content" as const, label: "Contenu", icon: <Layers size={14} /> },
              { id: "audience" as const, label: "Audience", icon: <Users size={14} /> },
              { id: "supports" as const, label: "Supports", icon: <Printer size={14} /> },
              { id: "reports" as const, label: "Rapports", icon: <Calendar size={14} /> },
            ].map(t => {
              const on = tab === t.id
              return (
                <button key={t.id} role="tab" aria-selected={on} onClick={() => setTab(t.id)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "11px 16px 13px", cursor: "pointer", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "#e8c877" : "#8a8177", background: "none", border: "none", fontFamily: "inherit", transition: "color .2s ease", whiteSpace: "nowrap" }}>
                  {t.icon} {t.label}
                  {on && <span aria-hidden style={{ position: "absolute", left: 10, right: 10, bottom: -1, height: 2, borderRadius: 2, background: "linear-gradient(90deg,#e8c877,#c9a24d)" }} />}
                </button>
              )
            })}
          </div>
        )}

        {/* État vide pédagogique : aucune donnée encore */}
        {noData && (
          <div className="az" style={{ marginBottom: 14, padding: "22px 24px", borderRadius: 16, position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, color-mix(in srgb,#7B61FF 12%,#100F0A), #100F0A)",
            border: "1px solid rgba(123,97,255,0.3)", boxShadow: "0 10px 34px rgba(0,0,0,0.3)" }}>
            <div style={{ position: "absolute", top: -30, right: -20, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,97,255,0.16), transparent 70%)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: "rgba(123,97,255,0.18)", color: "#A78BFA" }}><BarChart2 size={15} /></span>
              <span style={{ color: "#A78BFA", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" as const }}>Bientôt vos données</span>
            </div>
            <h2 style={{ color: "#F8F4EC", fontSize: 21, fontWeight: 700, margin: "0 0 4px", fontFamily: "Fraunces, serif", letterSpacing: "-0.3px" }}>
              Vos statistiques apparaîtront ici dès le premier scan
            </h2>
            <p style={{ color: "#C9C3B6", fontSize: 13, margin: "0 0 14px", lineHeight: 1.55, maxWidth: 620 }}>
              Vous verrez en temps réel : <strong style={{ color: "#F5F0E8" }}>scans &amp; vues</strong>, <strong style={{ color: "#F5F0E8" }}>pays &amp; villes</strong>, <strong style={{ color: "#F5F0E8" }}>appareils</strong>, <strong style={{ color: "#F5F0E8" }}>sources de trafic</strong> et vos <strong style={{ color: "#F5F0E8" }}>pages les plus performantes</strong>. Lancez-vous pour activer le suivi.
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <a href="/dashboard/qr-codes" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", color: "#080808", textDecoration: "none", fontSize: 13, fontWeight: 800, boxShadow: "0 6px 20px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                <QrCode size={15} strokeWidth={2.4} /> Tester mon QR code
              </a>
              {pages.find(p => p.status === "published") && (
                <a href={"/" + pages.find(p => p.status === "published")!.slug} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                  <Globe size={14} /> Partager ma page
                </a>
              )}
              <a href="/examples" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                <Eye size={14} /> Voir un exemple
              </a>
            </div>
          </div>
        )}

        {/* ── Synthèse narrative (storytelling) ──────────────────────────── */}
        {!noData && tab === "overview" && story && (
          <div className="az" style={{ marginBottom: 14, padding: "18px 20px", borderRadius: 16, position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 11%, #100F0A), #100F0A)",
            border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
            <div style={{ position: "absolute", top: -30, right: -20, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
              <span style={{ flexShrink: 0, fontSize: 20, lineHeight: 1.1 }}>{live.evo > 5 ? "📈" : live.evo < -5 ? "📉" : "📊"}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: "#F8F4EC", fontSize: 16, fontWeight: 700, margin: "0 0 3px", fontFamily: "Fraunces, serif", letterSpacing: "-0.2px" }}>
                  {live.evo > 5 ? "Votre trafic augmente." : live.evo < -5 ? "Votre trafic ralentit un peu." : "Votre QR est suivi en temps réel."}
                </p>
                <p style={{ color: "#C9C3B6", fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>
                  {totalScans30} scan{totalScans30 > 1 ? "s" : ""} sur 30 jours
                  {story.topSource ? <>, surtout via <strong style={{ color: "#F5F0E8" }}>{story.topSource}</strong></> : null}
                  {story.topDevice ? <> sur <strong style={{ color: "#F5F0E8" }}>{story.topDevice}</strong></> : null}
                  {story.peakHour != null ? <> · pic d&apos;activité vers <strong style={{ color: "#F5F0E8" }}>{story.peakHour}h</strong></> : null}.
                </p>
                {(() => {
                  const advice =
                    totalScans30 < 10 ? "Partagez votre QR sur vos réseaux et imprimez-le pour décoller."
                    : story.peakHour != null ? `Publiez vos posts autour de ${story.peakHour}h, votre heure de pic.`
                    : story.topSource ? `L’essentiel vient de ${story.topSource} — testez un autre canal pour diversifier.`
                    : null
                  return advice ? (
                    <p style={{ display: "flex", alignItems: "baseline", gap: 7, color: "var(--accent)", fontSize: 12.5, fontWeight: 600, margin: "9px 0 0", lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0 }}>💡</span> {advice}
                    </p>
                  ) : null
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Bandeau TEMPS RÉEL (masque tant qu'aucune donnee : pas de zeros — audit #04) ── */}
        {!noData && tab === "overview" && (
        <div className="az" style={{ animationDelay: "60ms", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 13, marginBottom: 13 }}>
          {/* Visiteurs actifs (hero live) */}
          <div className="az-card" style={{ background: "linear-gradient(135deg, color-mix(in srgb,var(--success) 11%,#0E0D09), #0E0D09)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -16, right: -16, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle,rgba(57,255,143,0.16),transparent 70%)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--success)", animation: live.active ? "ring 1.6s infinite" : "mo-pulse 2s infinite" }} />
              <span style={{ color: "var(--success)", fontSize: 11.5, fontWeight: 700 }}>Visiteurs actifs</span>
            </div>
            <p style={{ color: "#F8F4EC", fontSize: 38, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif", lineHeight: 1 }}>{live.active}</p>
            <p style={{ color: "rgba(57,255,143,0.7)", fontSize: 10.5, margin: "2px 0 0" }}>sur les 10 dernières minutes</p>
          </div>
          {/* Aujourd'hui + évolution */}
          <div className="az-card" style={{ background: "#100F0A", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <p style={{ color: "#A8A190", fontSize: 11.5, fontWeight: 600, margin: "0 0 8px" }}>Activité aujourd'hui</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <p style={{ color: "#F8F4EC", fontSize: 38, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif", lineHeight: 1 }}>{live.todayN}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: live.evo >= 0 ? "var(--success)" : "var(--danger)", fontSize: 12.5, fontWeight: 700 }}>
                <TrendingUp size={13} style={{ transform: live.evo >= 0 ? "none" : "scaleY(-1)" }} /> {live.evo >= 0 ? "+" : ""}{live.evo}%
              </span>
            </div>
            <p style={{ color: MUTED, fontSize: 10.5, margin: "2px 0 0" }}>vs hier ({live.ydayN}) · scans + vues</p>
          </div>
          {/* Dernier événement */}
          <div className="az-card" style={{ background: "#100F0A", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ color: "#A8A190", fontSize: 11.5, fontWeight: 600, margin: "0 0 8px" }}>Dernier événement</p>
            {live.last ? (
              <>
                <p style={{ color: "#F8F4EC", fontSize: 19, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{live.last.kind}</p>
                <p style={{ color: GOLD, fontSize: 11.5, margin: "3px 0 0", fontWeight: 600 }}>{formatAgo(live.last.t)}</p>
              </>
            ) : (
              <p style={{ color: MUTED, fontSize: 13, margin: "6px 0 0" }}>Aucun pour l'instant</p>
            )}
          </div>
        </div>
        )}

        {/* KPI Cards (masques tant qu'aucune donnee : audit #04) */}
        {!noData && tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 13, marginBottom: 22 }}>
          {[
            { icon: <QrCode size={18} />, label: "Scans (30j)", value: totalScans30, color: GOLD },
            { icon: <Eye size={18} />, label: "Vues (30j)", value: totalViews30, color: NEON },
            { icon: <BarChart2 size={18} />, label: "Pages actives", value: pages.filter(p => p.status === "published").length, color: "#7B61FF" },
            { icon: <TrendingUp size={18} />, label: "Total scans", value: profile?.total_scans || 0, color: "var(--danger)" },
          ].map((kpi, i) => (
            <div key={i} className="az az-card" style={{
              animationDelay: `${120 + i * 60}ms`,
              background: "#100F0A", border: "1px solid color-mix(in srgb, var(--accent) 13%, transparent)",
              borderRadius: 13, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: -12, right: -12, width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(circle,${kpi.color}1c,transparent 70%)` }} />
              <div style={{ color: kpi.color, background: `${kpi.color}1a`, borderRadius: 9, padding: 10, display: "flex" }}>
                {kpi.icon}
              </div>
              <div>
                <p style={{ color: "#C9C3B6", fontSize: 11.5, margin: 0, fontWeight: 500 }}>{kpi.label}</p>
                <p style={{ color: "#F8F4EC", fontSize: 28, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif", lineHeight: 1.1 }}>{(kpi.value as number).toLocaleString("fr-FR")}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Sections détaillées — masquées tant qu'il n'y a aucune donnée */}
        {!noData && (<>
        {/* ── VUE D'ENSEMBLE : graphique Scans & Vues ── */}
        {tab === "overview" && (
        <div className="az" style={{
          animationDelay: "360ms",
          background: "linear-gradient(180deg,#13110B,#100F0A)", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
          borderRadius: 16, padding: "22px 24px", marginBottom: 18, boxShadow: "0 8px 30px rgba(0,0,0,0.25)"
        }}>
          <h2 style={{ color: "#F8F4EC", fontSize: 18, fontWeight: 700, marginBottom: 18, marginTop: 0, letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: 9 }}>
            <TrendingUp size={17} color={GOLD} /> Scans &amp; Vues <span style={{ color: MUTED, fontWeight: 500, fontSize: 14 }}>— 30 jours</span>
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={NEON} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: MUTED, fontSize: 13 }} />
              <Area type="monotone" dataKey="scans" name="Scans QR" stroke={GOLD} strokeWidth={2.4} fill="url(#gScans)" animationDuration={1100} dot={false} activeDot={{ r: 4, fill: GOLD }} />
              <Area type="monotone" dataKey="views" name="Vues page" stroke={NEON} strokeWidth={2.4} fill="url(#gViews)" animationDuration={1100} animationBegin={200} dot={false} activeDot={{ r: 4, fill: NEON }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}

        {/* ── AUDIENCE : appareils + sources ── */}
        {tab === "audience" && (<>
        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Device */}
          <div style={{
            background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
            borderRadius: 12, padding: "24px"
          }}>
            <h2 style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 600, marginBottom: 20, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={16} color={GOLD} /> Appareils
            </h2>
            {deviceData.length === 0 ? (
              <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>Pas encore de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Source */}
          <div style={{
            background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
            borderRadius: 12, padding: "24px"
          }}>
            <h2 style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 600, marginBottom: 20, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={16} color={NEON} /> Sources de trafic
            </h2>
            {sourceData.length === 0 ? (
              <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>Pas encore de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Vues" radius={[0, 4, 4, 0]}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        </>)}

        {/* ── CONTENU : liens + blocs + tunnel/profondeur ── */}
        {tab === "content" && (<>
        <div style={{ marginBottom: 24 }}>
          <TopLinksPanel
            clicks={clicks}
            pageViews={filteredViews}
            pages={pages}
          />
        </div>

        {/* ── Performance blocs ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <BlockPerformancePanel
            blocks={blocks}
            clicks={clicks}
            pageViews={filteredViews}
            pages={pages}
            events={filteredEvents}
          />
        </div>

        {/* ── Tunnel de conversion + Profondeur de lecture ──────────────── */}
        <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <ConversionFunnelPanel steps={funnel.steps} conversionRate={funnel.conversionRate} hasEngagementData={funnel.hasEngagementData} />
          <ScrollDepthPanel funnel={scrollFunnel} />
        </div>
        </>)}

        {/* ── SUPPORTS : ROI par support physique ── */}
        {tab === "supports" && (
        <div style={{ marginBottom: 24 }}>
          <SupportPanel qrs={filteredSupportQrs} scans={filteredScans} views={supportViews} clicks={supportClicks} leads={supportLeads} />
        </div>
        )}

        {/* ── AUDIENCE (suite) : carte de chaleur + géo + appareils ── */}
        {tab === "audience" && (<>
        <div style={{ marginBottom: 24 }}>
          <HeatmapPanel grid={tapGrid} byBlock={tapsByBlock} total={tapTotal} blocks={blocks} />
        </div>

        {/* ── Géographie ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <GeoPanel
            scans={geoScans}
            pageViews={filteredViews}
            pages={pages}
          />
        </div>

        {/* ── Appareils ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <DevicePanel
            scans={deviceScans}
            pageViews={filteredViews}
            pages={pages}
          />
        </div>
        </>)}

        {/* ── RAPPORTS : export CSV + abonnements ── */}
        {tab === "reports" && (<>
        <div style={{ marginBottom: 24 }}>
          <ExportPanel
            plan={profile?.plan ?? "free"}
            pages={pages}
            views={filteredViews}
            scans={recentScans as any}
            clicks={clicks}
            blocks={blocks}
            geoScans={geoScans}
          />
        </div>

        {/* ── Rapports automatiques ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <ReportSubscriptionPanel
            userEmail={userEmail || profile?.email || ""}
            plan={profile?.plan ?? "free"}
          />
        </div>
        </>)}

        {/* ── VUE D'ENSEMBLE (suite) : Top pages ── */}
        {tab === "overview" && (
        <div style={{
          background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
          borderRadius: 12, padding: "24px"
        }}>
          <h2 style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 600, marginBottom: 20, marginTop: 0 }}>
            Top Pages
          </h2>
          {pages.length === 0 ? (
            <p style={{ color: MUTED }}>Aucune page créée</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pages.slice(0, 5).map((page, i) => {
                const maxViews = pages[0]?.total_views || 1
                const pct = Math.max(4, (page.total_views / maxViews) * 100)
                return (
                  <div key={page.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ color: MUTED, fontSize: 13, width: 20, textAlign: "right" }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#F5F0E8", fontSize: 14 }}>{page.title}</span>
                        <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{page.total_views} vues</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${NEON})`, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}
        </>)}

      </div>
    </div>
  )
}
