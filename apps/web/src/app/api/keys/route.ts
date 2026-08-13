// app/api/keys/route.ts — Génération SÉCURISÉE des clés API (serveur).
// La clé en clair n'est renvoyée qu'UNE fois ; seule son empreinte SHA-256 est
// stockée (key_hash). Corrige l'ancienne génération client qui stockait le hex
// brut en base (clé en clair). Format : qrk_sk_live_<hex>.
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "node:crypto"
import { rateLimit } from "@/lib/rateLimit"
import { canApi } from "@/lib/plans"

// Vérifie que l'utilisateur a un plan autorisant l'API (Pro+). Ferme le trou où un
// compte gratuit pouvait créer une clé en appelant directement /api/keys.
async function requireApiPlan(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("plan").eq("id", userId).single()
  return canApi(data?.plan)
}

// Plafond de clés actives par compte : borne le nombre de buckets de rate-limit
// (chaque clé a son propre quota 120/min) pour empêcher un compte de contourner
// la limite d'API en multipliant les clés.
const MAX_ACTIVE_KEYS = 10

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

  if (!(await requireApiPlan(supabase, user.id))) {
    return NextResponse.json({ error: "L'accès API nécessite le plan Pro ou Business.", upgrade: true }, { status: 403 })
  }

  if (!(await rateLimit("apikey-create:" + user.id, 10, 3600_000))) {
    return NextResponse.json({ error: "Trop de créations de clés. Réessayez plus tard." }, { status: 429 })
  }

  const { name } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 })

  // Plafond de clés actives (anti-contournement du quota par clé).
  const { count } = await supabase.from("api_keys")
    .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true)
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return NextResponse.json({ error: `Limite de ${MAX_ACTIVE_KEYS} clés actives atteinte.` }, { status: 403 })
  }

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

  if (!(await requireApiPlan(supabase, user.id))) {
    return NextResponse.json({ error: "L'accès API nécessite le plan Pro ou Business.", upgrade: true }, { status: 403 })
  }

  if (!(await rateLimit("apikey-regen:" + user.id, 20, 3600_000))) {
    return NextResponse.json({ error: "Trop de régénérations. Réessayez plus tard." }, { status: 429 })
  }

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
