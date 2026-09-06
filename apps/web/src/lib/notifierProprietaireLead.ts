// ─────────────────────────────────────────────────────────────────────────────
// PRÉVENIR LE PROPRIÉTAIRE D'UN NOUVEAU MESSAGE — côté serveur uniquement.
//
// Cette logique vivait dans /api/emails/new-lead, une route ANONYME que le
// navigateur appelait après l'enregistrement du lead. Lu dans le code le
// 4 septembre : n'importe qui pouvait l'appeler directement, sans lead réel,
// avec un contenu libre et sans borne — un relais d'e-mails ouvert, depuis
// @qrowg.com, vers le propriétaire de n'importe quelle page.
//
// Désormais c'est /api/leads qui appelle ceci, APRÈS l'insertion réussie, avec
// les champs déjà bornés. La route publique n'existe plus.
// ─────────────────────────────────────────────────────────────────────────────
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailButton } from "@/lib/emailLayout"

const TYPE_LABELS: Record<string, string> = {
  quote: "Demande de devis", reservation: "Réservation", booking: "Réservation événement",
  register: "Inscription événement", rsvp: "Réponse RSVP", form: "Nouveau message",
}


export type LeadPourEmail = {
  pageId: string
  type?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  data?: Record<string, unknown> | null
}

/** Borne les champs libres avant de les mettre dans un e-mail (défense en profondeur). */
export function bornerLead(l: LeadPourEmail): LeadPourEmail {
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null)
  const data: Record<string, unknown> = {}
  if (l.data && typeof l.data === "object") {
    for (const [k, v] of Object.entries(l.data).slice(0, 30)) {
      if (!Object.hasOwn(l.data, k)) continue
      data[k.slice(0, 60)] = typeof v === "string" ? v.slice(0, 500) : v == null ? "" : String(v).slice(0, 500)
    }
  }
  return { pageId: l.pageId, type: s(l.type, 40), name: s(l.name, 200), email: s(l.email, 200), phone: s(l.phone, 60), message: s(l.message, 3000), data }
}

export async function notifierProprietaireLead(brut: LeadPourEmail): Promise<{ envoye: boolean; raison?: string; id?: string }> {
  const { pageId, type, name, email, phone, message, data } = bornerLead(brut)
  try {
    const admin = createAdminClient()

    // Propriétaire de la page + préférences
    const { data: page } = await admin
      .from("pages")
      .select("title, user_id")
      .eq("id", pageId)
      .single()
    if (!page) return { envoye: false, raison: "page introuvable" }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, preferences")
      .eq("id", page.user_id)
      .single()

    const to = profile?.email
    if (!to) return { envoye: false, raison: "pas de destinataire" }
    // Respecte l'opt-out si défini
    if (profile?.preferences?.email_leads === false) return { envoye: false, raison: "opt-out" }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return { envoye: false, raison: "Resend non configuré" }
    const resend = new Resend(apiKey)

    const label = (type && Object.hasOwn(TYPE_LABELS, type) ? TYPE_LABELS[type] : null) || "Nouveau message"
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
    if (error) return { envoye: false, raison: String((error as any)?.message || error) }
    return { envoye: true, id: sent?.id }
  } catch (e) {
    return { envoye: false, raison: e instanceof Error ? e.message : "erreur" }
  }
}
