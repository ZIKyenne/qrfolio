// app/api/cron/quota-alerts/route.ts
// Alerte email "quota de vues" — soft-cap : on PRÉVIENT, on ne coupe jamais les pages.
// Appelé par cron (Vercel Cron). Protégé par CRON_SECRET.
// Pour chaque utilisateur dont les vues du mois >= 80% du quota de son plan,
// envoie un email d'alerte (palier "near" à 80%, "over" à 100%), dédupliqué par mois.
//
// ⚠️ Dédup : utilise la colonne `profiles.quota_alert_month` (text, ex "2026-06:over").
//    Si la colonne n'existe pas encore, l'alerte fonctionne quand même mais peut se
//    répéter à chaque passage du cron. SQL à exécuter dans Supabase :
//      alter table profiles add column if not exists quota_alert_month text;

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { getPlan } from "@/lib/plans"
import { EMAIL_FROM } from "@/lib/emailFrom"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

function alertHtml(name: string, views: number, limit: number, over: boolean, appUrl: string): string {
  const pct = Math.round((views / limit) * 100)
  const accent = over ? "#FF6B6B" : "#C9A84C"
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#080808;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="color:#C9A84C;font-size:22px;font-weight:700;margin:0 0 4px">QRowg</p>
    <div style="background:#111009;border:1px solid ${accent}40;border-radius:16px;padding:28px 24px;margin-top:16px">
      <p style="color:#F5F0E8;font-size:18px;font-weight:700;margin:0 0 10px">
        ${over ? "Quota de vues atteint ce mois-ci" : "Tu approches de ton quota de vues"}
      </p>
      <p style="color:#C9C4B8;font-size:14px;line-height:1.6;margin:0 0 16px">
        Salut ${name || "!"},<br/>
        Tu en es à <strong style="color:${accent}">${views.toLocaleString("fr-FR")} / ${limit.toLocaleString("fr-FR")} vues</strong> (${pct}%) ce mois-ci.
      </p>
      <p style="color:#8A8478;font-size:13px;line-height:1.6;margin:0 0 20px">
        Pas d'inquiétude : <strong style="color:#39FF8F">tes QR codes et tes pages restent 100% en ligne</strong>, rien n'est coupé.
        Passe à un plan supérieur pour augmenter ton quota et garder de la marge.
      </p>
      <a href="${appUrl}/upgrade" style="display:inline-block;background:linear-gradient(90deg,#C9A84C,#b8953f);color:#080808;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">
        Augmenter mon quota →
      </a>
    </div>
    <p style="color:#5a574f;font-size:11px;margin:20px 0 0;text-align:center">QRowg — alerte automatique de quota</p>
  </div>
</body></html>`
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const secret = req.nextUrl.searchParams.get("secret")
  // Fail-closed : sans CRON_SECRET configure, ou sans preuve valide, on refuse
  // (coherent avec /api/emails/weekly ; empeche tout declenchement non autorise).
  if (CRON_SECRET === "" || (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: "Service email non configure", sent: 0 }, { status: 503 })

  try {
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, plan")
    if (!profiles?.length) return NextResponse.json({ sent: 0 })

    let sent = 0
    const errors: string[] = []

    for (const p of profiles) {
      try {
        if (!p.email) continue
        const limit = getPlan(p.plan as string).limits.views
        if (limit == null) continue // plan illimité

        const { data: pages } = await supabase.from("pages").select("id").eq("user_id", p.id)
        const ids = (pages ?? []).map(pg => pg.id)
        if (!ids.length) continue

        const { count } = await supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", monthStart)
        const views = count ?? 0
        const threshold = views >= limit ? "over" : views >= limit * 0.8 ? "near" : null
        if (!threshold) continue

        // Dédup mensuelle (tolérant si la colonne n'existe pas)
        let last: string | null = null
        try {
          const { data: prof } = await supabase.from("profiles").select("quota_alert_month").eq("id", p.id).single()
          last = (prof as any)?.quota_alert_month ?? null
        } catch { /* colonne absente : pas de dédup */ }
        const tag = `${monthKey}:${threshold}`
        if (last === tag) continue                                   // déjà alerté ce palier ce mois
        if (threshold === "near" && last === `${monthKey}:over`) continue // déjà alerté plus haut

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [p.email],
            subject: threshold === "over" ? "⚠️ Quota de vues atteint — QRowg" : "📊 Tu approches de ton quota de vues — QRowg",
            html: alertHtml(p.full_name as string, views, limit, threshold === "over", appUrl),
          }),
        })
        if (!res.ok) throw new Error(await res.text())

        try { await supabase.from("profiles").update({ quota_alert_month: tag }).eq("id", p.id) } catch { /* colonne absente */ }
        sent++
      } catch (e: any) {
        errors.push(`${p.email}: ${e?.message ?? "err"}`)
      }
    }

    return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
  } catch (e: any) {
    return serverError("cron/quota-alerts", e)
  }
}
