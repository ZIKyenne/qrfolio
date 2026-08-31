// /api/cron/etat — Le dernier passage de chaque tâche planifiée.
//
// Existe parce que la question « est-ce que mes emails partent ? » n'avait aucune
// réponse : les tâches n'écrivent rien quand il n'y a rien à envoyer, et les
// journaux d'exécution de l'hébergeur ne remontent qu'une heure ou deux en arrière.
//
// Ne renvoie JAMAIS le champ `detail` : il contient les messages d'erreur, qui
// citent les adresses email des destinataires.

import { NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { dernierPassage, type Passage } from "@/lib/journalCron"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  try {
    const { data, error } = await createAdminClient()
      .from("cron_runs")
      .select("tache, lance_le, statut")     // jamais `detail` : il cite des emails
      .order("lance_le", { ascending: false })
      .limit(200)
    // Table absente (migration non appliquée) : ce n'est pas une panne, c'est un
    // journal qu'on n'a pas encore ouvert. On le dit, on ne casse rien.
    if (error) return NextResponse.json({ disponible: false, passages: {} })
    const passages = Object.fromEntries(dernierPassage((data ?? []) as Passage[]))
    return NextResponse.json({ disponible: true, passages })
  } catch {
    return NextResponse.json({ disponible: false, passages: {} })
  }
}
