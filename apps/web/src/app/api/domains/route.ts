// app/api/domains/route.ts
// CRUD domaines + vérification DNS + ajout Vercel

import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { serverError } from "@/lib/apiError"
import dns from "dns/promises"
import { normalizeDomain, isValidDomain } from "@/lib/domain"
import { PLANS } from "@/lib/plans"

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN ?? ""
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? ""
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID ?? ""

function vercelHeaders() {
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  }
}

// ── Ajouter le domaine sur Vercel ──────────────────────────────────────────────
async function addToVercel(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, error: "VERCEL_TOKEN ou VERCEL_PROJECT_ID manquant" }
  }
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`
    + (VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "")

  const res = await fetch(url, {
    method:  "POST",
    headers: vercelHeaders(),
    body:    JSON.stringify({ name: domain }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message ?? `HTTP ${res.status}`
    // Domaine déjà présent = OK
    if (msg.includes("already exists")) return { ok: true }
    return { ok: false, error: msg }
  }
  return { ok: true }
}

// ── Supprimer de Vercel ────────────────────────────────────────────────────────
async function removeFromVercel(domain: string): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return
  const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`
    + (VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "")
  await fetch(url, { method: "DELETE", headers: vercelHeaders() })
}

// ── Vérifier le TXT DNS ───────────────────────────────────────────────────────
async function verifyTxtRecord(domain: string, expected: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain)
    return records.some(r => r.join("").includes(expected))
  } catch {
    return false
  }
}

// ── GET: liste les domaines de l'utilisateur ──────────────────────────────────
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { data } = await supabase
    .from("domain_verifications")
    .select("*, pages(title, slug)").order("is_primary", { ascending: false })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ domains: data ?? [] })
}

