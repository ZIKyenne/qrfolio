import { ImageResponse } from "next/og"

// Image OpenGraph/Twitter du site, générée dynamiquement (next/og).
// Remplace l'ancien /og-image.png statique qui était ABSENT de /public
// (vignette sociale cassée sur tout partage). Ce fichier-convention est
// automatiquement utilisé par Next pour les métadonnées OG des routes qui
// n'en fournissent pas (la page publique [slug] a sa propre image).

export const runtime = "edge"
export const alt = "QRowg — Carte de visite numérique & QR code dynamique"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
          color: "#F5F0E8",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 30 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 22,
              background: "#C9A84C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#080808",
              fontSize: 46,
              fontWeight: 800,
            }}
          >
            QR
          </div>
          <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -1 }}>QRowg</div>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#C9A84C", textAlign: "center" }}>
          Votre page pro + QR code dynamique
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#A8A190", marginTop: 18, maxWidth: 940, textAlign: "center", lineHeight: 1.4 }}>
          La destination reste modifiable après impression. Analytics inclus.
        </div>
      </div>
    ),
    { ...size },
  )
}
