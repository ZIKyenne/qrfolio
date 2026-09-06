// app/api/goals/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { texte, entierOuNull, entier, couleurHex, parmi, uuidOuNull } from "@/lib/bornes"

// Types d'objectifs connus (migration 20260611_005).
const GOAL_TYPES = ["whatsapp", "calendly", "cta_button", "contact_form", "stripe_product", "phone", "email", "custom"] as const

type ChampsObjectif = {
  name: string; description: string | null; goal_type: typeof GOAL_TYPES[number]
  target_match: string | null; target_count: number | null; period_days: number; color: string; page_id: string | null
}

// Borne chaque champ et vérifie que la page visée appartient bien au compte
// (page_id arrivait tel quel : un objectif pouvait pointer la page d'un autre).
async function bornerObjectif(supabase: { from: (t: string) => any }, userId: string, body: any): Promise<ChampsObjectif | { erreur: string; status: number }> {
  const name = texte(body?.name, 120)
  const goal_type = parmi(body?.goal_type, GOAL_TYPES, "custom")
  if (!name || typeof body?.goal_type !== "string") return { erreur: "name et goal_type requis", status: 400 }
  const page_id = uuidOuNull(body?.page_id)
  if (page_id) {
    const { data: page } = await supabase.from("pages").select("id").eq("id", page_id).eq("user_id", userId).maybeSingle()
    if (!page) return { erreur: "Page introuvable", status: 404 }
  }
  return {
    name,
    description: texte(body?.description, 500),
    goal_type,
    target_match: texte(body?.target_match, 300),
    target_count: entierOuNull(body?.target_count, 1, 1_000_000),
    period_days: entier(body?.period_days, 1, 365, 30),
    color: couleurHex(body?.color, "#C9A84C"),
    page_id,
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { data, error } = await supabase
    .from("conversion_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .order("created_at", { ascending: false })

  if (error) return serverError("goals", error)
  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const champsObjectif = await bornerObjectif(supabase, user.id, body)
  if ("erreur" in champsObjectif) return NextResponse.json({ error: champsObjectif.erreur }, { status: champsObjectif.status })

  const { data, error } = await supabase
    .from("conversion_goals")
    .insert({ user_id: user.id, ...champsObjectif })
    .select()
    .single()

  if (error) return serverError("goals", error)
  return NextResponse.json({ goal: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const id = uuidOuNull(body?.id)
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  const champsObjectif = await bornerObjectif(supabase, user.id, body)
  if ("erreur" in champsObjectif) return NextResponse.json({ error: champsObjectif.erreur }, { status: champsObjectif.status })

  // Le `.eq("user_id", user.id)` garantit qu'on ne modifie qu'un objectif qui nous appartient.
  const { data, error } = await supabase
    .from("conversion_goals")
    .update(champsObjectif)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return serverError("goals", error)
  return NextResponse.json({ goal: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const { error } = await supabase
    .from("conversion_goals")
    .update({ enabled: false })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return serverError("goals", error)
  return NextResponse.json({ ok: true })
}
