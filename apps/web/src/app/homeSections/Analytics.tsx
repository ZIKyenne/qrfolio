"use client"

import { useInView } from "../homeUi"

const ANALYTICS_DEMO = {
  stats: [
    { label: "Scans ce mois", value: "847",  delta: "+12%", color: "var(--success)",  icon: "📱" },
    { label: "Vues de page",  value: "2 341", delta: "+8%",  color: "var(--action)",  icon: "👁️" },
    { label: "Taux de clic",  value: "36%",   delta: "+4pt", color: "#C9A84C",  icon: "🎯" },
    { label: "QR actifs",     value: "5",     delta: "",      color: "#A78BFA",  icon: "✅" },
  ],
  chart: [
    { day: "L",  scans: 38,  views: 102 },
    { day: "M",  scans: 52,  views: 141 },
    { day: "M",  scans: 41,  views: 118 },
    { day: "J",  scans: 67,  views: 184 },
    { day: "V",  scans: 84,  views: 231 },
    { day: "S",  scans: 121, views: 312 },
    { day: "D",  scans: 93,  views: 248 },
  ],
  pages: [
    { name: "Ma carte pro",   scans: 312, bar: 100, color: "#C9A84C"  },
    { name: "Menu restaurant",scans: 198, bar: 63,  color: "var(--action)"  },
    { name: "Portfolio",      scans: 142, bar: 45,  color: "#A78BFA"  },
    { name: "Promo flash",    scans: 89,  bar: 28,  color: "var(--success)"  },
  ],
  devices: [
    { label: "Mobile", pct: 72, color: "#C9A84C"  },
    { label: "Tablette",pct: 18, color: "var(--action)" },
    { label: "Desktop", pct: 10, color: "#A78BFA" },
  ],
  sources: [
    { label: "Direct QR",    pct: 58, color: "#C9A84C" },
    { label: "Réseaux soc.", pct: 24, color: "#F97316" },
    { label: "Email",        pct: 11, color: "var(--action)" },
    { label: "Autre",        pct: 7,  color: "#BCB6A6" },
  ],
}

const ANALYTICS_BENEFITS = [
  { icon: "📍", text: "Savoir quels QR codes fonctionnent vraiment" },
  { icon: "📱", text: "Comprendre les appareils de vos visiteurs" },
  { icon: "🎯", text: "Optimiser vos boutons d'action et vos pages" },
  { icon: "📈", text: "Suivre votre croissance semaine après semaine" },
]

