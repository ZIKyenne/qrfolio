// accuseReceptionLead — l'e-mail « nous avons bien reçu votre demande » envoyé au
// visiteur qui laisse son adresse sur une page.
//
// Avant : une route publique /api/emails/lead-confirmation prenait `email` et
// `name` dans le corps de la requête. Elle exigeait bien qu'un lead récent porte
// cet e-mail, mais n'importe qui pouvait déposer un lead avec l'adresse d'un
// tiers, puis lui faire parvenir « Merci <texte libre> » depuis @qrowg.com.
//
// Maintenant : l'envoi part de /api/leads lui-même, après l'insertion, avec les
// champs BORNÉS du lead enregistré — et seulement si le propriétaire de la page
// n'a pas désactivé l'accusé de réception (preferences.lead_confirmation).

import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell } from "@/lib/emailLayout"

const TYPE_INTRO: Record<string, string> = {
  quote: "Votre demande de devis a bien été reçue.",
  reservation: "Votre demande de réservation a bien été reçue.",
  booking: "Votre demande de réservation a bien été reçue.",
  register: "Votre inscription a bien été enregistrée.",
  rsvp: "Votre réponse a bien été enregistrée.",
  form: "Votre message a bien été reçu.",
}

export const estEmail = (s: string | null | undefined): s is string => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "")

// Un prénom, pas une phrase : 60 caractères, sans retour à la ligne ni balise.
export function prenomAffichable(name: string | null | undefined): string {
  const n = (name || "").replace(/[\r\n<>]/g, " ").trim().slice(0, 60)
  return n
}

export type AccuseInput = { pageId: string; email: string | null; name: string | null; type: string }
export type AccuseResultat = { envoye: boolean; raison?: string }

export function accuseActive(preferences: unknown): boolean {
  return (preferences as { lead_confirmation?: unknown } | null)?.lead_confirmation !== false
}

export async function envoyerAccuseReception(lead: AccuseInput): Promise<AccuseResultat> {
  if (!estEmail(lead.email)) return { envoye: false, raison: "pas d'e-mail" }
  const admin = createAdminClient()
  const { data: page } = await admin.from("pages").select("title, user_id").eq("id", lead.pageId).maybeSingle()
  if (!page) return { envoye: false, raison: "page introuvable" }

  const { data: profile } = await admin.from("profiles").select("email, full_name, preferences").eq("id", page.user_id).maybeSingle()
  if (!accuseActive(profile?.preferences)) return { envoye: false, raison: "opt-out" }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { envoye: false, raison: "RESEND_API_KEY absente" }

  const sender = page.title || profile?.full_name || "QRowg"
  const replyTo = estEmail(profile?.email) ? profile!.email! : undefined
  const prenom = prenomAffichable(lead.name)
  const intro = Object.hasOwn(TYPE_INTRO, lead.type) ? TYPE_INTRO[lead.type] : TYPE_INTRO.form

  const content = `
      <div style="text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(57,255,143,0.12);border:1px solid rgba(57,255,143,0.35);font-size:28px;line-height:56px;text-align:center;margin-bottom:18px;">✅</div>
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#F5F0E8;margin:0 0 12px;">Merci${prenom ? ` ${esc(prenom)}` : ""} !</h1>
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

  const { error } = await new Resend(apiKey).emails.send({
    from: EMAIL_FROM,
    to: lead.email,
    replyTo,
    subject: `Nous avons bien reçu votre demande — ${sender}`,
    html,
  })
  if (error) return { envoye: false, raison: "envoi refusé" }
  return { envoye: true }
}
