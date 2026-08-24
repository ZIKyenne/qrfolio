// Retour d'authentification. Deux flux passent ici :
//   • les liens email (récupération de mot de passe, confirmation) : historique ;
//   • le retour de Google (OAuth), qui a trois besoins de plus — le parrainage,
//     que Google ne transmet pas, l'email de bienvenue, envoyé par l'action
//     d'inscription mais pas par OAuth, et des erreurs qui reviennent au bon
//     endroit (« mot de passe oublié » n'a aucun sens sans mot de passe).
//
// Les décisions vivent dans callbackLogic.ts, testable seul.
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { safeNext, errorRedirect, isBrandNew, displayName, cleanRefCode, REF_COOKIE } from "../callbackLogic"

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")
  // Le flux est marqué explicitement : le lien de réinitialisation passe LUI AUSSI
  // un `next` (/auth/reset-password), donc sa présence ne distingue rien. Sans ce
  // marqueur, un lien de réinitialisation périmé renverrait vers la connexion au
  // lieu de « mot de passe oublié ».
  const flow: "oauth" | "email" = searchParams.get("flow") === "oauth" ? "oauth" : "email"

  // Derriere un proxy (Vercel), preferer l'hote transmis pour construire l'URL finale.
  const forwardedHost = req.headers.get("x-forwarded-host")
  const base = forwardedHost ? `https://${forwardedHost}` : origin

  if (!code) return NextResponse.redirect(`${base}${errorRedirect(flow, next)}`)

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${base}${errorRedirect(flow, next)}`)

  const res = NextResponse.redirect(`${base}${safeNext(next)}`)

  // ── Suites propres au premier passage ──────────────────────────────────────
  // Aucune ne doit pouvoir empêcher la connexion : tout est enveloppé.
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && isBrandNew(user)) {
      const ref = cleanRefCode(req.cookies.get(REF_COOKIE)?.value)
      if (ref) await applyReferral(user.id, ref)
      await sendWelcome(user.email || "", displayName(user))
    }
  } catch { /* la session est ouverte : on ne bloque pas l'entrée pour un à-côté */ }

  // Le cookie de parrainage a fait son office (ou n'était pas valide) : on l'efface.
  res.cookies.set(REF_COOKIE, "", { maxAge: 0, path: "/" })
  return res
}

/**
 * Parrainage différé. À l'inscription par email, le code voyage dans les
 * métadonnées et le trigger `handle_new_user` fait le travail. Google ne
 * transmet rien de tel : on rejoue ici la même logique, à l'identique.
 */
async function applyReferral(userId: string, refCode: string): Promise<void> {
  const admin = createAdminClient()

  // Le parrain existe-t-il, et n'est-ce pas soi-même ?
  const { data: referrer } = await admin.from("profiles").select("id").eq("ref_code", refCode).maybeSingle()
  if (!referrer || (referrer as any).id === userId) return

  // Idempotent : un compte n'est parrainé qu'une fois, même si la page est rechargée.
  const { data: me } = await admin.from("profiles").select("referred_by").eq("id", userId).maybeSingle()
  if (!me || (me as any).referred_by) return

  await admin.from("profiles").update({ referred_by: (referrer as any).id }).eq("id", userId)
  await admin.from("referrals").insert({
    referrer_id: (referrer as any).id,
    referred_id: userId,
    ref_code: refCode,
    status: "pending",
    reward_months: 1,
  })
}

/** Email de bienvenue — l'inscription par email l'envoie déjà, pas OAuth. */
async function sendWelcome(email: string, name: string): Promise<void> {
  if (!email) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  if (!appUrl) return
  await fetch(`${appUrl}/api/emails/welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-token": process.env.CRON_SECRET || "" },
    body: JSON.stringify({ email, name }),
  })
}
