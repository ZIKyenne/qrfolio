"use client"

// Trois briques partagées par l'accueil : l'observateur d'entrée dans l'écran, le
// carré « finder » d'un QR (la signature graphique du site), et le sur-titre des
// sections. Sorties de HomeClient.tsx pour que les sections vivent dans leurs
// propres fichiers sans se recopier.
import { useEffect, useRef, useState } from "react"

export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

export function QRFinder({ size = 46, color = "rgba(201,168,76,0.5)", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, border: `${Math.max(2, size * 0.07)}px solid ${color}`,
      borderRadius: size * 0.22, display: "flex", alignItems: "center", justifyContent: "center",
      padding: size * 0.17, ...style,
    }}>
      <div style={{ width: "100%", height: "100%", background: color, borderRadius: size * 0.14 }} />
    </div>
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
      <QRFinder size={12} color="rgba(201,168,76,0.62)" />
      <span style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", fontWeight: 600 }}>{children}</span>
    </div>
  )
}

// Le petit QR dessiné à la main (aucune dépendance) : signature visuelle réutilisée
// par le pied de page et par les sections mises de côté.
export function QRMiniSvg({ fg, bg, accent, size = 80 }: { fg: string; bg: string; accent: string; size?: number }) {
  // Matrice QR simplifiée 7x7 (pattern visuel, pas un vrai QR scannable)
  const matrix = [
    [1,1,1,1,1,1,1,0,1,0,0,1,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,0,1,1,0,1,1,0,1,1,1,0,1,0,1,1,0],
    [0,1,0,0,1,1,0,1,1,0,0,1,0,1,0,1,0,1,0,0,1],
    [1,1,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0],
    [0,0,1,0,1,0,0,0,0,1,1,0,0,1,0,0,1,1,0,1,1],
    [1,0,1,0,0,1,1,1,0,1,0,1,1,0,1,0,1,0,0,1,0],
    [0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,0,0,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,1,0,1,1,1,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,0,0,0,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,0],
    [1,1,1,1,1,1,1,0,0,0,1,0,1,0,0,1,0,0,0,1,0],
  ]
  const cols = matrix[0].length
  const rows = matrix.length
  const cell = size / Math.max(cols, rows)
  // Cellules dorées (centre)
  const goldCells = new Set(['10-10','10-11','11-10','9-10','10-9'])

  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}
      xmlns="http://www.w3.org/2000/svg" style={{ display:"block" }}>
      <rect width={size} height={size} fill={bg} rx={4}/>
      {matrix.map((row, r) =>
        row.map((cell_val, c) => {
          if (!cell_val) return null
          const isGold = goldCells.has(r + "-" + c)
          return (
            <rect key={r + "-" + c}
              x={c * cell + 1} y={r * cell + 1}
              width={cell - 1.5} height={cell - 1.5}
              rx={1}
              fill={isGold ? accent : fg}
            />
          )
        })
      )}
    </svg>
  )
}
