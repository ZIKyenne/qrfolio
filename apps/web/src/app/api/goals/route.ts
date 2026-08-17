// app/api/goals/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"

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

  const body = await req.json()
  const { name, description, goal_type, target_match, target_count, period_days, color, page_id } = body

  if (!name || !goal_type) {
    return NextResponse.json({ error: "name et goal_type requis" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("conversion_goals")
    .insert({
      user_id: user.id,
      name, description, goal_type,
      target_match: target_match || null,
      target_count: target_count || null,
      period_days:  period_days || 30,
      color:        color || "#C9A84C",
      page_id:      page_id || null,
    })
    .select()
    .single()

  if (error) return serverError("goals", error)
  return NextResponse.json({ goal: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json()
  const { id, name, description, goal_type, target_match, target_count, period_days, color, page_id } = body

  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  if (!name || !goal_type) {
    return NextResponse.json({ error: "name et goal_type requis" }, { status: 400 })
  }

  // Le `.eq("user_id", user.id)` garantit qu'on ne modifie qu'un objectif qui nous appartient.
  const { data, error } = await supabase
    .from("conversion_goals")
    .update({
      name, description: description ?? null, goal_type,
      target_match: target_match || null,
      target_count: target_count || null,
      period_days:  period_days || 30,
      color:        color || "#C9A84C",
      page_id:      page_id || null,
    })
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
