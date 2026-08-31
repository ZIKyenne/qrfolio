// /api/account/username-libre?u=<username> — « ce nom est-il déjà pris ? »
//
// Cette vérification se faisait côté navigateur, avec la clé publique :
//   sb.from("profiles").select("id").eq("username", clean)
// Pour qu'elle fonctionne, une policy `Profils publics` autorisait la lecture de
// TOUTE la table `profiles` — qual `true` — à quiconque possède une session.
// N'importe quel compte gratuit pouvait donc lire l'email, le nom, le plan et les
// préférences de tous les autres comptes. C'était la seule lecture croisée du
// produit : partout ailleurs, le client ne lit que sa propre ligne.
//
// La question légitime « ce nom est-il libre ? » passe maintenant par le serveur,
// qui répond par OUI ou NON et rien d'autre. Aucune ligne ne sort de la base.

import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { rateLimit, ipOf } from "@/lib/rateLimit"

export const runtime = "nodejs"

// Même forme que celle acceptée par l'écran Profil.
const USERNAME = /^[a-z0-9_-]{3,30}$/

export async function GET(req: NextRequest) {
  // Session obligatoire : cet endpoint dit si un nom est pris, il n'a rien à faire
  // en accès libre. Et une limite de débit, pour qu'il ne devienne pas un moyen
  // d'énumérer les noms d'utilisateurs à la chaîne.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  if (!(await rateLimit("username:" + ipOf(req), 30, 60_000))) {
    return NextResponse.json({ error: "Trop de vérifications" }, { status: 429 })
  }

  const demande = (req.nextUrl.searchParams.get("u") || "").trim().toLowerCase()
  if (!USERNAME.test(demande)) return NextResponse.json({ error: "Nom invalide" }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from("profiles").select("id").eq("username", demande).maybeSingle()
  if (error) return NextResponse.json({ error: "Vérification impossible" }, { status: 500 })

  // Un booléen, jamais l'identifiant trouvé : le nom est pris, on ne dit pas par qui.
  return NextResponse.json({ libre: !data || data.id === user.id })
}
