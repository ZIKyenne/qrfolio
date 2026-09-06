// GET /api/v1/qr-codes — liste les QR codes du détenteur de la clé API.
import { NextRequest, NextResponse } from "next/server"
import { authApiKey } from "@/lib/apiAuth"
import { createAdminClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rateLimit"
import { consommerQuotaApi, reponseQuotaDepasse, enTetesQuota } from "@/lib/quotaApi"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export async function GET(req: NextRequest) {
  const auth = await authApiKey(req)
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 })
  if (!(await rateLimit("api:" + auth.keyId, 120, 60_000))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 })
  // Plafond mensuel du plan (1 000 / 10 000) — compté en base, cf. lib/quotaApi.
  const quota = await consommerQuotaApi(auth.userId, auth.plan)
  if (!quota.autorise) return reponseQuotaDepasse(quota)

  const admin = createAdminClient()
  const { data } = await admin
    .from("qr_codes")
    .select("id, short_code, page_id, status, total_scans, dest_override, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })

  return NextResponse.json({
    data: (data ?? []).map(q => ({ ...q, scan_url: `${APP_URL}/q/${q.short_code}` })),
  }, { headers: enTetesQuota(quota) })
}
