"use client"

// Bandeau d'erreur de paiement : rend visible un échec de checkout Stripe (sinon le bouton
// rejoue son animation puis revient à zéro sans message → l'action paraît cassée).
export default function CheckoutErrorBanner({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null
  return (
    <div role="alert" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 1000, display: "flex", alignItems: "center", gap: 12, maxWidth: "calc(100vw - 32px)", background: "#1A0F0F", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 14, padding: "13px 16px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
      <span aria-hidden style={{ fontSize: 20 }}>⚠️</span>
      <p style={{ margin: 0, color: "#F5E8E8", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{error}</p>
      <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: "#B08F8F", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  )
}
