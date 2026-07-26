// app/api/cron/prune-events/route.ts
// Purge des tables d'events brutes au-delà de la fenêtre de rétention (voir
// lib/eventRetention). Appelé par cron (Vercel Cron). Protégé par CRON_SECRET.
//
// ⚠️ DESTRUCTIF : supprime définitivement les lignes brutes anciennes. Les
// compteurs cumulés ne sont pas touchés (cf. lib/eventRetention). N'est PAS
// planifié par défaut — pour l'activer, ajouter dans vercel.json :
//   { "path": "/api/cron/prune-events", "schedule": "0 4 * * 0" }   (dim. 4h)

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { EVENT_TABLES, RETENTION_DAYS, retentionCutoffISO } from "@/lib/eventRetention"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const secret = req.nextUrl.searchParams.get("secret")
  // Fail-closed : sans CRON_SECRET configuré, ou sans preuve valide, on refuse.
  if (CRON_SECRET === "" || (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const cutoff = retentionCutoffISO(new Date())
  const admin = createAdminClient()
  const deleted: Record<string, number | string> = {}

  for (const { table, column } of EVENT_TABLES) {
    const { error, count } = await admin
      .from(table)
      .delete({ count: "exact" })
      .lt(column, cutoff)
    deleted[table] = error ? `error: ${error.message}` : (count ?? 0)
  }

  return NextResponse.json({ ok: true, cutoff, retentionDays: RETENTION_DAYS, deleted })
}
