// =============================================================================
// /api/unsplash — Recherche d'images (proxy serveur, cle privee)
// La cle reste cote serveur. Build-safe : si la cle manque, on renvoie 503
// (jamais d'exception au chargement du module -> ne casse pas le build Vercel).
// Variable d'env requise (Vercel) : UNSPLASH_ACCESS_KEY
//   -> https://unsplash.com/oauth/applications (Access Key)
// =============================================================================

import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rateLimit"

export async function GET(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    return NextResponse.json({ error: "Recherche d'images non configurée", photos: [] }, { status: 503 })
  }

  // Proxy vers une API externe à quota : réservé aux utilisateurs connectés
  // (la recherche d'images ne sert qu'au builder/print studio) + rate-limit.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié", photos: [] }, { status: 401 })
  if (!(await rateLimit(`unsplash:${user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: "Trop de recherches, patientez un instant.", photos: [] }, { status: 429 })
  }

  const q = (req.nextUrl.searchParams.get("q") || "background").slice(0, 80)
  const orientation = req.nextUrl.searchParams.get("orientation") || ""

  try {
    const u = new URL("https://api.unsplash.com/search/photos")
    u.searchParams.set("query", q)
    u.searchParams.set("per_page", "24")
    u.searchParams.set("content_filter", "high")
    if (orientation === "portrait" || orientation === "landscape" || orientation === "squarish") {
      u.searchParams.set("orientation", orientation)
    }

    const r = await fetch(u.toString(), {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      // cache cote edge : les memes recherches ne re-tapent pas l'API
      next: { revalidate: 3600 },
    })
    if (!r.ok) {
      return NextResponse.json({ error: `Unsplash ${r.status}`, photos: [] }, { status: 502 })
    }
    const data = await r.json()
    const photos = (data.results || []).map((p: any) => ({
      id: p.id,
      thumb: p.urls?.thumb,
      small: p.urls?.small,
      regular: p.urls?.regular,
      author: p.user?.name,
      authorUrl: p.user?.links?.html,
    }))
    return NextResponse.json({ photos })
  } catch (e: any) {
    console.error("[unsplash]", e?.message ?? e)
    return NextResponse.json({ error: "Erreur serveur", photos: [] }, { status: 500 })
  }
}
