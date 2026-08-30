// premierScan.ts — L'interrupteur « Alertes de scans » de l'écran Réglages est allumé
// par défaut et promet un email quand le QR code est scanné. Rien ne l'envoyait :
// la fonction cliente existait (lib/emails.ts), personne ne l'appelait, et la route
// qu'elle visait exigeait un jeton interne qu'un navigateur n'a pas.
//
// Ce qu'on envoie, c'est le PREMIER scan de chaque page, pas chaque scan. Le
// commerçant colle son support et attend de savoir qu'il fonctionne ; au dixième
// scan le même email n'est plus qu'une notification de plus.

import { escapeHtml } from "./escapeHtml"
import { emailShell, emailH1, emailP, emailButton } from "./emailLayout"

// La source posée sur la visite quand elle vient d'un QR code (voir detectTrafficSource).
export const SOURCE_SCAN = "qr_scan"

export function estUnScan(source: string | null | undefined): boolean {
  return source === SOURCE_SCAN
}

// Opt-out : une préférence absente vaut « activée », puisque l'interrupteur est
// allumé par défaut dans l'écran Réglages. Ne jamais inverser cette lecture.
export function alerteActivee(preferences: unknown): boolean {
  if (!preferences || typeof preferences !== "object") return true
  return (preferences as Record<string, unknown>).scan_alert !== false
}

// Deux scans simultanés ne doivent pas donner deux emails. On ne prévient que si la
// ligne qu'on vient d'écrire est bien la plus ancienne visite-scan de la page : les
// deux requêtes concurrentes lisent la même « plus ancienne », une seule se reconnaît.
export function estLaPremiere(idEcrit: string | null | undefined, idLePlusAncien: string | null | undefined): boolean {
  return !!idEcrit && !!idLePlusAncien && idEcrit === idLePlusAncien
}

export const SUJET_PREMIER_SCAN = "Votre premier scan sur QRowg"

export function contenuPremierScan(opts: { nom?: string | null; titrePage?: string | null }): string {
  const nom = String(opts.nom ?? "").trim()
  const salut = nom ? `Bonjour ${escapeHtml(nom)},` : "Bonjour,"
  const titre = String(opts.titrePage ?? "").trim()
  const page = titre
    ? `<strong style="color:#F5F0E8;">&laquo;&nbsp;${escapeHtml(titre)}&nbsp;&raquo;</strong>`
    : "votre page"
  return `
      <div style="display:inline-block;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:5px 14px;color:#C9A84C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:18px;">Premier scan</div>
      ${emailH1("On vient de scanner votre QR code")}
      ${emailP(salut)}
      ${emailP(`Quelqu'un a scanné ${page} pour la première fois. Votre support fonctionne : à partir de maintenant, chaque scan est compté.`, 28)}
      ${emailButton("Voir mes statistiques →", "https://qrowg.com/dashboard/analytics")}
  `
}

export function emailPremierScan(opts: { nom?: string | null; titrePage?: string | null }): string {
  return emailShell({
    preheader: "Votre QR code vient d'être scanné pour la première fois.",
    content: contenuPremierScan(opts),
  })
}
