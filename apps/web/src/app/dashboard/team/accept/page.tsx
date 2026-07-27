"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, Check, AlertTriangle, Loader2 } from "lucide-react"

const GOLD = "#C9A84C"

export default function AcceptInvitePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "auth">("loading")
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) { setStatus("error"); setMsg("Lien d'invitation invalide."); return }
    fetch("/api/team/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 401) { setStatus("auth"); return }
        if (!r.ok) throw new Error(d.error || "Erreur")
        setStatus("ok")
      })
      .catch(e => { setStatus("error"); setMsg((e as Error).message || "Erreur") })
  }, [])

  const wrap: React.CSSProperties = { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif" }
  const card: React.CSSProperties = { background: "#0F0E0B", border: "1px solid rgba(201,168,76,0.16)", borderRadius: 18, padding: "36px 32px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }
  const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, padding: "12px 24px", borderRadius: 11, background: "linear-gradient(135deg,#EBCE72,#C9A84C)", color: "#0A0A0A", fontWeight: 700, fontSize: 14, textDecoration: "none" }

  return (
    <div style={wrap}>
      <div style={card}>
        {status === "loading" && (
          <>
            <Loader2 size={30} color={GOLD} style={{ animation: "qfspin 1s linear infinite" }} />
            <style>{`@keyframes qfspin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: "#8A8478", marginTop: 16 }}>Validation de l'invitation…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(57,255,143,0.14)", border: "1px solid rgba(57,255,143,0.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><Check size={26} color="#39FF8F" /></div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 23, color: "#F5F0E8", margin: "18px 0 8px" }}>Bienvenue dans l'équipe !</h1>
            <p style={{ color: "#8A8478", fontSize: 14, margin: 0 }}>Vous avez désormais accès aux pages et QR codes partagés.</p>
            <Link href="/dashboard" style={btn}><Users size={16} /> Aller au tableau de bord</Link>
          </>
        )}
        {status === "auth" && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><Users size={24} color={GOLD} /></div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#F5F0E8", margin: "18px 0 8px" }}>Connectez-vous d'abord</h1>
            <p style={{ color: "#8A8478", fontSize: 14, margin: 0 }}>Connectez-vous (ou créez un compte avec l'adresse invitée), puis rouvrez ce lien.</p>
            <Link href={`/auth/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard/team")}`} style={btn}>Se connecter</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.35)", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><AlertTriangle size={24} color="#FF6B6B" /></div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#F5F0E8", margin: "18px 0 8px" }}>Invitation indisponible</h1>
            <p style={{ color: "#8A8478", fontSize: 14, margin: 0 }}>{msg}</p>
            <Link href="/dashboard" style={btn}>Retour au tableau de bord</Link>
          </>
        )}
      </div>
    </div>
  )
}
