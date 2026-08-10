// app/q/[code]/route.ts v2
// Résolution QR avec gestion des statuts

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { resolveOverrideDest, detectDevice, escapeHtml, type OverrideDest } from "./qrResolve"
import { rateLimit, ipOf } from "@/lib/rateLimit"

// Redirection NON mise en cache : un QR est DYNAMIQUE (le proprietaire peut changer sa
// destination apres impression) -> chaque scan doit re-resoudre cote serveur. Sans no-store,
// un CDN/navigateur pourrait figer une ancienne destination.
function redirectNoStore(url: string | URL, status = 302): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { Location: url.toString(), "Cache-Control": "no-store, must-revalidate" },
  })
}

function pausedHtml(message: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR Code temporairement indisponible</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#080808;color:#F5F0E8;font-family:'DM Sans',Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#0F0E0B;border:1px solid rgba(249,115,22,0.3);border-radius:20px;padding:40px 32px;max-width:400px;width:100%;text-align:center}
.icon{font-size:48px;margin-bottom:16px}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);border-radius:20px;padding:4px 14px;font-size:12px;color:#F97316;font-weight:600;margin-bottom:20px}
.dot{width:6px;height:6px;border-radius:50%;background:#F97316;animation:pulse 1.5s infinite}
h1{font-size:22px;font-weight:700;margin-bottom:10px;color:#F5F0E8}
p{font-size:14px;line-height:1.7;color:#8A8478;margin-bottom:28px}
.link{color:#C9A84C;text-decoration:none;font-size:13px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
</style>
</head>
<body>
<div class="card">
  <div class="icon">⏸</div>
  <div class="badge"><div class="dot"></div>En pause</div>
  <h1>QR Code temporairement indisponible</h1>
  <p>${message ? escapeHtml(message) : "Ce QR Code est temporairement désactivé. Réessayez plus tard."}</p>
  <a class="link" href="${appUrl}">Créer votre propre QR Code →</a>
</div>
</body></html>`
}

function expiredHtml(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR Code expiré</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#080808;color:#F5F0E8;font-family:'DM Sans',Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#0F0E0B;border:1px solid rgba(255,107,107,0.3);border-radius:20px;padding:40px 32px;max-width:400px;width:100%;text-align:center}
.icon{font-size:48px;margin-bottom:16px}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);border-radius:20px;padding:4px 14px;font-size:12px;color:#FF6B6B;font-weight:600;margin-bottom:20px}
h1{font-size:22px;font-weight:700;margin-bottom:10px;color:#F5F0E8}
p{font-size:14px;line-height:1.7;color:#8A8478;margin-bottom:28px}
.link{color:#C9A84C;text-decoration:none;font-size:13px}
</style>
</head>
<body>
<div class="card">
  <div class="icon">⌛</div>
  <div class="badge">Expiré</div>
  <h1>Ce QR Code a expiré</h1>
  <p>La durée de validité de ce QR Code est dépassée. Contactez l'émetteur pour en obtenir un nouveau.</p>
  <a class="link" href="${appUrl}">Créer votre propre QR Code →</a>
</div>
</body></html>`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!code) return redirectNoStore(new URL("/", req.url))

  const supabase = createAdminClient()
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

  try {
    // select("*") volontaire : robuste si des colonnes optionnelles (status,
    // dest_override, pause_message, expires_at — migrations 012/013) ne sont pas
    // appliquées en prod. Un select explicite d'une colonne absente ferait échouer
    // la requête -> data null -> redirection à tort vers l'accueil pour TOUS les QR.
    const { data: qr, error: qrErr } = await supabase
      .from("qr_codes")
      .select("*, pages(slug)")
      .eq("short_code", code)
      .maybeSingle()

    if (qrErr) console.error("[qr-redirect] erreur lookup", code, qrErr.message)

    // ── Lien instantané DYNAMIQUE (table `instant_qrs`) : résolu ici via l'admin client (hors RLS).
    // Même logique de statut/expiration que les qr_codes (essai 7 j par lien → status "expired").
    if (!qr) {
      const htmlNoStore = (html: string, status: number) => new NextResponse(html, {
        status, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store, must-revalidate" },
      })
      const { data: inst } = await supabase
        .from("instant_qrs").select("id, dynamic, dest_url, status, expires_at, total_scans")
        .eq("short_code", code).maybeSingle()
      if (inst && inst.dynamic) {
        const st = inst.status ?? "active"
        if (inst.expires_at && new Date(inst.expires_at) < new Date() && st === "active") {
          supabase.from("instant_qrs").update({ status: "expired" }).eq("id", inst.id).then(() => {}, () => {})
          return htmlNoStore(expiredHtml(appUrl), 410)
        }
        if (st === "paused") return htmlNoStore(pausedHtml("", appUrl), 503)
        if (st === "expired") return htmlNoStore(expiredHtml(appUrl), 410)
        const dest = inst.dest_url && /^https?:\/\//i.test(inst.dest_url) ? inst.dest_url : null
        if (dest) {
          // Scan best-effort (anti-abus + incrément non bloquant).
          rateLimit(`scan:${code}:${ipOf(req)}`, 20, 60_000).then((allow) => {
            if (allow) supabase.from("instant_qrs").update({ total_scans: (inst.total_scans ?? 0) + 1, last_scan_at: new Date().toISOString() }).eq("id", inst.id).then(() => {}, () => {})
          })
          return redirectNoStore(dest)
        }
      }
      return redirectNoStore(new URL("/?qr=notfound", appUrl))
    }

    const qrStatus = qr.status ?? "active"

    // ── Vérifier expiration automatique ───────────────────────────────────
    if (qr.expires_at && new Date(qr.expires_at) < new Date() && qrStatus === "active") {
      // Auto-expirer
      supabase.from("qr_codes").update({ status: "expired" }).eq("id", qr.id).then(() => {}, () => {})
      return new NextResponse(expiredHtml(appUrl), {
        status: 410, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store, must-revalidate" }
      })
    }

    // ── Bloquer selon statut ───────────────────────────────────────────────
    switch (qrStatus) {
      case "paused":
        return new NextResponse(pausedHtml(qr.pause_message ?? "", appUrl), {
          status: 503, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store, must-revalidate" }
        })
      case "archived":
        return new NextResponse(expiredHtml(appUrl), {
          status: 410, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store, must-revalidate" }
        })
      case "expired":
        return new NextResponse(expiredHtml(appUrl), {
          status: 410, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store, must-revalidate" }
        })
      case "draft":
        // Draft accessible uniquement si paramètre preview (pour le dashboard)
        if (!req.nextUrl.searchParams.has("preview")) {
          return redirectNoStore(new URL("/?qr=draft", appUrl))
        }
        break
    }

    // ── Enregistrer le scan (fire-and-forget) ─────────────────────────────
    const ua     = req.headers.get("user-agent") ?? ""
    const device = detectDevice(ua)

    // Le comptage (qr_codes.total_scans + last_scan_at, pages.total_views,
    // profiles.total_scans) est fait par le trigger `increment_scan_counters`
    // sur l'INSERT de scan ci-dessous. L'ancien UPDATE manuel etait casse
    // (rpc imbrique comme valeur de colonne -> rejete par Postgres, avale
    // silencieusement) et redondant : retire.
    // Anti-abus best-effort : au-delà de 20 scans/min pour un même code+IP, on
    // n'enregistre plus (évite le gonflage des stats/quotas par bouclage d'un
    // short_code). NON bloquant : la redirection n'attend pas ce check.
    rateLimit(`scan:${code}:${ipOf(req)}`, 20, 60_000).then((allow) => {
      if (allow) supabase.from("scans").insert({ qr_code_id: qr.id, page_id: qr.page_id, device }).then(() => {}, () => {})
    })

    // ── Résolution destination (override ou page) ─────────────────────────
    const override = qr.dest_override as OverrideDest
    if (override) {
      if (override.type === "page") {
        // Type "page" : resolution du slug via la DB (hors helper pur).
        const { data: pg } = await supabase.from("pages").select("slug").eq("id", override.value).maybeSingle()
        if (pg?.slug) return redirectNoStore(`${appUrl}/${pg.slug}`)
      } else {
        const dest = resolveOverrideDest(override)
        if (dest) return redirectNoStore(dest)
      }
    }

    if (qr.page_id) {
      // Slug déjà joint au lookup initial (pages(slug)) -> pas de 2ᵉ aller-retour DB
      // sur le chemin le plus fréquent. Repli sur une requête si l'embed manque.
      const joinedSlug = (qr as any).pages?.slug as string | undefined
      if (joinedSlug) return redirectNoStore(`${appUrl}/${joinedSlug}`)
      const { data: pg } = await supabase.from("pages").select("slug").eq("id", qr.page_id).maybeSingle()
      if (pg?.slug) return redirectNoStore(`${appUrl}/${pg.slug}`)
    }

    return redirectNoStore(new URL("/?qr=error", appUrl))
  } catch (e) {
    console.error("[qr-redirect]", e)
    return redirectNoStore(new URL("/?qr=error", appUrl))
  }
}
