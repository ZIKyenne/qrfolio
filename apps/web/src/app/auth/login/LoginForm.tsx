"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react"
import { signIn } from "../actions"

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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} style={{
      width: "100%", height: 52, marginTop: 4,
      background: "var(--accent, #C9A84C)", color: "#080808", border: "none",
      borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: pending ? "default" : "pointer",
      fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8, opacity: pending ? 0.75 : 1,
      boxShadow: "0 6px 20px color-mix(in srgb, var(--accent, #C9A84C) 30%, transparent)",
    }}>
      {pending
        ? <><Loader2 size={17} style={{ animation: "mo-spin 0.7s linear infinite" }} /> Connexion…</>
        : <><LogIn size={17} /> Se connecter</>}
    </button>
  )
}

export default function LoginForm() {
  const [show, setShow] = useState(false)
  const [redirectTo, setRedirectTo] = useState("")
  useEffect(() => { setRedirectTo(new URLSearchParams(window.location.search).get("redirect") || "") }, [])
  return (
    <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{``}</style>
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      <div>
        <label htmlFor="email" style={LABEL}>Email</label>
        <input id="email" type="email" name="email" placeholder="toi@email.com" required
          autoComplete="email" inputMode="email" style={FIELD} />
      </div>

      <div>
        <label htmlFor="password" style={LABEL}>Mot de passe</label>
        <div style={{ position: "relative" }}>
          <input id="password" type={show ? "text" : "password"} name="password" placeholder="••••••••"
            required autoComplete="current-password" style={{ ...FIELD, paddingRight: 52 }} />
          <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none",
              cursor: "pointer", color: "#8A8478" }}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <a href="/auth/forgot-password" style={{ color: "#C9A84C", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Mot de passe oublié ?
          </a>
        </div>
      </div>

      <SubmitButton />
    </form>
  )
}
