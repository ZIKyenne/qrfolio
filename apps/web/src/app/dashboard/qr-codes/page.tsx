import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import QRStudioSwitch from "./QRStudioSwitch"
import Particles from "@/components/Particles"
import { accessibleOwnerIds } from "@/lib/team"
import { pageLimit } from "@/lib/plans"
import { Plus, QrCode, Link2 } from "lucide-react"

export const metadata: Metadata = { title: "QR Codes Studio - QRowg" }

export default async function QRCodesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single()

  // Contenu accessible : le sien + celui des équipes dont il est membre.
  const ownerIds = await accessibleOwnerIds(supabase, user.id)

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*, pages(id, title, slug, status, total_views, updated_at)")
    .in("user_id", ownerIds)
    .order("created_at", { ascending: false })

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
  const userPlan = profile?.plan || "free"

  const totalScans = (qrCodes ?? []).reduce((a, q) => a + (q.total_scans ?? 0), 0)
  const activeQR   = (qrCodes ?? []).filter((q: any) => (q.status ?? "active") === "active").length
  // Quota du plan = QR ACTIFS (visitables). null = illimité.
  const activeLimit = pageLimit(userPlan)
  // Compteur QR actifs : % de quota (barre) + couleur d'état (vert / or ≥80% / rouge à 100%).
  const quotaPct  = activeLimit ? Math.min(100, Math.round((activeQR / activeLimit) * 100)) : 100
  const dotColor  = activeLimit == null ? "#6fbf73" : quotaPct >= 100 ? "#d9534f" : quotaPct >= 80 ? "#e8c877" : "#6fbf73"

  return (
    <div style={{ minHeight: "100dvh", background: "transparent", fontFamily: "DM Sans, sans-serif", position: "relative" }}>
      <Particles behind mobileVivid />

      {/* ===== Header ===== */}
      <style>{`
        .qrh-inner { max-width:1320px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:66px; }
        .qrh-actions { display:flex; align-items:center; gap:14px; }
        @media (max-width:860px) {
          /* En-tete NON sticky sur mobile : il defile au lieu d'occuper l'ecran en
             permanence -> la personnalisation commence plus haut et le bas des
             reglages devient atteignable au scroll (fix scroll bloque). */
          .qrh-bar { padding:12px 16px !important; position: static !important; }
          .qrh-inner { flex-direction:column; align-items:stretch; height:auto; gap:12px; }
          .qrh-actions { flex-direction:column; align-items:stretch; gap:10px; width:100%; }
          /* KPIs (QR actifs / scans total) masques sur mobile : peu d'info pour la
             place prise ; les scans restent consultables dans l'onglet Stats. */
          .qrh-kpis { display:none !important; }
          .qrh-cta { width:100%; justify-content:center; padding:13px !important; font-size:14px !important; }
          .qrh-content { padding:16px 16px 130px !important; }
        }
      `}</style>
      <div className="qrh-bar" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)", background: "rgba(15,14,11,0.85)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 50, padding: "0 24px" }}>
        <div className="qrh-inner">

          {/* Identite */}
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 12%, transparent)" }}>
              <QrCode size={19} color="var(--accent)"/>
            </div>
            <div>
              <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#F5F0E8", fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
                QR Codes Studio
              </h1>
              <p style={{ color: "#A8A190", fontSize: 11, margin: 0 }}>
                Créez, personnalisez et exportez vos QR Codes
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="qrh-actions">
            {/* Compteurs d'en-tête — indicateurs animés dorés (handoff « Compteurs d'en-tête »). */}
            <div className="qrh-kpis" style={{ display: "flex", alignItems: "center", gap: 12 }}>

              {/* QR ACTIFS — pastille d'état vivante + barre de quota (valeur réelle) */}
              <div className="kpi-chip" aria-label={activeLimit != null ? `${activeQR} QR actifs sur ${activeLimit}` : `${activeQR} QR actifs`}>
                <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", width: 11, height: 11, flex: "none" }}>
                  <span className="kpi-dotring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${dotColor}` }} />
                  <span className="kpi-dotcore" style={{ position: "absolute", inset: 1, borderRadius: "50%", background: dotColor, boxShadow: `0 0 12px ${dotColor}b3` }} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "#e8c877", lineHeight: 1 }}>{activeQR}{activeLimit != null && <span style={{ color: "#6b6258", fontWeight: 500 }}> / {activeLimit}</span>}</div>
                  <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#8a8177", fontWeight: 600 }}>QR actifs</div>
                </div>
                {activeLimit != null && (
                  <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "#221f1b" }}>
                    <div style={{ position: "relative", overflow: "hidden", height: "100%", width: `${quotaPct}%`, background: "linear-gradient(90deg,#c9a24d,#e8c877)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}>
                      <div className="kpi-barshine" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "40%", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.85), rgba(255,255,255,0))" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* SCANS TOTAL — icône mini-QR scanné (faisceau + onde) */}
              <div className="kpi-chip" aria-label={`${totalScans} scans au total`}>
                <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", width: 20, height: 20, flex: "none" }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: 6, border: "1.5px solid rgba(232,200,119,.55)" }} />
                  <span className="kpi-scanring" style={{ position: "absolute", inset: 0, borderRadius: 6, border: "1.5px solid rgba(232,200,119,.5)" }} />
                  <span style={{ position: "absolute", left: 4, top: 4, width: 4, height: 4, borderRadius: 1, background: "rgba(232,200,119,.75)" }} />
                  <span style={{ position: "absolute", right: 4, top: 4, width: 4, height: 4, borderRadius: 1, background: "rgba(232,200,119,.75)" }} />
                  <span style={{ position: "absolute", left: 4, bottom: 4, width: 4, height: 4, borderRadius: 1, background: "rgba(232,200,119,.75)" }} />
                  <span className="kpi-scanline" style={{ position: "absolute", left: 2, right: 2, top: 3, height: 1.5, borderRadius: 2, background: "linear-gradient(90deg, rgba(232,200,119,0), #f0d590, rgba(232,200,119,0))", boxShadow: "0 0 8px rgba(232,200,119,.8)" }} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "#e8c877", lineHeight: 1 }}>{totalScans.toLocaleString("fr-FR")}</div>
                  <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#8a8177", fontWeight: 600 }}>Scans total</div>
                </div>
              </div>
            </div>

            {/* QR Dynamique — secondaire or contour (handoff « Boutons d'en-tête »). */}
            <a href="/dashboard/qr-link" className="qrh-cta qb-hsec">
              <span className="qb-ico" aria-hidden="true" style={{ display: "inline-flex" }}><Link2 size={15}/></span> QR Dynamique
            </a>

            {/* Nouvelle page + QR — primaire or (halo respirant + reflet au survol). */}
            <span style={{ position: "relative", display: "inline-flex" }}>
              <span aria-hidden="true" className="qb-halo" />
              <a href="/dashboard/templates" className="qrh-cta qb-hpri">
                <span aria-hidden="true" className="qb-gloss" />
                <span aria-hidden="true" className="qb-sheen" />
                <span className="qb-ico" aria-hidden="true" style={{ display: "inline-flex" }}><Plus size={16}/></span>
                <span style={{ position: "relative", zIndex: 1 }}>Nouvelle page + QR</span>
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* ===== Studio ===== */}
      <div className="qrh-content" style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 24px 40px" }}>
        <QRStudioSwitch
          qrCodes={(qrCodes ?? []) as any}
          userPlan={userPlan}
          appUrl={appUrl}
        />
      </div>
    </div>
  )
}
