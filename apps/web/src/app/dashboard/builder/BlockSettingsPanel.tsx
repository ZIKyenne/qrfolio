"use client"

// BlockSettingsPanel.tsx — Coquille de réglages de bloc refondue (mission C03, Vague 3). Deux modes
// (Simple / Avancé), navigation par sections (modèle pur builderSettings), rendu générique du contenu
// pour les blocs pilotes, et INJECTION du panneau legacy (EditPanel) pour le design/disposition et les
// blocs non pilotes — aucune logique métier dupliquée, aucune valeur perdue. Derrière BUILDER_REDESIGN
// ou dans le harness. Présentational, props-driven.

import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react"
import { type Block } from "./types"
import { BLOCK_DEFS } from "./blockDefs"
import { BUILDER_UI } from "./builderUi"
import {
  resolveSettingsMode, SETTINGS_MODE_KEY, blockSettingsSections, resolveActiveSection,
  contentFieldsFor, isPilotBlock, blockStateBadges, isBlockEmpty, type BlockSettingsMode,
} from "./builderSettings"
import { LIBRARY_LABEL_OVERRIDES } from "./builderLibrary"
import { SettingsFieldRenderer } from "./SettingsFieldRenderer"
import { BlockContextToolbar } from "./BlockContextToolbar"

const MUTED = BUILDER_UI.text.muted
const TONE: Record<string, string> = { neutral: MUTED, warning: "var(--warning)", accent: "var(--accent)", success: "var(--success)" }

export interface BlockSettingsPanelProps {
  block: Block | null
  index?: number
  total?: number
  mobile?: boolean
  isPremium?: boolean
  onChange: (key: string, val: string) => void
  onDuplicate?: () => void
  onDelete?: () => void
  onToggleVisible?: () => void
  onToggleLock?: () => void
  onToggleDraft?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onCopyStyle?: () => void
  /** Réinitialise le contenu du bloc (annulable via undo côté coquille). */
  onResetBlock?: () => void
  onRequestClose?: () => void
  onOpenLibrary?: () => void
  onOpenOutline?: () => void
  /** Confirmation, fournie par l'éditeur (useConfirm). Sans elle, le panneau
   *  s'abstient plutôt que d'ouvrir une boîte native : une suppression n'est
   *  jamais faite « par défaut ». */
  confirm?: (message: string) => boolean | Promise<boolean>
  /** Panneau legacy injecté (EditPanel) — évite toute duplication et toute perte de champ. */
  renderLegacyContent?: (block: Block) => ReactNode
  renderLegacyDesign?: (block: Block) => ReactNode
}

const clearLabel = (type: string) => LIBRARY_LABEL_OVERRIDES[type] ?? BLOCK_DEFS[type]?.label ?? type

