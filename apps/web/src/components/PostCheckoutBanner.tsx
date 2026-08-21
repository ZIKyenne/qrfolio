"use client"

// Bandeau de confirmation après un paiement Stripe réussi (success_url ?upgraded=true / ?dyn_upgraded=true).
// Rassure le client à l'instant le plus sensible : « mon paiement est-il bien passé ? ».
import { useEffect, useState } from "react"

export default function PostCheckoutBanner({ param, message }: { param: string; message: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get(param) === "true") setShow(true) } catch {}
  }, [param])
  if (!show) return null
  return (
    <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 1000, display: "flex", alignItems: "center", gap: 12, maxWidth: "calc(100vw - 32px)", background: "#0F1A12", border: "1px solid rgba(62,224,138,0.35)", borderRadius: 14, padding: "13px 16px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
      <span aria-hidden style={{ fontSize: 20 }}>✅</span>
      <p style={{ margin: 0, color: "#E8F5EC", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{message}</p>
      <button onClick={() => setShow(false)} aria-label="Fermer" style={{ background: "none", border: "none", color: "#8FA894", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  )
}
