"use client"

// BlockLibrary.tsx — Bibliothèque de blocs refondue (mission C02, Vague 2). Orchestrateur
// présentational, props-driven : consomme le modèle PUR builderLibrary.ts et reçoit l'état partagé
// (favoris, récents) + les callbacks (ajout, favori) de la coquille — AUCUNE logique métier
// dupliquée (§24). Rendu derrière le flag BUILDER_REDESIGN ou dans le harness. Desktop + mobile.

import { useMemo, useRef, useState, useCallback, useEffect } from "react"
import { BUILDER_UI } from "./builderUi"
import {
  buildLibraryItems, searchLibrary, libraryCategories, nearbyCategories, premiumInfo,
  isDuplicateAdd, pushRecentType, type BlockLibraryItem, type RecoContext, recommendedForContext,
} from "./builderLibrary"
import { BlockLibraryCard } from "./BlockLibraryCard"

const MUTED = BUILDER_UI.text.muted

type Tab = "recommended" | "recent" | "favorites" | "all" | string

export interface BlockLibraryProps {
  favorites: string[]
  recents: string[]
  /** Contexte de recommandation (déterministe). Défaut "default". */
  recoContext?: RecoContext
  mobile?: boolean
  onAdd: (type: string) => void
  onToggleFavorite: (type: string) => void
  /** Ferme la bibliothèque (Escape, bouton fermer). Facultatif (ex. panneau docké desktop). */
  onRequestClose?: () => void
  /** Sert de titre a11y. */
  title?: string
}

