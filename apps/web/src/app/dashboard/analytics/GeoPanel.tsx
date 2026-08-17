"use client"

import { useMemo, useState, useEffect } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { Globe, MapPin, QrCode, Eye, ZoomIn, ZoomOut } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type ScanRow = { country: string | null; city: string | null; page_id: string; scanned_at: string }
type ViewRow = { country: string | null; page_id: string; viewed_at: string }
type PageRow = { id: string; title: string }

interface Props {
  scans:     ScanRow[]
  pageViews: ViewRow[]
  pages:     PageRow[]
}

// ISO 3166-1 alpha-2 → label lisible (top 60 pays suffisants pour 95%+ du trafic)
const COUNTRY_NAMES: Record<string, string> = {
  FR: "France",       US: "États-Unis",   GB: "Royaume-Uni",  DE: "Allemagne",
  ES: "Espagne",      IT: "Italie",       BE: "Belgique",     CH: "Suisse",
  CA: "Canada",       AU: "Australie",    NL: "Pays-Bas",     PT: "Portugal",
  BR: "Brésil",       MX: "Mexique",      JP: "Japon",        KR: "Corée du Sud",
  CN: "Chine",        IN: "Inde",         RU: "Russie",       PL: "Pologne",
  SE: "Suède",        NO: "Norvège",      DK: "Danemark",     FI: "Finlande",
  AT: "Autriche",     CZ: "Tchéquie",     HU: "Hongrie",      RO: "Roumanie",
  TR: "Turquie",      IL: "Israël",       AE: "Émirats arabes", SA: "Arabie saoudite",
  ZA: "Afrique du Sud", NG: "Nigeria",    EG: "Égypte",       MA: "Maroc",
  DZ: "Algérie",      TN: "Tunisie",      SN: "Sénégal",      CI: "Côte d'Ivoire",
  AR: "Argentine",    CL: "Chili",        CO: "Colombie",     PE: "Pérou",
  VN: "Vietnam",      TH: "Thaïlande",    ID: "Indonésie",    MY: "Malaisie",
  PH: "Philippines",  SG: "Singapour",    HK: "Hong Kong",    TW: "Taïwan",
  NZ: "Nouvelle-Zélande", UA: "Ukraine",  GR: "Grèce",        HR: "Croatie",
  SK: "Slovaquie",    LU: "Luxembourg",   IE: "Irlande",      FO: "Îles Féroé",
}

const getName = (code: string | null) =>
  // « ?? »/vide = pays non résolu (README #8 : jamais « ?? », on dit pourquoi).
  (!code || code === "??") ? "Pays non détecté" : (COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase())

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

const PERIODS = [{ v: 7, l: "7j" }, { v: 30, l: "30j" }, { v: 90, l: "90j" }]
const MODES   = [{ v: "table", l: "Tableau" }, { v: "map", l: "Carte" }]

const G     = "var(--accent)"
const MUTED = "#A8A190"

// ── Gradient de chaleur ───────────────────────────────────────────────────────
function heatColor(ratio: number): string {
  if (ratio <= 0) return "#1a1a0e"
  if (ratio < 0.1) return "#2a2210"
  if (ratio < 0.25) return "#4a3a14"
  if (ratio < 0.5) return "#7a5c1a"
  if (ratio < 0.75) return "#b08228"
  return "var(--accent)"
}

