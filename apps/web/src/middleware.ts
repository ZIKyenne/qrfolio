// middleware.ts — Routing domaines custom + sous-domaines *.qrowg.com

import { NextRequest, NextResponse } from "next/server"

const APP_DOMAIN     = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "qrowg.com"
const QROWG_HOSTS  = new Set(["qrowg.com", "www.qrowg.com", "localhost"])

// Extension de fichier en fin de chemin (2 à 5 caractères alphanumériques).
export function estFichierStatique(pathname: string): boolean {
  return /\.[a-z0-9]{2,5}$/i.test(pathname)
}

export async function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") ?? "").replace(/:\d+$/, "")
  const pathname  = req.nextUrl.pathname

  // Exclure les routes système
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/favicon") ||
    // Fichiers statiques seulement : une vraie extension en fin de chemin.
    // `includes(".")` laissait client.com/foo.bar servir le contenu de qrowg.com
    // sous l'hôte du client, sans passer par la résolution du domaine.
    estFichierStatique(pathname)
  ) {
    return NextResponse.next()
  }

  // ── Cas 1 : sous-domaine *.qrowg.com ────────────────────────────────────
  const isSubdomain = hostname.endsWith(`.${APP_DOMAIN}`) && !QROWG_HOSTS.has(hostname)

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${APP_DOMAIN}`, "")
    if (!subdomain || subdomain === "www") return NextResponse.next()

    const url      = req.nextUrl.clone()
    url.pathname   = "/api/subdomain/resolve"
    url.searchParams.set("username", subdomain)
    url.searchParams.set("path",     pathname)
    return NextResponse.rewrite(url)
  }

  // ── Cas 2 : domaine racine QRowg ────────────────────────────────────────
  // www sert exactement le même site que l'apex : sans redirection permanente,
  // Google voit deux sites identiques et partage l'autorité entre les deux.
  if (hostname === `www.${APP_DOMAIN}`) {
    const url = req.nextUrl.clone()
    url.host = APP_DOMAIN
    url.protocol = "https:"
    url.port = ""
    return NextResponse.redirect(url, 308)
  }
  if (QROWG_HOSTS.has(hostname) || hostname.endsWith(".vercel.app")) {
    return NextResponse.next()
  }

  // ── Cas 3 : domaine custom ────────────────────────────────────────────────
  const url      = req.nextUrl.clone()
  url.pathname   = "/api/domains/resolve"
  url.searchParams.set("domain", hostname)
  url.searchParams.set("path",   pathname)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)" ],
}
