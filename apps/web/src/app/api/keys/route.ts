// app/api/keys/route.ts — Génération SÉCURISÉE des clés API (serveur).
// La clé en clair n'est renvoyée qu'UNE fois ; seule son empreinte SHA-256 est
// stockée (key_hash). Corrige l'ancienne génération client qui stockait le hex
// brut en base (clé en clair). Format : qrk_sk_live_<hex>.
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "node:crypto"

function newApiKey() {
  const hex     = randomBytes(32).toString("hex")
  const full    = `qrk_sk_live_${hex}`
  const hash    = createHash("sha256").update(full).digest("hex")
  const preview = `qrk_sk_live_${hex.slice(0, 8)}...${hex.slice(-4)}`
  return { full, hash, preview }
}

// POST — créer une clé
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { name } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 })

  const k = newApiKey()
  const { data, error } = await supabase.from("api_keys").insert({
    user_id: user.id, name: name.trim(), key_hash: k.hash, key_preview: k.preview, is_active: true,
  }).select().single()
  if (error) return NextResponse.json({ error: "Création impossible" }, { status: 500 })

  // `key` (clé en clair) renvoyée UNE seule fois.
  return NextResponse.json({ ok: true, key: k.full, record: data })
}

// PATCH — régénérer une clé existante
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const k = newApiKey()
  const { data, error } = await supabase.from("api_keys")
    .update({ key_hash: k.hash, key_preview: k.preview, last_used_at: null })
    .eq("id", id).eq("user_id", user.id)
    .select().single()
  if (error || !data) return NextResponse.json({ error: "Régénération impossible" }, { status: 500 })

  return NextResponse.json({ ok: true, key: k.full, record: data })
}
