// /api/qr-instant — CRUD des QR autonomes (lien, Wi-Fi, texte, contact, appel,
// email). STATIQUES par défaut (contenu encodé directement) ; la plupart peuvent
// être MODIFIABLES après impression (redirigés par /q/[code], destination
// changeable). Stockés dans `instant_qrs`.
//
// Deux quotas du MÊME abonnement : `limits.qr` borne les QR autonomes, `limits.dyn`
// borne ceux d'entre eux qui sont modifiables. Il n'y a plus d'essai de 30 jours :
// un QR imprimé et collé sur une table ne doit pas mourir tout seul.

import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { qrLimit, dynLimit, canDynSecurite } from "@/lib/plans"
import { countInstantQrs, countDynamicQrs } from "@/lib/quota"
import { hashLinkPassword, mdpLienTropLong, LONGUEUR_MAX_MDP_LIEN } from "@/lib/linkPassword"
import { uniqueShortCode } from "@/lib/shortCode"
import { objetBorne } from "@/lib/bornes"

const KINDS = new Set(["link", "wifi", "text", "contact", "phone", "call", "email", "sms"])
// Types éligibles au DYNAMIQUE (redirigé + expirable). Wi-Fi et Contact restent STATIQUES : ils
// doivent fonctionner hors ligne (auto-connexion Wi-Fi, ajout de contact) — impossible via redirection.
const DYNAMIC_KINDS = new Set(["link", "text", "phone", "call", "email"])
// `last_scan_at` manquait : la fiche affichait « Aucun scan pour l'instant » même
// sur un QR scanné cent fois, parce que le champ n'était simplement jamais envoyé.
const COLS = "id, kind, label, payload, inputs, style, created_at, dynamic, short_code, dest_url, status, expires_at, total_scans, last_scan_at, paused_reason, password_hash"

// Ne JAMAIS renvoyer le hash du mot de passe au client : on expose seulement `has_password`.
function pub(row: any): any {
  if (!row) return row
  const { password_hash, ...rest } = row
  return { ...rest, has_password: !!password_hash }
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"

// Normalise + durcit une destination de lien dynamique : http(s) uniquement.
function safeDestUrl(raw: string): string | null {
  const v = (raw || "").trim()
  if (!v) return null
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try { const u = new URL(withProto); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null }
  catch { return null }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { data } = await supabase
    .from("instant_qrs").select(COLS)
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(300)
  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  return NextResponse.json({ items: (data || []).map(pub), plan: prof?.plan ?? "free" })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = String(body?.kind || "")
  const payload = typeof body?.payload === "string" ? body.payload : ""
  // Wi-Fi/Contact : toujours statiques, même si `dynamic` est envoyé.
  const wantsDynamic = body?.dynamic === true && DYNAMIC_KINDS.has(kind)
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Type de QR invalide" }, { status: 400 })
  // Le contenu encodé (payload) n'est requis qu'en STATIQUE : en dynamique le serveur génère
  // payload = /q/<code> et stocke la cible/le contenu dans dest_url.
  if (!wantsDynamic && (!payload.trim() || payload.length > 4000)) return NextResponse.json({ error: "Contenu du QR invalide" }, { status: 400 })

  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()

  // Quota des QR AUTONOMES (limits.qr) : s'applique à TOUS, modifiables compris.
  // Un seul abonnement, un seul compteur : « il vous reste N QR » se dit sans note
  // de bas de page.
  {
    const limit = qrLimit(prof?.plan as string)
    if (limit !== null && (await countInstantQrs(supabase, user.id)) >= limit) {
      return NextResponse.json(
        { error: `Limite de ${limit} QR atteinte sur votre plan.`, upgrade: true },
        { status: 403 },
      )
    }
  }

  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) || null : null
  // 16 Ko chacun : un QR n'a pas besoin de plus, et rien n'empêchait d'en stocker des Mo.
  const inputs = objetBorne(body?.inputs, 16_000) ?? (body?.inputs ? null : {})
  const style = objetBorne(body?.style, 16_000) ?? (body?.style ? null : {})
  if (!inputs || !style) return NextResponse.json({ error: "Contenu trop volumineux (16 Ko maximum)." }, { status: 413 })

  // ── QR MODIFIABLE : le QR encode /q/<code>, la destination se change après impression. ──
  // dest_url = cible/contenu résolu par /q/[code] : lien→URL, appel→tel:, email→mailto:,
  // texte/wifi/contact→contenu encodé (rendu sur une page). Les 3 derniers ne marchent plus hors ligne.
  if (wantsDynamic) {
    // Sous-quota des QR modifiables (limits.dyn). Un refus dit le nombre et le plan :
    // « Limite de 1 QR modifiable » se comprend sans aller lire une grille tarifaire.
    const limiteDyn = dynLimit(prof?.plan as string)
    if (limiteDyn !== null) {
      const dejaModifiables = await countDynamicQrs(supabase, user.id)
      if (dejaModifiables >= limiteDyn) {
        return NextResponse.json(
          { error: `Limite de ${limiteDyn} QR modifiable${limiteDyn > 1 ? "s" : ""} atteinte sur votre plan. Les QR non modifiables restent disponibles.`, upgrade: true },
          { status: 403 },
        )
      }
    }
    let dest: string
    if (kind === "link") {
      const d = safeDestUrl(String(body?.dest || body?.inputs?.url || payload || ""))
      if (!d) return NextResponse.json({ error: "Lien invalide (http/https requis)." }, { status: 400 })
      dest = d
    } else {
      dest = String(body?.dest || payload || "").trim()
      if (!dest || dest.length > 4000) return NextResponse.json({ error: "Contenu du QR invalide" }, { status: 400 })
    }
    let short_code: string
    try { short_code = await uniqueShortCode(supabase) } catch (e) { return serverError("qr-instant", e) }
    // Aucune expiration à la création : `expires_at` n'existe plus que si le
    // commerçant en programme une lui-même (capacité « sécurité du lien »).
    const dynPayload = `${APP_URL}/q/${short_code}`
    const { data, error } = await supabase
      .from("instant_qrs")
      .insert({ user_id: user.id, kind, label, payload: dynPayload, inputs, style,
        dynamic: true, short_code, dest_url: dest, status: "active", expires_at: null })
      .select(COLS)
      .single()
    if (error) return serverError("qr-instant", error)
    return NextResponse.json({ ok: true, item: pub(data) })
  }

  const { data, error } = await supabase
    .from("instant_qrs")
    .insert({ user_id: user.id, kind, label, payload, inputs, style })
    .select(COLS)
    .single()
  if (error) return serverError("qr-instant", error)
  return NextResponse.json({ ok: true, item: pub(data) })
}