export function BlockLibrary(props: BlockLibraryProps) {
  const { favorites, recents, mobile, onToggleFavorite, onRequestClose } = props
  const recommended = useMemo(() => recommendedForContext(props.recoContext ?? "default"), [props.recoContext])
  const items = useMemo(
    () => buildLibraryItems({ favorites, recents, recommended }),
    [favorites, recents, recommended],
  )
  const byType = useMemo(() => new Map(items.map(i => [i.type, i])), [items])
  const cats = useMemo(() => libraryCategories(items), [items])

  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>(recommended.length ? "recommended" : "all")
  const [detail, setDetail] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Anti-double-ajout (double-clic / double déclenchement rapide).
  const lastAdd = useRef<{ type: string | null; t: number }>({ type: null, t: 0 })
  const onAdd = useCallback((type: string) => {
    const now = Date.now()
    if (isDuplicateAdd(lastAdd.current.type, lastAdd.current.t, type, now)) return
    lastAdd.current = { type, t: now }
    props.onAdd(type)
  }, [props])

  // Liste visible : la recherche prime sur l'onglet.
  const visible = useMemo<BlockLibraryItem[]>(() => {
    if (query.trim()) return searchLibrary(items, query)
    switch (tab) {
      case "recommended": return items.filter(i => i.isRecommended)
      case "favorites": return items.filter(i => i.isFavorite)
      case "recent": {
        const rank = new Map(recents.map((t, i) => [t, i]))
        return items.filter(i => rank.has(i.type)).sort((a, b) => (rank.get(a.type)! - rank.get(b.type)!))
      }
      case "all": return items
      default: return items.filter(i => i.category === tab)
    }
  }, [items, query, tab, recents])

  // Escape : ferme le détail puis la bibliothèque.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (detail) { e.stopPropagation(); setDetail(null) }
      else if (onRequestClose) { e.stopPropagation(); onRequestClose() }
    }
  }

  useEffect(() => { if (detail && !byType.has(detail)) setDetail(null) }, [detail, byType])

  const quickTabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "recommended", label: "Recommandés", show: recommended.length > 0 },
    { id: "recent", label: "Récents", show: recents.length > 0 },
    { id: "favorites", label: "Favoris", show: favorites.length > 0 },
    { id: "all", label: "Tout", show: true },
  ]

  const tabBtn = (id: Tab, label: string, count?: number) => {
    const on = tab === id && !query.trim()
    return (
      <button key={String(id)} type="button" role="tab" aria-selected={on}
        data-tab={id}
        onClick={() => { setTab(id); setQuery("") }}
        style={{
          flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          minHeight: mobile ? 40 : 30, padding: mobile ? "0 13px" : "0 11px", borderRadius: 9,
          background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.07)"}`,
          color: on ? "var(--accent)" : MUTED, fontSize: mobile ? 13 : 11.5, fontWeight: on ? 700 : 500, cursor: "pointer",
        }}>
        {label}{typeof count === "number" && <span style={{ opacity: 0.7 }}>{count}</span>}
      </button>
    )
  }

  const detailItem = detail ? byType.get(detail) : null

  return (
    <div data-testid="block-library" onKeyDown={onKeyDown}
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#0A0A0A" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: mobile ? "calc(env(safe-area-inset-top) + 10px) 12px 10px" : "12px 12px 8px" }}>
        <h2 style={{ margin: 0, fontSize: mobile ? 16 : 13, fontWeight: 800, color: "var(--ink, #F5F0E8)", flex: 1 }}>{props.title ?? "Ajouter un bloc"}</h2>
        {onRequestClose && (
          <button type="button" onClick={onRequestClose} aria-label="Fermer la bibliothèque"
            style={{ width: mobile ? 40 : 30, height: mobile ? 40 : 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", color: MUTED, fontSize: 15 }}>✕</button>
        )}
      </div>

      {/* RECHERCHE */}
      <div style={{ flexShrink: 0, padding: "0 12px 10px", position: "relative" }}>
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un bloc…"
          aria-label="Rechercher un bloc"
          type="search"
          style={{ width: "100%", boxSizing: "border-box", height: mobile ? 46 : 36, background: "#111", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10, padding: "0 36px 0 12px", color: "var(--ink, #F5F0E8)", fontSize: mobile ? 15 : 12.5, outline: "none" }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus() }} aria-label="Effacer la recherche"
            style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: MUTED, cursor: "pointer" }}>✕</button>
        )}
      </div>

      {/* ONGLETS D'ACCÈS RAPIDE + CATÉGORIES (scroll horizontal) */}
      <div role="tablist" aria-label="Filtrer les blocs"
        style={{ flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 10px", scrollbarWidth: "none" as const }}>
        {quickTabs.filter(t => t.show).map(t => tabBtn(t.id, t.label))}
        <span aria-hidden="true" style={{ width: 1, background: "rgba(255,255,255,0.1)", flexShrink: 0, margin: "2px 2px" }} />
        {cats.map(c => tabBtn(c.id, `${c.icon} ${c.label}`, c.count))}
      </div>

      {/* GRILLE */}
      <div role="list" aria-label="Blocs disponibles"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: mobile ? "0 12px calc(env(safe-area-inset-bottom) + 16px)" : "0 12px 16px", display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, alignContent: "start" }}>
        {visible.map(item => (
          <div role="listitem" key={item.type}>
            <BlockLibraryCard item={item} mobile={mobile} onAdd={onAdd} onToggleFavorite={onToggleFavorite} onOpenDetail={setDetail} />
          </div>
        ))}

        {/* ÉTAT SANS RÉSULTAT (§9) */}
        {visible.length === 0 && (
          <div role="status" aria-live="polite" data-testid="library-empty"
            style={{ gridColumn: "1 / -1", textAlign: "center", padding: "28px 16px", color: MUTED }}>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "var(--ink, #F5F0E8)" }}>Aucun bloc trouvé</p>
            <p style={{ margin: "0 0 14px", fontSize: 12 }}>Essayez un autre mot, ou parcourez une catégorie proche.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 14 }}>
              {nearbyCategories(items, query || "blocs").map(c => (
                <button key={c.id} type="button" onClick={() => { setQuery(""); setTab(c.id) }}
                  style={{ padding: "6px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--ink, #F5F0E8)", fontSize: 12, cursor: "pointer" }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            {query && (
              <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus() }}
                style={{ padding: "7px 14px", borderRadius: 9, background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 34%, transparent)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </div>

      {/* PANNEAU DÉTAIL (§19) — vue interne, pas une page */}
      {detailItem && (
        <div data-testid="library-detail" role="dialog" aria-label={`Détails du bloc ${detailItem.title}`}
          style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(8,8,8,0.92)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", padding: mobile ? "calc(env(safe-area-inset-top) + 16px) 16px" : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: detailItem.color + "1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{detailItem.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink, #F5F0E8)" }}>{detailItem.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{detailItem.categoryLabel}{detailItem.isPremium ? " · 👑 Premium" : ""}</p>
            </div>
            <button type="button" onClick={() => setDetail(null)} aria-label="Fermer les détails"
              style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", color: MUTED, fontSize: 16 }}>✕</button>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink, #F5F0E8)" }}>{detailItem.description}</p>
          {detailItem.useCases.length > 0 && (
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "color-mix(in srgb, var(--accent) 80%, #8A8478)" }}>💡 {detailItem.useCases.join(" · ")}</p>
          )}
          {detailItem.isPremium && (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED }}>
              {premiumInfo(detailItem.type).benefit} — mis en avant dans l'offre {premiumInfo(detailItem.type).plan}.
            </p>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" data-detail-add={detailItem.type} onClick={() => { onAdd(detailItem.type); setDetail(null) }}
            style={{ minHeight: 48, borderRadius: 12, background: "var(--accent)", border: "none", color: "#080808", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Ajouter ce bloc
          </button>
        </div>
      )}
    </div>
  )
}

// Réexport utilitaire pour la coquille (mise à jour des récents côté client si besoin).
export { pushRecentType }
