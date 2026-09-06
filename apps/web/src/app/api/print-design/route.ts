// =============================================================================
// /api/print-design — Persistance du design "Atelier d'impression"
// Un design courant par QR : colonnes print_design (JSONB) + print_format (TEXT)
// sur la table qr_codes. Ecriture serveur uniquement (RLS).
// Migration requise (Supabase SQL Editor) :
//   ALTER TABLE qr_codes
//     ADD COLUMN IF NOT EXISTS print_design JSONB DEFAULT NULL,
//     ADD COLUMN IF NOT EXISTS print_format TEXT DEFAULT 'a4';
// =============================================================================

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { objetBorne } from "@/lib/bornes"

const ALLOWED_FORMATS = ["a4", "square", "story", "carte", "flyer", "table"] as const

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const { qr_id, short_code, design, format } = body as {
      qr_id?: string
      short_code?: string
      design?: unknown
      format?: string
    }
    if (!qr_id && !short_code) {
      return NextResponse.json({ error: "qr_id ou short_code requis" }, { status: 400 })
    }

    const safeFormat = ALLOWED_FORMATS.includes(format as any) ? format : "a4"
    // Le design est un objet de réglages : 64 Ko le contiennent largement.
    if (design !== undefined && design !== null && !objetBorne(design, 64_000)) {
      return NextResponse.json({ error: "Design trop volumineux (64 Ko maximum)." }, { status: 413 })
    }

    let q = supabase
      .from("qr_codes")
      .update({
        print_design: design ?? null,
        print_format: safeFormat,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
    q = qr_id ? q.eq("id", qr_id) : q.eq("short_code", short_code as string)
    const { data, error } = await q.select("id")

    if (error) {
      return serverError("print-design", error)
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "QR introuvable" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return serverError("print-design", e)
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const qrId = req.nextUrl.searchParams.get("qr_id")
    const shortCode = req.nextUrl.searchParams.get("short_code")
    if (!qrId && !shortCode) {
      return NextResponse.json({ error: "qr_id ou short_code requis" }, { status: 400 })
    }

    let sel = supabase
      .from("qr_codes")
      .select("print_design, print_format")
      .eq("user_id", user.id)
    sel = qrId ? sel.eq("id", qrId) : sel.eq("short_code", shortCode as string)
    const { data, error } = await sel.maybeSingle()

    if (error) {
      return serverError("print-design", error)
    }
    return NextResponse.json({
      design: data?.print_design ?? null,
      format: data?.print_format ?? "a4",
    })
  } catch (e: any) {
    return serverError("print-design", e)
  }
}
