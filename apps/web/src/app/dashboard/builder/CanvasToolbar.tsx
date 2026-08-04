// CanvasToolbar.tsx — Barre d'outils du canvas responsive (mission C04). Présentational, props-driven.
// Sélecteur d'appareil, orientation, zoom (−/valeur/+/ajuster/100 %), centrer, mode aperçu, plein écran.
// A11y : boutons nommés, aria-pressed, valeur de zoom annoncée (aria-live).

import type { CanvasDevice, CanvasOrientation, CanvasMode } from "./builderCanvas"
import { DEVICE_LABEL, zoomPercent } from "./builderCanvas"
import { BUILDER_UI } from "./builderUi"

const MUTED = BUILDER_UI.text.muted

export interface CanvasToolbarProps {
  device: CanvasDevice
  orientation: CanvasOrientation
  zoom: number
  mode: CanvasMode
  label: string
  showOrientation: boolean
  showZoom: boolean
  mobile?: boolean
  isFullscreen?: boolean
  onDevice: (d: CanvasDevice) => void
  onToggleOrientation: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onReset: () => void
  onCenter: () => void
  onToggleMode: () => void
  onFullscreen?: () => void
}

const DEVICES: { id: CanvasDevice; icon: string }[] = [
  { id: "mobile", icon: "📱" }, { id: "tablet", icon: "▭" }, { id: "desktop", icon: "🖥" }, { id: "fluid", icon: "↔" },
]

const ctrl = (mobile?: boolean): React.CSSProperties => ({
  minWidth: mobile ? 40 : 30, height: mobile ? 40 : 30, display: "inline-flex", alignItems: "center",
  justifyContent: "center", gap: 4, padding: "0 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)", color: "var(--ink, #F5F0E8)", fontSize: mobile ? 13 : 12, cursor: "pointer",
})

export function CanvasToolbar(p: CanvasToolbarProps) {
  const seg = (active: boolean): React.CSSProperties => ({
    ...ctrl(p.mobile),
    background: active ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "rgba(255,255,255,0.04)",
    borderColor: active ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.08)",
    color: active ? "var(--accent)" : "var(--ink, #F5F0E8)",
  })

  return (
    <div data-testid="canvas-toolbar" role="toolbar" aria-label="Contrôles du canvas"
      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: p.mobile ? "8px 10px" : "7px 10px", background: "rgba(12,12,12,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
      {/* Sélecteur d'appareil */}
      <div role="group" aria-label="Format d'appareil" style={{ display: "flex", gap: 3 }}>
        {DEVICES.map(d => (
          <button key={d.id} type="button" data-device={d.id} aria-pressed={p.device === d.id}
            aria-label={DEVICE_LABEL[d.id]} title={DEVICE_LABEL[d.id]} onClick={() => p.onDevice(d.id)} style={seg(p.device === d.id)}>
            <span aria-hidden="true">{d.icon}</span>
          </button>
        ))}
      </div>

      {p.showOrientation && (
        <button type="button" data-testid="orientation" aria-label={`Orientation : ${p.orientation === "portrait" ? "portrait" : "paysage"} (basculer)`}
          title="Pivoter (portrait/paysage)" onClick={p.onToggleOrientation} style={ctrl(p.mobile)}>
          <span aria-hidden="true">{p.orientation === "portrait" ? "⤢" : "⤡"}</span>
        </button>
      )}

      {/* Largeur active */}
      <span data-testid="device-label" style={{ fontSize: 11, color: MUTED, fontWeight: 600, whiteSpace: "nowrap" }}>{p.label}</span>

      <div style={{ flex: 1, minWidth: 6 }} />

      {p.showZoom && (
        <div role="group" aria-label="Zoom" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button type="button" data-testid="zoom-out" aria-label="Dézoomer" title="Zoom − (Ctrl −)" onClick={p.onZoomOut} style={ctrl(p.mobile)}>−</button>
          <span data-testid="zoom-value" aria-live="polite" style={{ fontSize: 11, color: "var(--ink, #F5F0E8)", fontWeight: 700, minWidth: 40, textAlign: "center" }}>{zoomPercent(p.zoom)} %</span>
          <button type="button" data-testid="zoom-in" aria-label="Zoomer" title="Zoom + (Ctrl +)" onClick={p.onZoomIn} style={ctrl(p.mobile)}>+</button>
          <button type="button" data-testid="zoom-fit" aria-label="Ajuster à la largeur" title="Ajuster" onClick={p.onFit} style={ctrl(p.mobile)}>Ajuster</button>
          <button type="button" data-testid="zoom-reset" aria-label="Zoom 100 %" title="100 % (Ctrl 0)" onClick={p.onReset} style={ctrl(p.mobile)}>100 %</button>
        </div>
      )}

      <button type="button" data-testid="center" aria-label="Recentrer le canvas" title="Centrer" onClick={p.onCenter} style={ctrl(p.mobile)}>
        <span aria-hidden="true">◎</span>
      </button>

      <button type="button" data-testid="preview-toggle" aria-pressed={p.mode === "preview"} aria-label={p.mode === "preview" ? "Quitter l'aperçu" : "Aperçu (sans outils)"}
        title="Aperçu" onClick={p.onToggleMode} style={seg(p.mode === "preview")}>
        <span aria-hidden="true">👁</span>{!p.mobile && <span style={{ fontSize: 11 }}>{p.mode === "preview" ? "Éditer" : "Aperçu"}</span>}
      </button>

      {p.onFullscreen && (
        <button type="button" data-testid="fullscreen" aria-label={p.isFullscreen ? "Quitter le plein écran" : "Plein écran"} title="Plein écran"
          onClick={p.onFullscreen} style={ctrl(p.mobile)}>
          <span aria-hidden="true">{p.isFullscreen ? "🡼" : "⛶"}</span>
        </button>
      )}
    </div>
  )
}
