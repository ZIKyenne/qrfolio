import type { CSSProperties } from "react"

// Filigrane de marque superposé aux APERÇUS de QR (jamais sur le fichier réellement
// créé / téléchargé, qui passe par getQRBlob). But : empêcher de récupérer un QR
// propre par simple capture d'écran de l'aperçu, et marquer la propriété QRowg.
// À poser dans un conteneur `position: relative` qui enveloppe le <QRCanvas>.
// `size` = côté du QR en px : la densité/taille du filigrane s'y adapte (vignettes ↔ grand aperçu).
export default function QrWatermark({ text = "QROWG", size = 210 }: { text?: string; size?: number }) {
  const fontSize = Math.max(6.5, Math.min(12, size / 17))
  const count = size < 120 ? 18 : 80
  const gap = size < 120 ? "5px 8px" : "9px 15px"
  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
  }
  const tile: CSSProperties = {
    position: "absolute", inset: "-45%", transform: "rotate(-30deg)",
    display: "flex", flexWrap: "wrap", gap,
    alignContent: "center", justifyContent: "center",
  }
  const word: CSSProperties = {
    fontSize, fontWeight: 800, letterSpacing: size < 120 ? 0.6 : 1.4, whiteSpace: "nowrap",
    color: "rgba(201,168,76,0.62)", textShadow: "0 1px 2px rgba(0,0,0,0.45)", userSelect: "none",
  }
  return (
    <div aria-hidden style={wrap}>
      <div style={tile}>
        {Array.from({ length: count }).map((_, i) => <span key={i} style={word}>{text}</span>)}
      </div>
    </div>
  )
}
