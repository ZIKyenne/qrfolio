import type { CSSProperties } from "react"

// Filigrane de marque superposé aux APERÇUS de QR (jamais sur le fichier réellement
// créé / téléchargé, qui passe par getQRBlob). Double rôle :
//  1) marquer la propriété QRowg ;
//  2) rendre l'aperçu NON SCANNABLE (voile qui casse le contraste des modules +
//     marque dense) → impossible de récupérer un QR propre par capture d'écran.
// À poser dans un conteneur `position: relative` qui enveloppe le <QRCanvas>.
// `size` = côté du QR en px : densité/taille du filigrane adaptées (vignettes ↔ grand aperçu).
export default function QrWatermark({ text = "QROWG", size = 210 }: { text?: string; size?: number }) {
  const small = size < 120
  const fontSize = Math.max(8, Math.min(15, size / 13))
  const count = small ? 26 : 96
  const gap = small ? "3px 6px" : "6px 11px"
  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
    // Voile clair : abaisse le contraste noir/blanc des modules → l'aperçu ne se scanne plus proprement.
    background: "rgba(255,255,255,0.28)",
  }
  const tile: CSSProperties = {
    position: "absolute", inset: "-45%", transform: "rotate(-30deg)",
    display: "flex", flexWrap: "wrap", gap,
    alignContent: "center", justifyContent: "center",
  }
  const word: CSSProperties = {
    fontSize, fontWeight: 900, letterSpacing: small ? 0.4 : 1.1, whiteSpace: "nowrap",
    color: "rgba(201,168,76,0.95)", textShadow: "0 1px 2px rgba(0,0,0,0.65)", userSelect: "none",
  }
  return (
    <div aria-hidden style={wrap}>
      <div style={tile}>
        {Array.from({ length: count }).map((_, i) => <span key={i} style={word}>{text}</span>)}
      </div>
    </div>
  )
}
