import type { CSSProperties } from "react"

// Filigrane de marque superposé à l'APERÇU d'un QR (jamais sur le fichier réellement
// créé / téléchargé, qui passe par getQRBlob). Rend l'aperçu NON SCANNABLE et le marque.
// Mécanique : `backdrop-filter: blur` FLOUTE le QR derrière (casse la lecture quelle que
// soit sa couleur) + voile de secours (si backdrop-filter indisponible) + rangées « QROWG ».
// À poser dans un conteneur `position: relative` qui enveloppe le QRCanvas.
// `size` = côté du QR en px (adapte flou/densité entre vignette et grand aperçu).
export default function QrWatermark({ text = "QROWG", size = 210 }: { text?: string; size?: number }) {
  const small = size < 120
  const fontSize = Math.max(7, Math.min(13, size / 15))
  const blur = small ? 1.6 : Math.max(2.4, size / 70) // ~3px sur un grand aperçu
  const rows = small ? 7 : 11
  const reps = small ? 4 : 7
  const lineText = (Array(reps).fill(text).join("   ") + "   ").repeat(2)
  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
    // Le flou de fond rend le QR illisible au scan ; le voile est un filet de sécurité.
    backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
    background: "rgba(255,255,255,0.30)",
  }
  const tile: CSSProperties = {
    position: "absolute", inset: "-30%", transform: "rotate(-30deg)",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: small ? 6 : Math.round(fontSize * 1.15),
  }
  const rowStyle: CSSProperties = {
    whiteSpace: "nowrap", fontSize, fontWeight: 800, letterSpacing: 2,
    color: "rgba(201,168,76,0.7)", textShadow: "0 1px 2px rgba(0,0,0,0.5)", userSelect: "none",
  }
  return (
    <div aria-hidden style={wrap}>
      <div style={tile}>
        {Array.from({ length: rows }).map((_, i) => <div key={i} style={rowStyle}>{lineText}</div>)}
      </div>
    </div>
  )
}
