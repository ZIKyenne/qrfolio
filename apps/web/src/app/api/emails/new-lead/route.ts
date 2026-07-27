import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailButton } from "@/lib/emailLayout"
import { rateLimit, ipOf } from "@/lib/rateLimit"

const TYPE_LABELS: Record<string, string> = {
  quote: "Demande de devis", reservation: "Réservation", booking: "Réservation événement",
  register: "Inscription événement", rsvp: "Réponse RSVP", form: "Nouveau message",
}

export async function POST(req: NextRequest) {
  try {
    // Route appelée par des visiteurs anonymes (soumission de lead) -> rate-limit.
    if (!(await rateLimit("new-lead:" + ipOf(req), 10, 600_000))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 })
    const { pageId, type, name, email, phone, message, data } = await req.json()
    if (!pageId) return NextResponse.json({ error: "pageId requis" }, { status: 400 })

    const admin = createAdminClient()

    // Propriétaire de la page + préférences
    const { data: page } = await admin
      .from("pages")
      .select("title, user_id")
      .eq("id", pageId)
      .single()
    if (!page) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, preferences")
      .eq("id", page.user_id)
      .single()

    const to = profile?.email
    if (!to) return NextResponse.json({ error: "Pas d'email destinataire" }, { status: 200 })
    // Respecte l'opt-out si défini
    if (profile?.preferences?.email_leads === false) return NextResponse.json({ success: true, skipped: true })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 })
    const resend = new Resend(apiKey)

    const label = TYPE_LABELS[type] || "Nouveau message"
    const rows: string[] = []
    if (name) rows.push(`<tr><td style="color:#8A8478;padding:4px 0">Nom</td><td style="color:#F5F0E8;text-align:right;font-weight:600">${esc(name)}</td></tr>`)
    if (email) rows.push(`<tr><td style="color:#8A8478;padding:4px 0">Email</td><td style="text-align:right"><a href="mailto:${esc(email)}" style="color:#C9A84C;font-weight:600">${esc(email)}</a></td></tr>`)
    if (phone) rows.push(`<tr><td style="color:#8A8478;padding:4px 0">Téléphone</td><td style="text-align:right"><a href="tel:${esc(phone)}" style="color:#C9A84C;font-weight:600">${esc(phone)}</a></td></tr>`)
    Object.entries(data || {}).forEach(([k, v]) => {
      if (["nom", "email", "telephone"].includes(k.toLowerCase())) return
      rows.push(`<tr><td style="color:#8A8478;padding:4px 0">${esc(k)}</td><td style="color:#F5F0E8;text-align:right;font-weight:500">${esc(String(v))}</td></tr>`)
    })

    const content = `
      <div style="display:inline-block;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:5px 14px;color:#C9A84C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">${esc(label)}</div>
      ${emailH1("Nouveau message reçu")}
      <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#8A8478;">Depuis votre page <strong style="color:#B8B2A4;">« ${esc(page.title)} »</strong></p>
      ${message ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;margin:0 0 18px;"><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#F5F0E8;line-height:1.6;white-space:pre-wrap;">${esc(message)}</td></tr></table>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;margin:0 0 28px;">${rows.join("")}</table>
      ${emailButton("Voir dans mes messages →", "https://qrowg.com/dashboard/leads")}
    `
    const html = emailShell({ preheader: `${label} sur votre page « ${esc(page.title)} »`, content })

    const { data: sent, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: email || undefined,
      subject: `${label} — ${name || "nouveau contact"}`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, id: sent?.id })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
