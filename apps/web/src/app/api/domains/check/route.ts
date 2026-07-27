// app/api/domains/check/route.ts
// Vérification DNS complète: TXT ownership + CNAME + A record + accessibilité HTTP

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import dns from "dns/promises"
import { isPublicHttpUrl } from "@/lib/safeUrl"

// ── Types ─────────────────────────────────────────────────────────────────────
export type CheckStatus = "ok" | "pending" | "error"

export type DnsCheck = {
  id:       string
  label:    string
  status:   CheckStatus
  message:  string
  detail?:  string
  found?:   string
  expected?: string
}

export type CheckResult = {
  domain:   string
  allOk:    boolean
  checks:   DnsCheck[]
  canVerify: boolean  // true si TXT ok → on peut activer
}

// ── IPs officielles Vercel ────────────────────────────────────────────────────
const VERCEL_IPS = [
  "76.76.21.21",   // A record Vercel principal
  "76.76.21.22",
]
const VERCEL_CNAME = "cname.vercel-dns.com"

// ── Résoudre avec timeout ─────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("DNS timeout")), ms)
    ),
  ])
}

// ── Check 1: TXT ownership ────────────────────────────────────────────────────
async function checkTxt(domain: string, expected: string): Promise<DnsCheck> {
  try {
    const records = await withTimeout(dns.resolveTxt(domain))
    const flat    = records.map(r => r.join(""))
    const found   = flat.find(r => r.includes("qrowg-verify="))
    const match   = flat.some(r => r.includes(expected))

    if (match) {
      return {
        id: "txt", label: "Vérification propriété",
        status: "ok",
        message: "Enregistrement TXT trouvé et valide",
        found: `qrowg-verify=${expected}`,
      }
    }

    if (found) {
      return {
        id: "txt", label: "Vérification propriété",
        status: "error",
        message: "Enregistrement TXT trouvé mais valeur incorrecte",
        found,
        expected: `qrowg-verify=${expected}`,
        detail: "Supprimez l'ancien enregistrement et recréez-le avec la bonne valeur",
      }
    }

    return {
      id: "txt", label: "Vérification propriété",
      status: "pending",
      message: "Enregistrement TXT non trouvé",
      expected: `qrowg-verify=${expected}`,
      detail: "Ajoutez un enregistrement TXT @ avec cette valeur dans votre gestionnaire DNS",
    }
  } catch (e: any) {
    const isNxDomain = e.message?.includes("ENOTFOUND") || e.message?.includes("ENODATA")
    return {
      id: "txt", label: "Vérification propriété",
      status: "pending",
      message: isNxDomain ? "Domaine introuvable — vérifiez l'orthographe" : "Impossible de résoudre le domaine",
      detail: e.message?.includes("timeout") ? "Délai DNS dépassé — réessayez dans quelques instants" : e.message,
    }
  }
}

// ── Check 2: CNAME ────────────────────────────────────────────────────────────
async function checkCname(domain: string): Promise<DnsCheck> {
  // Essayer www.domain si pas de CNAME sur la racine (CNAME interdit sur apex)
  const targets = domain.startsWith("www.") ? [domain] : [`www.${domain}`, domain]

  for (const target of targets) {
    try {
      const records = await withTimeout(dns.resolveCname(target))
      const found   = records[0] ?? ""

      if (found.includes("vercel") || found.includes(VERCEL_CNAME.replace(".com", ""))) {
        return {
          id: "cname", label: "Enregistrement CNAME",
          status: "ok",
          message: `CNAME correctement pointé vers Vercel`,
          found,
          expected: VERCEL_CNAME,
        }
      }

      return {
        id: "cname", label: "Enregistrement CNAME",
        status: "error",
        message: "CNAME pointe vers un serveur incorrect",
        found,
        expected: VERCEL_CNAME,
        detail: `Modifiez votre CNAME pour pointer vers ${VERCEL_CNAME}`,
      }
    } catch {
      // Pas de CNAME → vérifier A record
    }
  }

  return {
    id: "cname", label: "Enregistrement CNAME",
    status: "pending",
    message: "Aucun CNAME trouvé",
    expected: VERCEL_CNAME,
    detail: `Ajoutez un CNAME "www" pointant vers ${VERCEL_CNAME}`,
  }
}

