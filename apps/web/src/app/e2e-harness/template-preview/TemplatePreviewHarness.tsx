"use client"

// Harness du composant réutilisable TemplateComposer (T2/T3). Monte le VRAI composant produit + un
// enregistreur de `onCreate` (oracle de test). SANS Supabase — la création réelle est déléguée au
// parent (ici : on enregistre le template composé).

import { useState } from "react"
import { TemplateComposer } from "@/components/templates/TemplateComposer"
import type { ComposedTemplate } from "@/app/dashboard/builder/templateEngine"

export function TemplatePreviewHarness() {
  const [created, setCreated] = useState<ComposedTemplate | null>(null)
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div data-testid="create-recorder" data-created-key={created?.key ?? ""} data-created-blocks={created ? created.blocks.length : ""}
        style={{ flexShrink: 0, padding: "6px 12px", background: "#0C0C0C", borderBottom: "1px solid rgba(201,168,76,0.2)", color: "#8A8478", fontSize: 11 }}>
        Créé : <b>{created?.key ?? "—"}</b>{created ? ` (${created.blocks.length} blocs)` : ""}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <TemplateComposer onCreate={setCreated} />
      </div>
    </div>
  )
}
