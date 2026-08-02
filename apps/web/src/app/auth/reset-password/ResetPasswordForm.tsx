"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound } from "lucide-react"
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

export default function ResetPasswordForm() {
  const router = useRouter()
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking")
  const [pwd, setPwd] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verifie qu'une session de recuperation est bien ouverte (via /auth/callback).
  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setPhase(data.user ? "ready" : "invalid")
    })
    return () => { active = false }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    if (pwd.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return }
    if (pwd !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return }
    setPending(true); setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pwd })
      if (error) {
        setError(/same/i.test(error.message)
          ? "Choisissez un mot de passe différent de l'ancien."
          : "La mise à jour a échoué. Le lien a peut-être expiré.")
      } else {
        setDone(true)
        setTimeout(() => router.replace("/dashboard"), 1200)
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setPending(false)
    }
  }

  if (phase === "checking") {
    return (
      <div style={{ textAlign: "center", padding: "18px 0", color: "#C9C3B6", fontSize: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Loader2 size={22} style={{ animation: "mo-spin 0.7s linear infinite" }} />
        Vérification du lien…
        <style>{``}</style>
      </div>
    )
  }

  if (phase === "invalid") {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ color: "#F8F4EC", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Lien invalide ou expiré</h2>
        <p style={{ color: "#C9C3B6", fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" }}>
          Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau.
        </p>
        <a href="/auth/forgot-password" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, padding: "0 22px", background: "var(--accent, #C9A84C)", color: "#080808", borderRadius: 12, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
          <KeyRound size={16} /> Nouvelle demande
        </a>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, background: "var(--success-bg, rgba(57,255,143,0.09))", border: "1px solid var(--success-border, rgba(57,255,143,0.28))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={26} color="var(--success, var(--success))" />
        </div>
        <h2 style={{ color: "#F8F4EC", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Mot de passe mis à jour</h2>
        <p style={{ color: "#C9C3B6", fontSize: 14, lineHeight: 1.5, margin: 0 }}>Redirection vers votre tableau de bord…</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{``}</style>
      {error && (
        <div role="alert" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 11, padding: "11px 14px", fontSize: 13.5, color: "var(--danger)", lineHeight: 1.45 }}>
          {error}
        </div>
      )}
      <div>
        <label htmlFor="pwd" style={LABEL}>Nouveau mot de passe</label>
        <div style={{ position: "relative" }}>
          <input id="pwd" type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="8 caractères minimum" required minLength={8} autoComplete="new-password" style={{ ...FIELD, paddingRight: 52 }} />
          <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#8A8478" }}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" style={LABEL}>Confirmer le mot de passe</label>
        <input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Retapez le mot de passe" required minLength={8} autoComplete="new-password" style={FIELD} />
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
          ? <><Loader2 size={17} style={{ animation: "mo-spin 0.7s linear infinite" }} /> Mise à jour…</>
          : <><ShieldCheck size={17} /> Mettre à jour</>}
      </button>
    </form>
  )
}
