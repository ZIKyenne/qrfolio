// app/api/subdomain/route.ts
// Gestion des sous-domaines personnalisés: vérification + réservation + modification

import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { rateLimit, ipOf } from "@/lib/rateLimit"

const RESERVED = new Set([
  "www","app","api","admin","dashboard","auth","login","signup","register",
  "support","help","blog","docs","status","mail","smtp","ftp","dev","staging",
  "production","beta","test","demo","static","assets","cdn","media","images",
  "qrfolio","qrowg","team","account","profile","settings","billing","pricing","legal",
  "terms","privacy","contact","about","careers","press","partners",
])

function validateUsername(s: string): string | null {
  if (!s) return "Le sous-domaine est requis"
  if (s.length < 3) return "Minimum 3 caractères"
  if (s.length > 30) return "Maximum 30 caractères"
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(s) && !/^[a-z0-9]{3}$/.test(s)) {
    return "Uniquement lettres minuscules, chiffres, - et _ (commence et finit par un alphanumérique)"
  }
  if (RESERVED.has(s)) return "Ce sous-domaine est réservé"
  return null
}

// GET ?username=xxx — vérifier disponibilité
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim()
  if (!username) return NextResponse.json({ error: "username requis" }, { status: 400 })

  const validationError = validateUsername(username)
  if (validationError) {
    return NextResponse.json({ available: false, reason: validationError })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Session obligatoire + limite de débit : cet endpoint dit si un nom est pris,
  // il ne doit pas servir à énumérer les comptes.
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  if (!(await rateLimit("subdomain:" + ipOf(req), 30, 60_000))) {
    return NextResponse.json({ error: "Trop de vérifications" }, { status: 429 })
  }

  // Le client de session ne voit que SA ligne de profiles depuis la fermeture de
  // la table : il répondait « disponible » pour tout nom pris par un autre compte,
  // et le POST retombait sur 23505. Le test d'unicité passe par la clé de service,
  // et ne renvoie qu'un booléen.
  const { data: existing, error: lectureErr } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()
  if (lectureErr) return NextResponse.json({ error: "Vérification impossible" }, { status: 500 })

  if (existing) {
    // Si c'est le même utilisateur → "c'est le vôtre"
    if (user && existing.id === user.id) {
      return NextResponse.json({ available: false, reason: "C'est déjà votre sous-domaine actuel", isOwn: true })
    }
    return NextResponse.json({ available: false, reason: "Ce sous-domaine est déjà pris" })
  }

  return NextResponse.json({ available: true, subdomain: `${username}.qrowg.com` })
}

// POST — réserver ou modifier le sous-domaine
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { username } = await req.json()
  const clean = username?.toLowerCase().trim()

  const validationError = validateUsername(clean)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  // Vérifier disponibilité (clé de service : le client de session ne voit que sa ligne)
  const { data: existing } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("username", clean)
    .neq("id", user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: "Ce sous-domaine est déjà pris" }, { status: 409 })

  // Mettre à jour le username dans profiles (client de session : RLS = sa ligne)
  const { data, error } = await supabase
    .from("profiles")
    .update({ username: clean })
    .eq("id", user.id)
    .select("username")
    .single()

  // Course entre la vérification et l'écriture : l'index unique tranche (23505).
  if (error?.code === "23505") return NextResponse.json({ error: "Ce sous-domaine vient d'être pris" }, { status: 409 })
  if (error) return serverError("subdomain", error)

  return NextResponse.json({
    ok:        true,
    username:  data.username,
    subdomain: `${data.username}.qrowg.com`,
  })
}

// DELETE — libérer le sous-domaine
export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { error } = await supabase
    .from("profiles")
    .update({ username: null })
    .eq("id", user.id)

  if (error) return serverError("subdomain", error)
  return NextResponse.json({ ok: true })
}
