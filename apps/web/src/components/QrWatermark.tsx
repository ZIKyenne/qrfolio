import type { CSSProperties } from "react"

// Filigrane de marque superposé aux APERÇUS de QR (jamais sur le fichier réellement
// créé / téléchargé, qui passe par getQRBlob). But : empêcher de récupérer un QR
// propre par simple capture d'écran de l'aperçu, et marquer la propriété QRowg.
// À poser dans un conteneur `position: relative` qui enveloppe le <QRCanvas>.
export default function QrWatermark({ text = "QROWG" }: { text?: string }) {
  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
  }
  const tile: CSSProperties = {
    position: "absolute", inset: "-45%", transform: "rotate(-30deg)",
    display: "flex", flexWrap: "wrap", gap: "9px 15px",
    alignContent: "center", justifyContent: "center",
  }
  const word: CSSProperties = {
    fontSize: 12, fontWeight: 800, letterSpacing: 1.4, whiteSpace: "nowrap",
    color: "rgba(201,168,76,0.62)", textShadow: "0 1px 2px rgba(0,0,0,0.45)", userSelect: "none",
  }
  return (
    <div aria-hidden style={wrap}>
      <div style={tile}>
        {Array.from({ length: 80 }).map((_, i) => <span key={i} style={word}>{text}</span>)}
      </div>
    </div>
  )
}
