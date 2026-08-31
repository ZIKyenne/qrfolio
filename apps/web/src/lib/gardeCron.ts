// gardeCron.ts — Le contrôle d'entrée des cinq tâches planifiées, au même endroit.
//
// Les cinq routes recopiaient le même bloc de six lignes, avec des différences qui
// n'étaient voulues nulle part : « Non autorise », « Non autorisé », « Unauthorized »,
// et une clé Resend manquante qui donnait 503 ici, 500 là.
//
// Surtout, toutes refusaient AVANT d'écrire dans le journal. Le journal existe pour
// répondre à « est-ce que mes emails partent ? » ; il ne pouvait pas distinguer
// « jamais déclenchée » de « déclenchée et refusée », alors que le second cas est
// la panne la plus probable : un CRON_SECRET absent des variables d'environnement.
// Un refus laisse maintenant une trace.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { noterRefus, type Tache } from "@/lib/journalCron"

/** Le secret présenté, quel que soit le chemin utilisé par l'appelant. */
async function secretPresente(req: NextRequest): Promise<string[]> {
  const donnes: string[] = []
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) donnes.push(auth.slice(7))
  const q = req.nextUrl.searchParams.get("secret")
  if (q) donnes.push(q)
  // Compat : certains appels historiques posaient le secret dans le corps. Vercel
  // Cron, lui, n'envoie qu'un GET sans corps — d'où le catch.
  if (req.method !== "GET") {
    try {
      const body = await req.json()
      if (body?.secret) donnes.push(String(body.secret))
    } catch { /* pas de corps JSON : normal */ }
  }
  return donnes
}

/**
 * Vérifie l'appel d'une tâche planifiée. Renvoie la réponse à retourner tel quel
 * si l'appel est refusé, ou `null` si la tâche peut travailler.
 *
 * `resendRequis` : la tâche envoie des emails et ne sert à rien sans clé d'envoi.
 */
export async function gardeCron(
  req: NextRequest,
  tache: Tache,
  opts: { resendRequis?: boolean } = {},
): Promise<NextResponse | null> {
  const attendu = process.env.CRON_SECRET ?? ""
  const donnes = await secretPresente(req)

  if (attendu === "") {
    await tracer(tache, "CRON_SECRET absent des variables d'environnement")
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  if (!donnes.includes(attendu)) {
    await tracer(tache, donnes.length ? "secret invalide" : "appel sans secret")
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  if (opts.resendRequis && !process.env.RESEND_API_KEY) {
    await tracer(tache, "RESEND_API_KEY absente : aucun email ne peut partir")
    return NextResponse.json({ error: "Service email non configuré", sent: 0 }, { status: 503 })
  }
  return null
}

async function tracer(tache: Tache, motif: string): Promise<void> {
  try { await noterRefus(createAdminClient(), tache, motif) } catch { /* jamais bloquant */ }
}