// ── POST: ajouter un domaine ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { page_id, action } = body
  // Un seul point de normalisation : `Mon-Site.FR ` et `mon-site.fr` sont le même
  // domaine, pour la vérification comme pour le choix du principal.
  const domain = typeof body.domain === "string" ? normalizeDomain(body.domain) : ""
  if (domain && !isValidDomain(domain)) return NextResponse.json({ error: "Format de domaine invalide" }, { status: 400 })

  // ── Action: vérifier DNS ──────────────────────────────────────────────────
  if (action === "verify") {
    if (!domain) return NextResponse.json({ error: "domain requis" }, { status: 400 })

    const { data: existing } = await supabase
      .from("domain_verifications")
      .select("txt_record, id, page_id")
      .eq("domain", domain)
      .eq("user_id", user.id)
      .single()

    if (!existing) return NextResponse.json({ error: "Domaine introuvable" }, { status: 404 })

    const ok = await verifyTxtRecord(domain, existing.txt_record)
    if (!ok) {
      return NextResponse.json({
        verified: false,
        message: `Enregistrement TXT non trouvé. Ajoutez: qrowg-verify=${existing.txt_record}`,
      })
    }

    // Revendiquer le domaine (verified=true) AVANT tout appel externe. L'index
    // unique partiel `(domain) where verified` rejette (23505) si un AUTRE compte
    // l'a déjà vérifié → anti-squatting, message propre plutôt qu'une erreur 500.
    // L'état d'une vérification (verified, is_primary…) est verrouillé en base
    // pour tout rôle sauf le service role (migration 20260904120000) : le
    // serveur, qui vient de contrôler le DNS, écrit avec le client admin — en
    // gardant le filtre user_id, puisque l'admin ne passe pas par la RLS.
    const admin = createAdminClient()
    const { error: claimErr } = await admin
      .from("domain_verifications")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
    if (claimErr) {
      if (claimErr.code === "23505") {
        return NextResponse.json({ error: "Ce domaine est déjà vérifié par un autre compte." }, { status: 409 })
      }
      return NextResponse.json({ error: "Vérification impossible." }, { status: 500 })
    }

    // Ajouter sur Vercel (après revendication réussie).
    const vercel = await addToVercel(domain)
    await supabase
      .from("domain_verifications")
      .update({
        vercel_status: vercel.ok ? "active" : "error",
        vercel_error:  vercel.error ?? null,
      })
      .eq("id", existing.id)

    // Mettre à jour pages.custom_domain — sur la page rattachée à la vérification
    // (`existing.id` était l'identifiant de la vérification, pas d'une page :
    // custom_domain n'était jamais renseigné).
    const pageCible = page_id || existing.page_id
    if (vercel.ok && pageCible) {
      await supabase
        .from("pages")
        .update({ custom_domain: domain })
        .eq("id", pageCible)
        .eq("user_id", user.id)
    }

    return NextResponse.json({ verified: true, vercel_ok: vercel.ok, vercel_error: vercel.error })
  }

  // ── Action: définir domaine principal ────────────────────────────────────
  if (action === "set_primary") {
    if (!domain) return NextResponse.json({ error: "domain requis" }, { status: 400 })

    // 1. Récupérer tous les domaines vérifiés de l'user
    const { data: allDomains } = await supabase
      .from("domain_verifications")
      .select("domain, is_primary")
      .eq("user_id", user.id)
      .eq("verified", true)

    // is_primary est verrouillé en base hors service role, et un index unique
    // partiel interdit deux principaux : les deux écritures (retirer l'ancien,
    // poser le nouveau) passent par UNE fonction transactionnelle, appelée avec
    // la clé de service (migration 20260905130000).
    const admin = createAdminClient()
    const { data: pose, error: pe } = await admin.rpc("definir_domaine_principal", { p_user: user.id, p_domain: domain })
    if (pe) return NextResponse.json({ error: "Impossible de définir ce domaine comme principal." }, { status: 500 })
    if (pose !== true) return NextResponse.json({ error: "Ce domaine n'est pas un domaine vérifié de votre compte." }, { status: 404 })

    // 4. Créer des redirections 301 automatiques:
    //    tous les autres domaines vérifiés → domaine principal
    const otherDomains = (allDomains ?? []).filter(d => d.domain !== domain)

    for (const other of otherDomains) {
      await supabase
        .from("domain_redirects")
        .upsert({
          user_id:       user.id,
          from_domain:   other.domain,
          from_path:     "/",
          to_url:        `https://${domain}`,
          redirect_type: 301,
          label:         `Auto — redirection vers domaine principal ${domain}`,
          enabled:       true,
        }, { onConflict: "from_domain,from_path" })
    }

    return NextResponse.json({
      ok:             true,
      primary:        domain,
      redirected:     otherDomains.map(d => d.domain),
    })
  }

  // ── Action: ajouter ──────────────────────────────────────────────────────
  if (!domain || !page_id) {
    return NextResponse.json({ error: "domain et page_id requis" }, { status: 400 })
  }

  // Vérifier la limite par plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single()

  const userPlan = profile?.plan ?? "free"

  // Limites par défaut (code) : robuste si la table plan_domain_limits est vide
  // ou n'a pas la ligne du plan. -1 = illimité.
  const DEFAULT_DOMAIN_LIMITS: Record<string, number> = { free: 0, starter: 0, pro: 1, business: -1 }

  const { data: limitRow } = await supabase
    .from("plan_domain_limits")
    .select("max_domains")
    .eq("plan", userPlan)
    .maybeSingle()

  const maxDomains = limitRow?.max_domains ?? DEFAULT_DOMAIN_LIMITS[userPlan] ?? 0

  if (maxDomains === 0) {
    return NextResponse.json({
      error: `Les domaines personnalisés sont inclus à partir du plan ${PLANS.pro.label}.`,
      upgrade_required: true,
    }, { status: 403 })
  }

  if (maxDomains !== -1) {
    const { count } = await supabase
      .from("domain_verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
    if ((count ?? 0) >= maxDomains) {
      return NextResponse.json({
        error: `Limite atteinte (${maxDomains} domaine${maxDomains > 1 ? "s" : ""} max sur votre plan). Le plan ${PLANS.business.label} n'a pas de limite.`,
        upgrade_required: true,
        limit: maxDomains,
      }, { status: 403 })
    }
  }

  // Déjà normalisé et validé en tête de route.
  const cleanDomain = domain

  // Vérifier que la page appartient à l'user
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", page_id)
    .eq("user_id", user.id)
    .single()
  if (!page) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

  // Générer token de vérification
  const token = `qrv_${randomBytes(16).toString("hex")}`

  const { data, error } = await supabase
    .from("domain_verifications")
    .upsert({
      user_id:    user.id,
      page_id,
      domain:     cleanDomain,
      txt_record: token,
      verified:   false,
      vercel_status: "pending",
      is_primary: false,
    }, { onConflict: "user_id,domain" })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce domaine est déjà vérifié par un autre compte" }, { status: 409 })
    }
    return serverError("domains", error)
  }

  return NextResponse.json({ domain: data })
}

// ── DELETE: supprimer un domaine ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const { data: existing } = await supabase
    .from("domain_verifications")
    .select("domain, page_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await removeFromVercel(existing.domain)

  await supabase
    .from("pages")
    .update({ custom_domain: null })
    .eq("id", existing.page_id)
    .eq("user_id", user.id)

  const { error: de } = await supabase
    .from("domain_verifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (de) return NextResponse.json({ error: "Le domaine n'a pas pu être supprimé." }, { status: 500 })

  return NextResponse.json({ ok: true })
}