// PATCH — modifier un lien dynamique. Cœur : destination/label (toujours autorisé au
// propriétaire). SÉCURITÉ (mot de passe, expiration programmée, pause/reprise manuelle) :
// réservée au plan Pro et au-dessus (canDynSecurite). Propriétaire uniquement (RLS + filtre user_id).
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const id = String(body?.id || "")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  // Cible (propriétaire) — nécessaire pour les règles de quota/expiration.
  const { data: link } = await supabase
    .from("instant_qrs").select("id, dynamic, expires_at, status").eq("id", id).eq("user_id", user.id).maybeSingle()
  if (!link) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const patch: Record<string, any> = {}
  if (typeof body?.dest === "string") {
    const dest = safeDestUrl(body.dest)
    if (!dest) return NextResponse.json({ error: "Lien invalide (http/https requis)." }, { status: 400 })
    patch.dest_url = dest
  }
  if (typeof body?.label === "string") patch.label = body.label.trim().slice(0, 80) || null

  const action = body?.action as string | undefined
  const wantsSecurity = ("password" in body) || ("expires_at" in body) || action === "pause" || action === "resume"
  if (wantsSecurity) {
    const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
    if (!canDynSecurite(prof?.plan)) {
      return NextResponse.json({ error: "La sécurité du lien est réservée au plan Pro.", upgrade: true }, { status: 403 })
    }

    // Mot de passe : chaîne non vide -> hash ; vide/null -> retire le mot de passe.
    if ("password" in body) {
      const pw = typeof body.password === "string" ? body.password : ""
      if (mdpLienTropLong(pw)) return NextResponse.json({ error: `Mot de passe trop long (${LONGUEUR_MAX_MDP_LIEN} caractères maximum).` }, { status: 400 })
      patch.password_hash = pw ? hashLinkPassword(pw) : null
    }

    // Expiration programmée : ISO future, ou null/"" pour rendre permanent.
    if ("expires_at" in body) {
      if (body.expires_at === null || body.expires_at === "") patch.expires_at = null
      else {
        const t = Date.parse(String(body.expires_at))
        if (isNaN(t)) return NextResponse.json({ error: "Date d'expiration invalide." }, { status: 400 })
        if (t <= Date.now()) return NextResponse.json({ error: "La date d'expiration doit être dans le futur." }, { status: 400 })
        patch.expires_at = new Date(t).toISOString()
      }
      // Modifier l'expiration réactive un lien expiré.
      if (link.status === "expired") patch.status = "active"
    }

    // Pause / reprise MANUELLE.
    if (action === "pause") { patch.status = "paused"; patch.paused_reason = "manual" }
    if (action === "resume") {
      // Reprendre un QR modifiable ne doit pas dépasser le sous-quota `limits.dyn`.
      if (link.dynamic) {
        const lim = dynLimit(prof?.plan)
        if (lim !== null && (await countDynamicQrs(supabase, user.id)) >= lim) {
          return NextResponse.json({ error: "Quota de QR modifiables atteint — mettez-en un autre en pause d'abord." }, { status: 403 })
        }
      }
      patch.status = "active"; patch.paused_reason = null
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 })
  const { data, error } = await supabase
    .from("instant_qrs").update(patch).eq("id", id).eq("user_id", user.id).select(COLS).single()
  if (error) return serverError("qr-instant", error)
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json({ ok: true, item: pub(data) })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await req.json().catch(() => ({} as any))
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  const { data, error } = await supabase
    .from("instant_qrs").delete().eq("id", id).eq("user_id", user.id).select("id")
  if (error) return serverError("qr-instant", error)
  if (!data || data.length === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
