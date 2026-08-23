"use client"
// marquee_text — Bandeau de texte qui défile en boucle. Le message se répète, séparé par
// un symbole : on lit l'information même si le téléphone est étroit. Animation coupée si
// l'utilisateur a demandé moins d'animations.
import { safeColor, splitList, clampInt, textOn } from "../../models/layoutStyle"
import { Marquee } from "../../primitives/Marquee"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const parts = splitList(c.items, 12)
  const items = parts.length ? parts : [String(c.text || "").trim()].filter(Boolean)
  if (items.length === 0) return null
  const bg = safeColor(c.bg_color, u.G)
  const fg = safeColor(c.text_color, textOn(bg))
  const sep = String(c.separator || "✦")
  const size = clampInt(c.size, 10, 30, 14)
  return (
    <div style={{ background: bg, padding: `${Math.round(10 * u.scale)}px 0` }}>
      <Marquee animate={u.mode === "public"} durationSec={clampInt(c.speed, 8, 90, 24)} reverse={String(c.direction || "") === "Droite"} gap={0} fade={false}>
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {items.map((t, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", color: fg, fontSize: Math.round(size * u.scale), fontWeight: 700, whiteSpace: "nowrap", fontFamily: u.FONT_B, letterSpacing: 0.4 }}>
              {t}
              <span aria-hidden style={{ opacity: 0.55, padding: `0 ${Math.round(14 * u.scale)}px` }}>{sep}</span>
            </span>
          ))}
        </div>
      </Marquee>
    </div>
  )
}

export function EditorMarqueeText({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicMarqueeText({ content, ctx }: PublicAdapterProps) { return <View content={content || {}} u={publicCtx(ctx)} /> }
