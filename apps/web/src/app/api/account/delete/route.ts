// Suppression definitive du compte (obligation RGPD). Securise :
//  - le demandeur est authentifie via ses cookies de session ;
//  - il doit re-confirmer en tapant son propre email ;
//  - la suppression de l'utilisateur auth cascade sur profiles puis sur
//    toutes les donnees (pages, qr, blocks, leads, analytics...).
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { resilierToutChezStripe } from "@/lib/resiliationStripe"

export async function POST(req: NextRequest) {
  // 1. Authentifier le demandeur (session cookie) — jamais un id passe par le client.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

  // 2. Double confirmation : l'email tape doit correspondre a celui du compte.
  let body: { email?: string } = {}
  try { body = await req.json() } catch {}
  const typed = (body.email ?? "").trim().toLowerCase()
  if (!typed || typed !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "Confirmation incorrecte." }, { status: 400 })
  }

  // Client service-role (non type : contourne les types generes potentiellement obsoletes).
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const uid = user.id

  // 3. Arrêter la facturation AVANT de supprimer quoi que ce soit. Sans cela le
  //    client continuait d'être prélevé après la disparition de son compte. Si
  //    Stripe échoue, on refuse la suppression : un compte qui reste vaut mieux
  //    qu'un compte fantôme qui paie.
  const { data: profil } = await admin.from("profiles").select("stripe_customer_id").eq("id", uid).maybeSingle()
  try {
    const r = await resilierToutChezStripe(stripe, profil?.stripe_customer_id ?? null)
    if (r.annules.length) console.log(`[account/delete] ${r.annules.length} abonnement(s) Stripe annule(s) pour ${uid}`)
  } catch (e) {
    console.error("[account/delete] annulation Stripe impossible :", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Impossible d'annuler votre abonnement pour le moment. Votre compte n'a pas été supprimé — réessayez dans quelques minutes ou contactez le support." }, { status: 502 })
  }

  // 4. Lever les contraintes qui bloqueraient la suppression du profil :
  //    - profiles.referred_by (NO ACTION) : detacher les filleuls parraines.
  //    - teams.owner_id (RESTRICT) : supprimer les equipes possedees.
  await admin.from("profiles").update({ referred_by: null }).eq("referred_by", uid)
  await admin.from("teams").delete().eq("owner_id", uid)

  // 5. Supprimer l'utilisateur auth -> cascade sur profiles et toutes les donnees liees.
  const { error } = await admin.auth.admin.deleteUser(uid)
  if (error) {
    return NextResponse.json({ error: "La suppression a échoué. Réessayez ou contactez le support." }, { status: 500 })
  }

  // 6. Invalider la session locale (cookies) apres coup.
  try { await supabase.auth.signOut() } catch {}

  return NextResponse.json({ ok: true })
}
