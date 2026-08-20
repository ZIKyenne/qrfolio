"use client"

// Cartes de l'onglet "Vue d'ensemble" — refonte design (handoff Analytics QROWG).
// 1) OverviewChart : serie temporelle 30 j (courbe lissee Catmull-Rom -> Bezier,
//    grille alignee, pic annote, infobulle au survol, toggles de serie).
// 2) TopPagesCard : classement des pages par vues cumulees (rang, part %, barre).
// Autonome, aucune dependance graphique externe (pas de recharts) : SVG pur.
import { useMemo, useState, type CSSProperties } from "react"

// ── Palette du design (tokens du handoff) ───────────────────────────────────
const CARD_BG = "#141210", CARD_BC = "#221f1b"
const GOLD = "#e8c877", GOLD_DEEP = "#c9a24d"
const GREEN = "#3ee08a"
const T1 = "#e8e3da", T2 = "#c8bfb2", T3 = "#8a8177", T4 = "#6b6258"

type DailyPoint = { date: string; scans: number; views: number }
type PageRow = { id: string; title: string; total_views: number }

// Lissage normatif (handoff) : Catmull-Rom converti en cubiques de Bezier,
// points de controle bornes au cadre pour que la courbe ne plonge jamais sous 0.
function smooth(pts: [number, number][], H: number): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : ""
  const clamp = (y: number) => Math.max(0, Math.min(H, y))
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const k = 0.28
    const c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = clamp(p1[1] + (p2[1] - p0[1]) * k)
    const c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = clamp(p2[1] - (p3[1] - p1[1]) * k)
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`
  }
  return d
}

const cardStyle: CSSProperties = {
  display: "flex", flexDirection: "column", gap: 16,
  padding: "19px 20px 15px", borderRadius: 16, background: CARD_BG, border: `1px solid ${CARD_BC}`,
}

export function OverviewChart({ daily, rangeLabel = "30 derniers jours" }: { daily: DailyPoint[]; rangeLabel?: string }) {
  const [showScans, setShowScans] = useState(true)
  const [showViews, setShowViews] = useState(true)
  const [hover, setHover] = useState<number | null>(null)

  const g = useMemo(() => {
    const W = 1000, H = 220
    const scans = daily.map(d => d.scans)
    const views = daily.map(d => d.views)
    const dates = daily.map(d => d.date)
    const n = Math.max(daily.length, 1)
    const anyViews = views.some(v => v > 0)
    const rawMax = Math.max(1, ...scans, ...views)
    const max = Math.max(4, Math.ceil(rawMax / 4) * 4)
    const px = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W)
    const py = (v: number) => H - (v / max) * H
    const scanPts = scans.map((v, i) => [px(i), py(v)] as [number, number])
    const viewPts = views.map((v, i) => [px(i), py(v)] as [number, number])
    const lineScans = smooth(scanPts, H)
    const areaScans = `${lineScans} L${W} ${H} L0 ${H} Z`
    const lineViews = anyViews ? smooth(viewPts, H) : `M0 ${H - 1} L${W} ${H - 1}`
    let peakI = 0
    for (let i = 1; i < scans.length; i++) if (scans[i] > scans[peakI]) peakI = i
    const yTicks = [0, 1, 2, 3, 4].map(i => ({ label: Math.round((max * (4 - i)) / 4), top: 8 + i * 57, zero: i === 4 }))
    const xTicks = [3, 8, 13, 18, 23, 28].filter(i => i < n).map(i => ({
      label: dates[i], left: `${(i / (n - 1)) * 100}%`, shift: i === 0 ? "0%" : i === n - 1 ? "-100%" : "-50%",
    }))
    return { W, H, n, scans, views, dates, anyViews, max, py, lineScans, areaScans, lineViews, peakI, yTicks, xTicks }
  }, [daily])

  const totalScans = g.scans.reduce((a, b) => a + b, 0)
  const totalViews = g.views.reduce((a, b) => a + b, 0)
  const peakVal = g.scans[g.peakI] || 0
  const showPeak = showScans && hover === null && peakVal > 0
  const noViews = showViews && !g.anyViews

  const chip = (active: boolean): CSSProperties => active
    ? { background: "rgba(232,200,119,.10)", border: "1px solid rgba(232,200,119,.45)", color: GOLD, fontWeight: 700 }
    : { background: "transparent", border: `1px solid #26211a`, color: T3, fontWeight: 500 }

  const hvX = hover === null ? "0%" : `${(hover / (g.n - 1)) * 100}%`
  const hvY = hover === null ? "0%" : `${(g.py(g.scans[hover]) / g.H) * 100}%`
  const hvShift = hover === null ? "-50%" : hover > g.n * 0.7 ? "-100%" : hover < g.n * 0.15 ? "0%" : "-50%"

  return (
    <div style={cardStyle}>
      {/* En-tete */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em", color: T1 }}>
          <span aria-hidden style={{ flex: "none", width: 15, height: 15, background: GOLD_DEEP, clipPath: "path(evenodd, 'M1 11.2 L4.6 6.4 L7.4 8.6 L12.4 1.8 L13.4 2.8 L7.6 10.8 L4.8 8.6 L2 12.6 Z M0.6 0.8 L2 0.8 L2 13.2 L0.6 13.2 Z')" }} />
          Scans &amp; vues <span style={{ color: T3, fontWeight: 500 }}>— {rangeLabel}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button type="button" onClick={() => setShowScans(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", transition: "background .2s ease, border-color .2s ease, color .2s ease", ...chip(showScans) }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: showScans ? GOLD : "#3a332a" }} />
            Scans QR <span style={{ color: T3 }}>{totalScans}</span>
          </button>
          <button type="button" onClick={() => setShowViews(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", transition: "background .2s ease, border-color .2s ease, color .2s ease", ...chip(showViews) }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: showViews ? GREEN : "#3a332a" }} />
            Vues <span style={{ color: T3 }}>{totalViews}</span>
          </button>
        </div>
      </div>

      {/* Graphique */}
      <div style={{ position: "relative", height: 262 }}>
        {/* Grille + axe Y */}
        {g.yTicks.map((y, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 6, top: y.top, display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
            <span style={{ width: 24, textAlign: "right", fontSize: 10.5, lineHeight: 1, color: T4, fontVariantNumeric: "tabular-nums" }}>{y.label}</span>
            <span style={{ flex: 1, height: 1, background: y.zero ? "#2a251d" : "rgba(42,37,29,.5)" }} />
          </div>
        ))}

        {/* Aire de trace */}
        <div style={{ position: "absolute", left: 38, right: 6, top: 8, bottom: 26 }}>
          <svg viewBox="0 0 1000 220" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id="ovScanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.28} />
                <stop offset="70%" stopColor={GOLD} stopOpacity={0.04} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showViews && (g.anyViews
              ? <path d={g.lineViews} fill="none" stroke={GREEN} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              : <path d={g.lineViews} fill="none" stroke={GREEN} strokeWidth={1.5} strokeOpacity={0.55} strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
            {showScans && <>
              <path d={g.areaScans} fill="url(#ovScanGrad)" />
              <path d={g.lineScans} fill="none" stroke={GOLD} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>}
          </svg>

          {/* Pic de la periode */}
          {showPeak && <>
            <div style={{ position: "absolute", left: `${(g.peakI / (g.n - 1)) * 100}%`, top: `${(g.py(peakVal) / g.H) * 100}%`, width: 7, height: 7, margin: "-4px 0 0 -4px", borderRadius: "50%", background: GOLD, boxShadow: "0 0 0 3px rgba(232,200,119,.18)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: `${(g.peakI / (g.n - 1)) * 100}%`, top: `${(g.py(peakVal) / g.H) * 100}%`, transform: "translate(-50%,-30px)", display: "flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999, background: "rgba(232,200,119,.12)", border: "1px solid rgba(232,200,119,.26)", color: GOLD, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none" }}>
              <span aria-hidden style={{ width: 7, height: 7, background: "currentColor", clipPath: "path('M4 0 L8 4 L5 4 L5 8 L3 8 L3 4 L0 4 Z')" }} />
              pic · {peakVal} scans le {g.dates[g.peakI]}
            </div>
          </>}

          {/* Point survole */}
          {hover !== null && <>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: hvX, width: 1, background: "rgba(232,200,119,.45)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: hvX, top: hvY, width: 9, height: 9, margin: "-5px 0 0 -5px", borderRadius: "50%", background: GOLD, boxShadow: "0 0 0 3px rgba(232,200,119,.22)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: hvX, top: 8, transform: `translateX(${hvShift})`, padding: "10px 13px", borderRadius: 11, background: "rgba(15,13,11,.97)", border: "1px solid rgba(232,200,119,.3)", boxShadow: "0 14px 30px -18px rgba(0,0,0,.95)", pointerEvents: "none", whiteSpace: "nowrap" }}>
              <span style={{ display: "block", fontSize: 11, color: T3, marginBottom: 5 }}>{g.dates[hover]}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: T1 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} />{g.scans[hover]} scans</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 12.5, fontWeight: 700, color: T1 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />{g.views[hover]} vues</span>
            </div>
          </>}

          {/* Colonnes de survol */}
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {g.scans.map((_, i) => (
              <span key={i} style={{ flex: 1, cursor: "crosshair" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
          </div>
        </div>

        {/* Axe X */}
        <div style={{ position: "absolute", left: 38, right: 6, bottom: 0, height: 20 }}>
          {g.xTicks.map((x, i) => (
            <span key={i} style={{ position: "absolute", left: x.left, top: 0, transform: `translateX(${x.shift})`, fontSize: 10.5, color: T4, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{x.label}</span>
          ))}
        </div>
      </div>

      {/* Note "aucune vue" */}
      {noViews && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 11, background: "rgba(62,158,110,.07)", border: "1px solid rgba(62,158,110,.2)" }}>
          <span aria-hidden style={{ flex: "none", width: 14, height: 14, borderRadius: 2, background: GREEN, opacity: 0.7, clipPath: "path('M0 6 L14 6 L14 8 L0 8 Z')" }} />
          <span style={{ fontSize: 12, color: "#8fd0ae", lineHeight: 1.5 }}>La courbe <strong style={{ color: T2, fontWeight: 700 }}>Vues</strong> reste à plat : aucune vue de page n'est encore pistée sur la période.</span>
        </div>
      )}
    </div>
  )
}

export function TopPagesCard({ pages }: { pages: PageRow[] }) {
  const sorted = [...pages].sort((a, b) => b.total_views - a.total_views)
  const top = sorted.slice(0, 5)
  const pMax = top[0]?.total_views || 1
  const pSum = pages.reduce((a, p) => a + (p.total_views || 0), 0)
  const nb = pages.length

  return (
    <div style={{ ...cardStyle, padding: "19px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em", color: T1 }}>Pages les plus vues</span>
        <span style={{ fontSize: 12, color: T3 }}><strong style={{ color: T2, fontWeight: 700 }}>{pSum} {pSum === 1 ? "vue cumulée" : "vues cumulées"}</strong> · {nb} page{nb === 1 ? "" : "s"} active{nb === 1 ? "" : "s"}</span>
      </div>

      {top.length === 0 ? (
        <p style={{ color: T3, fontSize: 13, margin: 0 }}>Aucune page publiée pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {top.map((p, i) => {
            const v = p.total_views || 0
            const rankBg = i === 0 ? "rgba(232,200,119,.14)" : "transparent"
            const rankCol = i === 0 ? GOLD : i < 3 ? GOLD_DEEP : T3
            const w = v ? `${Math.max(3, (v / pMax) * 100)}%` : "0%"
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: 10, borderRadius: 10, margin: "0 -10px", cursor: "default", transition: "background .2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,200,119,.05)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
                <span style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 7, background: rankBg, fontSize: 11.5, fontWeight: 700, color: rankCol, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: T1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title || "Page sans titre"}</span>
                    <span style={{ flex: "none", display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: v ? T1 : T3, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                      <span style={{ fontSize: 11.5, color: T3 }}>{v === 1 ? "vue" : "vues"}</span>
                      <span style={{ width: 38, textAlign: "right", fontSize: 11.5, color: T4, fontVariantNumeric: "tabular-nums" }}>{pSum ? Math.round((v / pSum) * 100) : 0} %</span>
                    </span>
                  </div>
                  <span style={{ position: "relative", height: 6, borderRadius: 3, background: "#1e1b18", overflow: "hidden" }}>
                    <span style={{ position: "absolute", inset: "0 auto 0 0", width: w, borderRadius: 3, background: v ? "linear-gradient(90deg,#c9a24d,#e8c877)" : "transparent" }} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <span style={{ fontSize: 11.5, color: T4, lineHeight: 1.5 }}>Vues cumulées depuis la publication de chaque page — indépendantes du filtre de période.</span>
    </div>
  )
}
