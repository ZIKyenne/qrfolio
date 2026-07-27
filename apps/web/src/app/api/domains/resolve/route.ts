// app/api/domains/resolve/route.ts v2
// Résolution hiérarchique: exact > sous-domaine > wildcard > domaine racine

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { escapeHtml } from "@/lib/escapeHtml"

export async function GET(req: NextRequest) {
  const rawDomain = req.nextUrl.searchParams.get("domain")
  if (!rawDomain) return NextResponse.json({ error: "domain requis" }, { status: 400 })

  const domain = rawDomain.replace(/^www\./, "").toLowerCase()

  try {
    const supabase = createAdminClient()
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

    // ── Étape -1: domaine secondaire → redirection vers principal ──────────────
    // Si ce domaine n'est pas principal et qu'un principal existe, rediriger
    const { data: domainVerif } = await supabase
      .from("domain_verifications")
      .select("is_primary, user_id")
      .eq("domain", domain)
      .eq("verified", true)
      .maybeSingle()

    if (domainVerif && !domainVerif.is_primary) {
      // Chercher le domaine principal de cet user
      const { data: primaryDomain } = await supabase
        .from("domain_verifications")
        .select("domain")
        .eq("user_id", domainVerif.user_id)
        .eq("is_primary", true)
        .maybeSingle()

      if (primaryDomain) {
        const rawPath = req.nextUrl.searchParams.get("path") ?? "/"
        // Forcer un chemin (leading "/") : sinon `path=@evil.com` construirait
        // `https://primary.com@evil.com` (host = evil.com) = open-redirect.
        const path = rawPath.startsWith("/") ? rawPath : "/" + rawPath
        const dest = `https://${primaryDomain.domain}${path !== "/" ? path : ""}`
        return NextResponse.redirect(dest, { status: 301 })
      }
    }

    // ── Étape 0: vérifier les redirections ──────────────────────────────────────
    const rawPath = req.nextUrl.searchParams.get("path") ?? "/"
    const path = rawPath.startsWith("/") ? rawPath : "/" + rawPath

    // Chercher une redirection exacte (domaine + chemin)
    const { data: redirect } = await supabase
      .from("domain_redirects")
      .select("to_url, redirect_type, id")
      .eq("from_domain", domain)
      .eq("from_path", path)
      .eq("enabled", true)
      .maybeSingle()

    if (redirect) {
      // Incrémenter hit_count de façon ATOMIQUE (fire-and-forget) via la fonction
      // SQL dédiée : `hit_count = hit_count + 1` côté Postgres, sans perte sous
      // trafic concurrent (le read-then-write applicatif perdait des incréments).
      supabase
        .rpc("increment_redirect_hit", { p_id: redirect.id })
        .then(() => {}, () => {})

      const dest = redirect.to_url.startsWith("http")
        ? redirect.to_url
        : new URL(redirect.to_url.startsWith("/") ? redirect.to_url : "/" + redirect.to_url, appUrl).toString()

      return NextResponse.redirect(dest, { status: redirect.redirect_type })
    }

    // Redirection wildcard (domaine seul, chemin "/" par défaut)
    if (path !== "/") {
      const { data: wildcardRedir } = await supabase
        .from("domain_redirects")
        .select("to_url, redirect_type")
        .eq("from_domain", domain)
        .eq("from_path", "/")
        .eq("enabled", true)
        .maybeSingle()

      if (wildcardRedir) {
        const dest = wildcardRedir.to_url.startsWith("http")
          ? wildcardRedir.to_url
          : new URL(wildcardRedir.to_url, appUrl).toString()
        return NextResponse.redirect(dest, { status: wildcardRedir.redirect_type })
      }
    }

    // ── Étape 1: chercher dans domain_routes (multi-page) ─────────────────────
    // Extraire le domaine racine et le sous-domaine éventuel
    // ex: "booking.restaurant.fr" → root="restaurant.fr", sub="booking"
    // ex: "restaurant.fr" → root="restaurant.fr", sub=null

    const parts = domain.split(".")
    // Domaines avec sous-domaine: 3+ parties (booking.restaurant.fr)
    // Domaines racine: 2 parties (restaurant.fr) ou SLD exotiques
    let root: string
    let sub: string | null

    if (parts.length >= 3) {
      // booking.restaurant.fr → root=restaurant.fr, sub=booking
      // sub.sub2.restaurant.fr → root=restaurant.fr, sub=sub.sub2
      root = parts.slice(-2).join(".")
      sub  = parts.slice(0, -2).join(".")
    } else {
      root = domain
      sub  = null
    }

    // Récupérer toutes les routes du domaine racine (triées par priorité desc)
    const { data: routes } = await supabase
      .from("domain_routes")
      .select("subdomain, page_id, priority, pages(slug)")
      .eq("root_domain", root)
      .eq("enabled", true)
      .order("priority", { ascending: false })

    if (routes && routes.length > 0) {
      const page = resolveRoute(routes, sub)
      if (page) {
        return NextResponse.redirect(new URL(`/${(page as any).slug}`, appUrl))
      }
    }

    // ── Étape 2: fallback domain_verifications (ancien système, 1 domaine = 1 page) ──
    const { data: verif } = await supabase
      .from("domain_verifications")
      .select("page_id, pages(slug)")
      .eq("domain", domain)
      .eq("verified", true)
      .maybeSingle()

    if (verif?.pages) {
      const page = verif.pages as any
      return NextResponse.redirect(new URL(`/${page.slug}`, appUrl))
    }

    // ── 404 ────────────────────────────────────────────────────────────────────
    return new NextResponse(notFoundHtml(domain, appUrl), {
      status: 404,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    })
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// ── Algorithme de résolution ──────────────────────────────────────────────────
// Ordre: correspondance exacte > wildcard > racine (sub=null)
function resolveRoute(routes: any[], sub: string | null): any | null {
  // 1. Correspondance exacte
  const exact = routes.find(r => r.subdomain === sub)
  if (exact) return exact.pages

  // 2. Wildcard
  const wildcard = routes.find(r => r.subdomain === "*")
  if (wildcard) return wildcard.pages

  // 3. Domaine racine (subdomain null) si on est sur le domaine racine
  if (sub === null) {
    const root = routes.find(r => r.subdomain === null)
    if (root) return root.pages
  }

  return null
}

function notFoundHtml(domain: string, appUrl: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Page introuvable — ${escapeHtml(domain)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="background:#080808;color:#F5F0E8;font-family:DM Sans,Arial,sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">
<div>
  <div style="font-size:48px;margin-bottom:16px">🔍</div>
  <h1 style="color:#C9A84C;font-size:28px;margin:0 0 8px;font-weight:300">Domaine non configuré</h1>
  <p style="color:#8A8478;margin:0 0 24px;font-size:14px">${escapeHtml(domain)} n'est associé à aucune page QRowg</p>
  <a href="${appUrl}" style="display:inline-block;background:linear-gradient(90deg,#C9A84C,#b8953f);
    color:#080808;text-decoration:none;padding:11px 24px;border-radius:10px;font-weight:700;font-size:14px">
    Créer ma page sur QRowg
  </a>
</div>
</body></html>`
}
