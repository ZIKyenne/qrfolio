import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml } from "@/lib/escapeHtml"
import { hasInternalToken } from "@/lib/rateLimit"

// Email d'accueil — HTML "bulletproof" : layout en tables + styles 100% inline
// (Gmail & co strippent le <style> du <head>, donc on ne s'appuie JAMAIS dessus).
// Palette unique noir/or/creme. Le <style> ne sert que d'ameliorations (mobile).
const APP = "https://qrowg.com"

const STEPS: [string, string][] = [
  ["1", "Choisissez un modèle adapté à votre activité"],
  ["2", "Personnalisez votre page avec vos contenus"],
  ["3", "Générez votre QR code et partagez-le"],
]

const stepRows = STEPS.map(([n, txt], i) => `
              <tr>
                <td width="26" valign="top" style="padding:0 0 ${i === STEPS.length - 1 ? 0 : 14}px;">
                  <span style="display:inline-block;width:24px;height:24px;background:#C9A84C;color:#0A0A0A;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:12px;text-align:center;line-height:24px;">${n}</span>
                </td>
                <td valign="middle" style="padding:0 0 ${i === STEPS.length - 1 ? 0 : 14}px 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.45;color:#E4DED0;">${txt}</td>
              </tr>`).join("")

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Bienvenue sur QRowg</title>
<style>
  @media (max-width:600px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:26px!important}
    /* Outlook ignore les media queries et garde ses 600 px ; les clients mobiles
       les appliquent et le cadre s'adapte enfin à la largeur du téléphone. */
    .wrap{width:100%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#080808;">
<div style="display:none;font-size:1px;color:#080808;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Votre compte est prêt — créez votre première page en 5 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080808;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#0C0B08;border:1px solid rgba(201,168,76,0.14);border-radius:16px;">
        <!-- Header -->
        <tr>
          <td align="center" class="px" style="padding:34px 40px 26px;border-bottom:1px solid rgba(201,168,76,0.14);">
            <a href="${APP}" style="text-decoration:none;">
              <span style="display:inline-block;background:#C9A84C;color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:19px;line-height:1;padding:7px 9px;border-radius:8px;">QR</span><span style="color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:23px;">&nbsp;owg</span>
            </a>
          </td>
        </tr>
        <!-- Intro -->
        <tr>
          <td class="px" style="padding:38px 40px 6px;">
            <h1 class="h1" style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#F5F0E8;line-height:1.15;">Bienvenue chez QRowg</h1>
            <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#B8B2A4;">Bonjour<strong style="color:#F5F0E8;">{{name}}</strong>,</p>
            <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#B8B2A4;">Votre compte est prêt. En quelques minutes, créez votre page professionnelle, générez votre <strong style="color:#F5F0E8;">QR code dynamique</strong> et rassemblez tout votre univers derrière un seul lien.</p>
          </td>
        </tr>
        <!-- Steps box -->
        <tr>
          <td class="px" style="padding:0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:12px;">
              <tr>
                <td style="padding:22px 24px;">
                  <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;">3 étapes pour démarrer</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${stepRows}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td align="center" class="px" style="padding:32px 40px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#C9A84C" style="border-radius:12px;">
                  <a href="${APP}/dashboard/templates" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0A0A0A;text-decoration:none;border-radius:12px;">Créer ma première page&nbsp;→</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Reassurance -->
        <tr>
          <td class="px" style="padding:26px 40px 0;">
            <div style="height:1px;line-height:1px;font-size:0;background:rgba(201,168,76,0.16);margin:0 0 22px;">&nbsp;</div>
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#B8B2A4;">Une question&nbsp;? Répondez directement à cet email, nous sommes là pour vous aider.</p>
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#8A8478;">— L'équipe QRowg</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 40px 32px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6E6A60;">QRowg · Votre page, votre QR code, vos statistiques<br><a href="${APP}/dashboard/settings" style="color:#8A8478;text-decoration:underline;">Se désabonner</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

export async function POST(req: NextRequest) {
  try {
    // Route interne (appelée uniquement côté serveur au signup) : secret requis
    // pour empêcher le relais email ouvert (spam/phishing signé @qrowg.com).
    if (!hasInternalToken(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 })
    const resend = new Resend(apiKey)

    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 })

    // "Bonjour Prenom," si prenom fourni, sinon "Bonjour," (espace insecable inclus dans le strong)
    const clean = name && String(name).trim() ? escapeHtml(String(name).trim()) : ""
    const html = WELCOME_HTML.replace(/{{name}}/g, clean ? `&nbsp;${clean}` : "")

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Bienvenue sur QRowg !",
      html,
    })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
