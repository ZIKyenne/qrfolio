"use client"
// Registre ÉDITEUR : mappe type → adapter éditeur. Importé UNIQUEMENT par builderPreview.
// N'entre jamais dans le bundle public.
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorAdapterProps } from "./renderTypes"
import { EditorHeading } from "./blocks/heading/EditorHeading"
import { EditorValues } from "./blocks/values/EditorValues"
import { EditorPricing } from "./blocks/pricing/EditorPricing"
import { EditorDivider } from "./blocks/divider/EditorDivider"
import { EditorSpacer } from "./blocks/spacer/EditorSpacer"
import { EditorBio } from "./blocks/bio/EditorBio"
import { EditorSkills } from "./blocks/skills/EditorSkills"
import { EditorLanguages } from "./blocks/languages/EditorLanguages"
import { EditorAdvantages } from "./blocks/advantages/EditorAdvantages"

const EDITOR_ADAPTERS: Record<string, ComponentType<EditorAdapterProps>> = {
  heading: EditorHeading,
  values: EditorValues,
  pricing: EditorPricing,
  divider: EditorDivider,
  spacer: EditorSpacer,
  bio: EditorBio,
  skills: EditorSkills,
  languages: EditorLanguages,
  advantages: EditorAdvantages,
}

// Renvoie l'adapter éditeur partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolveEditorBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<EditorAdapterProps> | null {
  if (!active.has(type)) return null
  return EDITOR_ADAPTERS[type] ?? null
}
