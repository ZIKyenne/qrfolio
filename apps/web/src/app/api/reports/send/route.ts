// app/api/reports/send/route.ts
// Génération et envoi des rapports — appelé par cron (Vercel Cron ou pg_cron)
// Protégé par CRON_SECRET

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { noterPassage } from "@/lib/journalCron"

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
    return `<span style="color:${color};font-size:13px;font-weight:700;margin-left:6px;">${arrow} ${Math.abs(g.pct)}%</span>`
  }

  // Carte KPI (chiffre dore + libelle), coherente avec l'email hebdo. valueHtml peut
  // contenir le badge de croissance (deja stylise).
  const statCard = (valueHtml: string, label: string, side: "left" | "right") => {
    const pad = side === "left" ? "0 6px 0 0" : "0 0 0 6px"
    return `<td width="50%" valign="top" style="padding:${pad};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:12px;"><tr><td align="center" style="padding:20px 12px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#C9A84C;line-height:1;">${valueHtml}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:1px;margin-top:7px;">${label}</div>
      </td></tr></table>
    </td>`
  }

  // Tableau "Top" (liens / pages) reutilisable, palette de la coquille partagee.
  const topTable = (title: string, rows: { label: string; value: number; accent: string }[]) => {
    if (!rows.length) return ""
    const body = rows.slice(0, 5).map((r, i) =>
      `<tr>
        <td style="padding:8px 12px;color:#8A8478;font-family:Arial,Helvetica,sans-serif;font-size:12px;">#${i + 1}</td>
        <td style="padding:8px 12px;color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;font-size:12px;word-break:break-all;">${esc(r.label)}</td>
        <td style="padding:8px 12px;color:${r.accent};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-align:right;">${r.value}</td>
      </tr>`
    ).join("")
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#F5F0E8;">${title}</td></tr>
      <tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr>
    </table>`
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

  const content = `
    ${emailH1(`Bonjour ${esc(params.userName)} 👋`)}
    ${emailP(`Voici vos performances · ${esc(params.period)}`, 22)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
      ${statCard(`${params.totalViews.toLocaleString("fr-FR")}${growthBadge(viewGrowth)}`, "Vues de page", "left")}
      ${statCard(`${params.totalScans.toLocaleString("fr-FR")}${growthBadge(scanGrowth)}`, "Scans QR", "right")}
    </tr></table>
    ${topTable("🔗 Top liens cliqués", params.topLinks.map(l => ({ label: l.target.slice(0, 60), value: l.clicks, accent: "#C9A84C" })))}
    ${topTable("📄 Top pages", params.topPages.map(p => ({ label: p.title, value: p.views, accent: "#39FF8F" })))}
    ${emailButton("Voir le dashboard complet →", `${appUrl}/dashboard/analytics`)}
  `

  const footer = `Vous recevez ce rapport car vous êtes abonné aux notifications QRowg.<br><a href="${params.unsubUrl}" style="color:#8A8478;text-decoration:underline;">Se désabonner</a> · <a href="${appUrl}/dashboard/settings" style="color:#8A8478;text-decoration:underline;">Gérer les notifications</a>`

  return emailShell({ preheader: `Vos performances QRowg · ${esc(params.period)}`, content, footer })
}

// Nom de cette tâche dans le journal (lib/journalCron) : sans trace, personne ne
// pouvait dire si elle s'exécutait.
const TACHE = "reports/send" as const

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

  const debut = Date.now()
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
      await noterPassage(supabase, TACHE, "rien", "aucun abonnement actif", Date.now() - debut)
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
            from:    EMAIL_FROM,
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

    await noterPassage(supabase, TACHE, errors.length ? "erreur" : sent > 0 ? "ok" : "rien", errors.join(" · ") || `${sent} envoyé(s)`, Date.now() - debut)
    return NextResponse.json({ sent, total: due.length, errors })
  } catch (err: any) {
    // Une tâche qui plante ne laissait AUCUNE trace : c'est justement le cas
    // qu'on veut voir dans le journal.
    await noterPassage(createAdminClient(), TACHE, "erreur", err?.message ?? "erreur inconnue", Date.now() - debut)
    return serverError("reports/send", err)
  }
}
