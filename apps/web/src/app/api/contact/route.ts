import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell, emailH1 } from "@/lib/emailLayout"

// Anti-spam simple: max 3 messages par IP par heure
const ipCache = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipCache.get(ip)
  if (!entry || now > entry.reset) {
    ipCache.set(ip, { count: 1, reset: now + 3600_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"

    // Rate limiting
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de messages envoyés. Veuillez réessayer plus tard." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { name, email, subject, message } = body

    // Validation serveur
    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: "Nom invalide." }, { status: 400 })
    }
    if (!email?.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 })
    }
    if (!subject?.trim() || subject.trim().length < 3) {
      return NextResponse.json({ error: "Sujet trop court." }, { status: 400 })
    }
    if (!message?.trim() || message.trim().length < 10) {
      return NextResponse.json({ error: "Message trop court (min. 10 caractères)." }, { status: 400 })
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Message trop long (max. 2000 caractères)." }, { status: 400 })
    }

    // Honeypot anti-bot (champ caché)
    if (body.website) {
      return NextResponse.json({ success: true }) // Silently drop
    }

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()

    // 1) Notification email vers l'inbox support (canal principal). Destinataire
    //    configurable via CONTACT_EMAIL (Vercel) ; replyTo = l'expediteur pour
    //    repondre directement. Tout est echappe (esc) : injection HTML impossible.
    const to = process.env.CONTACT_EMAIL
    const apiKey = process.env.RESEND_API_KEY
    if (to && apiKey) {
      try {
        const content = `
          <div style="display:inline-block;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:5px 14px;color:#C9A84C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">Formulaire de contact</div>
          ${emailH1("Nouveau message de contact")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;margin:0 0 18px;">
            <tr><td style="color:#8A8478;padding:4px 0;">Nom</td><td style="color:#F5F0E8;text-align:right;font-weight:600;">${esc(cleanName)}</td></tr>
            <tr><td style="color:#8A8478;padding:4px 0;">Email</td><td style="text-align:right;"><a href="mailto:${esc(cleanEmail)}" style="color:#C9A84C;font-weight:600;text-decoration:none;">${esc(cleanEmail)}</a></td></tr>
            <tr><td style="color:#8A8478;padding:4px 0;">Sujet</td><td style="color:#F5F0E8;text-align:right;font-weight:500;">${esc(cleanSubject)}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
            <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#F5F0E8;line-height:1.6;white-space:pre-wrap;">${esc(cleanMessage)}</td></tr>
          </table>`
        await new Resend(apiKey).emails.send({
          from: EMAIL_FROM,
          to,
          replyTo: cleanEmail,
          subject: `[Contact] ${cleanSubject}`.slice(0, 120),
          html: emailShell({ preheader: `Message de ${cleanName}`, content }),
        })
      } catch (e) {
        console.error("Contact email error:", (e as any)?.message)
      }
    } else {
      console.warn("Contact: CONTACT_EMAIL ou RESEND_API_KEY absent -> notification non envoyée")
    }

    // 2) Archivage best-effort (si la table contact_messages existe un jour).
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.from("contact_messages").insert({
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        ip_hash: ip.slice(0, 8) + "****", // Anonymisation partielle
      })
      if (error) console.error("Contact insert error:", error.message)
    } catch (e) {
      console.error("Contact insert exception:", (e as any)?.message)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
