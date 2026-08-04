"use client"

// Harness client de la bibliothèque de blocs (C02). Gère l'état partagé (favoris/récents) en
// mémoire — comme le fait la coquille BuilderV4 — pour que Playwright teste l'ajout, les favoris et
// les récents SANS Supabase. Un journal d'ajouts visible sert d'oracle de test.

import { useState, useCallback } from "react"
import { BlockLibrary } from "../../dashboard/builder/BlockLibrary"
import { toggleFavorite, pushRecentType } from "../../dashboard/builder/builderLibrary"

export function BlockLibraryHarness() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const [added, setAdded] = useState<string[]>([])
  const [closed, setClosed] = useState(false)

  const onAdd = useCallback((type: string) => {
    setAdded(a => [...a, type])
    setRecents(r => pushRecentType(r, type))
  }, [])
  const onToggleFavorite = useCallback((type: string) => {
    setFavorites(f => toggleFavorite(f, type))
  }, [])

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#080808", color: "#F5F0E8", fontFamily: "DM Sans, sans-serif" }}>
      {/* Oracle de test : compteur d'ajouts + dernier ajout (data-attributes stables). */}
      <div data-testid="harness-bar" data-added-count={added.length} data-last-added={added[added.length - 1] ?? ""} data-closed={closed ? "1" : "0"}
        style={{ flexShrink: 0, padding: "8px 12px", borderBottom: "1px solid rgba(201,168,76,0.2)", fontSize: 12, display: "flex", gap: 14 }}>
        <span>Ajouts : <b data-testid="added-count">{added.length}</b></span>
        <span>Dernier : <b data-testid="last-added">{added[added.length - 1] ?? "—"}</b></span>
        <span>Favoris : <b data-testid="fav-count">{favorites.length}</b></span>
        <span>Récents : <b data-testid="recent-count">{recents.length}</b></span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", maxWidth: 900, width: "100%", margin: "0 auto", borderInline: "1px solid rgba(255,255,255,0.06)" }}>
        <BlockLibrary
          favorites={favorites}
          recents={recents}
          recoContext="pro"
          onAdd={onAdd}
          onToggleFavorite={onToggleFavorite}
          onRequestClose={() => setClosed(true)}
        />
      </div>
    </div>
  )
}
