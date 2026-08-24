// callbackLogic.ts — les décisions du retour d'authentification, isolées et pures.
//
// La route /auth/callback ne faisait qu'une chose : échanger le code d'un lien
// email. Elle sert maintenant aussi au retour de Google, ce qui change trois
// règles — et chacune mérite d'être testable sans navigateur ni Supabase.

/** Cookie de parrainage : posé avant le détour par Google, relu une seule fois au retour. */
export const REF_COOKIE = "qrowg_ref"

/** Ne redirige que vers l'intérieur du site : un `next` externe serait un open redirect. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  const n = (next || "").trim()
  if (!n.startsWith("/") || n.startsWith("//")) return fallback
  return n
}

/**
 * Où renvoyer quand l'échange échoue. Un lien de réinitialisation périmé doit
 * ramener vers « mot de passe oublié » ; un retour de Google qui tourne mal doit
 * ramener à la connexion — l'envoyer sur « mot de passe oublié » n'aurait aucun
 * sens pour quelqu'un qui n'a jamais eu de mot de passe.
 */
export function errorRedirect(flow: "oauth" | "email", next: string | null | undefined): string {
  const msg = flow === "oauth"
    ? "La connexion Google n'a pas abouti. Réessayez, ou créez un compte par email."
    : "Lien invalide ou expiré. Merci de refaire une demande."
  if (flow === "email") return `/auth/forgot-password?error=${encodeURIComponent(msg)}`
  const dest = safeNext(next, "")
  const back = dest ? `&redirect=${encodeURIComponent(dest)}` : ""
  return `/auth/login?error=${encodeURIComponent(msg)}${back}`
}

/**
 * Compte tout juste créé ? Sur la première connexion, l'inscription et la
 * connexion sont séparées par quelques millisecondes ; ensuite, `last_sign_in_at`
 * s'éloigne définitivement de `created_at`. Sert à n'envoyer l'email de bienvenue
 * qu'une fois, sans ajouter de colonne en base.
 */
export function isBrandNew(user: { created_at?: string | null; last_sign_in_at?: string | null } | null): boolean {
  if (!user?.created_at) return false
  const created = Date.parse(user.created_at)
  if (Number.isNaN(created)) return false
  const signed = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : created
  if (Number.isNaN(signed)) return false
  return Math.abs(signed - created) < 10_000
}

/** Nom affichable d'un compte Google, quel que soit le champ renseigné. */
export function displayName(user: { user_metadata?: Record<string, any> | null; email?: string | null } | null): string {
  const m = user?.user_metadata || {}
  const n = [m.full_name, m.name, m.given_name].find(v => typeof v === "string" && v.trim())
  if (n) return String(n).trim().slice(0, 80)
  const mail = (user?.email || "").split("@")[0]
  return mail ? mail.slice(0, 80) : ""
}

/** Code de parrainage recevable : même forme que celle acceptée à l'inscription. */
export function cleanRefCode(v: string | null | undefined): string {
  const s = (v || "").trim().toLowerCase()
  return /^[a-z0-9_-]{3,40}$/.test(s) ? s : ""
}
