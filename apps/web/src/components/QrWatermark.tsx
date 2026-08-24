import type { CSSProperties } from "react"
import { watermarkGeometry } from "./qrWatermark"

// Filigrane de marque superposé à l'APERÇU d'un QR — jamais sur le fichier créé /
// téléchargé, qui passe par getQRBlob et reste, lui, parfaitement propre.
//
// Un seul ruban en travers de la diagonale bas-gauche → haut-droite : il efface deux
// des trois yeux de détection, ce qui rend l'aperçu introuvable pour un lecteur, et
// laisse le reste du code NET — couleurs, forme des modules, logo, style de coin en
// haut à gauche. Le raisonnement complet est dans ./qrWatermark.ts.
//
// À poser dans un conteneur `position: relative` qui enveloppe le QRCanvas.
// `size` = côté du QR en px (le ruban et son texte s'y adaptent).
export default function QrWatermark({ text = "QROWG", size = 210 }: { text?: string; size?: number }) {
  const g = watermarkGeometry(size)
  const gold = "#C9A84C"

  const wrap: CSSProperties = {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
    borderRadius: "inherit",
  }

  // Le ruban : une bande horizontale centrée, pivotée de 45° dans le sens inverse
  // des aiguilles — elle rejoint donc le coin bas-gauche au coin haut-droite.
  // Elle déborde largement en largeur pour que ses extrémités sortent du cadre.
  const ribbon: CSSProperties = {
    position: "absolute", left: "-30%", right: "-30%", top: "50%",
    height: g.band, marginTop: -g.half,
    transform: "rotate(-45deg)",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(180deg, #101010 0%, #050505 100%)",
    borderTop: `1px solid ${gold}`, borderBottom: `1px solid ${gold}`,
    boxShadow: "0 6px 22px rgba(0,0,0,0.45)",
  }

  const label: CSSProperties = {
    color: gold, fontSize: g.fontSize, fontWeight: 800,
    letterSpacing: g.letterSpacing, whiteSpace: "nowrap", userSelect: "none",
    fontFamily: "DM Sans, sans-serif", textTransform: "uppercase",
  }

  return (
    <div aria-hidden style={wrap}>
      <div style={ribbon}>
        {g.withText && <span style={label}>{text} · aperçu</span>}
      </div>
    </div>
  )
}
