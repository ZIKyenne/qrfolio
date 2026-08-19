// Rate-limiter à fenêtre fixe.
//
// Deux back-ends, transparents pour l'appelant :
//  1. Upstash Redis (REST) — store PARTAGÉ entre toutes les instances serverless,
//     persistant au cold start. Actif dès que UPSTASH_REDIS_REST_URL +
//     UPSTASH_REDIS_REST_TOKEN sont posés (aucune dépendance npm : appel REST direct).
//  2. Repli en mémoire (best-effort) — utilisé si Upstash n'est pas configuré, ou
//     en cas d'erreur réseau Upstash (fail-safe : on retombe sur la protection
//     locale plutôt que d'ouvrir en grand).
//
// Sémantique commune : `rateLimit(key, max, windowMs)` renvoie `true` si l'appel
// est AUTORISÉ. Les `max` premiers appels de la fenêtre passent, le (max+1)ᵉ est
// bloqué. La fenêtre expire `windowMs` ms après le premier appel.

import crypto from "node:crypto"

const buckets = new Map<string, { count: number; reset: number }>()

function memoryAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const e = buckets.get(key)
  if (!e || now > e.reset) {
    // Balayage opportuniste des entrées expirées : borne la Map (évite une fuite
    // mémoire sur une instance chaude voyant beaucoup d'IP/clés distinctes).
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (e.count >= max) return false
  e.count++
  return true
}

function upstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// Fenêtre fixe distribuée : INCR le compteur, puis pose le TTL uniquement au
// premier passage (EXPIRE ... NX). Un seul aller-retour via le pipeline REST.
async function upstashAllow(key: string, max: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const rlKey = `rl:${key}`

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", rlKey],
      ["EXPIRE", rlKey, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`upstash ${res.status}`)

  // Réponse pipeline : [{ result: <count> }, { result: 0|1 }]
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>
  if (!Array.isArray(data) || data[0]?.error) throw new Error(data?.[0]?.error || "upstash bad response")
  // Si l'EXPIRE (2e commande) a échoué, la clé peut rester SANS TTL → compteur
  // jamais réinitialisé → blocage permanent. On lève pour retomber sur le repli
  // mémoire (fail-safe) plutôt que de faire confiance à un compteur qui ne
  // redescendra jamais.
  if (data[1]?.error) throw new Error(`upstash expire: ${data[1].error}`)
  const count = Number(data[0]?.result)
  // Réponse 2xx malformée (result absent/non numérique) → fail-safe, pas fail-open.
  if (!Number.isFinite(count)) throw new Error("upstash bad count")
  return count <= max
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  if (upstashConfigured()) {
    try {
      return await upstashAllow(key, max, windowMs)
    } catch {
      // Erreur réseau/Upstash : on retombe sur le limiteur local (fail-safe).
      return memoryAllow(key, max, windowMs)
    }
  }
  return memoryAllow(key, max, windowMs)
}

export function ipOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

// Vrai si l'appelant serveur fournit le bon jeton interne (routes non exposées
// au client : welcome, first-scan, subscription). Réutilise CRON_SECRET.
export function hasInternalToken(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const token = req.headers.get("x-internal-token")
  if (!token) return false
  const actual = crypto.createHash('sha256').update(token).digest()
  const expected = crypto.createHash('sha256').update(secret).digest()
  return crypto.timingSafeEqual(actual, expected)
}