export function BlockSettingsPanel(props: BlockSettingsPanelProps) {
  const { block, mobile, onChange, onRequestClose } = props
  // Initial "simple" (identique SSR/client → pas de mismatch d'hydratation) ; la préférence
  // persistée est lue APRÈS montage.
  const [mode, setMode] = useState<BlockSettingsMode>("simple")
  const [section, setSection] = useState<string>("content")
  useEffect(() => {
    try {
      const saved = resolveSettingsMode(localStorage.getItem(SETTINGS_MODE_KEY))
      if (saved !== "simple") setMode(saved)
    } catch { /* noop */ }
  }, [])

  const sections = useMemo(() => (block ? blockSettingsSections(block, mode) : []), [block, mode])
  const activeSection = useMemo(() => (block ? resolveActiveSection(block, mode, section) : "content"), [block, mode, section])

  const setModePersist = useCallback((next: BlockSettingsMode) => {
    setMode(next)
    try { localStorage.setItem(SETTINGS_MODE_KEY, next) } catch { /* noop */ }
  }, [])

  const doConfirm = useCallback(async (msg: string) => {
    if (props.confirm) return props.confirm(msg)
    // Aucun moyen de demander : on ne fait rien. `window.confirm` bloquait le fil
    // d'exécution, ignorait la charte et s'ouvrait derrière la feuille sur iOS.
    console.warn("[BlockSettingsPanel] confirm absent — action annulée :", msg)
    return false
  }, [props])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onRequestClose) { e.stopPropagation(); onRequestClose() }
  }

  // ── État vide (§21) ────────────────────────────────────────────────────────
  if (!block) {
    return (
      <div data-testid="settings-empty" onKeyDown={onKeyDown}
        style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", background: "#161616" }}>
        <span aria-hidden="true" style={{ fontSize: 30, opacity: 0.35 }}>⚙️</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #F5F0E8)" }}>Sélectionnez un bloc pour le modifier</p>
        <p style={{ margin: 0, fontSize: 12, color: MUTED, maxWidth: 240, lineHeight: 1.5 }}>Cliquez un bloc sur la page, ou ajoutez-en un depuis la bibliothèque.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {props.onOpenLibrary && <button type="button" onClick={props.onOpenLibrary} style={btn("accent")}>Ajouter un bloc</button>}
          {props.onOpenOutline && <button type="button" onClick={props.onOpenOutline} style={btn()}>Voir le plan</button>}
        </div>
      </div>
    )
  }

  const def = BLOCK_DEFS[block.type]
  const empty = isBlockEmpty(block)
  const badges = blockStateBadges(block, { isPremium: props.isPremium, isEmpty: empty })
  const pilot = isPilotBlock(block.type)
  const total = props.total ?? 1
  const index = props.index ?? 0

  const handlers = {
    moveUp: props.onMoveUp, moveDown: props.onMoveDown, duplicate: props.onDuplicate,
    toggleVisible: props.onToggleVisible, toggleLock: props.onToggleLock, toggleDraft: props.onToggleDraft,
    copyStyle: props.onCopyStyle,
    reset: props.onResetBlock ? async () => { if (await doConfirm("Réinitialiser ce bloc ? Les réglages reviennent au défaut (annulable avec Ctrl+Z).")) props.onResetBlock!() } : undefined,
    // Supprimer ne demande rien : l'éditeur affiche « Bloc supprimé — Annuler ».
    // Ce panneau était le seul des quatre chemins de suppression à ouvrir une
    // fenêtre ; la même action se comportait donc de deux façons.
    delete: props.onDelete,
  }

  const renderBody = () => {
    if (activeSection === "content") {
      if (pilot) return <SettingsFieldRenderer blockId={block.id} fields={contentFieldsFor(block.type, mode)} content={block.content as Record<string, string>} onChange={onChange} mobile={mobile} />
      return <>{props.renderLegacyContent?.(block) ?? <LegacyNote />}</>
    }
    // Sections de style/disposition → panneau universel legacy injecté.
    return <>{props.renderLegacyDesign?.(block) ?? <LegacyNote />}</>
  }

  return (
    <div data-testid="block-settings" data-mode={mode} onKeyDown={onKeyDown}
      style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, background: "#161616" }}>

      {/* HEADER (§10) */}
      <div style={{ flexShrink: 0, padding: mobile ? "calc(env(safe-area-inset-top) + 10px) 12px 10px" : "12px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 8, background: (def?.color ?? "#C9A84C") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{def?.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ink, #F5F0E8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clearLabel(block.type)}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: MUTED }}>{mode === "advanced" ? `${def?.category} · ${block.type}` : def?.category}</p>
          </div>
          {onRequestClose && (
            <button type="button" onClick={onRequestClose} aria-label="Fermer les réglages"
              style={{ width: mobile ? 40 : 30, height: mobile ? 40 : 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", color: MUTED, fontSize: 15, flexShrink: 0 }}>✕</button>
          )}
        </div>

        {/* États + toggle Simple/Avancé */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 5, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            {badges.map(b => (
              <span key={b.id} style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, color: TONE[b.tone], background: `color-mix(in srgb, ${TONE[b.tone]} 12%, transparent)` }}>{b.label}</span>
            ))}
          </div>
          <div role="group" aria-label="Niveau de réglages" style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 2, flexShrink: 0 }}>
            {(["simple", "advanced"] as const).map(m => (
              <button key={m} type="button" data-mode-btn={m} aria-pressed={mode === m}
                onClick={() => setModePersist(m)}
                title={m === "simple" ? "L’essentiel pour aller vite" : "Tous les réglages"}
                style={{ minHeight: mobile ? 38 : 26, padding: "0 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: mode === m ? 800 : 600, background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#080808" : MUTED }}>
                {m === "simple" ? "Simple" : "Avancé"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* NAVIGATION SECTIONS (§12) */}
      <div role="tablist" aria-label="Sections de réglages"
        style={{ flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", padding: "10px 12px", scrollbarWidth: "none" as const }}>
        {sections.map(s => {
          const on = s.id === activeSection
          return (
            <button key={s.id} type="button" role="tab" aria-selected={on} data-section={s.id}
              onClick={() => setSection(s.id)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, minHeight: mobile ? 38 : 28, padding: mobile ? "0 13px" : "0 11px", borderRadius: 9, background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.07)"}`, color: on ? "var(--accent)" : MUTED, fontSize: mobile ? 13 : 11.5, fontWeight: on ? 700 : 500, cursor: "pointer" }}>
              {s.label}
              {s.changedCount > 0 && <span data-changed style={{ background: "var(--accent)", color: "#080808", borderRadius: 8, minWidth: 15, height: 15, padding: "0 4px", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{s.changedCount}</span>}
            </button>
          )
        })}
      </div>

      {/* AIDE DE SECTION (§6) */}
      <p style={{ flexShrink: 0, margin: 0, padding: "0 12px 8px", fontSize: 11, color: MUTED }}>
        {sections.find(s => s.id === activeSection)?.description}
      </p>

      {/* CORPS (scroll unique) */}
      <div data-testid="settings-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: mobile ? "0 12px calc(env(safe-area-inset-bottom) + 20px)" : "0 12px 20px" }}>
        {renderBody()}

        {/* ZONE DANGEREUSE (§19) — mode avancé, section avancée ou toujours en bas */}
        {mode === "advanced" && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>Actions du bloc</p>
            <BlockContextToolbar block={block} index={index} total={total} mobile={mobile} handlers={handlers}
              only={["duplicate", "toggleVisible", "toggleLock", "toggleDraft", "reset"]} />
            {props.onDelete && (
              <div style={{ marginTop: 12 }}>
                <button type="button" data-action="delete" disabled={!!block.locked}
                  onClick={() => handlers.delete?.()}
                  aria-label="Supprimer le bloc"
                  onMouseEnter={e => { if (!block.locked) e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 12%, transparent)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  style={{ width: "100%", minHeight: mobile ? 46 : 38, borderRadius: BUILDER_UI.radius.sm, border: "1px solid color-mix(in srgb, var(--danger) 26%, transparent)", background: "transparent", color: "var(--danger)", fontSize: 12.5, fontWeight: 700, cursor: block.locked ? "not-allowed" : "pointer", opacity: block.locked ? 0.5 : 1, transition: BUILDER_UI.transition }}>
                  🗑 Supprimer ce bloc
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LegacyNote() {
  return <p style={{ color: MUTED, fontSize: 12, margin: "8px 0", lineHeight: 1.5 }}>Réglages complets indisponibles dans cet aperçu.</p>
}

const btn = (tone?: "accent"): React.CSSProperties => ({
  padding: "9px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  border: tone === "accent" ? "none" : "1px solid rgba(255,255,255,0.12)",
  background: tone === "accent" ? "var(--accent)" : "rgba(255,255,255,0.04)",
  color: tone === "accent" ? "#080808" : "var(--ink, #F5F0E8)",
})
