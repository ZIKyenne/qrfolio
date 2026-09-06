// quotaApi — applique le plafond mensuel d'appels de l'API publique.
//
// plans.ts promettait « 1 000 / 10 000 appels par mois » ; seul un garde-fou de
// 120 requêtes/minute existait. Le compteur vit en base (api_usage, fonction
// api_consommer) : il survit aux redémarrages serverless, contrairement au
// limiteur en mémoire.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { apiQuotaMensuel } from "@/lib/plans"

export type EtatQuota = { autorise: boolean; appels: number; plafond: number }

type Rpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }

// Logique pure sur la réponse de la base : testable sans Supabase.
export function interpreter(data: unknown, plafond: number): EtatQuota {
  const ligne = Array.isArray(data) ? data[0] : data
  const appels = Number((ligne as { appels?: unknown } | null)?.appels ?? 0)
  const autorise = (ligne as { autorise?: unknown } | null)?.autorise === true
  return { autorise, appels: Number.isFinite(appels) ? appels : 0, plafond }
}

// Renvoie l'état après avoir compté CET appel. Sans plan API → refus.
// En cas d'erreur de la base, on refuse : un compteur muet ne doit pas ouvrir
// l'API en grand.
export async function consommerQuotaApi(userId: string, plan: string | null | undefined, client: Rpc = createAdminClient() as unknown as Rpc): Promise<EtatQuota> {
  const plafond = apiQuotaMensuel(plan)
  if (plafond === null) return { autorise: false, appels: 0, plafond: 0 }
  const { data, error } = await client.rpc("api_consommer", { p_user: userId, p_plafond: plafond })
  if (error) return { autorise: false, appels: 0, plafond }
  return interpreter(data, plafond)
}

export function enTetesQuota(q: EtatQuota): Record<string, string> {
  return {
    "X-Quota-Limit": String(q.plafond),
    "X-Quota-Used": String(q.appels),
    "X-Quota-Remaining": String(Math.max(0, q.plafond - q.appels)),
  }
}

export function reponseQuotaDepasse(q: EtatQuota) {
  return NextResponse.json(
    { error: `Quota mensuel atteint (${q.plafond} appels). Il se remet à zéro le 1er du mois prochain.`, quota: { limit: q.plafond, used: q.appels } },
    { status: 429, headers: enTetesQuota(q) },
  )
}
