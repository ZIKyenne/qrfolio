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
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { escapeHtml } from "@/lib/escapeHtml"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

// Alerte de quota, sur la coquille partagée (vouvoiement, nom échappé) — cohérente
// avec tous les autres emails transactionnels.
function alertHtml(name: string, views: number, limit: number, over: boolean, appUrl: string): string {
  const pct = Math.round((views / limit) * 100)
  const accent = over ? "#FF6B6B" : "#C9A84C"
  const safeName = name ? escapeHtml(String(name).trim()) : ""
  const greeting = safeName ? `Bonjour ${safeName},` : "Bonjour,"
  const content = `
    ${emailH1(over ? "Quota de vues atteint ce mois-ci" : "Vous approchez de votre quota de vues")}
    ${emailP(greeting)}
    ${emailP(`Vous en êtes à <strong style="color:${accent}">${views.toLocaleString("fr-FR")} / ${limit.toLocaleString("fr-FR")} vues</strong> (${pct} %) ce mois-ci.`)}
    ${emailP(`Pas d'inquiétude : <strong style="color:#39FF8F">vos QR codes et vos pages restent 100 % en ligne</strong>, rien n'est coupé. Passez à un plan supérieur pour augmenter votre quota et garder de la marge.`, 24)}
    ${emailButton("Augmenter mon quota →", `${appUrl}/upgrade`)}
  `
  return emailShell({ preheader: over ? "Votre quota de vues est atteint ce mois-ci." : "Vous approchez de votre quota de vues.", content })
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
            subject: threshold === "over" ? "⚠️ Quota de vues atteint — QRowg" : "📊 Vous approchez de votre quota de vues — QRowg",
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
