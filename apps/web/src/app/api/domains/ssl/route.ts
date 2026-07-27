// app/api/domains/ssl/route.ts
// Lecture de l'état SSL d'un domaine via l'API Vercel

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { isPublicHttpUrl } from "@/lib/safeUrl"

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN ?? ""
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? ""
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID ?? ""

export type SslStatus = "active" | "pending" | "error"

export type SslInfo = {
  status:       SslStatus
  label:        string
  message:      string
  detail?:      string
  checked_at:   string
  // Données du certificat si actif
  issuer?:      string
  expiry?:      string
  days_left?:   number
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const domain = req.nextUrl.searchParams.get("domain")
  if (!domain) return NextResponse.json({ error: "domain requis" }, { status: 400 })

  // Vérifier que le domaine appartient à l'user
  const { data: rec } = await supabase
    .from("domain_verifications")
    .select("verified, domain")
    .eq("domain", domain)
    .eq("user_id", user.id)
    .single()

  if (!rec) return NextResponse.json({ error: "Domaine introuvable" }, { status: 404 })

  const checked_at = new Date().toISOString()

  // Domaine non vérifié → SSL impossible
  if (!rec.verified) {
    return NextResponse.json({
      status:    "pending",
      label:     "En attente",
      message:   "Le domaine doit être vérifié avant l'activation SSL",
      detail:    "Complétez la vérification DNS pour que Vercel puisse émettre le certificat",
      checked_at,
    } satisfies SslInfo)
  }

  // Interroger l'API Vercel pour l'état du domaine
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    // Fallback: tenter une connexion HTTPS directe
    return checkHttpsSsl(domain, checked_at)
  }

  try {
    const teamQ = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""
    const url   = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQ}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    if (!res.ok) {
      // Domaine pas encore sur Vercel
      if (res.status === 404) {
        return NextResponse.json({
          status:    "pending",
          label:     "En cours d'émission",
          message:   "Vercel n'a pas encore reçu ce domaine",
          detail:    "Le certificat sera émis automatiquement après propagation DNS (quelques minutes)",
          checked_at,
        } satisfies SslInfo)
      }
      throw new Error(`Vercel API ${res.status}`)
    }

    const data = await res.json()

    // Lire l'état SSL depuis la réponse Vercel
    const ssl = data?.ssl ?? {}

    // Pas de certif encore
    if (!ssl || ssl.state === "PENDING" || !data.verified) {
      return NextResponse.json({
        status:  "pending",
        label:   "En cours d'émission",
        message: "Le certificat SSL est en cours de création",
        detail:  "Vercel génère automatiquement un certificat Let's Encrypt. Cela prend généralement moins de 2 minutes après la vérification DNS.",
        checked_at,
      } satisfies SslInfo)
    }

    if (ssl.state === "ERROR" || data.verifiedError) {
      const errMsg = data.verifiedError?.message ?? ssl.error ?? "Erreur inconnue"
      return NextResponse.json({
        status:  "error",
        label:   "Erreur SSL",
        message: "Impossible d'émettre le certificat SSL",
        detail:  `${errMsg} — Vérifiez que votre CNAME ou A record pointe bien vers Vercel`,
        checked_at,
      } satisfies SslInfo)
    }

    // SSL actif
    const expiry    = ssl.expiresAt ? new Date(ssl.expiresAt) : null
    const daysLeft  = expiry ? Math.floor((expiry.getTime() - Date.now()) / 86400000) : null
    const expiryStr = expiry ? expiry.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : undefined

    return NextResponse.json({
      status:    "active",
      label:     "Certificat actif",
      message:   daysLeft !== null ? `Expire dans ${daysLeft} jours` : "HTTPS actif",
      detail:    "Certificat Let's Encrypt émis et renouvelé automatiquement par Vercel",
      checked_at,
      issuer:    "Let's Encrypt",
      expiry:    expiryStr,
      days_left: daysLeft ?? undefined,
    } satisfies SslInfo)

  } catch (e: any) {
    // Fallback: vérifier HTTPS directement
    return checkHttpsSsl(domain, checked_at)
  }
}

// ── Fallback: vérifier HTTPS directement ──────────────────────────────────────
async function checkHttpsSsl(domain: string, checked_at: string): Promise<Response> {
  // Garde anti-SSRF : `domain` est fourni par l'utilisateur -> on refuse les hôtes
  // non publics (localhost, IP privées, métadonnées) avant tout fetch.
  if (!isPublicHttpUrl(`https://${domain}`)) {
    return NextResponse.json({ status: "error", label: "Domaine invalide", message: "Domaine non autorisé (hôte non public).", checked_at } satisfies SslInfo)
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      // "manual" : ne pas suivre une redirection vers une cible interne (anti-SSRF).
      redirect: "manual",
    })
    clearTimeout(timer)

    if (res.ok || res.status < 400) {
      return NextResponse.json({
        status:  "active",
        label:   "Certificat actif",
        message: "HTTPS opérationnel",
        detail:  "Certificat Let's Encrypt actif et renouvelé automatiquement",
        checked_at,
        issuer:  "Let's Encrypt",
      } satisfies SslInfo)
    }

    return NextResponse.json({
      status:  "pending",
      label:   "En cours",
      message: "Le domaine répond mais le certificat est en cours d'activation",
      checked_at,
    } satisfies SslInfo)

  } catch {
    return NextResponse.json({
      status:  "pending",
      label:   "En cours d'émission",
      message: "Certificat SSL en cours de création par Vercel",
      detail:  "Le certificat est émis automatiquement après la vérification DNS. Aucune action requise.",
      checked_at,
    } satisfies SslInfo)
  }
}
