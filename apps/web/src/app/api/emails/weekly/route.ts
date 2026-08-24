import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { semaineEcoulee, resumeSemaine, nombre } from "@/lib/weeklyReport"

// Carte de statistique (nombre dore + libelle). Cellule d'une rangee a 2 colonnes.
function statCard(value: string, label: string, side: "left" | "right"): string {
  const pad = side === "left" ? "0 6px 0 0" : "0 0 0 6px"
  return `<td width="50%" valign="top" style="padding:${pad};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:12px;"><tr><td align="center" style="padding:20px 12px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#C9A84C;line-height:1;">${value}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:1px;margin-top:7px;">${label}</div>
    </td></tr></table>
  </td>`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 })
    const resend = new Resend(apiKey)

    // Verifier secret (fail-closed) — accepté via header Authorization: Bearer,
    // query ?secret= (pattern des autres crons) OU body (compat). Vercel Cron
    // ne peut poser que header/query, d'où la souplesse.
    const CRON = process.env.CRON_SECRET ?? ""
    const auth = req.headers.get("authorization")
    const qsecret = req.nextUrl.searchParams.get("secret")
    const body = await req.json().catch(() => ({} as any))
    const bsecret = body?.secret
    if (CRON === "" || (auth !== `Bearer ${CRON}` && qsecret !== CRON && bsecret !== CRON)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    // Client SERVICE-ROLE : sans session, un client RLS lirait 0 profil (l'email
    // hebdo n'était donc jamais envoyé). L'admin lit bien tous les profils actifs.
    const supabase = createAdminClient()

    // Recuperer tous les users actifs
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, total_scans, total_pages, preferences")
      .gt("total_pages", 0)

    if (!profiles?.length) return NextResponse.json({ sent: 0 })

    const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    // Un rapport de période doit parler de la période : on borne les sept derniers jours.
    const { debutIso, libelle: periode } = semaineEcoulee(new Date())

    let sent = 0
    for (const profile of profiles) {
      // Respecte la préférence utilisateur (opt-out) : rapport hebdo désactivé.
      if ((profile as any).preferences?.weekly_report === false) continue
      const clean = profile.full_name && String(profile.full_name).trim() ? escapeHtml(String(profile.full_name).trim()) : ""
      const greeting = clean ? `Bonjour ${clean},` : "Bonjour,"
      // Activité RÉELLE de la semaine, page par page. Sans cela l'email répétait
      // les cumuls de toujours et n'apprenait rien à personne.
      let vuesSemaine = 0, scansSemaine = 0
      try {
        const { data: pagesUser } = await supabase.from("pages").select("id").eq("user_id", profile.id)
        const ids = (pagesUser ?? []).map((p: any) => p.id)
        if (ids.length) {
          const [{ count: v }, { count: sc }] = await Promise.all([
            supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", debutIso),
            supabase.from("scans").select("id", { count: "exact", head: true }).in("page_id", ids).gte("created_at", debutIso),
          ])
          vuesSemaine = v ?? 0
          scansSemaine = sc ?? 0
        }
      } catch { /* un comptage raté ne doit pas priver la personne de son email */ }

      const resume = resumeSemaine({ vues: vuesSemaine, scans: scansSemaine, scansTotal: profile.total_scans ?? 0 })
      const scans = nombre(scansSemaine)
      const pages = nombre(vuesSemaine)

      const content = `
        ${emailH1(resume.titre)}
        ${emailP(greeting)}
        ${emailP(`${resume.phrase} <span style="color:#6E6A60;">(${periode})</span>`, 22)}
        ${resume.creux ? "" : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;"><tr>
          ${statCard(scans, "Scans cette semaine", "left")}
          ${statCard(pages, "Visites cette semaine", "right")}
        </tr></table>`}
        ${emailP(`Depuis le début : <strong style="color:#F5F0E8;">${nombre(profile.total_scans ?? 0)}</strong> scan${(profile.total_scans ?? 0) > 1 ? "s" : ""} au total.`, 26)}
        ${emailButton("Voir mes statistiques →", "https://qrowg.com/dashboard/analytics")}
      `

      await resend.emails.send({
        from: EMAIL_FROM,
        to: profile.email,
        subject: resume.creux ? `Semaine calme sur QRowg — ${dateLabel}` : `${scans} scan${scansSemaine > 1 ? "s" : ""} cette semaine — QRowg`,
        html: emailShell({ preheader: "Votre activité QRowg en un coup d'œil.", content }),
      })
      sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
