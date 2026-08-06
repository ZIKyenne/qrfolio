"use client"

// Harness T3.b : monte la VRAIE modale de nommage (`NamingModal`) avec le sélecteur de style/
// disposition alimenté par le moteur de templates, sur une structure partagée réelle. Prouve
// visuellement le pont galerie sans Supabase (la création réelle reste un flux authentifié = binôme).
import { useState } from "react"
import { NamingModal } from "@/app/dashboard/templates/page"
import {
  TEMPLATE_STYLE_LIST, TEMPLATE_LAYOUT_LIST, TEMPLATE_STRUCTURES,
  nativeStyleKeyFor, galleryRestyle,
} from "@/app/dashboard/builder/templateEngine"
import { PAGE_TEMPLATES } from "@/app/dashboard/builder/page-templates"

// On prend un vrai template partagé (structure connue → restylable).
const TARGET = PAGE_TEMPLATES[0]

export function NamingStyleHarness() {
  const [styleKey, setStyleKey] = useState<string | null>(nativeStyleKeyFor(TARGET.key))
  const [layoutKey, setLayoutKey] = useState("default")
  const [created, setCreated] = useState<{ blocks: number; themeName: string } | null>(null)

  const effStyle = styleKey || nativeStyleKeyFor(TARGET.key) || "gold"
  const composed = galleryRestyle(TARGET.key, effStyle, layoutKey)!

  const tpl = {
    id: TARGET.key, name: TARGET.label, category: TARGET.group,
    emoji: TARGET.emoji, color: TARGET.theme.primary,
  }

  return (
    <div data-testid="naming-style-harness"
      data-structure={TARGET.key}
      data-style={effStyle}
      data-layout={layoutKey}
      data-blocks={composed.blocks.length}
      data-theme-name={composed.theme.name}
      style={{ minHeight: "100vh", background: "#050505" }}>

      {/* Enregistreur (assert e2e) : ce que la création enverrait réellement à l'API. */}
      <div data-testid="create-recorder"
        data-created-blocks={created?.blocks ?? ""}
        data-created-theme={created?.themeName ?? ""}
        style={{ position: "fixed", top: 0, left: 0, padding: 8, color: "#666", fontSize: 11, zIndex: 1 }}>
        {created ? `créé: ${created.blocks} blocs · ${created.themeName}` : "en attente"}
      </div>

      <NamingModal
        template={tpl}
        blockCount={composed.blocks.length}
        styleOptions={TEMPLATE_STYLE_LIST.map(s => ({ key: s.key, label: s.label, color: s.theme.primary }))}
        styleKey={effStyle}
        onStyleChange={setStyleKey}
        layoutOptions={TEMPLATE_LAYOUT_LIST.map(l => ({ key: l.key, label: l.label }))}
        layoutKey={layoutKey}
        onLayoutChange={setLayoutKey}
        onClose={() => { /* noop en harness */ }}
        onCreate={async () => {
          const r = galleryRestyle(TARGET.key, effStyle, layoutKey)!
          setCreated({ blocks: r.blocks.length, themeName: r.theme.name })
          return { ok: true }
        }}
      />

      {/* Sanity : le registre est bien peuplé (verticales incluses). */}
      <span data-testid="registry-size" style={{ display: "none" }}>{TEMPLATE_STRUCTURES.length}</span>
    </div>
  )
}
