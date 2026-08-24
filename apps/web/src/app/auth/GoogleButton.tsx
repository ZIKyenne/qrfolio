"use client"

// GoogleButton — la dernière marche avant le compte.
//
// Après l'essai sans inscription, il restait trois champs à remplir et un mot de
// passe à inventer, juste avant la récompense. Un clic suffit désormais.
//
// Le bouton n'apparaît QUE si NEXT_PUBLIC_GOOGLE_AUTH vaut "1" : tant que le
// fournisseur Google n'est pas configuré côté Supabase, un bouton visible ne
// mènerait qu'à une erreur. L'activation reste donc une décision explicite.
//
// Deux choses doivent survivre au détour par Google :
//   • la destination (?redirect=…), sinon un visiteur revenu de Google perdrait
//     le brouillon qu'il vient de composer ;
//   • le code de parrainage (?ref=…), que Google ne transmet évidemment pas —
//     on le dépose dans un cookie court, relu au retour par /auth/callback.

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { REF_COOKIE } from "./callbackLogic"

export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"

export default function GoogleButton({ label, refCode }: { label: string; refCode?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!GOOGLE_AUTH_ENABLED) return null

  async function go() {
    setBusy(true); setError("")
    try {
      // Destination interne uniquement (jamais une URL absolue : open redirect).
      let dest = ""
      try {
        const r = new URLSearchParams(window.location.search).get("redirect") || ""
        if (r.startsWith("/") && !r.startsWith("//")) dest = r
      } catch { /* pas de query : destination par défaut */ }

      if (refCode) {
        // 30 minutes : le temps du détour par Google, pas plus.
        document.cookie = `${REF_COOKIE}=${encodeURIComponent(refCode)}; max-age=1800; path=/; SameSite=Lax`
      }

      const next = dest || "/dashboard/onboarding"
      const redirectTo = `${window.location.origin}/auth/callback?flow=oauth&next=${encodeURIComponent(next)}`
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: { prompt: "select_account" } },
      })
      if (error) { setError("La connexion Google est indisponible pour le moment."); setBusy(false) }
      // Succès : le navigateur part chez Google, rien à faire de plus ici.
    } catch {
      setError("La connexion Google est indisponible pour le moment.")
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={go} disabled={busy} aria-busy={busy}
        style={{
          width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "#FFFFFF", color: "#1F1F1F", border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 12, fontSize: 15, fontWeight: 600, fontFamily: "DM Sans, sans-serif",
          cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1,
        }}>
        <GoogleGlyph />
        <span>{busy ? "Ouverture de Google…" : label}</span>
      </button>

      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, margin: "8px 0 0", lineHeight: 1.4 }}>{error}</p>
      )}

      {/* Séparateur : le formulaire reste disponible, Google ne le remplace pas. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ color: "#8A8478", fontSize: 11.5, fontWeight: 600 }}>ou par email</span>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
      </div>
    </div>
  )
}

/** Logo Google officiel (quatre couleurs), inline pour éviter une requête. */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
