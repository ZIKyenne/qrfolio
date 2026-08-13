// app/api/cron/dynamic-expiry/route.ts
// Alerte email « votre QR dynamique gratuit expire bientôt » — prévient le PROPRIÉTAIRE
// avant que son essai gratuit (30 j par lien) ne coupe la redirection du QR imprimé.
// Appelé par cron (Vercel Cron / pg_cron). Protégé par CRON_SECRET (fail-closed).
//
// Dédup : colonne `instant_qrs.expiry_alert_stage` (text : "d3" / "d1"), tolérante si absente.
//   SQL : alter table instant_qrs add column if not exists expiry_alert_stage text;
// Cœur de décision pur & testé : lib/dynamicExpiry (daysUntil / expiryAlertStage).

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { escapeHtml } from "@/lib/escapeHtml"
import { daysUntil, expiryAlertStage, expiryHorizonIso } from "@/lib/dynamicExpiry"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

function expiryHtml(name: string, label: string, daysLeft: number, appUrl: string): string {
  const safeName = name ? escapeHtml(String(name).trim()) : ""
  const greeting = safeName ? `Bonjour ${safeName},` : "Bonjour,"
  const when = daysLeft <= 1 ? "demain" : `dans ${daysLeft} jours`
  const which = label ? ` « ${escapeHtml(label)} »` : ""
  const content = `
    ${emailH1(`Votre QR dynamique gratuit expire ${when}`)}
    ${emailP(greeting)}
    ${emailP(`Votre essai gratuit de QR dynamique${which} arrive à échéance. Passé ce délai, ce QR <strong style="color:#F5F0E8;">cessera de rediriger</strong> : le support déjà imprimé ne fonctionnera plus.`)}
    ${emailP(`Pour qu'il reste actif (redirection modifiable + suivi des scans), passez à un abonnement QR Dynamique.`, 24)}
    ${emailButton("Garder mon QR actif →", `${appUrl}/dashboard/qr-dynamique`)}
  `
  return emailShell({ preheader: `Votre QR dynamique gratuit expire ${when}.`, content })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const secret = req.nextUrl.searchParams.get("secret")
  // Fail-closed : sans CRON_SECRET configuré, ou sans preuve valide, on refuse.
  if (CRON_SECRET === "" || (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: "Service email non configuré", sent: 0 }, { status: 503 })

  try {
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
    const now = new Date()
    const horizon = expiryHorizonIso(now)

    // QR dynamiques gratuits actifs proches de l'échéance. On tente d'inclure la colonne
    // de dédup ; si elle n'existe pas encore, on retombe sur une requête sans elle.
    const base = "id, user_id, label, expires_at, status, dynamic"
    const filtered = (q: any) => q
      .eq("dynamic", true).eq("status", "active")
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", horizon)
    let rows: any[] = []
    try {
      const { data, error } = await filtered(supabase.from("instant_qrs").select(`${base}, expiry_alert_stage`))
      if (error) throw error
      rows = data ?? []
    } catch {
      const { data } = await filtered(supabase.from("instant_qrs").select(base))
      rows = data ?? []
    }

    let sent = 0
    const errors: string[] = []

    for (const qr of rows) {
      try {
        const daysLeft = daysUntil(qr.expires_at, now)
        const stage = expiryAlertStage(daysLeft)
        if (!stage || daysLeft == null) continue
        if (qr.expiry_alert_stage === stage) continue // ce palier a déjà été notifié pour ce QR

        const { data: prof } = await supabase
          .from("profiles").select("email, full_name").eq("id", qr.user_id).single()
        const email = (prof as any)?.email
        if (!email) continue

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [email],
            subject: daysLeft <= 1 ? "⏳ Votre QR dynamique expire demain — QRowg" : "⏳ Votre QR dynamique gratuit expire bientôt — QRowg",
            html: expiryHtml((prof as any)?.full_name ?? "", qr.label ?? "", daysLeft, appUrl),
          }),
        })
        if (!res.ok) throw new Error(await res.text())

        // Marque le palier notifié (tolérant si la colonne n'existe pas encore).
        try { await supabase.from("instant_qrs").update({ expiry_alert_stage: stage } as any).eq("id", qr.id) } catch { /* colonne absente */ }
        sent++
      } catch (e: any) {
        errors.push(`${qr.id}: ${e?.message ?? "err"}`)
      }
    }

    return NextResponse.json({ sent, total: rows.length, errors: errors.length ? errors : undefined })
  } catch (e: any) {
    return serverError("cron/dynamic-expiry", e)
  }
}
