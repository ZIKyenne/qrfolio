"use client"
// Registre PUBLIC : mappe type → adapter public. Importé UNIQUEMENT par PublicPageClient.
// N'importe AUCUN adapter éditeur (isolation de bundle vérifiée par bundleBoundary.test).
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { PublicAdapterProps } from "./renderTypes"
import { PublicHeading } from "./blocks/heading/PublicHeading"
import { PublicValues } from "./blocks/values/PublicValues"
import { PublicPricing } from "./blocks/pricing/PublicPricing"
import { PublicDivider } from "./blocks/divider/PublicDivider"
import { PublicSpacer } from "./blocks/spacer/PublicSpacer"
import { PublicBio } from "./blocks/bio/PublicBio"
import { PublicSkills } from "./blocks/skills/PublicSkills"
import { PublicLanguages } from "./blocks/languages/PublicLanguages"
import { PublicAdvantages } from "./blocks/advantages/PublicAdvantages"

const PUBLIC_ADAPTERS: Record<string, ComponentType<PublicAdapterProps>> = {
  heading: PublicHeading,
  values: PublicValues,
  pricing: PublicPricing,
  divider: PublicDivider,
  spacer: PublicSpacer,
  bio: PublicBio,
  skills: PublicSkills,
  languages: PublicLanguages,
  advantages: PublicAdvantages,
}

// Renvoie l'adapter public partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolvePublicBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<PublicAdapterProps> | null {
  if (!active.has(type)) return null
  return PUBLIC_ADAPTERS[type] ?? null
}