// ── Check 3: A record ─────────────────────────────────────────────────────────
async function checkARecord(domain: string): Promise<DnsCheck> {
  // Domaine racine (apex) — CNAME interdit → A record obligatoire
  const apex = domain.replace(/^www\./, "")

  try {
    const records = await withTimeout(dns.resolve4(apex))
    const found   = records[0] ?? ""

    if (VERCEL_IPS.includes(found)) {
      return {
        id: "arecord", label: "Enregistrement A (domaine racine)",
        status: "ok",
        message: "A record pointé vers Vercel",
        found,
        expected: VERCEL_IPS[0],
      }
    }

    // IP non-Vercel mais A record présent
    return {
      id: "arecord", label: "Enregistrement A (domaine racine)",
      status: "error",
      message: "A record pointe vers une IP incorrecte",
      found,
      expected: VERCEL_IPS[0],
      detail: `Modifiez votre A record @ pour pointer vers ${VERCEL_IPS[0]}`,
    }
  } catch (e: any) {
    const isNxDomain = e.message?.includes("ENOTFOUND") || e.message?.includes("ENODATA")
    return {
      id: "arecord", label: "Enregistrement A (domaine racine)",
      status: isNxDomain ? "pending" : "pending",
      message: "Aucun A record trouvé",
      expected: VERCEL_IPS[0],
      detail: `Ajoutez un A record @ pointant vers ${VERCEL_IPS[0]} (pour le domaine racine sans www)`,
    }
  }
}

// ── Check 4: Accessibilité HTTP ───────────────────────────────────────────────
async function checkHttp(domain: string): Promise<DnsCheck> {
  const urls = [`https://${domain}`, `https://www.${domain}`]

  for (const url of urls) {
    // Garde anti-SSRF : `domain` vient de l'utilisateur -> on ignore les hôtes non publics.
    if (!isPublicHttpUrl(url)) continue
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(url, {
        method:   "HEAD",
        // "manual" (et pas "follow") : `isPublicHttpUrl` ne valide que le 1er saut ;
        // suivre les redirections laisserait un domaine renvoyer vers une IP interne
        // (169.254.169.254, …) = SSRF. Un 3xx est déjà traité comme un succès plus bas.
        redirect: "manual",
        signal:   controller.signal,
        headers:  { "User-Agent": "QRowg-DomainCheck/1.0" },
      })
      clearTimeout(timer)

      if (res.ok || res.status === 301 || res.status === 302 || res.status === 200) {
        return {
          id: "http", label: "Accessibilité HTTPS",
          status: "ok",
          message: `Domaine accessible (HTTP ${res.status})`,
          found: url,
        }
      }

      return {
        id: "http", label: "Accessibilité HTTPS",
        status: "error",
        message: `Domaine répond avec une erreur HTTP ${res.status}`,
        detail: "Vérifiez que le domaine est correctement configuré sur Vercel",
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        return {
          id: "http", label: "Accessibilité HTTPS",
          status: "pending",
          message: "Délai de connexion dépassé",
          detail: "Le domaine n'est pas encore accessible. La propagation DNS peut prendre jusqu'à 48h.",
        }
      }
    }
  }

  return {
    id: "http", label: "Accessibilité HTTPS",
    status: "pending",
    message: "Domaine non accessible pour l'instant",
    detail: "La propagation DNS peut prendre de quelques minutes à 48h selon votre fournisseur.",
  }
}

// ── GET /api/domains/check?domain=xxx ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const domain = req.nextUrl.searchParams.get("domain")
  if (!domain) return NextResponse.json({ error: "domain requis" }, { status: 400 })

  // Récupérer le token TXT attendu
  const { data: rec } = await supabase
    .from("domain_verifications")
    .select("txt_record, verified")
    .eq("domain", domain)
    .eq("user_id", user.id)
    .single()

  if (!rec) return NextResponse.json({ error: "Domaine introuvable" }, { status: 404 })

  // Déjà vérifié → retourner directement
  if (rec.verified) {
    const checks: DnsCheck[] = [
      { id: "txt",     label: "Vérification propriété",       status: "ok", message: "Propriété vérifiée" },
      { id: "cname",   label: "Enregistrement CNAME",         status: "ok", message: "CNAME configuré" },
      { id: "arecord", label: "Enregistrement A (domaine racine)", status: "ok", message: "A record configuré" },
      { id: "http",    label: "Accessibilité HTTPS",          status: "ok", message: "Domaine actif et accessible" },
    ]
    return NextResponse.json({ domain, allOk: true, checks, canVerify: true } satisfies CheckResult)
  }

  // Lancer les 4 vérifications en parallèle
  const [txt, cname, arecord, http] = await Promise.all([
    checkTxt(domain, rec.txt_record),
    checkCname(domain),
    checkARecord(domain),
    checkHttp(domain),
  ])

  const checks   = [txt, cname, arecord, http]
  const allOk    = checks.every(c => c.status === "ok")
  const canVerify = txt.status === "ok"

  // Si TXT ok → activer automatiquement dans Supabase
  if (canVerify && !rec.verified) {
    await supabase
      .from("domain_verifications")
      .update({ verified: true, verified_at: new Date().toISOString(), vercel_status: "active" })
      .eq("domain", domain)
      .eq("user_id", user.id)
  }

  return NextResponse.json({ domain, allOk, checks, canVerify } satisfies CheckResult)
}
