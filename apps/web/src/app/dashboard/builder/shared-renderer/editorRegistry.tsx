"use client"
// Registre ÉDITEUR : mappe type → adapter éditeur. Importé UNIQUEMENT par builderPreview.
// N'entre jamais dans le bundle public.
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorAdapterProps } from "./renderTypes"
import { EditorHeading } from "./blocks/heading/EditorHeading"
import { EditorValues } from "./blocks/values/EditorValues"
import { EditorPricing } from "./blocks/pricing/EditorPricing"

const EDITOR_ADAPTERS: Record<string, ComponentType<EditorAdapterProps>> = {
  heading: EditorHeading,
  values: EditorValues,
  pricing: EditorPricing,
}

// Renvoie l'adapter éditeur partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolveEditorBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<EditorAdapterProps> | null {
  if (!active.has(type)) return null
  return EDITOR_ADAPTERS[type] ?? null
}
