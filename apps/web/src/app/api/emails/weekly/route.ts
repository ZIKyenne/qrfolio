import { Resend } from "resend"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { semaineEcoulee, resumeSemaine, nombre } from "@/lib/weeklyReport"
import { noterPassage, sansAdresses } from "@/lib/journalCron"
import { gardeCron } from "@/lib/gardeCron"

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

// Vercel Cron appelle en GET. Cette route n'exportait que POST : planifiée telle
// quelle, elle aurait répondu 405 sans que rien ne le signale. Les deux verbes
// mènent au même traitement.
// Nom de cette tâche dans le journal (lib/journalCron) : sans trace, personne ne
// pouvait dire si elle s'exécutait.
const TACHE = "emails/weekly" as const

export async function GET(req: NextRequest) { return envoyer(req) }
export async function POST(req: NextRequest) { return envoyer(req) }

async function envoyer(req: NextRequest) {
  const debut = Date.now()
  // Contrôle d'entrée commun aux cinq tâches (lib/gardeCron) : un refus laisse
  // désormais une trace dans le journal. Sans elle, « jamais déclenchée » et
  // « déclenchée puis refusée faute de secret » étaient le même silence.
  const refus = await gardeCron(req, TACHE, { resendRequis: true })
  if (refus) return refus

  try {
    const resend = new Resend(process.env.RESEND_API_KEY as string)

    // Client SERVICE-ROLE : sans session, un client RLS lirait 0 profil (l'email
    // hebdo n'était donc jamais envoyé). L'admin lit bien tous les profils actifs.
    const supabase = createAdminClient()

    // Qui reçoit : ceux qui ont au moins une page. `profiles.total_pages` semblait
    // dire cela — la colonne vaut 0 pour tout le monde, y compris un compte à douze
    // pages : rien ne l'incrémente. Le rapport n'avait donc aucun destinataire.
    // On compte les pages réelles, une fois, et la boucle réutilise le résultat.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, total_scans, preferences")

    const { data: toutesLesPages } = await supabase.from("pages").select("id, user_id")
    const pagesDe = new Map<string, string[]>()
    for (const pg of (toutesLesPages ?? []) as { id: string; user_id: string }[]) {
      const liste = pagesDe.get(pg.user_id) ?? []
      liste.push(pg.id)
      pagesDe.set(pg.user_id, liste)
    }

    const destinataires = (profiles ?? []).filter(p => (pagesDe.get(p.id)?.length ?? 0) > 0)
    if (!destinataires.length) { await noterPassage(supabase, TACHE, "rien", "aucun destinataire", Date.now() - debut); return NextResponse.json({ sent: 0 }) }

    const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    // Un rapport de période doit parler de la période : on borne les sept derniers jours.
    const { debutIso, libelle: periode } = semaineEcoulee(new Date())

    let sent = 0
    const echecs: string[] = []
    for (const profile of destinataires) {
      // Respecte la préférence utilisateur (opt-out) : rapport hebdo désactivé.
      if ((profile as any).preferences?.weekly_report === false) continue
      const clean = profile.full_name && String(profile.full_name).trim() ? escapeHtml(String(profile.full_name).trim()) : ""
      const greeting = clean ? `Bonjour ${clean},` : "Bonjour,"
      // Activité RÉELLE de la semaine, page par page. Sans cela l'email répétait
      // les cumuls de toujours et n'apprenait rien à personne.
      let vuesSemaine = 0, scansSemaine = 0
      try {
        const ids = pagesDe.get(profile.id) ?? []
        if (ids.length) {
          const [{ count: v }, { count: sc }] = await Promise.all([
            supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", debutIso),
            // `scans` n'a pas de colonne de ce nom — son horodatage est `scanned_at`.
            // PostgREST répondait 42703, supabase-js ne lève rien, `count` valait null :
            // TOUS les rapports hebdomadaires annonçaient « 0 scan cette semaine ».
            supabase.from("scans").select("id", { count: "exact", head: true }).in("page_id", ids).gte("scanned_at", debutIso),
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

      // Le SDK Resend ne LÈVE PAS : un 429, un 403 ou une panne réseau reviennent
      // dans `error`. `sent++` était inconditionnel — la tâche annonçait « 12
      // envoyé(s) » et le journal « ok » quand rien n'était parti.
      const { error: echec } = await resend.emails.send({
        from: EMAIL_FROM,
        to: profile.email,
        subject: resume.creux ? `Semaine calme sur QRowg — ${dateLabel}` : `${scans} scan${scansSemaine > 1 ? "s" : ""} cette semaine — QRowg`,
        html: emailShell({ preheader: "Votre activité QRowg en un coup d'œil.", content }),
      })
      if (echec) echecs.push(echec.message ?? String(echec))
      else sent++
    }

    const detail = echecs.length
      ? sansAdresses(`${sent} envoyé(s), ${echecs.length} échec(s) : ${echecs.join(" · ")}`)
      : `${sent} envoyé(s)`
    await noterPassage(supabase, TACHE, echecs.length ? "erreur" : sent > 0 ? "ok" : "rien", detail, Date.now() - debut)
    return NextResponse.json({ success: echecs.length === 0, sent, echecs: echecs.length })
  } catch (e: any) {
    // Une tâche qui plante ne laissait AUCUNE trace : c'est justement le cas
    // qu'on veut voir dans le journal.
    await noterPassage(createAdminClient(), TACHE, "erreur", e?.message ?? "erreur inconnue", Date.now() - debut)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
