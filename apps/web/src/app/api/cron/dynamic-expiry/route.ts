// app/api/cron/dynamic-expiry/route.ts
// Alerte email « votre QR modifiable expire bientôt » — prévient le PROPRIÉTAIRE
// avant qu'une expiration QU'IL A PROGRAMMÉE ne coupe la redirection du QR imprimé.
//
// Il n'y a plus d'essai de 30 jours : un QR n'expire que si son propriétaire a posé
// une date (capacité « sécurité du lien », plan Pro et au-dessus). L'alerte reste
// utile — on oublie une date posée trois mois plus tôt sur un support déjà collé.
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
import { noterPassage, sansAdresses } from "@/lib/journalCron"
import { gardeCron } from "@/lib/gardeCron"


function expiryHtml(name: string, label: string, daysLeft: number, appUrl: string): string {
  const safeName = name ? escapeHtml(String(name).trim()) : ""
  const greeting = safeName ? `Bonjour ${safeName},` : "Bonjour,"
  const when = daysLeft <= 1 ? "demain" : `dans ${daysLeft} jours`
  const which = label ? ` « ${escapeHtml(label)} »` : ""
  const content = `
    ${emailH1(`Votre QR modifiable expire ${when}`)}
    ${emailP(greeting)}
    ${emailP(`L'expiration que vous avez programmée sur ce QR${which} arrive à échéance. Passé ce délai, il <strong style="color:#F5F0E8;">cessera de rediriger</strong> : le support déjà imprimé ne fonctionnera plus.`)}
    ${emailP(`Si ce n'est pas ce que vous voulez, retirez la date d'expiration — le QR restera actif.`, 24)}
    ${emailButton("Voir mes QR codes →", `${appUrl}/dashboard/qr-link`)}
  `
  return emailShell({ preheader: `Votre QR modifiable expire ${when}.`, content })
}

// Nom de cette tâche dans le journal (lib/journalCron) : sans trace, personne ne
// pouvait dire si elle s'exécutait.
const TACHE = "cron/dynamic-expiry" as const

export async function GET(req: NextRequest) {
  // Contrôle d'entrée commun aux cinq tâches (lib/gardeCron) : un refus laisse
  // une trace dans le journal.
  const refus = await gardeCron(req, TACHE, { resendRequis: true })
  if (refus) return refus
  const resendKey = process.env.RESEND_API_KEY as string

  const debut = Date.now()
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

    await noterPassage(supabase, TACHE, errors.length ? "erreur" : sent > 0 ? "ok" : "rien", sansAdresses(errors.join(" · ")) || `${sent} envoyé(s)`, Date.now() - debut)
    return NextResponse.json({ sent, total: rows.length, errors: errors.length ? errors : undefined })
  } catch (e: any) {
    // Une tâche qui plante ne laissait AUCUNE trace : c'est justement le cas
    // qu'on veut voir dans le journal.
    await noterPassage(createAdminClient(), TACHE, "erreur", e?.message ?? "erreur inconnue", Date.now() - debut)
    return serverError("cron/dynamic-expiry", e)
  }
}
