import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { rateLimit, ipOf } from "@/lib/rateLimit"
import { estUnScan } from "@/lib/premierScan"
import { previenirPremierScan } from "@/lib/premierScanEnvoi"

// Endpoint de tracking (vues / clics / événements d'engagement). Remplace les
// inserts anonymes directs (RLS "insert with check(true)") qui permettaient
// d'empoisonner les analytics et de gonfler les quotas. Ici : insert via le
// service role, rate-limité, page vérifiée (publiée), colonnes whitelistées.
export const runtime = "nodejs"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EVENT_KINDS = new Set(["scroll", "impression", "tap", "dwell"])

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null
  const s = v.slice(0, max)
  return s || null
}
function num01(v: unknown): number { const n = Number(v); return n >= 0 && n <= 1 ? Math.round(n * 1000) / 1000 : 0 }
function clampNum(v: unknown, lo: number, hi: number): number { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0 }

// Insert résilient pour l'attribution par support : tente avec qr_source ; si la colonne
// n'existe pas encore (migration non appliquée), réessaie SANS -> le tracking ne casse jamais.
// Renvoie l'identifiant de la ligne écrite (null si l'écriture a échoué) : l'alerte
// « premier scan » s'en sert pour savoir si c'est bien elle qui a écrit la première.
async function insertTracked(admin: any, table: string, row: Record<string, unknown>, qs: string | null): Promise<string | null> {
  const ecrire = (r: Record<string, unknown>) => admin.from(table).insert(r).select("id").maybeSingle()
  if (qs) {
    const { data, error } = await ecrire({ ...row, qr_source: qs })
    if (!error) return (data as { id?: string } | null)?.id ?? null
  }
  const { data } = await ecrire(row)
  return (data as { id?: string } | null)?.id ?? null
}

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimit("track:" + ipOf(req), 60, 60_000))) return NextResponse.json({ ok: false }, { status: 429 })
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 })

    const { type, pageId } = body as { type?: string; pageId?: string }
    if (!pageId || typeof pageId !== "string" || !UUID.test(pageId)) return NextResponse.json({ ok: false }, { status: 400 })

    const admin = createAdminClient()
    // La page doit exister et être publiée (empêche l'insertion pour des pages fantômes).
    const { data: page } = await admin.from("pages").select("id").eq("id", pageId).eq("status", "published").maybeSingle()
    if (!page) return NextResponse.json({ ok: true, skipped: true })

    const qs = str(body.qrSource, 40)
    if (type === "view") {
      const source = str(body.source, 40)
      const idVue = await insertTracked(admin, "page_views", {
        country: (req.headers.get("x-vercel-ip-country") || "").slice(0, 2).toUpperCase() || null,
        page_id: pageId,
        source,
        referrer: str(body.referrer, 200),
        device: str(body.device, 20),
        session_id: str(body.session_id, 80),
      }, qs)
      // « Alertes de scans » : le tout premier scan d'une page prévient son
      // propriétaire. C'est le seul email du produit qui ne dépend d'aucun cron.
      if (estUnScan(source)) await previenirPremierScan(admin, pageId, idVue)
    } else if (type === "click") {
      if (!str(body.clickTarget, 500)) return NextResponse.json({ ok: true })
      await insertTracked(admin, "block_clicks", {
        page_id: pageId,
        block_id: str(body.blockId, 200),
        click_target: str(body.clickTarget, 500),
      }, qs)
    } else if (type === "events") {
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, 300) : []
      const clean = rows
        .filter((r: any) => r && EVENT_KINDS.has(r.kind))
        .map((r: any) => {
          const base: Record<string, unknown> = { page_id: pageId, kind: r.kind, ref: str(r.ref, 200) || "-" }
          if (r.kind === "tap") { base.x = num01(r.x); base.y = num01(r.y) }
          if (r.kind === "dwell") { base.value = clampNum(r.value, 0, 86400) }
          return base
        })
      if (clean.length) await admin.from("page_events").insert(clean)
    } else {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
