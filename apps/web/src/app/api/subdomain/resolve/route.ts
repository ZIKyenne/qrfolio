// app/api/subdomain/resolve/route.ts
// Résout un sous-domaine username.qrowg.com → page principale de l'utilisateur

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { escapeHtml } from "@/lib/escapeHtml"

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")
  if (!username) return NextResponse.json({ error: "username requis" }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

    // Trouver l'utilisateur par username
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single()

    if (!profile) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Sous-domaine introuvable</title></head>
<body style="background:#080808;color:#F5F0E8;font-family:DM Sans,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">
<div>
  <div style="font-size:48px;margin-bottom:16px">🔍</div>
  <h1 style="color:#C9A84C;font-size:24px;margin:0 0 8px">Sous-domaine introuvable</h1>
  <p style="color:#8A8478;margin:0 0 24px">${escapeHtml(username)}.qrowg.com n'est associé à aucun compte</p>
  <a href="${appUrl}" style="color:#C9A84C;text-decoration:none;font-size:14px">← Retour à QRowg</a>
</div>
</body></html>`,
        { status: 404, headers: { "Content-Type": "text/html;charset=utf-8" } }
      )
    }

    // Trouver la page principale publiée de cet utilisateur
    const { data: page } = await supabase
      .from("pages")
      .select("slug")
      .eq("user_id", profile.id)
      .eq("status", "published")
      .order("total_views", { ascending: false })
      .limit(1)
      .single()

    if (!page) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Aucune page publiée</title></head>
<body style="background:#080808;color:#F5F0E8;font-family:DM Sans,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">
<div>
  <div style="font-size:48px;margin-bottom:16px">📄</div>
  <h1 style="color:#C9A84C;font-size:24px;margin:0 0 8px">Aucune page publiée</h1>
  <p style="color:#8A8478;margin:0 0 24px">Ce profil n'a pas encore de page publique</p>
  <a href="${appUrl}" style="color:#C9A84C;text-decoration:none;font-size:14px">← Retour à QRowg</a>
</div>
</body></html>`,
        { status: 404, headers: { "Content-Type": "text/html;charset=utf-8" } }
      )
    }

    // Réécriture interne → /{slug} sur qrowg.com
    return NextResponse.redirect(new URL(`/${page.slug}`, appUrl), {
      headers: { "X-Subdomain": username },
    })
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
