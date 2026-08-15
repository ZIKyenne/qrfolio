"use client"

// Sélecteur segmenté doré (handoff « Segmented Control ») : indicateur qui glisse sous l'option active,
// reflet balayant rejoué à chaque changement (via key={moves}), halo doré qui respire en boucle.
// Fidèle au spec (couleurs/durées/courbes) ; N options ; a11y (tablist/tab + flèches + focus) ; reduced-motion.
import { useRef, useState } from "react"

export function SegmentedControl({
  labels, value, onChange, ariaLabel, dense = false,
}: {
  labels: string[]
  value: number
  onChange: (index: number, label: string) => void
  ariaLabel?: string
  dense?: boolean   // contexte étroit (inspecteur) : réduit typo/padding (cf. note responsive du handoff)
}) {
  const [moves, setMoves] = useState(0)
  const n = Math.max(1, labels.length)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function select(i: number) {
    if (i === value) return              // clic sur l'option active = no-op (pas de rejeu)
    setMoves(m => m + 1)
    onChange(i, labels[i])
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    e.preventDefault()
    const ni = (value + (e.key === "ArrowRight" ? 1 : -1) + n) % n
    select(ni); refs.current[ni]?.focus()
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", width: "100%", maxWidth: 440 }}>
      <style>{`
        @keyframes scGlow { 0%{opacity:.45;transform:scale(.95)} 50%{opacity:.9;transform:scale(1.05)} 100%{opacity:.45;transform:scale(.95)} }
        @keyframes scSheen { 0%{transform:translateX(-140%) skewX(-18deg);opacity:0} 14%{opacity:.8} 100%{transform:translateX(260%) skewX(-18deg);opacity:0} }
        .sc-halo{animation:scGlow 6s ease-in-out infinite}
        .sc-sheen{animation:scSheen .8s cubic-bezier(.3,.7,.3,1) 40ms both}
        .sc-tab:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(201,162,77,.35)}
        @media (prefers-reduced-motion: reduce){ .sc-halo,.sc-sheen{animation:none!important} .sc-thumb{transition-duration:.01ms!important} }
      `}</style>

      {/* Halo qui respire (décoratif) */}
      <div aria-hidden="true" className="sc-halo" style={{ position: "absolute", inset: -10, borderRadius: 999, background: "radial-gradient(58% 118% at 50% 50%, rgba(201,162,77,.20), rgba(201,162,77,0) 70%)", filter: "blur(16px)", pointerEvents: "none", willChange: "transform, opacity" }} />

      {/* Rail */}
      <div role="tablist" aria-label={ariaLabel} onKeyDown={onKey} style={{ position: "relative", display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", width: "100%", padding: 5, borderRadius: 999, background: "#100e0c", border: "1px solid #221f1b", boxShadow: "0 1px 0 rgba(255,255,255,.04) inset, 0 -1px 0 rgba(0,0,0,.6) inset", isolation: "isolate" }}>

        {/* Indicateur glissant + reflet */}
        <div aria-hidden="true" className="sc-thumb" style={{ position: "absolute", top: 5, bottom: 5, left: 5, width: `calc((100% - 10px) / ${n})`, transform: `translateX(calc(${value} * 100%))`, transition: "transform .42s cubic-bezier(.2,.85,.2,1)", borderRadius: 999, overflow: "hidden", background: "linear-gradient(135deg, #e8c877, #c9a24d)", boxShadow: "0 1px 0 rgba(255,255,255,.45) inset, 0 -2px 6px rgba(90,62,20,.4) inset, 0 6px 18px -8px rgba(201,162,77,.5)", pointerEvents: "none" }}>
          <div key={moves} className="sc-sheen" style={{ position: "absolute", top: "-20%", bottom: "-20%", left: 0, width: "34%", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 100%)" }} />
        </div>

        {/* Options */}
        {labels.map((l, i) => {
          const on = i === value
          return (
            <button key={l} ref={el => { refs.current[i] = el }} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} type="button" onClick={() => select(i)} className="sc-tab"
              style={{ position: "relative", zIndex: 1, appearance: "none", border: "none", background: "transparent", cursor: "pointer", padding: dense ? "9px 6px" : "12px 18px", borderRadius: 999, fontFamily: "inherit", fontSize: dense ? 12 : 15, fontWeight: on ? 600 : 500, color: on ? "#1a1408" : "#8a8177", transition: "color .2s ease, font-weight .18s ease", whiteSpace: "nowrap" }}>
              {l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
