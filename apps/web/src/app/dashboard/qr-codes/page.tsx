import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import QRStudioSwitch from "./QRStudioSwitch"
import Particles from "@/components/Particles"
import { accessibleOwnerIds } from "@/lib/team"
import { pageLimit } from "@/lib/plans"
import { Plus, QrCode, TrendingUp, Activity, Link2 } from "lucide-react"

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
            {/* KPIs en pastilles */}
            <div className="qrh-kpis" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[
                { label: "QR actifs",   value: activeLimit !== null ? `${activeQR} / ${activeLimit}` : activeQR, icon: <Activity size={13} color="var(--success)"/>,    color: "var(--success)" },
                { label: "Scans total", value: totalScans.toLocaleString("fr-FR"), icon: <TrendingUp size={13} color="var(--accent)"/>, color: "var(--accent)" },
              ].map((k, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "7px 13px" }}>
                  {k.icon}
                  <div>
                    <p style={{ color: k.color, fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1 }}>{k.value}</p>
                    <p style={{ color: "#A8A190", fontSize: 9, margin: "1px 0 0", textTransform: "uppercase", letterSpacing: 0.8 }}>{k.label}</p>
                  </div>
                </div>
              ))}
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
