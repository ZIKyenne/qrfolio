// app/api/reports/subscribe/route.ts
// Abonnement / désabonnement aux rapports automatiques

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const body = await req.json()
    const { frequency, enabled, email } = body as {
      frequency: "weekly" | "monthly"
      enabled: boolean
      email?: string
    }

    if (!["weekly", "monthly"].includes(frequency)) {
      return NextResponse.json({ error: "Fréquence invalide" }, { status: 400 })
    }

    // Récupérer l'email du profil si non fourni
    let targetEmail = email
    if (!targetEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single()
      targetEmail = profile?.email
    }

    if (!targetEmail) {
      return NextResponse.json({ error: "Email introuvable" }, { status: 400 })
    }

    // Upsert l'abonnement
    const { data, error } = await supabase
      .from("report_subscriptions")
      .upsert({
        user_id:   user.id,
        email:     targetEmail,
        frequency,
        enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,frequency" })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, subscription: data })
  } catch (err: any) {
    console.error("[reports/subscribe]", err)
    return serverError("reports/subscribe", err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { data } = await supabase
      .from("report_subscriptions")
      .select("id, frequency, enabled, email, last_sent_at, created_at")
      .eq("user_id", user.id)

    return NextResponse.json({ subscriptions: data ?? [] })
  } catch (err: any) {
    return serverError("reports/subscribe", err)
  }
}
