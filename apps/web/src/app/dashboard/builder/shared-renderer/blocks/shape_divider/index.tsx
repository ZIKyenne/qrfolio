"use client"
// shape_divider — Séparateur de FORME (vague, pente, arrondi, triangle, zigzag) dessiné
// en SVG, à la couleur choisie. C'est ce qui manque pour que deux sections de couleurs
// différentes se succèdent sans que la coupure soit un simple trait droit.
import { safeColor, clampInt } from "../../models/layoutStyle"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

// Chemins normalisés sur une boîte 1200 x 100 (preserveAspectRatio="none" les étire).
const SHAPES: Record<string, string> = {
  "Vague": "M0,40 C300,110 900,-30 1200,40 L1200,100 L0,100 Z",
  "Vague douce": "M0,60 C400,10 800,110 1200,55 L1200,100 L0,100 Z",
  "Pente": "M0,100 L1200,0 L1200,100 Z",
  "Pente inversée": "M0,0 L1200,100 L0,100 Z",
  "Arrondi": "M0,100 C300,0 900,0 1200,100 Z",
  "Triangle": "M0,100 L600,0 L1200,100 Z",
  "Zigzag": "M0,100 L200,30 L400,100 L600,30 L800,100 L1000,30 L1200,100 L1200,100 L0,100 Z",
  "Marche": "M0,100 L0,50 L400,50 L400,20 L800,20 L800,60 L1200,60 L1200,100 Z",
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const shape = String(c.shape || "Vague")
  const d = SHAPES[shape] || SHAPES["Vague"]
  const color = safeColor(c.color, u.SURFACE)
  const h = clampInt(c.height, 16, 160, 56)
  const flipY = String(c.flip || "Non") === "Oui"
  return (
    <div style={{ lineHeight: 0, transform: flipY ? "scaleY(-1)" : undefined }}>
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden focusable="false"
        style={{ display: "block", width: "100%", height: Math.round(h * u.scale) }}>
        <path d={d} fill={color} />
      </svg>
    </div>
  )
}

export function EditorShapeDivider({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicShapeDivider({ content, ctx }: PublicAdapterProps) { return <View content={content || {}} u={publicCtx(ctx)} /> }
