// app/api/reports/send/route.ts
// Génération et envoi des rapports — appelé par cron (Vercel Cron ou pg_cron)
// Protégé par CRON_SECRET

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { escapeHtml as esc } from "@/lib/escapeHtml"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

function buildEmailHtml(params: {
  userName:   string
  period:     string
  totalViews: number
  prevViews:  number
  totalScans: number
  prevScans:  number
  topLinks:   { target: string; clicks: number }[]
  topPages:   { title: string; views: number }[]
  unsubUrl:   string
}): string {
  const g = (curr: number, prev: number) => {
    if (!prev) return null
    const pct = Math.round(((curr - prev) / prev) * 100)
    return { pct, up: pct >= 0 }
  }

  const viewGrowth  = g(params.totalViews, params.prevViews)
  const scanGrowth  = g(params.totalScans, params.prevScans)

  const growthBadge = (g: { pct: number; up: boolean } | null) => {
    if (!g) return ""
    const color = g.up ? "#39FF8F" : "#FF6B6B"
    const arrow = g.up ? "↑" : "↓"
    return `<span style="color:${color};font-size:12px;font-weight:700;margin-left:6px">${arrow} ${Math.abs(g.pct)}%</span>`
  }

  const topLinksHtml = params.topLinks.slice(0, 5).map((l, i) =>
    `<tr>
      <td style="padding:8px 12px;color:#8A8478;font-size:12px">#${i+1}</td>
      <td style="padding:8px 12px;color:#F5F0E8;font-size:12px;word-break:break-all">${esc(l.target.slice(0, 60))}</td>
      <td style="padding:8px 12px;color:#C9A84C;font-size:12px;font-weight:700;text-align:right">${l.clicks}</td>
    </tr>`
  ).join("")

  const topPagesHtml = params.topPages.slice(0, 5).map((p, i) =>
    `<tr>
      <td style="padding:8px 12px;color:#8A8478;font-size:12px">#${i+1}</td>
      <td style="padding:8px 12px;color:#F5F0E8;font-size:12px">${esc(p.title)}</td>
      <td style="padding:8px 12px;color:#39FF8F;font-size:12px;font-weight:700;text-align:right">${p.views}</td>
    </tr>`
  ).join("")

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:8px 20px;margin-bottom:16px">
        <span style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:2px">QROWG REPORT</span>
      </div>
      <h1 style="color:#F5F0E8;font-size:24px;font-weight:300;margin:0 0 6px;font-family:'Fraunces',Georgia,serif">
        Bonjour ${esc(params.userName)} 👋
      </h1>
      <p style="color:#8A8478;font-size:13px;margin:0">Voici vos performances · ${params.period}</p>
    </div>

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td width="50%" style="padding:0 6px 0 0">
          <div style="background:#0F0E0B;border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px;text-align:center">
            <p style="color:#8A8478;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px">Vues de page</p>
            <p style="color:#F5F0E8;font-size:28px;font-weight:800;margin:0">
              ${params.totalViews.toLocaleString("fr-FR")}${growthBadge(viewGrowth)}
            </p>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 6px">
          <div style="background:#0F0E0B;border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px;text-align:center">
            <p style="color:#8A8478;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px">Scans QR</p>
            <p style="color:#F5F0E8;font-size:28px;font-weight:800;margin:0">
              ${params.totalScans.toLocaleString("fr-FR")}${growthBadge(scanGrowth)}
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top liens -->
    ${params.topLinks.length > 0 ? `
    <div style="background:#0F0E0B;border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin-bottom:20px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="color:#F5F0E8;font-size:13px;font-weight:700">🔗 Top liens cliqués</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:rgba(255,255,255,0.02)">
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:left;font-weight:600">#</th>
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:left;font-weight:600">Lien</th>
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:right;font-weight:600">Clics</th>
          </tr>
        </thead>
        <tbody>${topLinksHtml}</tbody>
      </table>
    </div>` : ""}

    <!-- Top pages -->
    ${params.topPages.length > 0 ? `
    <div style="background:#0F0E0B;border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin-bottom:24px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="color:#F5F0E8;font-size:13px;font-weight:700">📄 Top pages</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:rgba(255,255,255,0.02)">
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:left;font-weight:600">#</th>
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:left;font-weight:600">Page</th>
            <th style="padding:8px 12px;color:#8A8478;font-size:10px;text-align:right;font-weight:600">Vues</th>
          </tr>
        </thead>
        <tbody>${topPagesHtml}</tbody>
      </table>
    </div>` : ""}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics"
        style="display:inline-block;background:linear-gradient(90deg,#C9A84C,#b8953f);border-radius:10px;padding:13px 28px;color:#080808;font-size:14px;font-weight:700;text-decoration:none">
        Voir le dashboard complet →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">
      <p style="color:#555;font-size:11px;margin:0 0 8px">
        Vous recevez ce rapport car vous êtes abonné aux notifications QRowg.
      </p>
      <a href="${params.unsubUrl}" style="color:#8A8478;font-size:11px">Se désabonner</a>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  // Vérifier le secret cron
  const auth = req.headers.get("authorization")
  const secret = req.nextUrl.searchParams.get("secret")
  // Fail-closed : sans CRON_SECRET configure, ou sans preuve valide, on refuse
  // (evite tout envoi d'emails en masse non autorise).
  if (CRON_SECRET === "" || (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const frequencyParam = req.nextUrl.searchParams.get("frequency") as "weekly" | "monthly" | null

  try {
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

    // 1. Récupérer les abonnements actifs à traiter
    const now = new Date()
    const { data: subs } = await supabase
      .from("report_subscriptions")
      .select("id, user_id, email, frequency, last_sent_at")
      .eq("enabled", true)
      .in("frequency", frequencyParam ? [frequencyParam] : ["weekly", "monthly"])

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, message: "Aucun abonnement actif" })
    }

    // Filtrer selon la date du dernier envoi
    const due = subs.filter(sub => {
      if (!sub.last_sent_at) return true
      const last = new Date(sub.last_sent_at)
      const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      return sub.frequency === "weekly" ? diffDays >= 7 : diffDays >= 28
    })

    let sent = 0
    const errors: string[] = []

    for (const sub of due) {
      try {
        // 2. Récupérer les données de l'utilisateur
        const days = sub.frequency === "weekly" ? 7 : 30
        const prevDays = days * 2
        const since = new Date(now); since.setDate(since.getDate() - days)
        const prevSince = new Date(now); prevSince.setDate(prevSince.getDate() - prevDays)

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", sub.user_id)
          .single()

        const { data: pages } = await supabase
          .from("pages")
          .select("id, title, total_views")
          .eq("user_id", sub.user_id)
          .eq("status", "published")

        const pageIds = (pages ?? []).map(p => p.id)
        if (!pageIds.length) continue

        const { count: totalViews } = await supabase
          .from("page_views")
          .select("id", { count: "exact", head: true })
          .in("page_id", pageIds)
          .gte("viewed_at", since.toISOString())

        const { count: prevViews } = await supabase
          .from("page_views")
          .select("id", { count: "exact", head: true })
          .in("page_id", pageIds)
          .gte("viewed_at", prevSince.toISOString())
          .lt("viewed_at", since.toISOString())

        const { count: totalScans } = await supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .in("page_id", pageIds)
          .gte("scanned_at", since.toISOString())

        const { count: prevScans } = await supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .in("page_id", pageIds)
          .gte("scanned_at", prevSince.toISOString())
          .lt("scanned_at", since.toISOString())

        const { data: clicksRaw } = await supabase
          .from("block_clicks")
          .select("click_target")
          .in("page_id", pageIds)
          .gte("clicked_at", since.toISOString())
          .not("click_target", "is", null)

        // Agréger top liens
        const linkMap: Record<string, number> = {}
        ;(clicksRaw ?? []).forEach(c => {
          if (c.click_target) linkMap[c.click_target] = (linkMap[c.click_target] || 0) + 1
        })
        const topLinks = Object.entries(linkMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([target, clicks]) => ({ target, clicks }))

        // Top pages par vues sur la période
        const topPages = (pages ?? [])
          .sort((a, b) => b.total_views - a.total_views)
          .slice(0, 5)
          .map(p => ({ title: p.title, views: p.total_views }))

        const periodLabel = sub.frequency === "weekly"
          ? `Semaine du ${since.toLocaleDateString("fr-FR")}`
          : `Mois de ${since.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`

        const unsubUrl = `${appUrl}/api/reports/unsubscribe?user=${sub.user_id}&freq=${sub.frequency}&token=${Buffer.from(sub.id).toString("base64url")}`

        const html = buildEmailHtml({
          userName:   profile?.full_name ?? "là",
          period:     periodLabel,
          totalViews: totalViews ?? 0,
          prevViews:  prevViews ?? 0,
          totalScans: totalScans ?? 0,
          prevScans:  prevScans ?? 0,
          topLinks,
          topPages,
          unsubUrl,
        })

        // 3. Envoyer via Resend (ou autre provider configuré)
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) {
          console.warn("[reports] RESEND_API_KEY manquant — email non envoyé pour", sub.email)
          continue
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from:    "QRowg Reports <reports@qrowg.com>",
            to:      [sub.email],
            subject: `📊 Votre rapport ${sub.frequency === "weekly" ? "hebdomadaire" : "mensuel"} QRowg`,
            html,
          }),
        })

        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Resend error: ${err}`)
        }

        // 4. Mettre à jour last_sent_at
        await supabase
          .from("report_subscriptions")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", sub.id)

        sent++
      } catch (e: any) {
        errors.push(`${sub.email}: ${e.message}`)
      }
    }

    return NextResponse.json({ sent, total: due.length, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
