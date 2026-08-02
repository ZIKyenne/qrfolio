import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { qr_id, all, foreground_color, background_color, corner_style, error_correction, style_config } = body

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const fields = {
      foreground_color,
      background_color,
      corner_style,
      error_correction,
      style_config,
      updated_at: new Date().toISOString(),
    }

    // Mode "appliquer a tous mes QR"
    if (all === true) {
      const { data, error } = await supabase
        .from("qr_codes")
        .update(fields)
        .eq("user_id", user.id)
        .select("id")
      if (error) {
        return serverError("qr-style", error)
      }
      return NextResponse.json({ ok: true, count: data?.length ?? 0 })
    }

    // Mode "un seul QR"
    if (!qr_id) {
      return NextResponse.json({ error: "qr_id manquant" }, { status: 400 })
    }
    const { data, error } = await supabase
      .from("qr_codes")
      .update(fields)
      .eq("id", qr_id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      return serverError("qr-style", error)
    }
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne modifiee (QR introuvable ou non autorise)" },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, qr: data[0] })
  } catch (e: any) {
    return serverError("qr-style", e)
  }
}
