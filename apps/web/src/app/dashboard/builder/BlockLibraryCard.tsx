// BlockLibraryCard.tsx — Carte d'un bloc dans la bibliothèque (mission C02, Vague 2).
// Présentational, props-driven. A11y (§22) : PAS de bouton imbriqué dans un bouton (défaut de la
// coquille legacy) — l'action « Ajouter » et le bouton favori sont des boutons FRÈRES. Cibles
// tactiles ≥ 44 px sur mobile. Tokenisé (pas de hover requis pour agir).

import type { BlockLibraryItem } from "./builderLibrary"

const MUTED = "#8A8478"

export interface BlockLibraryCardProps {
  item: BlockLibraryItem
  mobile?: boolean
  onAdd: (type: string) => void
  onToggleFavorite: (type: string) => void
  onOpenDetail?: (type: string) => void
}

export function BlockLibraryCard({ item, mobile, onAdd, onToggleFavorite, onOpenDetail }: BlockLibraryCardProps) {
  const tap = mobile ? 44 : 34
  return (
    <div
      data-block-card={item.type}
      data-premium={item.isPremium ? "1" : "0"}
      style={{
        position: "relative", display: "flex", flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, background: "rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}
    >
      {/* Action principale : AJOUTER (occupe la carte, un seul bouton) */}
      <button
        type="button"
        data-add={item.type}
        onClick={() => onAdd(item.type)}
        aria-label={`Ajouter le bloc ${item.title}`}
        style={{
          display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
          background: "transparent", border: "none", cursor: "pointer", color: "var(--ink, #F5F0E8)",
          padding: mobile ? "12px 46px 12px 12px" : "10px 40px 10px 11px", width: "100%", minHeight: tap + 12,
        }}
      >
        <span aria-hidden="true" style={{ width: mobile ? 40 : 32, height: mobile ? 40 : 32, borderRadius: 9, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mobile ? 19 : 16, flexShrink: 0 }}>{item.icon}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: mobile ? 14 : 12.5, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
            {item.isPremium && (
              <span data-badge="premium" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: 0.3 }}>👑 Premium</span>
            )}
          </span>
          <span style={{ fontSize: mobile ? 12 : 10.5, color: MUTED, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.description}</span>
          {item.useCases[0] && (
            <span style={{ fontSize: 10, color: "color-mix(in srgb, var(--accent) 75%, #8A8478)", marginTop: 1 }}>💡 {item.useCases[0]}</span>
          )}
        </span>
      </button>

      {/* Bouton favori — FRÈRE du bouton Ajouter (jamais imbriqué) */}
      <button
        type="button"
        data-fav={item.type}
        onClick={() => onToggleFavorite(item.type)}
        aria-pressed={item.isFavorite}
        aria-label={item.isFavorite ? `Retirer ${item.title} des favoris` : `Ajouter ${item.title} aux favoris`}
        title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        style={{
          position: "absolute", top: 6, right: 6, width: mobile ? 44 : 30, height: mobile ? 44 : 30,
          display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none",
          cursor: "pointer", fontSize: mobile ? 17 : 14, color: item.isFavorite ? "#FFD700" : "rgba(255,255,255,0.28)", padding: 0,
        }}
      >
        {item.isFavorite ? "★" : "☆"}
      </button>

      {/* Détails (facultatif) — bouton frère discret */}
      {onOpenDetail && !mobile && (
        <button
          type="button"
          data-detail={item.type}
          onClick={() => onOpenDetail(item.type)}
          aria-label={`Voir les détails du bloc ${item.title}`}
          title="Détails"
          style={{ position: "absolute", bottom: 6, right: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, cursor: "pointer", color: MUTED, fontSize: 12, padding: 0 }}
        >
          ⓘ
        </button>
      )}
    </div>
  )
}
