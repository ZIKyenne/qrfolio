"use client"

import { Flame } from "lucide-react"

// Carte de chaleur des clics : où les visiteurs cliquent/tapent réellement sur la page.
// Grille normalisée (buildTapGrid) rendue dans un cadre « téléphone » + classement des blocs les plus touchés.
// Le rendu de la vraie page n'est pas reproduit ici : on montre l'intensité par zone (haut/milieu/bas × gauche/droite).

const GOLD = "var(--accent)"
const MUTED = "#A8A190"

type BRow = { id: string; type: string }
type Props = {
  grid: number[][]              // intensité 0..1, grid[ligne][colonne]
  byBlock: Record<string, number>
  total: number
  blocks: BRow[]
}

// Libellés FR compacts des types de blocs les plus courants (fallback = type brut).
const LABELS: Record<string, string> = {
  profile: "Profil", bio: "Présentation", skills: "Compétences", cta_button: "Bouton d'action",
  calendly: "Réservation", social_links: "Réseaux sociaux", social_feature: "Réseau mis en avant",
  instagram_feed: "Feed Instagram", product: "Produit", pricing: "Tarifs", promo_banner: "Bannière promo",
  menu_section: "Menu", services_list: "Services", image: "Image", gallery: "Galerie", video: "Vidéo",
  heading: "Titre", rich_text: "Texte", faq: "FAQ", testimonials: "Avis", documents: "Documents",
  google_maps: "Carte", google_maps_embed: "Carte", opening_hours: "Horaires", contact_form: "Formulaire",
  reservation_form: "Réservation", countdown: "Compte à rebours", event_info: "Événement",
  popular_products: "Best-sellers", announcement: "Annonce", timeline: "Timeline", team: "Équipe",
  table_booking: "Réserver une table", download_file: "Fichier", music_links: "Musique", spotify_player: "Spotify",
}
const label = (type: string) => LABELS[type] || type

// Couleur d'une cellule selon l'intensité (transparent -> or -> rouge chaud).
function heatColor(v: number): string {
  if (v <= 0) return "transparent"
  if (v < 0.34) return `rgba(201,168,76,${0.18 + v * 0.9})`      // or discret
  if (v < 0.67) return `rgba(249,168,60,${0.35 + v * 0.5})`      // ambre
  return `rgba(239,80,60,${0.5 + v * 0.4})`                       // rouge chaud
}

export default function HeatmapPanel({ grid, byBlock, total, blocks }: Props) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const typeById: Record<string, string> = {}
  for (const b of blocks) typeById[b.id] = b.type

  const top = Object.entries(byBlock)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const topMax = top[0]?.[1] || 0

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
        <Flame size={16} color={GOLD} />
        <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Carte de chaleur des clics</h3>
      </div>
      <p style={{ color: MUTED, fontSize: 12, margin: "0 0 16px" }}>Où vos visiteurs cliquent vraiment sur la page.</p>

      {total === 0 ? (
        <p style={{ color: MUTED, fontSize: 12.5, textAlign: "center", padding: "18px 0" }}>
          Pas encore de clics enregistrés. La carte se remplira dès vos prochaines visites.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Cadre téléphone : grille d'intensité */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 150, border: "6px solid rgba(255,255,255,0.09)", borderRadius: 22,
              overflow: "hidden", background: "#0C0C0D", position: "relative",
              display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}`,
            }}>
              {grid.flatMap((line, r) => line.map((v, c) => (
                <div key={`${r}-${c}`} style={{ background: heatColor(v), aspectRatio: "1 / 1" }} />
              )))}
              {/* Repères haut/bas */}
              <span style={{ position: "absolute", top: 4, left: 6, fontSize: 8, color: "rgba(255,255,255,0.35)", pointerEvents: "none" }}>haut</span>
              <span style={{ position: "absolute", bottom: 4, left: 6, fontSize: 8, color: "rgba(255,255,255,0.35)", pointerEvents: "none" }}>bas</span>
            </div>
            <p style={{ color: MUTED, fontSize: 10.5, textAlign: "center", margin: "8px 0 0" }}>{total} clic{total > 1 ? "s" : ""} · 30 j</p>
          </div>

          {/* Classement des blocs les plus touchés */}
          <div style={{ flex: 1, minWidth: 190 }}>
            <p style={{ color: "#F5F0E8", fontSize: 12.5, fontWeight: 700, margin: "0 0 10px" }}>Blocs les plus cliqués</p>
            {top.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 11.5 }}>Les clics enregistrés ne sont pas rattachés à un bloc précis.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {top.map(([id, n], i) => {
                  const type = typeById[id]
                  const name = type ? label(type) : "Zone supprimée"
                  const pct = topMax > 0 ? Math.round((n / topMax) * 100) : 0
                  return (
                    <div key={id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ color: type ? "#F5F0E8" : MUTED, fontSize: 12, fontWeight: 600 }}>
                          {name}
                        </span>
                        <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{n}</span>
                      </div>
                      <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, color-mix(in srgb, ${GOLD} 55%, #000))`, borderRadius: 5, transition: "width .4s" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p style={{ color: MUTED, fontSize: 10.5, margin: "12px 0 0", lineHeight: 1.5 }}>
              Un bloc très cliqué mérite d&apos;être remonté ou mis en avant. Un bloc jamais cliqué peut être simplifié ou déplacé.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
