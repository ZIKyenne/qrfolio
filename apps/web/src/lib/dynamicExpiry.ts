// dynamicExpiry.ts — Fenêtre d'alerte « QR modifiable bientôt expiré ». L'expiration
// n'est plus jamais automatique : elle n'existe que si le propriétaire l'a programmée.
// Moteur PUR (aucune I/O) -> testable (dynamicExpiry.test.ts). Le cron dynamic-expiry
// lit les QR proches de l'échéance et utilise ces helpers pour décider quoi notifier.

export const DAY_MS = 24 * 60 * 60 * 1000

// Jours restants (arrondi au supérieur) avant expiration ; null si date absente/invalide.
// Négatif si déjà expiré.
export function daysUntil(expiresAtIso: string | null | undefined, now: Date): number | null {
  if (!expiresAtIso) return null
  const t = Date.parse(expiresAtIso)
  if (Number.isNaN(t)) return null
  return Math.ceil((t - now.getTime()) / DAY_MS)
}

// Palier d'alerte selon les jours restants : 2 touches (J-3 puis J-1). null = ne pas alerter.
// Les paliers distincts servent aussi de clé de dédup (une alerte par palier et par QR).
export function expiryAlertStage(daysLeft: number | null): "d3" | "d1" | null {
  if (daysLeft == null) return null
  if (daysLeft === 3) return "d3"
  if (daysLeft === 1) return "d1"
  return null
}

// Borne haute de requête (ISO) : ne charger que les QR expirant dans la fenêtre d'alerte
// (un peu plus de 3 jours, pour couvrir le palier J-3 avec l'arrondi au supérieur).
export function expiryHorizonIso(now: Date): string {
  return new Date(now.getTime() + Math.ceil(3.5 * DAY_MS)).toISOString()
}