function AnalyticsMockup() {
  const maxScans = Math.max(...ANALYTICS_DEMO.chart.map(d => d.scans))
  const maxViews = Math.max(...ANALYTICS_DEMO.chart.map(d => d.views))
  const chartH = 80

  return (
    <div style={{
      background: "linear-gradient(145deg, #0e0c08, #111009)",
      border: "1px solid rgba(201,168,76,0.18)",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08)",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["var(--danger)","#F97316","var(--success)"].map((c,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:c, opacity:0.6 }}/>
          ))}
          <span style={{ color:"rgba(201,168,76,0.5)", fontSize:10, letterSpacing:1.5, marginLeft:4 }}>ANALYTICS</span>
        </div>
        <div style={{
          background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)",
          borderRadius: 6, padding: "3px 10px",
          display: "flex", alignItems: "center", gap: 5,
        }} title="Données de démonstration — pas vos chiffres réels">
          <span style={{ color:"#C9A84C", fontSize:9, fontWeight:700, letterSpacing:1 }}>EXEMPLE</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 4 KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {ANALYTICS_DEMO.stats.map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "10px 10px",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <p style={{ color: s.color, fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 9, margin: 0, lineHeight: 1.3 }}>{s.label}</p>
              {s.delta && (
                <span style={{ color: "var(--success)", fontSize: 8, fontWeight: 700 }}>{s.delta}</span>
              )}
            </div>
          ))}
        </div>

        {/* Graphique barres — scans 7 jours */}
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 600, margin: 0 }}>Scans · 7 jours</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[["#C9A84C","Scans"],["var(--action)","Vues"]].map(([c,l]) => (
                <div key={l as string} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:2, background:c as string }}/>
                  <span style={{ color:"rgba(188,182,166,0.7)", fontSize:9 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: chartH + 20 }}>
            {ANALYTICS_DEMO.chart.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
                {/* deux barres groupées : Vues (bleu) + Scans (or), contenues */}
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
                  <div title={d.views + " vues"} style={{
                    width: "40%", maxWidth: 14, borderRadius: "3px 3px 0 0",
                    background: "rgba(56,189,248,0.45)",
                    height: Math.max(3, Math.round((d.views / maxViews) * chartH)) + "px",
                    transition: "height 0.4s ease",
                  }}/>
                  <div title={d.scans + " scans"} style={{
                    width: "40%", maxWidth: 14, borderRadius: "3px 3px 0 0",
                    background: "linear-gradient(to top, #C9A84C, #d4a843)",
                    height: Math.max(3, Math.round((d.scans / maxScans) * chartH)) + "px",
                    transition: "height 0.4s ease",
                  }}/>
                </div>
                <span style={{ color: "rgba(188,182,166,0.5)", fontSize: 8 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ligne du bas: top pages + appareils + sources */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>

          {/* Top pages */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Top pages</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ANALYTICS_DEMO.pages.map((p) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(245,240,232,0.7)", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{p.name}</span>
                    <span style={{ color: p.color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{p.scans}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: p.bar + "%", background: p.color, borderRadius: 2, opacity: 0.7 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Appareils */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Appareils</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ANALYTICS_DEMO.devices.map((d) => (
                <div key={d.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(245,240,232,0.7)", fontSize: 9 }}>{d.label}</span>
                    <span style={{ color: d.color, fontSize: 9, fontWeight: 700 }}>{d.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: d.pct + "%", background: d.color, borderRadius: 2, opacity: 0.8 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Sources</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ANALYTICS_DEMO.sources.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}/>
                  <span style={{ color: "rgba(245,240,232,0.65)", fontSize: 9, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: 9, fontWeight: 700 }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export function AnalyticsSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section id="analytics" ref={ref} aria-labelledby="analytics-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .analytics-layout { display:grid; grid-template-columns:1fr 1.5fr; gap:72px; align-items:center; }
        @media(max-width:1024px){ .analytics-layout{ grid-template-columns:1fr!important; gap:48px!important; } }
        @media(max-width:640px){ #analytics{ padding:72px 20px!important; } }
      `}</style>

      {/* Ambiance bleutée (donnée / data) — variation de fond par section */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "-6%", width: "min(620px,70vw)", height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.08), transparent 64%)", filter: "blur(50px)" }} />
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="analytics-layout">

          {/* Left: texte + bénéfices */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
              textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Statistiques</p>
            <h2 id="analytics-title" style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(26px, 3.5vw, 46px)",
              color: "#F5F0E8", fontWeight: 700,
              margin: "0 0 20px", lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}>
              Comprenez ce qui se passe{" "}
              <span style={{ color: "#C9A84C" }}>après chaque scan.</span>
            </h2>
            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 15,
              lineHeight: 1.75, marginBottom: 36, maxWidth: 400 }}>
              Suivi des vues, scans, appareils, sources et pages les plus performantes.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
              {ANALYTICS_BENEFITS.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-16px)",
                  transition: `opacity 0.5s ease ${0.15 + i * 0.1}s, transform 0.5s ease ${0.15 + i * 0.1}s`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>{b.icon}</div>
                  <span style={{ color: "rgba(245,240,232,0.8)", fontSize: 13.5, lineHeight: 1.4 }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Carte insight — l'analytics devient un conseiller */}
            <div style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "14px 16px", borderRadius: 14, marginBottom: 32,
              background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(255,255,255,0.02))",
              border: "1px solid rgba(201,168,76,0.28)",
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.55s ease 0.5s, transform 0.55s ease 0.5s",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>💡</span>
              <div>
                <p style={{ color: "#C9A84C", fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 4px" }}>Recommandation</p>
                <p style={{ color: "#E8E6E0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                  Votre QR <strong style={{ color: "#F5F0E8" }}>Restaurant</strong> performe mieux entre <strong style={{ color: "#F5F0E8" }}>18h et 21h</strong>. Partagez-le juste avant le service.
                </p>
              </div>
            </div>

            <a href="/creer" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.3)",
              color: "#C9A84C", textDecoration: "none",
              fontSize: 14, fontWeight: 600,
              padding: "12px 26px", borderRadius: 10,
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "rgba(201,168,76,0.08)"
                el.style.borderColor = "rgba(201,168,76,0.55)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "transparent"
                el.style.borderColor = "rgba(201,168,76,0.3)"
              }}>
              Voir mes analytics <span style={{ fontSize: 16 }}>→</span>
            </a>
          </div>

          {/* Right: mockup */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}>
            <AnalyticsMockup />
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Use cases section ─────────────────────────────────────────────────────────
