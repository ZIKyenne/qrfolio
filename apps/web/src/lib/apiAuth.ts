// Authentification des requêtes de l'API publique par clé (Authorization: Bearer
// qrk_... ou en-tête x-api-key). On hashe la clé reçue en SHA-256 et on la compare
// à key_hash (jamais la clé en clair). Client admin car il n'y a pas de session.
import type { NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/server"
import { canApi } from "@/lib/plans"

export type ApiAuth = { userId: string; keyId: string; plan: string | null }

export async function authApiKey(req: NextRequest): Promise<ApiAuth | null> {
  const header = req.headers.get("authorization") || ""
  const raw = header.startsWith("Bearer ") ? header.slice(7) : (req.headers.get("x-api-key") || "")
  const key = raw.trim()
  if (!key || !key.startsWith("qrk_")) return null

  const hash = createHash("sha256").update(key).digest("hex")
  const admin = createAdminClient()
  const { data } = await admin
    .from("api_keys")
    .select("id, user_id, is_active, expires_at")
    .eq("key_hash", hash)
    .maybeSingle()

  if (!data || !data.is_active) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // L'accès API est réservé Pro+ : une clé reste inerte si le plan du propriétaire
  // a expiré / été rétrogradé (ferme le trou d'un compte gratuit appelant /v1).
  const { data: prof } = await admin.from("profiles").select("plan").eq("id", data.user_id).maybeSingle()
  if (!canApi((prof as any)?.plan)) return null

  // Trace d'utilisation (fire-and-forget).
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {}, () => {})

  return { userId: data.user_id, keyId: data.id, plan: ((prof as any)?.plan as string | null) ?? null }
}
