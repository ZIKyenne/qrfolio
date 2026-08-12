import type { CSSProperties } from "react"

// Filigrane de marque superposé à l'APERÇU d'un QR (jamais sur le fichier réellement
// créé / téléchargé, qui passe par getQRBlob). But : empêcher de récupérer un QR
// propre par simple capture d'écran de l'aperçu, et marquer clairement la marque.
// Rendu net : quelques rangées diagonales de « QROWG · » (pas une bouillie dense).
// À poser dans un conteneur `position: relative` qui enveloppe le QRCanvas.
// `size` = côté du QR en px (adapte taille/densité entre vignette et grand aperçu).
export default function QrWatermark({ text = "QROWG", size = 210 }: { text?: string; size?: number }) {
  const small = size < 120
  const fontSize = Math.max(7, Math.min(13, size / 15))
  const rows = small ? 7 : 11
  const reps = small ? 4 : 7
  const line = (Array(reps).fill(text).join("   ") + "   ").repeat(2)
  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
    // Voile : abaisse assez le contraste des modules pour que l'aperçu NE SE SCANNE PLUS,
    // tout en restant lisible (aspect « aperçu protégé », pas la bouillie dense).
    background: "rgba(255,255,255,0.42)",
  }
  const tile: CSSProperties = {
    position: "absolute", inset: "-30%", transform: "rotate(-30deg)",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: small ? 6 : Math.round(fontSize * 1.15),
  }
  const rowStyle: CSSProperties = {
    whiteSpace: "nowrap", fontSize, fontWeight: 700, letterSpacing: 2,
    color: "rgba(201,168,76,0.55)", textShadow: "0 1px 1px rgba(0,0,0,0.35)", userSelect: "none",
  }
  return (
    <div aria-hidden style={wrap}>
      <div style={tile}>
        {Array.from({ length: rows }).map((_, i) => <div key={i} style={rowStyle}>{line}</div>)}
      </div>
    </div>
  )
}
