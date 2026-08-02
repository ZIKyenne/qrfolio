// app/api/domains/routes/route.ts
// CRUD des routes domaine → page (multi-page par domaine)

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"

// GET ?root_domain=xxx — liste les routes d'un domaine
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const root = req.nextUrl.searchParams.get("root_domain")

  let query = supabase
    .from("domain_routes")
    .select("*, pages(id, title, slug, status)")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })

  if (root) query = query.eq("root_domain", root)

  const { data, error } = await query
  if (error) return serverError("domains/routes", error)
  return NextResponse.json({ routes: data ?? [] })
}

// POST — créer une route
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { root_domain, subdomain, page_id, priority } = await req.json()

  if (!root_domain || !page_id) {
    return NextResponse.json({ error: "root_domain et page_id requis" }, { status: 400 })
  }

  // Vérifier que le domaine racine est vérifié et appartient à l'user
  const { data: verified } = await supabase
    .from("domain_verifications")
    .select("id")
    .eq("domain", root_domain)
    .eq("user_id", user.id)
    .eq("verified", true)
    .single()

  if (!verified) {
    return NextResponse.json({
      error: "Le domaine racine doit être vérifié avant d'y ajouter des routes"
    }, { status: 403 })
  }

  // Vérifier que la page appartient à l'user
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", page_id)
    .eq("user_id", user.id)
    .single()

  if (!page) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

  // Normaliser le sous-domaine
  const cleanSub = subdomain?.trim().toLowerCase() || null

  // Calculer la priorité automatiquement si non fournie
  const autoPriority = cleanSub === null ? 5   // racine = priorité basse
    : cleanSub === "*" ? 1                      // wildcard = priorité minimale
    : priority ?? 10                            // exact = priorité haute

  const { data, error } = await supabase
    .from("domain_routes")
    .upsert({
      user_id:     user.id,
      root_domain,
      subdomain:   cleanSub,
      page_id,
      priority:    autoPriority,
    }, { onConflict: "root_domain,subdomain" })
    .select("*, pages(id, title, slug, status)")
    .single()

  if (error) return serverError("domains/routes", error)
  return NextResponse.json({ route: data })
}

// DELETE — supprimer une route
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const { error } = await supabase
    .from("domain_routes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return serverError("domains/routes", error)
  return NextResponse.json({ ok: true })
}
