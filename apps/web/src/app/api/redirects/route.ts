// app/api/redirects/route.ts
// CRUD des redirections domaine (301/302)

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { normalizeDomain } from "@/lib/domain"

// Destination autorisée : chemin interne "/…" OU URL http(s) absolue.
// Rejette les URL protocol-relative "//host" (open-redirect) et les schémas
// exotiques (javascript:, data:, …).
function isValidRedirectTarget(raw: string): boolean {
  const t = (raw ?? "").trim()
  if (!t || t.startsWith("//")) return false
  if (t.startsWith("/")) return true
  try { const u = new URL(t); return u.protocol === "http:" || u.protocol === "https:" }
  catch { return false }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { data } = await supabase
    .from("domain_redirects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ redirects: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { from_domain, from_path, to_url, redirect_type, label, enabled } = await req.json()

  if (!from_domain || !to_url) {
    return NextResponse.json({ error: "from_domain et to_url requis" }, { status: 400 })
  }

  if (redirect_type && ![301, 302].includes(redirect_type)) {
    return NextResponse.json({ error: "Type doit être 301 ou 302" }, { status: 400 })
  }

  // Normaliser les chemins
  const cleanPath = (from_path ?? "/").startsWith("/") ? (from_path ?? "/") : "/" + (from_path ?? "")
  const cleanDomain = normalizeDomain(from_domain)

  // Destination : http(s) valide ou chemin interne — jamais //host ni javascript:.
  if (!isValidRedirectTarget(to_url)) {
    return NextResponse.json({ error: "Destination invalide : URL http(s) ou chemin /…" }, { status: 400 })
  }

  // SÉCURITÉ (anti open-redirect) : la source doit être un domaine VÉRIFIÉ
  // appartenant à l'utilisateur. Sans ça, n'importe qui créerait une redirection
  // sur qrowg.com ou sur le domaine d'un autre.
  const { data: ownedDomain } = await supabase
    .from("domain_verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("domain", cleanDomain)
    .eq("verified", true)
    .maybeSingle()
  if (!ownedDomain) {
    return NextResponse.json({ error: "Vous devez d'abord ajouter et vérifier ce domaine." }, { status: 403 })
  }

  // Éviter les redirections en boucle (comparaison normalisee, insensible a la casse)
  const destDomain = normalizeDomain(to_url)
  if (destDomain === cleanDomain) {
    return NextResponse.json({ error: "La destination ne peut pas être identique à la source" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("domain_redirects")
    .upsert({
      user_id:       user.id,
      from_domain:   cleanDomain,
      from_path:     cleanPath,
      to_url:        to_url.trim(),
      redirect_type: redirect_type ?? 301,
      label:         label?.trim() || null,
      enabled:       enabled ?? true,
    }, { onConflict: "from_domain,from_path" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ redirect: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const allowed = ["to_url", "redirect_type", "label", "enabled"]
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  // Memes validations qu'a la creation (l'entree PATCH est tout aussi non fiable).
  if ("redirect_type" in filtered && ![301, 302].includes(filtered.redirect_type as number)) {
    return NextResponse.json({ error: "Type doit être 301 ou 302" }, { status: 400 })
  }
  if ("to_url" in filtered && !isValidRedirectTarget(String(filtered.to_url ?? ""))) {
    return NextResponse.json({ error: "Destination invalide : URL http(s) ou chemin /…" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("domain_redirects")
    .update(filtered)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ redirect: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const { error } = await supabase
    .from("domain_redirects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
