// premierScanEnvoi.ts — La plomberie de l'alerte « premier scan ». Appelée depuis
// /api/track juste après l'enregistrement d'une visite venue d'un QR code.
//
// Deux règles : ne jamais jeter (un email raté ne doit pas faire échouer le
// comptage), et ne jamais envoyer deux fois pour la même page.

import { EMAIL_FROM } from "./emailFrom"
import { SOURCE_SCAN, SUJET_PREMIER_SCAN, alerteActivee, emailPremierScan, estLaPremiere } from "./premierScan"

type Issue = "envoye" | "pas-la-premiere" | "desactive" | "impossible"

export async function previenirPremierScan(
  admin: { from: (t: string) => any },
  pageId: string,
  idEcrit: string | null,
): Promise<Issue> {
  try {
    if (!idEcrit) return "impossible"

    // La plus ancienne visite-scan de cette page. Le second tri par `id` rend la
    // réponse identique pour deux requêtes concurrentes, même à horodatage égal.
    const { data: premiere } = await admin
      .from("page_views")
      .select("id")
      .eq("page_id", pageId)
      .eq("source", SOURCE_SCAN)
      .order("viewed_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!estLaPremiere(idEcrit, premiere?.id)) return "pas-la-premiere"

    const { data: page } = await admin.from("pages").select("title, user_id").eq("id", pageId).maybeSingle()
    if (!page?.user_id) return "impossible"

    const { data: profil } = await admin
      .from("profiles").select("email, full_name, preferences").eq("id", page.user_id).maybeSingle()
    if (!profil?.email) return "impossible"
    if (!alerteActivee(profil.preferences)) return "desactive"

    const cle = process.env.RESEND_API_KEY
    if (!cle) return "impossible"

    const rep = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [profil.email],
        subject: SUJET_PREMIER_SCAN,
        html: emailPremierScan({ nom: profil.full_name, titrePage: page.title }),
      }),
    })
    return rep.ok ? "envoye" : "impossible"
  } catch {
    return "impossible"
  }
}
