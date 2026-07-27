import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import QRStudio from "./QRStudio"
import Particles from "@/components/Particles"
import { accessibleOwnerIds } from "@/lib/team"
import { Plus, QrCode, TrendingUp, Activity, Link2 } from "lucide-react"

export const metadata: Metadata = { title: "QR Studio - QRowg" }

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

  return (
    <div style={{ minHeight: "100dvh", background: "transparent", fontFamily: "DM Sans, sans-serif", position: "relative" }}>
      <Particles behind />

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
          .qrh-kpis { width:100%; }
          .qrh-kpis > div { flex:1; }
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
                QR Studio
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
                { label: "QR actifs",   value: activeQR,                      icon: <Activity size={13} color="var(--success)"/>,    color: "var(--success)" },
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

            {/* QR d'un lien : generateur de QR pour n'importe quelle URL (decouvrable ici aussi, pas seulement dans le sheet mobile). */}
            <a href="/dashboard/qr-link" className="qrh-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(201,168,76,0.08)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)", textDecoration: "none", fontSize: 12.5, fontWeight: 700, padding: "10px 16px", borderRadius: 10, whiteSpace: "nowrap" as const }}>
              <Link2 size={14}/> QR instantané
            </a>

            {/* Un QR = une page dans QRowg : la creation part donc d'une page (templates). */}
            <a href="/dashboard/templates" className="qrh-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #000))", color: "#080808", textDecoration: "none", fontSize: 12.5, fontWeight: 700, padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap" as const, boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 20%, transparent)" }}>
              <Plus size={14}/> Nouvelle page + QR
            </a>
          </div>
        </div>
      </div>

      {/* ===== Studio ===== */}
      <div className="qrh-content" style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 24px 40px" }}>
        <QRStudio
          qrCodes={(qrCodes ?? []) as any}
          userPlan={userPlan}
          appUrl={appUrl}
        />
      </div>
    </div>
  )
}
