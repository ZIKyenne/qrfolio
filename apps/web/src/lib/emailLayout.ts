// =============================================================================
// lib/emailLayout.ts — Coquille "bulletproof" partagée pour les emails QRowg.
// Tables + styles 100% inline (Gmail & co strippent le <style>). Palette unique
// noir/or/creme. Rendu identique Gmail / Outlook / Apple Mail / mobile / PC.
// Les valeurs dynamiques (nom, etc.) doivent etre echappees par l'appelant.
// =============================================================================

const APP = "https://qrowg.com"
const GOLD = "#C9A84C"

// En-tete : logo capsule "QR"+"owg" par defaut, ou un nom de marque (deja echappe)
// en serif dore (utilise par l'email de confirmation, envoye "de la part" du pro).
function brandHeader(brandName?: string): string {
  if (brandName) {
    return `<a href="${APP}" style="text-decoration:none;color:#F5F0E8;font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;">${brandName}</a>`
  }
  return `<a href="${APP}" style="text-decoration:none;"><span style="display:inline-block;background:${GOLD};color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:19px;line-height:1;padding:7px 9px;border-radius:8px;">QR</span><span style="color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:23px;">&nbsp;owg</span></a>`
}

// Bouton dore "bulletproof" (table + bgcolor -> rendu correct meme sur Outlook), centre.
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="${GOLD}" style="border-radius:12px;">
        <a href="${href}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0A0A0A;text-decoration:none;border-radius:12px;">${label}</a>
      </td></tr></table>
  </td></tr></table>`
}

// Titre + paragraphe reutilisables (styles coherents)
export const emailH1 = (txt: string) =>
  `<h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:700;color:#F5F0E8;line-height:1.18;">${txt}</h1>`
export const emailP = (html: string, mb = 18) =>
  `<p style="margin:0 0 ${mb}px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#B8B2A4;">${html}</p>`

// Coquille complete : header + contenu (deja stylise) + footer.
export function emailShell(opts: {
  preheader?: string
  brandName?: string   // si defini : header = ce nom (deja echappe) ; sinon capsule QRowg
  content: string      // HTML interne, deja stylise
  footer?: string      // HTML interne du footer ; defaut = lien "Gerer les notifications"
}): string {
  const { preheader = "", brandName, content } = opts
  const footer = opts.footer ?? `QRowg · <a href="${APP}/dashboard/settings" style="color:#8A8478;text-decoration:underline;">Gérer les notifications</a>`
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<style>@media (max-width:600px){.px{padding-left:24px!important;padding-right:24px!important}.wrap{width:100%!important}}</style>
</head>
<body style="margin:0;padding:0;background:#080808;">
<div style="display:none;font-size:1px;color:#080808;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080808;"><tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#0C0B08;border:1px solid rgba(201,168,76,0.14);border-radius:16px;">
    <tr><td align="center" class="px" style="padding:32px 40px 24px;border-bottom:1px solid rgba(201,168,76,0.14);">${brandHeader(brandName)}</td></tr>
    <tr><td class="px" style="padding:34px 40px;">${content}</td></tr>
    <tr><td align="center" class="px" style="padding:22px 40px 30px;border-top:1px solid rgba(255,255,255,0.06);"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6E6A60;">${footer}</p></td></tr>
  </table>
</td></tr></table>
</body></html>`
}
