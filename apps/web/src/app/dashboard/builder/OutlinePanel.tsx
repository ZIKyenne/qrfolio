"use client"

// Plan de la page (outline) — Phase 2 §2.21 du plan. Vue d'ensemble navigable des
// blocs : indispensable sur une page longue (sauter à un bloc, voir la structure,
// réordonner). Overlay accessible adossé au primitive Modal (focus trap, Échap,
// scrim, restauration du focus). Version overlay volontaire : ne restructure PAS le
// panneau gauche (intriqué, non vérifiable à l'aveugle) — une version dockée pourra
// suivre avec QA visuelle.

import { Modal } from "@/components/ui/Modal"
import { ChevronUp, ChevronDown, Lock, EyeOff, Pencil } from "lucide-react"
import type { Block } from "./types"

interface DefLite { label: string; icon?: React.ReactNode }

interface Props {
  open: boolean
  onClose: () => void
  blocks: Block[]
  blockDefs: Record<string, DefLite>
  /** Sélectionne et saute au bloc (ferme le plan). */
  onSelect: (id: string) => void
  /** Réordonne (dir -1 = monter, +1 = descendre) sans fermer le plan. */
  onMove: (id: string, dir: -1 | 1) => void
}

const G = "var(--accent)"
const MUTED = "#8A8478"

export function OutlinePanel({ open, onClose, blocks, blockDefs, onSelect, onMove }: Props) {
  if (!open) return null
  const last = blocks.length - 1

  const iconBtn = (disabled: boolean, onClick: () => void, label: string, children: React.ReactNode) => (
    <button type="button" aria-label={label} title={label} disabled={disabled}
      onClick={e => { e.stopPropagation(); if (!disabled) onClick() }}
      style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: disabled ? "rgba(255,255,255,0.2)" : "var(--ink)", cursor: disabled ? "default" : "pointer", flexShrink: 0 }}>
      {children}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title="Plan de la page" maxWidth={440}>
      {blocks.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "16px 0", margin: 0 }}>
          Page vide — ajoute des blocs (Ctrl+K ou « / »).
        </p>
      ) : (
        <div style={{ maxHeight: "56vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          {blocks.map((b, i) => {
            const def = blockDefs[b.type]
            const name = (b.content?.__name as string) || def?.label || b.type
            return (
              <div key={b.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", opacity: b.visible ? 1 : 0.5 }}>
                <span style={{ width: 20, textAlign: "center", flexShrink: 0, color: MUTED, fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                <button type="button" onClick={() => onSelect(b.id)} title="Aller à ce bloc"
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--ink)", textAlign: "left", padding: 0 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{def?.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{name}</span>
                  {b.draft && <Pencil size={12} color="#FBBF24" aria-label="Brouillon" />}
                  {b.locked && <Lock size={12} color="#818CF8" aria-label="Verrouillé" />}
                  {!b.visible && <EyeOff size={12} color={MUTED} aria-label="Masqué" />}
                </button>
                {iconBtn(i === 0 || !!b.locked, () => onMove(b.id, -1), "Monter", <ChevronUp size={13} />)}
                {iconBtn(i === last || !!b.locked, () => onMove(b.id, 1), "Descendre", <ChevronDown size={13} />)}
              </div>
            )
          })}
        </div>
      )}
      <p style={{ color: MUTED, fontSize: 11, margin: "12px 0 0" }}>
        {blocks.length} bloc{blocks.length > 1 ? "s" : ""} · clic = aller au bloc · flèches = réordonner
      </p>
    </Modal>
  )
}
