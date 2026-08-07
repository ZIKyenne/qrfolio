"use client"

// Harness T3.b : monte la VRAIE modale de nommage (`NamingModal`) avec le sélecteur de style/
// disposition alimenté par le moteur de templates. Exerce le cas « signature » (thème BESPOKE hors
// presets) → une option « original » précède les 14 ambiances, et le défaut reproduit le look exact.
// Prouve visuellement le pont galerie universel sans Supabase (création réelle = flux authentifié).
import { useState } from "react"
import { NamingModal } from "@/app/dashboard/templates/page"
import {
  TEMPLATE_STYLE_LIST, TEMPLATE_LAYOUT_LIST, TEMPLATE_STRUCTURES,
  galleryStyleChoices, nativeGalleryStyleKey, galleryComposeBlocks,
} from "@/app/dashboard/builder/templateEngine"

// Thème bespoke (comme les 14 « signature » de la galerie) : PAS un preset d'ambiance → doit générer
// une option « original » et un défaut qui conserve ce thème à l'identique.
const BESPOKE = {
  name: "Neon Creator", bg: "#030303", surface: "#0A0A0A", primary: "#FF0080", accent: "#00FFFF",
  text: "#F8F0FF", muted: "#808080", fontDisplay: "Space Grotesk", fontBody: "Space Grotesk", bgMode: "solid",
} as any
const BLOCKS = [
  { type: "profile", content: { name: "Alex Créa", tagline: "Créateur de contenu", badge: "Signature" } },
  { type: "bio", content: { text: "Un modèle signature restylable via le moteur.", align: "center" } },
  { type: "cta_button", content: { label: "Me suivre", url: "#", style: "neon", icon: "✨", full_width: "yes" } },
]

export function NamingStyleHarness() {
  const [styleKey, setStyleKey] = useState<string>(nativeGalleryStyleKey(BESPOKE))
  const [layoutKey, setLayoutKey] = useState("default")
  const [created, setCreated] = useState<{ blocks: number; themeName: string } | null>(null)

  const composed = galleryComposeBlocks(BLOCKS, BESPOKE, styleKey, layoutKey)
  const tpl = { id: "signature_demo", name: "Créateur (signature)", category: "Créatif", emoji: "✨", color: BESPOKE.primary }

  return (
    <div data-testid="naming-style-harness"
      data-style={styleKey}
      data-layout={layoutKey}
      data-blocks={composed.blocks.length}
      data-theme-name={composed.theme.name}
      style={{ minHeight: "100vh", background: "#050505" }}>

      <div data-testid="create-recorder"
        data-created-blocks={created?.blocks ?? ""}
        data-created-theme={created?.themeName ?? ""}
        style={{ position: "fixed", top: 0, left: 0, padding: 8, color: "#666", fontSize: 11, zIndex: 1 }}>
        {created ? `créé: ${created.blocks} blocs · ${created.themeName}` : "en attente"}
      </div>

      <NamingModal
        template={tpl}
        blockCount={composed.blocks.length}
        styleOptions={galleryStyleChoices(BESPOKE)}
        styleKey={styleKey}
        onStyleChange={setStyleKey}
        layoutOptions={TEMPLATE_LAYOUT_LIST.map(l => ({ key: l.key, label: l.label }))}
        layoutKey={layoutKey}
        onLayoutChange={setLayoutKey}
        onClose={() => { /* noop en harness */ }}
        onCreate={async () => {
          const r = galleryComposeBlocks(BLOCKS, BESPOKE, styleKey, layoutKey)
          setCreated({ blocks: r.blocks.length, themeName: r.theme.name })
          return { ok: true }
        }}
      />

      <span data-testid="registry-size" style={{ display: "none" }}>{TEMPLATE_STRUCTURES.length}</span>
      <span data-testid="style-count" style={{ display: "none" }}>{TEMPLATE_STYLE_LIST.length}</span>
    </div>
  )
}
