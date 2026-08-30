// app/api/cron/relance/route.ts
// Rappel à qui s'est inscrit et n'a rien créé. Appelé quotidiennement par Vercel
// Cron, protégé par CRON_SECRET, fail-closed comme les autres crons.
//
// Pourquoi : l'email de bienvenue part à la minute zéro, quand la personne est
// déjà devant l'écran. Il ne rattrape personne. Deux jours plus tard, plus rien
// n'était jamais envoyé — c'est exactement ce qui est arrivé au seul vrai
// inscrit qu'a eu QRowg.
//
// Aucune colonne de suivi : la fenêtre d'éligibilité (48 h à 72 h) garantit
// qu'un passage quotidien ne peut retenir un compte qu'une seule fois. Voir
// lib/relance.ts et ses tests.

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { emailShell, emailH1, emailP, emailButton } from "@/lib/emailLayout"
import { escapeHtml } from "@/lib/escapeHtml"
import { comptesARelancer, fenetreInscription, prenom, type Compte } from "@/lib/relance"

export const runtime = "nodejs"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

// Un email court. Il ne redit pas la bienvenue : il propose UN geste, et rappelle
// que la page peut être faite avant même d'y réfléchir longtemps.
function relanceHtml(nom: string, appUrl: string): string {
  const p = prenom(nom)
  const bonjour = p ? `Bonjour ${escapeHtml(p)},` : "Bonjour,"
  const content = `
    ${emailH1("Votre page vous attend")}
    ${emailP(bonjour)}
    ${emailP("Vous avez créé votre compte QRowg il y a deux jours, et votre première page n'est pas encore là. C'est trois minutes, et vous n'avez rien à rédiger : choisissez ce que la page doit faire, elle arrive déjà remplie.")}
    ${emailP("Une carte de restaurant, une page d'avis Google, une carte de visite : vous n'aurez plus qu'à changer les textes.", 24)}
    ${emailButton("Créer ma page →", `${appUrl}/dashboard/onboarding`)}
    ${emailP("Si vous préférez voir avant de vous lancer, le <a href=\"${APP}/examples\" style=\"color:#C9A84C;\">catalogue d'exemples</a> montre ce que ça donne.".replace("${APP}", appUrl), 0)}
  `
  return emailShell({
    preheader: "Votre première page QRowg en trois minutes, sans rien rédiger.",
    content,
  })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const secret = req.nextUrl.searchParams.get("secret")
  if (CRON_SECRET === "" || (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY absente" }, { status: 500 })

  try {
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
    const maintenant = new Date()
    const { depuis, jusqua } = fenetreInscription(maintenant)

    // On ne ramène que la fenêtre : jamais toute la table des comptes.
    const { data: profs, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .gte("created_at", depuis)
      .lt("created_at", jusqua)
      .limit(500)
    if (error) throw new Error(error.message)

    const ids = (profs ?? []).map(p => p.id as string)
    if (ids.length === 0) return NextResponse.json({ examines: 0, envoyes: 0 })

    // Une seule requête pour savoir qui a déjà créé quelque chose.
    const { data: pages } = await supabase.from("pages").select("user_id").in("user_id", ids)
    const avecPage = new Set((pages ?? []).map(p => p.user_id as string))

    const comptes: Compte[] = (profs ?? []).map(p => ({
      id: p.id as string,
      email: (p.email as string | null) ?? null,
      nom: (p.full_name as string | null) ?? null,
      inscritLe: (p.created_at as string | null) ?? null,
      nbPages: avecPage.has(p.id as string) ? 1 : 0,
    }))

    const aRelancer = comptesARelancer(comptes, maintenant)
    let envoyes = 0
    const erreurs: string[] = []

    for (const c of aRelancer) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [c.email],
            subject: "Votre page QRowg vous attend",
            html: relanceHtml(c.nom ?? "", appUrl),
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        envoyes++
      } catch (e: any) {
        erreurs.push(`${c.email}: ${e?.message ?? "err"}`)
      }
    }

    return NextResponse.json({ examines: comptes.length, envoyes, erreurs: erreurs.length ? erreurs : undefined })
  } catch (e: any) {
    return serverError("cron/relance", e)
  }
}
