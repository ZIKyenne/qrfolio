// app/api/qr-destination/route.ts
// Gestion des destinations dynamiques des QR codes

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { buildDestUrl, validateDest, type DestType } from "./qrDestination"
import { serverError } from "@/lib/apiError"

// GET ?qr_id=xxx — récupérer destination + historique
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const qrId = req.nextUrl.searchParams.get("qr_id")
  if (!qrId) return NextResponse.json({ error: "qr_id requis" }, { status: 400 })

  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, short_code, page_id, dest_override, dest_history, pages(id, title, slug, status)")
    .eq("id", qrId)
    .eq("user_id", user.id)   // défense en profondeur (ne pas dépendre que de la RLS) — cf. audit sécurité 2026-08-17
    .single()

  if (error || !data) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  return NextResponse.json({
    qr_id:        data.id,
    short_code:   data.short_code,
    page_id:      data.page_id,
    page:         data.pages,
    dest_override: data.dest_override,
    dest_history:  data.dest_history ?? [],
  })
}

// POST — changer la destination
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { qr_id, type, value, label } = await req.json()
  if (!qr_id || !type || !value) {
    return NextResponse.json({ error: "qr_id, type et value requis" }, { status: 400 })
  }

  const validErr = validateDest(type as DestType, value)
  if (validErr) return NextResponse.json({ error: validErr }, { status: 400 })

  // IDOR : pour une destination de type "page", exiger que la page cible
  // appartienne à l'utilisateur (parité avec api/v1/qr/[code]/destination).
  if (type === "page") {
    const { data: ownPage } = await supabase
      .from("pages").select("id").eq("id", String(value).trim()).eq("user_id", user.id).maybeSingle()
    if (!ownPage) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })
  }

  // Récupérer l'état actuel
  const { data: current } = await supabase
    .from("qr_codes")
    .select("dest_override, dest_history, page_id, pages(title, slug)")
    .eq("id", qr_id)
    .eq("user_id", user.id)
    .single()

  if (!current) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  // Construire la nouvelle destination
  const newDest = {
    type,
    value: value.trim(),
    url:   buildDestUrl(type as DestType, value.trim()),
    label: label?.trim() || null,
    set_at: new Date().toISOString(),
    set_by: user.id,
  }

  // Ajouter l'ancienne destination à l'historique (max 10)
  const oldEntry = current.dest_override ?? {
    type:  "page",
    value: current.page_id,
    url:   null,
    label: (current.pages as any)?.title ?? "Page QRowg",
    set_at: null,
    set_by: null,
  }

  const history = [oldEntry, ...(current.dest_history ?? [])].slice(0, 10)

  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      dest_override: type === "page" && value === current.page_id ? null : newDest,
      dest_history:  history,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", qr_id)
    .eq("user_id", user.id)
    .select("dest_override, dest_history")
    .single()

  if (error) return serverError("qr-destination", error)
  return NextResponse.json({ ok: true, dest_override: data?.dest_override, dest_history: data?.dest_history })
}

// PATCH ?action=restore — restaurer une destination de l'historique
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { qr_id, index } = await req.json()
  if (!qr_id || index === undefined) {
    return NextResponse.json({ error: "qr_id et index requis" }, { status: 400 })
  }

  const { data: current } = await supabase
    .from("qr_codes")
    .select("dest_override, dest_history, page_id")
    .eq("id", qr_id)
    .eq("user_id", user.id)
    .single()

  if (!current) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  const history = current.dest_history ?? []
  const restored = history[index]
  if (!restored) return NextResponse.json({ error: "Entrée historique introuvable" }, { status: 404 })

  // Mettre l'actuelle en historique
  const newHistory = [current.dest_override ?? null, ...history.filter((_: any, i: number) => i !== index)]
    .filter(Boolean).slice(0, 10)

  await supabase
    .from("qr_codes")
    .update({
      dest_override: restored.type === "page" && restored.value === current.page_id ? null : restored,
      dest_history:  newHistory,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", qr_id)
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true, restored })
}

// DELETE — supprimer l'override (retour à la page QRowg)
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { qr_id } = await req.json()
  if (!qr_id) return NextResponse.json({ error: "qr_id requis" }, { status: 400 })

  const { data: current } = await supabase
    .from("qr_codes")
    .select("dest_override, dest_history")
    .eq("id", qr_id)
    .eq("user_id", user.id)
    .single()

  if (!current) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  const history = [current.dest_override, ...(current.dest_history ?? [])].filter(Boolean).slice(0, 10)

  await supabase
    .from("qr_codes")
    .update({ dest_override: null, dest_history: history, updated_at: new Date().toISOString() })
    .eq("id", qr_id)
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}
