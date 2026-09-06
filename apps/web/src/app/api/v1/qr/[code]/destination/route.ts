// POST /api/v1/qr/[code]/destination — change dynamiquement la destination d'un QR
// (sans réimprimer). Le cœur de l'API QR. Auth par clé, réservé au propriétaire du QR.
import { NextRequest, NextResponse } from "next/server"
import { authApiKey } from "@/lib/apiAuth"
import { createAdminClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rateLimit"
import { consommerQuotaApi, reponseQuotaDepasse, enTetesQuota } from "@/lib/quotaApi"
import { buildDestUrl, validateDest, type DestType } from "../../../../qr-destination/qrDestination"

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const auth = await authApiKey(req)
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 })
  if (!(await rateLimit("api:" + auth.keyId, 120, 60_000))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 })
  // Plafond mensuel du plan (1 000 / 10 000) — compté en base, cf. lib/quotaApi.
  const quota = await consommerQuotaApi(auth.userId, auth.plan)
  if (!quota.autorise) return reponseQuotaDepasse(quota)

  const { code } = await params
  const corps = await req.json().catch(() => ({}))
  const type = typeof corps?.type === "string" ? corps.type : ""
  const value = typeof corps?.value === "string" ? corps.value : ""
  const label = typeof corps?.label === "string" ? corps.label.slice(0, 80) : undefined
  if (!type || !value) return NextResponse.json({ error: "type et value requis" }, { status: 400 })

  const err = validateDest(type as DestType, value)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const admin = createAdminClient()
  const { data: qr } = await admin
    .from("qr_codes")
    .select("id, page_id, dest_override, dest_history")
    .eq("short_code", code)
    .eq("user_id", auth.userId)
    .maybeSingle()
  if (!qr) return NextResponse.json({ error: "QR introuvable" }, { status: 404 })

  // IDOR : pour une destination de type "page", exiger que la page appartienne
  // au détenteur de la clé (sinon on pourrait pointer son QR vers l'ID de page
  // d'un autre utilisateur).
  if (type === "page") {
    const { data: pg } = await admin
      .from("pages").select("id").eq("id", value.trim()).eq("user_id", auth.userId).maybeSingle()
    if (!pg) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })
  }

  const newDest = {
    type,
    value:  value.trim(),
    url:    buildDestUrl(type as DestType, value.trim()),
    label:  label?.trim() || null,
    set_at: new Date().toISOString(),
    set_by: auth.userId,
  }
  const oldEntry = (qr as any).dest_override ?? { type: "page", value: qr.page_id, url: null, label: "Page QRowg", set_at: null, set_by: null }
  const history  = [oldEntry, ...((qr as any).dest_history ?? [])].slice(0, 10)

  const { error } = await admin
    .from("qr_codes")
    .update({
      dest_override: type === "page" && value === qr.page_id ? null : newDest,
      dest_history:  history,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", qr.id)
  if (error) return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 })

  return NextResponse.json({ ok: true, code, destination: newDest }, { headers: enTetesQuota(quota) })
}
