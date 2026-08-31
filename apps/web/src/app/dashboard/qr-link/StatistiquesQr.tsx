"use client"

// StatistiquesQr.tsx — La fenêtre de statistiques d'un QR, sortie de la page.
//
// C'était le plus gros bloc du fichier : 136 lignes de JSX dans un `return`
// qui en comptait 622, avec son propre chargement réseau et trois états. Elle
// ne partage rien avec la fabrication d'un QR — elle lit un enregistrement et
// l'affiche. La sortir rend les deux lisibles.

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, Clock, Calendar, TrendingUp, Activity, X } from "lucide-react"
import { countryFlag, DEVICE_LABEL } from "@/lib/scanStats"
import { useFermetureModale } from "@/lib/useFermetureModale"
import { useIsMobile } from "@/lib/useIsMobile"
import { etatLien, dateLisible, type InstantQr, type StatsLien } from "./instantQr"

const G = "#C9A84C"
const MUTED = "#A8A190"

export default function StatistiquesQr({ qr, onFermer }: { qr: InstantQr | null; onFermer: () => void }) {
  const [details, setDetails] = useState<StatsLien | null>(null)
  const [chargement, setChargement] = useState(false)
  const isMobile = useIsMobile(768)

  useFermetureModale(qr !== null, onFermer)

  // Ne dépend que de l'identifiant : l'effet se relançait à chaque nouvelle
  // référence d'objet, donc à chaque mise à jour du lien.
  const id = qr?.id
  useEffect(() => {
    if (!id) { setDetails(null); return }
    let vivant = true
    setChargement(true); setDetails(null)
    fetch(`/api/qr-instant/stats?id=${id}`).then(r => r.json())
      .then(d => { if (vivant) setDetails(d) })
      .catch(() => { if (vivant) setDetails(null) })
      .finally(() => { if (vivant) setChargement(false) })
    return () => { vivant = false }
  }, [id])

  if (!qr) return null
  const stats = qr

        const total = stats.total_scans ?? 0
    const created = stats.created_at ? new Date(stats.created_at) : null
    const daysActive = created ? Math.max(1, Math.round((Date.now() - created.getTime()) / 86400000)) : 1
    const perDay = total / daysActive
    // UNE seule fonction pour l'état : les deux d'avant décrivaient le même
    // lien avec des mots différents, rendues l'une au-dessus de l'autre ici.
    const st = etatLien(stats)
    const rows: { icon: any; label: string; value: string; color?: string }[] = [
      { icon: Clock, label: "Dernier scan", value: stats.last_scan_at ? dateLisible(stats.last_scan_at) : "Aucun scan pour l'instant" },
      { icon: TrendingUp, label: "Moyenne par jour", value: `${perDay.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / jour · sur ${daysActive} j` },
      { icon: Calendar, label: "Créé le", value: dateLisible(stats.created_at) },
      { icon: Activity, label: "Statut", value: st.phrase, color: st.couleur },
    ]
    const panel: React.CSSProperties = {
      background: "#141210", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
      zIndex: 401, overflowY: "auto", position: "fixed",
      ...(isMobile
        ? { left: 0, right: 0, bottom: 0, width: "100%", maxHeight: "85dvh", borderRadius: "22px 22px 0 0", padding: 20, paddingBottom: "calc(20px + env(safe-area-inset-bottom))", animation: "mo-slide-up .22s ease" }
        : { top: "50%", right: 24, transform: "translateY(-50%)", width: 380, maxHeight: "88vh", borderRadius: 20, padding: 22 }),
    }
    return (
      <div onClick={onFermer} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>
        {isMobile && <div style={{ position: "absolute", bottom: "calc(85dvh - 4px)", left: "50%", transform: "translateX(-50%)", width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />}
        <div onClick={e => e.stopPropagation()} style={panel}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <BarChart3 size={18} color={G} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 800, margin: 0 }}>Statistiques</p>
              <p style={{ color: MUTED, fontSize: 11.5, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stats.label || stats.dest_url || "Lien dynamique"}</p>
            </div>
            <button onClick={onFermer} aria-label="Fermer les statistiques" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30, flexShrink: 0 }}><X size={15} /></button>
          </div>

          {/* Total (chiffre héro) */}
          <div style={{ textAlign: "center", padding: "18px 12px", borderRadius: 16, background: "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.14), transparent 65%), rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.16)", marginBottom: 14 }}>
            <p style={{ color: G, fontSize: 44, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: -1 }}>{total.toLocaleString("fr-FR")}</p>
            <p style={{ color: MUTED, fontSize: 12, fontWeight: 600, margin: "7px 0 0", textTransform: "uppercase", letterSpacing: 1.2 }}>scan{total > 1 ? "s" : ""} au total</p>
          </div>

          {/* Un second bandeau d'état vivait ici, calculé par une AUTRE fonction
              que la ligne « Statut » juste en dessous : le même lien pouvait s'y
              décrire de deux façons contradictoires. La ligne « Statut » suffit. */}

          {/* Détail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {rows.map((r, i) => { const Icon = r.icon; return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                <Icon size={16} color={MUTED} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, color: MUTED, fontSize: 12.5 }}>{r.label}</span>
                <span style={{ color: r.color || "#F5F0E8", fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{r.value}</span>
              </div>
            ) })}
          </div>

          {/* Stats détaillées (Pro+) : graphe par jour, appareils, pays — données réelles. */}
          {chargement && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "16px 0 0" }}>Chargement des statistiques…</p>}

          {details?.detailed && (() => {
            const days = (details.byDay || []).slice(-14)
            const maxDay = Math.max(1, ...days.map((d: any) => d.count))
            const totalWindow = (details.byDevice || []).reduce((n: number, d: any) => n + d.count, 0)
            return (
              <div style={{ marginTop: 18 }}>
                <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 9px", display: "flex", justifyContent: "space-between" }}>
                  <span>Scans · 14 derniers jours</span>
                  {details.peakDay && <span style={{ color: "#6E685E", textTransform: "none", letterSpacing: 0 }}>pic : {details.peakDay.count}</span>}
                </p>
                {/* Histogramme par jour */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56, marginBottom: 4 }}>
                  {days.map((d: any, i: number) => (
                    <div key={i} title={`${d.date} · ${d.count} scan${d.count > 1 ? "s" : ""}`}
                      style={{ flex: 1, minWidth: 0, height: `${Math.max(3, (d.count / maxDay) * 100)}%`, borderRadius: 3,
                        background: d.count > 0 ? "linear-gradient(180deg, #E6C766, #C9A84C)" : "rgba(255,255,255,0.06)" }} />
                  ))}
                </div>
                {totalWindow === 0 && <p style={{ color: "#6E685E", fontSize: 11, textAlign: "center", margin: "6px 0 0" }}>Aucun scan sur la période — partagez votre QR pour voir les données arriver.</p>}

                {/* Appareils */}
                {(details.byDevice || []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Appareils</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {details.byDevice.map((d: any) => {
                        const pct = totalWindow ? Math.round((d.count / totalWindow) * 100) : 0
                        return (
                          <div key={d.device} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ width: 78, flexShrink: 0, color: "#D8D2C6", fontSize: 12 }}>{DEVICE_LABEL[d.device as keyof typeof DEVICE_LABEL] || d.device}</span>
                            <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: G }} />
                            </div>
                            <span style={{ width: 40, flexShrink: 0, textAlign: "right", color: MUTED, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{d.count} · {pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Pays */}
                {(details.byCountry || []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Pays</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {details.byCountry.slice(0, 5).map((c: any) => (
                        <div key={c.country} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                          <span style={{ fontSize: 15 }}>{countryFlag(c.country)}</span>
                          <span style={{ flex: 1, color: "#D8D2C6" }}>{c.country === "??" ? "Inconnu" : c.country}</span>
                          <span style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Upsell : stats détaillées réservées au Pro */}
          {details && details.detailed === false && (
            <a href="/upgrade" style={{ display: "block", marginTop: 16, padding: "13px 14px", borderRadius: 12, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.28)", textDecoration: "none" }}>
              <p style={{ color: G, fontSize: 12.5, fontWeight: 700, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 6 }}><BarChart3 size={14} /> Statistiques détaillées</p>
              <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>Scans par jour, appareil et pays à partir du plan <strong style={{ color: "#F5F0E8" }}>Pro</strong>. Toucher pour découvrir →</p>
            </a>
          )}

          <div style={{ marginTop: 16, padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ color: "#6E685E", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Lien suivi</p>
            <p style={{ color: "#F5F0E8", fontSize: 12, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{stats.payload}</p>
          </div>
          <p style={{ color: "#6E685E", fontSize: 10.5, margin: "10px 2px 0", lineHeight: 1.5, textAlign: "center" }}>Mis à jour à chaque scan.</p>
        </div>
      </div>
    )
}
