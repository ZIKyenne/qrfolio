import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell } from "@/lib/emailLayout"
import { rateLimit, ipOf } from "@/lib/rateLimit"

const TYPE_INTRO: Record<string, string> = {
  quote: "Votre demande de devis a bien été reçue.",
  reservation: "Votre demande de réservation a bien été reçue.",
  booking: "Votre demande de réservation a bien été reçue.",
  register: "Votre inscription a bien été enregistrée.",
  rsvp: "Votre réponse a bien été enregistrée.",
  form: "Votre message a bien été reçu.",
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "")
}

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimit("lead-confirm:" + ipOf(req), 10, 600_000))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 })
    const { pageId, email, name, type } = await req.json()
    if (!pageId || !isEmail(email)) return NextResponse.json({ error: "Paramètres invalides" }, { status: 200 })

    const admin = createAdminClient()
    const { data: page } = await admin.from("pages").select("title, user_id").eq("id", pageId).single()
    if (!page) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

    // Anti-relais : n'envoie l'accusé que si un vrai lead vient d'être créé pour
    // ce (pageId, email). Empêche l'envoi d'emails à des adresses arbitraires.
    const { data: recentLead } = await admin.from("leads").select("id")
      .eq("page_id", pageId).eq("email", email)
      .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
      .limit(1).maybeSingle()
    if (!recentLead) return NextResponse.json({ success: true, skipped: true })

    const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", page.user_id).single()
    const replyTo = profile?.email
    const sender = page.title || profile?.full_name || "QRowg"

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 })
    const resend = new Resend(apiKey)

    const intro = TYPE_INTRO[type] || TYPE_INTRO.form

    const content = `
      <div style="text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(57,255,143,0.12);border:1px solid rgba(57,255,143,0.35);font-size:28px;line-height:56px;text-align:center;margin-bottom:18px;">✅</div>
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#F5F0E8;margin:0 0 12px;">Merci${name ? ` ${esc(name)}` : ""} !</h1>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#B8B2A4;margin:0 0 6px;">${intro}</p>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#B8B2A4;margin:0 0 20px;">Nous revenons vers vous dans les plus brefs délais.</p>
        <div style="height:1px;background:rgba(201,168,76,0.2);margin:0 auto 20px;max-width:120px;line-height:1px;font-size:0;">&nbsp;</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8A8478;margin:0;">Cet e-mail confirme la bonne réception de votre demande auprès de <strong style="color:#F5F0E8;">${esc(sender)}</strong>.${replyTo ? " Vous pouvez répondre directement à cet e-mail." : ""}</p>
      </div>`
    const html = emailShell({
      preheader: "Nous avons bien reçu votre demande.",
      brandName: esc(sender),
      content,
      footer: `Propulsé par <a href="https://qrowg.com" style="color:#8A8478;text-decoration:underline;">QRowg</a>`,
    })

    const { data: sent, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: replyTo || undefined,
      subject: `Nous avons bien reçu votre demande — ${sender}`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, id: sent?.id })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
