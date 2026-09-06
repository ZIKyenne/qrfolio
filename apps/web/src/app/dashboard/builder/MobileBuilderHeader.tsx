// MobileBuilderHeader.tsx — Header mobile compact (mission C05, §5). Retour dashboard, nom de page,
// statut de sauvegarde (réutilise BuilderStatus), undo/redo, menu secondaire. Safe area haute, ≥ 44 px.

import { BuilderStatus } from "./BuilderStatus"
import { BUILDER_UI } from "./builderUi"

const MUTED = BUILDER_UI.text.muted

export interface MobileBuilderHeaderProps {
  pageName: string
  saving: boolean
  saved: boolean
  saveError: boolean
  saveErrorMsg?: string
  hasUnsaved: boolean
  canUndo: boolean
  canRedo: boolean
  onBack: () => void
  onUndo: () => void
  onRedo: () => void
  onSave?: () => void
  onRetry?: () => void
  onMenu?: () => void
  /** Renommer la page depuis le téléphone : le nom n'était que lu. */
  onRename?: (nom: string) => void
}

const iconBtn = (disabled?: boolean): React.CSSProperties => ({
  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
  color: disabled ? "rgba(255,255,255,0.25)" : "var(--ink, #F5F0E8)", cursor: disabled ? "default" : "pointer", flexShrink: 0, fontSize: 15,
})

export function MobileBuilderHeader(p: MobileBuilderHeaderProps) {
  return (
    <header data-testid="mobile-header"
      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "calc(env(safe-area-inset-top) + 8px) 10px 8px", background: "#0D0D0D", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
      <button type="button" onClick={p.onBack} aria-label="Retour au tableau de bord" style={iconBtn()}>←</button>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {p.onRename
          ? <input value={p.pageName} onChange={e => p.onRename!(e.target.value)} aria-label="Nom de la page"
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #F5F0E8)", background: "transparent", border: "none", outline: "none", padding: 0, width: "100%", minWidth: 0, minHeight: 22, textOverflow: "ellipsis", fontFamily: "inherit" }} />
          : <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #F5F0E8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pageName || "Ma page"}</span>}
        <BuilderStatus mobile saving={p.saving} saved={p.saved} saveError={p.saveError} saveErrorMsg={p.saveErrorMsg} hasUnsaved={p.hasUnsaved} onSave={p.onSave} onRetry={p.onRetry} />
      </div>
      <button type="button" onClick={p.onUndo} disabled={!p.canUndo} aria-label="Annuler" title="Annuler" style={iconBtn(!p.canUndo)}>↶</button>
      <button type="button" onClick={p.onRedo} disabled={!p.canRedo} aria-label="Rétablir" title="Rétablir" style={iconBtn(!p.canRedo)}>↷</button>
      {p.onMenu && <button type="button" onClick={p.onMenu} aria-label="Menu" style={iconBtn()}>⋯</button>}
    </header>
  )
}
