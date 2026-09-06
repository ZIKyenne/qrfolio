// app/api/qr-duplicate/route.ts
// Duplique un QR code et sa page liee (nouvelle page + nouveau short_code)
// Ne remplit QUE les colonnes reellement presentes dans la table.

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { MAX_PAGES, countPages, initialQrStatus } from "@/lib/quota"
import { slugifyBase } from "@/lib/slug"
import { uniqueShortCode } from "@/lib/shortCode"

// Suffixe de slug : aléa cryptographique (l ancien tirage était prédictible).
function randCode(len = 5): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = new Uint8Array(len); crypto.getRandomValues(bytes)
  let s = ""
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length]
  return s
}

// Affecte une valeur uniquement si la cle existe deja dans l'objet (= colonne presente)
function setIfPresent(obj: Record<string, any>, key: string, value: any) {
  if (key in obj) obj[key] = value
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { qr_id } = await req.json()
  if (!qr_id) return NextResponse.json({ error: "qr_id requis" }, { status: 400 })

  // Plafond anti-abus (cf. lib/quota) : la duplication crée une page -> bloquer
  // au-delà de MAX_PAGES. Le quota du plan porte sur les QR ACTIFS.
  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  if ((await countPages(supabase, user.id)) >= MAX_PAGES) {
    return NextResponse.json({ error: "limit", message: `Vous avez atteint le plafond de ${MAX_PAGES} pages.` }, { status: 403 })
  }
  // La copie démarre active si le quota le permet, sinon en brouillon (cohérent
  // avec la création : on peut dupliquer sans être bloqué par le plan).
  const dupQrStatus = await initialQrStatus(supabase, user.id, prof?.plan as string)

  // 1. Recuperer le QR original (verif proprietaire)
  const { data: orig, error: e1 } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", qr_id)
    .eq("user_id", user.id)
    .single()
  if (e1 || !orig) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  // 2. Dupliquer la page liee (si elle existe)
  let newPageId: string | null = orig.page_id ?? null
  if (orig.page_id) {
    const { data: page } = await supabase
      .from("pages")
      .select("*")
      .eq("id", orig.page_id)
      .single()
    if (page) {
      const p: Record<string, any> = { ...page }
      delete p.id
      delete p.created_at
      delete p.updated_at
      setIfPresent(p, "title", `${page.title ?? "Sans titre"} (copie)`)
      // Base bornee a 50 pour rester sous la contrainte slug_format (<= 60)
      // meme quand le slug original est proche de la limite.
      setIfPresent(p, "slug", `${slugifyBase(page.slug ?? "page", 50) || "page"}-${randCode(5)}`)
      setIfPresent(p, "status", "draft")
      setIfPresent(p, "total_views", 0)
      // Un domaine personnalisé ne se copie pas : deux pages sur le même domaine.
      setIfPresent(p, "custom_domain", null)
      setIfPresent(p, "published_at", null)

      const { data: insertedPage, error: e2 } = await supabase
        .from("pages")
        .insert(p)
        .select("id")
        .single()
      if (e2 || !insertedPage) {
        return NextResponse.json({ error: e2?.message || "Echec copie de la page" }, { status: 500 })
      }
      newPageId = insertedPage.id
    }
  }

  // 3. Creer le nouveau QR (copie a l'identique, on ne reinitialise que l'existant)
  const q: Record<string, any> = { ...orig }
  delete q.id
  delete q.created_at
  delete q.updated_at
  // colonnes que l'on sait presentes (utilisees ailleurs dans le code)
  q.page_id    = newPageId
  q.short_code = await uniqueShortCode(supabase)   // unique dans qr_codes ET instant_qrs, aléa crypto
  // reinitialisations conditionnelles (uniquement si la colonne existe)
  setIfPresent(q, "total_scans", 0)
  setIfPresent(q, "last_scan_at", null)
  setIfPresent(q, "dest_override", null)
  setIfPresent(q, "dest_history", [])
  setIfPresent(q, "status", dupQrStatus)

  const { data: insertedQr, error: e3 } = await supabase
    .from("qr_codes")
    .insert(q)
    .select("*, pages(id, title, slug, status, total_views, updated_at)")
    .single()
  if (e3 || !insertedQr) {
    return NextResponse.json({ error: e3?.message || "Echec copie du QR" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, qr: insertedQr })
}
