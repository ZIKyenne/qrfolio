"use client"

// Palette de commandes du Builder (Cmd/Ctrl+K) — Phase 2 §2.7 du plan.
// Overlay accessible (adossé au primitive Modal : focus trap, Échap, scrim, verrou
// scroll, restauration du focus). Recherche unifiée : COMMANDES (actions de l'éditeur)
// + AJOUTER UN BLOC (réutilise le moteur pur builderSearch.scoreBlock). Navigation
// clavier ↑/↓ + Entrée. Standard Notion/Figma/Linear.

import { useMemo, useState, useEffect, useRef, type ReactNode } from "react"
import { Modal } from "@/components/ui/Modal"
import { scoreBlock, type SearchableDef } from "./builderSearch"

export interface PaletteCommand {
  id: string
  label: string
  hint?: string        // ex. raccourci "Ctrl+Z"
  keywords?: string    // termes supplémentaires pour la recherche
  icon?: ReactNode
  run: () => void
}

type BlockDefLite = SearchableDef & { icon?: ReactNode; color?: string }

interface Props {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
  blockDefs: Record<string, BlockDefLite>
  onInsertBlock: (type: string) => void
  /** Types de blocs récents, proposés quand la requête est vide (ressenti « / » insertion). */
  recentBlockTypes?: string[]
  maxBlocks?: number
}

type Item =
  | { kind: "command"; key: string; label: string; hint?: string; icon?: ReactNode; run: () => void }
  | { kind: "block"; key: string; label: string; hint?: string; icon?: ReactNode; run: () => void }

const G = "var(--accent)"
const MUTED = "#8A8478"

export function CommandPalette({ open, onClose, commands, blockDefs, onInsertBlock, recentBlockTypes, maxBlocks = 8 }: Props) {
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Réinitialise la requête à chaque ouverture.
  useEffect(() => { if (open) { setQ(""); setActive(0) } }, [open])

  const query = q.toLowerCase().trim()

  const filteredCommands = useMemo(() => {
    if (!query) return commands
    return commands.filter(c => (c.label + " " + (c.keywords ?? "")).toLowerCase().includes(query))
  }, [commands, query])

  const filteredBlocks = useMemo(() => {
    // Requête vide : blocs récents (menu d'insertion rapide, ressenti « / »).
    if (!query) {
      return (recentBlockTypes ?? [])
        .filter(t => blockDefs[t])
        .slice(0, maxBlocks)
        .map(t => ({ type: t, def: blockDefs[t] }))
    }
    return Object.entries(blockDefs)
      .map(([type, def]) => ({ type, def, score: scoreBlock(type, def, query) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxBlocks)
      .map(({ type, def }) => ({ type, def }))
  }, [blockDefs, query, maxBlocks, recentBlockTypes])

  // Liste plate ordonnée (commandes puis blocs) pour la navigation clavier.
  const items = useMemo<Item[]>(() => {
    const run = (fn: () => void) => () => { fn(); onClose() }
    return [
      ...filteredCommands.map(c => ({ kind: "command" as const, key: "c:" + c.id, label: c.label, hint: c.hint, icon: c.icon, run: run(c.run) })),
      ...filteredBlocks.map(({ type, def }) => ({ kind: "block" as const, key: "b:" + type, label: def.label, hint: "Ajouter", icon: def.icon, run: run(() => onInsertBlock(type)) })),
    ]
  }, [filteredCommands, filteredBlocks, onClose, onInsertBlock])

  // Recadre l'index actif quand la liste change.
  useEffect(() => { setActive(a => Math.min(Math.max(0, a), Math.max(0, items.length - 1))) }, [items.length])
  // Fait défiler l'élément actif dans la vue.
  useEffect(() => { itemRefs.current[active]?.scrollIntoView({ block: "nearest" }) }, [active])

  if (!open) return null

  const cmdCount = filteredCommands.length
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === "Enter") { e.preventDefault(); items[active]?.run() }
  }

  const rowLabel = (item: Item, i: number) => (
    <button
      key={item.key}
      ref={el => { itemRefs.current[i] = el }}
      type="button"
      role="option"
      aria-selected={i === active}
      onMouseMove={() => setActive(i)}
      onClick={() => item.run()}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: "9px 12px", borderRadius: 10, border: "1px solid transparent", cursor: "pointer",
        background: i === active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
        borderColor: i === active ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "transparent",
        color: "var(--ink)", fontSize: 13.5,
      }}
    >
      <span style={{ width: 20, textAlign: "center", flexShrink: 0, fontSize: 14 }}>{item.icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
      {item.hint && <span style={{ flexShrink: 0, color: i === active ? G : MUTED, fontSize: 11, fontWeight: 600 }}>{item.hint}</span>}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} maxWidth={560}>
      <div onKeyDown={onKeyDown}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher une commande ou un bloc…"
          aria-label="Rechercher une commande ou un bloc"
          role="combobox"
          aria-expanded={items.length > 0}
          style={{
            width: "100%", boxSizing: "border-box", background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "var(--ink)",
            fontSize: 16, height: 48, padding: "0 14px", outline: "none", marginBottom: 12,
          }}
        />
        <div role="listbox" aria-label="Résultats" style={{ maxHeight: "48vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.length === 0 && (
            <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "20px 0", margin: 0 }}>Aucun résultat</p>
          )}
          {cmdCount > 0 && (
            <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "4px 4px 2px" }}>Commandes</p>
          )}
          {items.slice(0, cmdCount).map((item, i) => rowLabel(item, i))}
          {filteredBlocks.length > 0 && (
            <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "8px 4px 2px" }}>{query ? "Ajouter un bloc" : "Blocs récents"}</p>
          )}
          {items.slice(cmdCount).map((item, i) => rowLabel(item, cmdCount + i))}
        </div>
      </div>
    </Modal>
  )
}