export default function GeoPanel({ scans, pageViews, pages, page, periodDays }: Props & { page?: string; periodDays?: number }) {
  const [period, setPeriod] = useState(30)
  const [pageId, setPageId] = useState("all")
  useEffect(() => { if (page != null) setPageId(page) }, [page])                     // dedup #2 : barre du haut
  useEffect(() => { if (periodDays != null) setPeriod(periodDays) }, [periodDays])
  const [mode,   setMode]   = useState<"table" | "map">("table")
  const [zoom,   setZoom]   = useState(1)
  const [hover,  setHover]  = useState<string | null>(null)

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - period); return d
  }, [period])

  const fScans = useMemo(() =>
    scans.filter(s => new Date(s.scanned_at) >= cutoff && (pageId === "all" || s.page_id === pageId)),
    [scans, cutoff, pageId])

  const fViews = useMemo(() =>
    pageViews.filter(v => new Date(v.viewed_at) >= cutoff && (pageId === "all" || v.page_id === pageId)),
    [pageViews, cutoff, pageId])

  // ── Agréger par pays ─────────────────────────────────────────────────────
  const byCountry = useMemo(() => {
    const map: Record<string, { scans: number; views: number; cities: Set<string> }> = {}

    fScans.forEach(s => {
      const k = s.country?.toUpperCase() ?? "??"
      if (!map[k]) map[k] = { scans: 0, views: 0, cities: new Set() }
      map[k].scans++
      if (s.city) map[k].cities.add(s.city)
    })

    fViews.forEach(v => {
      const k = v.country?.toUpperCase() ?? "??"
      if (!map[k]) map[k] = { scans: 0, views: 0, cities: new Set() }
      map[k].views++
    })

    return Object.entries(map)
      .map(([code, d]) => ({
        code,
        name:   getName(code),
        scans:  d.scans,
        views:  d.views,
        total:  d.scans + d.views,
        cities: [...d.cities].slice(0, 4).join(", ") || null,
      }))
      .sort((a, b) => b.total - a.total)
  }, [fScans, fViews])

  // ── Agréger par ville (top 10) ────────────────────────────────────────────
  const byCity = useMemo(() => {
    const map: Record<string, { scans: number; country: string }> = {}
    fScans.forEach(s => {
      if (!s.city) return
      const k = s.city
      if (!map[k]) map[k] = { scans: 0, country: s.country ?? "" }
      map[k].scans++
    })
    return Object.entries(map)
      .map(([city, d]) => ({ city, ...d, country: getName(d.country) }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10)
  }, [fScans])

  const maxTotal  = byCountry[0]?.total || 1
  const totalVis  = fScans.length + fViews.length
  const topCountry = byCountry[0]

  // Map de lookup pour la carte choroplèthe
  const countryMap: Record<string, number> = {}
  byCountry.forEach(c => { countryMap[c.code] = c.total })

  return (
    <div style={{ background: "#0F0E0B", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Globe size={16} color={G} />
            <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Géographie</h3>
          </div>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            {byCountry.length} pays · {totalVis.toLocaleString()} visites
            {topCountry && (
              <span> · Top : <span style={{ color: G, fontWeight: 600 }}>{topCountry.name}</span></span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {pages.length > 1 && page == null && (
            <select value={pageId} onChange={e => setPageId(e.target.value)}
              style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 9, color: "#F5F0E8", padding: "5px 10px", fontSize: 11, cursor: "pointer", outline: "none" }}>
              <option value="all">Toutes les pages</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          {periodDays == null && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {PERIODS.map(o => (
              <button key={o.v} type="button" onClick={() => setPeriod(o.v)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: period === o.v ? G : "transparent", color: period === o.v ? "#080808" : MUTED }}>
                {o.l}
              </button>
            ))}
          </div>
          )}

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {MODES.map(o => (
              <button key={o.v} type="button" onClick={() => setMode(o.v as any)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: mode === o.v ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: mode === o.v ? G : MUTED }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { icon: <Globe size={13} color={G} />,          label: "Pays",        value: String(byCountry.filter(c => c.code !== "??").length) },
          { icon: <Eye size={13} color="var(--success)" />,       label: "Vues",        value: fViews.length.toLocaleString() },
          { icon: <QrCode size={13} color="var(--action)" />,    label: "Scans QR",    value: fScans.length.toLocaleString() },
          { icon: <MapPin size={13} color="#F472B6" />,    label: "Villes",      value: String(byCity.length) },
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

      {byCountry.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: MUTED }}>
          <div style={{ marginBottom: 10, color: "#5c554b" }}><Globe size={34} /></div>
          <p style={{ margin: "0 0 6px", fontSize: 14 }}>Aucune donnée géographique</p>
          <p style={{ margin: 0, fontSize: 12 }}>Les pays apparaissent dès les premières visites</p>
        </div>
      ) : mode === "table" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Tableau pays */}
          <div>
            <p style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px" }}>
              Par pays
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 90px", gap: 6, padding: "0 6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["Pays", "Vues", "Scans", ""].map((h, i) => (
                <span key={i} style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {byCountry.slice(0, 12).map((row, i) => (
              <div key={row.code} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 90px", gap: 6, alignItems: "center", padding: "8px 6px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderRadius: 7, marginTop: 2 }}>
                <div>
                  <span style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>{row.name}</span>
                  {row.cities && (
                    <p style={{ color: MUTED, fontSize: 10, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.cities}
                    </p>
                  )}
                </div>
                <span style={{ color: "var(--success)", fontSize: 12, fontWeight: 700 }}>{row.views}</span>
                <span style={{ color: "var(--action)", fontSize: 12, fontWeight: 700 }}>{row.scans}</span>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (row.total / maxTotal * 100) + "%", background: `linear-gradient(90deg, ${G}, var(--success))`, borderRadius: 3, opacity: 0.7, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top villes */}
          <div>
            <p style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px" }}>
              Top villes (scans QR)
            </p>
            {byCity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: MUTED }}>
                <MapPin size={20} color={MUTED} style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12 }}>Ville non disponible</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>Renseignée uniquement<br />lors des scans QR</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byCity.map((city, i) => (
                  <div key={city.city} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderRadius: 7 }}>
                    <span style={{ color: i < 3 ? G : MUTED, fontSize: 11, fontWeight: 700, minWidth: 22, textAlign: "center" }}>
                      {"#" + (i + 1)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>{city.city}</span>
                      <span style={{ color: MUTED, fontSize: 10, marginLeft: 6 }}>{city.country}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <QrCode size={10} color="var(--action)" />
                      <span style={{ color: "var(--action)", fontSize: 12, fontWeight: 700 }}>{city.scans}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Carte choroplèthe */}
          <div style={{ position: "relative", background: "#080808", borderRadius: 10, overflow: "hidden", height: 340 }}>
            {/* Zoom controls */}
            <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: <ZoomIn size={14} />, action: () => setZoom(z => Math.min(z + 0.5, 8)) },
                { icon: <ZoomOut size={14} />, action: () => setZoom(z => Math.max(z - 0.5, 1)) },
              ].map((btn, i) => (
                <button key={i} type="button" onClick={btn.action}
                  style={{ width: 28, height: 28, background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 7, color: G, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {btn.icon}
                </button>
              ))}
            </div>

            {/* Tooltip hover */}
            {hover && countryMap[hover] !== undefined && (
              <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8, padding: "8px 12px", pointerEvents: "none" }}>
                <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 3px" }}>{getName(hover)}</p>
                <p style={{ color: G, fontSize: 11, margin: 0 }}>{countryMap[hover].toLocaleString()} visites</p>
              </div>
            )}

            <ComposableMap
              projection="geoMercator"
              style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup zoom={zoom} center={[0, 20]}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo: any) => {
                      const code = geo.properties?.iso_a2 ?? ""
                      const total = countryMap[code] ?? 0
                      const ratio = total / maxTotal
                      const isHovered = hover === code
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => setHover(code)}
                          onMouseLeave={() => setHover(null)}
                          style={{
                            default: {
                              fill: heatColor(ratio),
                              stroke: "#1a1a0a",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                            hover: {
                              fill: total > 0 ? "#e8c060" : "#2a2a1a",
                              stroke: "var(--accent)",
                              strokeWidth: 1,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: { outline: "none" },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {/* Légende */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
            <span style={{ color: MUTED, fontSize: 10 }}>Aucune visite</span>
            <div style={{ display: "flex", gap: 2 }}>
              {["#1a1a0e", "#2a2210", "#4a3a14", "#7a5c1a", "#b08228", "var(--accent)"].map((c, i) => (
                <div key={i} style={{ width: 20, height: 10, background: c, borderRadius: 2 }} />
              ))}
            </div>
            <span style={{ color: MUTED, fontSize: 10 }}>Maximum</span>
          </div>

          {/* Top 5 pays sous la carte */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {byCountry.slice(0, 5).map((c, i) => (
              <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 10px" }}>
                <span style={{ color: i === 0 ? G : MUTED, fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: G, fontSize: 11 }}>{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
