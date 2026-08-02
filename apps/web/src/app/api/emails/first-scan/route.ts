import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { hasInternalToken } from "@/lib/rateLimit"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    if (!hasInternalToken(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 })
    const resend = new Resend(apiKey)

    const { email, name, page_title } = await req.json()
    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 })

    // Respecte la préférence utilisateur (opt-out) : alerte de scan désactivée.
    const { data: prof } = await createAdminClient()
      .from("profiles").select("preferences").eq("email", email).maybeSingle()
    if ((prof as any)?.preferences?.scan_alert === false) {
      return NextResponse.json({ skipped: true })
    }

    const clean = name && String(name).trim() ? escapeHtml(String(name).trim()) : ""
    const greeting = clean ? `Bonjour ${clean},` : "Bonjour,"
    const pt = page_title ? `<strong style="color:#F5F0E8;">« ${escapeHtml(page_title)} »</strong>` : "votre page"

    const content = `
      <div style="display:inline-block;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:5px 14px;color:#C9A84C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:18px;">Premier scan</div>
      ${emailH1("Votre tout premier scan")}
      ${emailP(greeting)}
      ${emailP(`Quelqu'un vient de scanner le QR code de ${pt}. Votre suivi démarre : chaque scan est désormais comptabilisé dans vos statistiques.`, 28)}
      ${emailButton("Voir mes statistiques →", "https://qrowg.com/dashboard/analytics")}
    `

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Votre premier scan sur QRowg",
      html: emailShell({ preheader: "Votre QR code vient d'être scanné pour la première fois.", content }),
    })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
