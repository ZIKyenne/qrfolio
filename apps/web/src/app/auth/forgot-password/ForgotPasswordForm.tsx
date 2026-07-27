"use client"

import { useState } from "react"
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const FIELD: React.CSSProperties = {
  width: "100%", height: 52, boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12, padding: "0 15px", color: "#F5F0E8", fontSize: 15,
  outline: "none", fontFamily: "DM Sans, sans-serif",
}
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, color: "#C9C3B6", fontWeight: 600,
  marginBottom: 7, letterSpacing: 0.3,
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || pending) return
    setPending(true); setError(null)
    try {
      const supabase = createClient()
      // Le lien du mail passe par /auth/callback qui ouvre la session,
      // puis renvoie vers la page de choix du nouveau mot de passe.
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      // On affiche toujours le meme message (anti-enumeration des comptes).
      if (error && !/rate/i.test(error.message)) {
        setError("Une erreur est survenue. Réessayez dans un instant.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Une erreur est survenue. Réessayez dans un instant.")
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, background: "var(--success-bg, rgba(57,255,143,0.09))", border: "1px solid var(--success-border, rgba(57,255,143,0.28))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={26} color="var(--success, var(--success))" />
        </div>
        <h2 style={{ color: "#F8F4EC", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Vérifiez votre boîte mail</h2>
        <p style={{ color: "#C9C3B6", fontSize: 14, lineHeight: 1.5, margin: "0 0 6px" }}>
          Si un compte existe pour <strong style={{ color: "#F5F0E8" }}>{email.trim()}</strong>, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
        <p style={{ color: "#8A8478", fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
          Pensez à regarder vos spams. Le lien expire après un court délai.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {error && (
        <div role="alert" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 11, padding: "11px 14px", fontSize: 13.5, color: "var(--danger)", lineHeight: 1.45 }}>
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" style={LABEL}>Email du compte</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="toi@email.com" required autoComplete="email" inputMode="email" style={FIELD} />
      </div>

      <button type="submit" disabled={pending} style={{
        width: "100%", height: 52, marginTop: 4,
        background: "var(--accent, #C9A84C)", color: "#080808", border: "none",
        borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: pending ? "default" : "pointer",
        fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8, opacity: pending ? 0.75 : 1,
        boxShadow: "0 6px 20px color-mix(in srgb, var(--accent, #C9A84C) 30%, transparent)",
      }}>
        {pending
          ? <><Loader2 size={17} style={{ animation: "spin 0.7s linear infinite" }} /> Envoi…</>
          : <><Mail size={17} /> Envoyer le lien</>}
      </button>

      <a href="/auth/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#C9C3B6", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
        <ArrowLeft size={15} /> Retour à la connexion
      </a>
    </form>
  )
}
