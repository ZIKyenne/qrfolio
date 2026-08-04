"use client"

// ResponsiveCanvas.tsx — Espace d'édition responsive (mission C04, Vague 4). Fournit la toolbar
// (appareil/orientation/zoom/ajuster/centrer/aperçu/plein écran), un cadre appareil + transform de
// zoom sur un wrapper STABLE (n'affecte pas les données ni le moteur de sélection/DnD), les repères
// de page et un indicateur de position. NE duplique PAS builderPreview : rend `children` (l'aperçu).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { BUILDER_UI } from "./builderUi"
import {
  DEVICE_LABEL, deviceFrameWidth, deviceLabel, canvasChrome, fitZoom, stepZoom, toggleOrientation,
  clampZoom, resolveCanvasShortcut, pagePositionLabel,
  type CanvasDevice, type CanvasOrientation, type CanvasMode,
} from "./builderCanvas"

const MUTED = BUILDER_UI.text.muted

export interface ResponsiveCanvasProps {
  children: ReactNode
  mobile?: boolean
  initialDevice?: CanvasDevice
  selectedIndex?: number | null
  total?: number
  /** Notifie le parent quand le mode édition/aperçu change (masquer le chrome d'édition). */
  onModeChange?: (mode: CanvasMode) => void
  /** Plein écran réel géré par le parent (API navigateur). Sinon, mode focus interne. */
  onFullscreen?: () => void
  isFullscreen?: boolean
  /** Recentrage custom (ex. scroll vers le bloc sélectionné). Défaut : haut de page. */
  onRequestCenter?: () => void
}

// Charge les contrôles CanvasToolbar en différé pour garder ce fichier compact.
import { CanvasToolbar } from "./CanvasToolbar"

export function ResponsiveCanvas({ children, mobile, initialDevice = "fluid", selectedIndex = null, total = 0, onModeChange, onFullscreen, isFullscreen, onRequestCenter }: ResponsiveCanvasProps) {
  const [device, setDevice] = useState<CanvasDevice>(initialDevice)
  const [orientation, setOrientation] = useState<CanvasOrientation>("portrait")
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<CanvasMode>("edit")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(900)

  // Largeur disponible (ResizeObserver borné à la zone de scroll).
  useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setAvailable(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chrome = useMemo(() => canvasChrome(device, !!mobile, mode), [device, mobile, mode])
  const frameWidth = useMemo(() => deviceFrameWidth(device, orientation, available), [device, orientation, available])
  const label = useMemo(() => deviceLabel(device, orientation, available), [device, orientation, available])

  const setModeAndNotify = (m: CanvasMode) => { setMode(m); onModeChange?.(m) }
  const center = () => { if (onRequestCenter) onRequestCenter(); else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }) }

  // Raccourcis clavier (bornés hors saisie ; Escape géré par le parent aussi).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const editing = !!target.closest("input, textarea, [contenteditable='true']")
    const action = resolveCanvasShortcut({ key: e.key, mod: e.ctrlKey || e.metaKey, editing })
    if (!action) return
    if (action === "escape") { if (mode === "preview") { e.preventDefault(); setModeAndNotify("edit") } return }
    e.preventDefault()
    if (action === "zoomIn") setZoom(z => stepZoom(z, 1))
    else if (action === "zoomOut") setZoom(z => stepZoom(z, -1))
    else if (action === "reset") setZoom(1)
    else if (action === "focus") scrollRef.current?.focus()
  }

  const framed = device !== "fluid" && chrome.showDeviceFrame
  const positionLabel = pagePositionLabel(selectedIndex, total)

  return (
    <div data-testid="responsive-canvas" data-device={device} data-orientation={orientation} data-mode={mode}
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#0A0A0A" }}>

      {/* Chrome d'édition : caché en mode aperçu (§11) */}
      {mode === "edit" && (
        <CanvasToolbar
          device={device} orientation={orientation} zoom={zoom} mode={mode} label={label}
          showOrientation={chrome.showOrientation} showZoom={chrome.showZoom} mobile={mobile} isFullscreen={isFullscreen}
          onDevice={d => { setDevice(d); setZoom(1); setOrientation("portrait") }}
          onToggleOrientation={() => setOrientation(toggleOrientation)}
          onZoomIn={() => setZoom(z => stepZoom(z, 1))}
          onZoomOut={() => setZoom(z => stepZoom(z, -1))}
          onFit={() => setZoom(fitZoom(device, orientation, available))}
          onReset={() => setZoom(1)}
          onCenter={center}
          onToggleMode={() => setModeAndNotify(mode === "edit" ? "preview" : "edit")}
          onFullscreen={onFullscreen}
        />
      )}
      {mode === "preview" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "rgba(12,12,12,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }} data-testid="preview-banner">Aperçu</span>
          <span style={{ fontSize: 11, color: MUTED }}>{DEVICE_LABEL[device]}</span>
          <div style={{ flex: 1 }} />
          <button type="button" data-testid="exit-preview" onClick={() => setModeAndNotify("edit")}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--ink, #F5F0E8)", fontSize: 12, cursor: "pointer" }}>Éditer</button>
        </div>
      )}

      {/* Zone de scroll UNIQUE (§21) */}
      <div ref={scrollRef} data-testid="canvas-scroll" tabIndex={0} onKeyDown={onKeyDown}
        style={{ flex: 1, minHeight: 0, overflow: "auto", padding: mobile ? "12px" : "20px", outline: "none", position: "relative" }}>

        {/* Wrapper STABLE cadre + zoom (transformé, pas les blocs individuellement) */}
        <div data-testid="canvas-frame" data-framed={framed ? "1" : "0"}
          style={{
            width: device === "fluid" ? "100%" : frameWidth,
            maxWidth: "100%",
            margin: chrome.centeredFrame ? "0 auto" : undefined,
            transform: zoom !== 1 ? `scale(${clampZoom(zoom)})` : undefined,
            transformOrigin: "top center",
            borderRadius: framed ? (device === "mobile" ? 26 : 14) : 0,
            border: framed ? "1px solid rgba(255,255,255,0.12)" : "none",
            boxShadow: framed ? "0 10px 40px rgba(0,0,0,0.45)" : "none",
            overflow: framed ? "hidden" : "visible",
            background: framed ? "#0A0A0A" : "transparent",
          }}>
          {/* Repère haut (§19) */}
          {framed && <div aria-hidden="true" style={{ height: 4, background: "rgba(255,255,255,0.06)" }} />}
          {children}
        </div>

        {/* Repère fin de page */}
        {total > 0 && (
          <div data-testid="page-end" aria-hidden="true" style={{ textAlign: "center", color: MUTED, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", padding: "16px 0 4px" }}>Fin de page</div>
        )}
      </div>

      {/* Statut : position + retour en haut (§18) */}
      <div data-testid="canvas-status" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "5px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(12,12,12,0.6)" }}>
        <span style={{ fontSize: 10.5, color: MUTED }} data-testid="page-position">{positionLabel}</span>
        <div style={{ flex: 1 }} />
        <button type="button" data-testid="back-to-top" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Revenir en haut" title="Revenir en haut"
          style={{ fontSize: 10.5, color: "var(--ink, #F5F0E8)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "3px 9px", cursor: "pointer" }}>↑ Haut</button>
      </div>
    </div>
  )
}
