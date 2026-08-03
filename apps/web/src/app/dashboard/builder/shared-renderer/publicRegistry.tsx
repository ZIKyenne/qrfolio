"use client"
// Registre PUBLIC : mappe type → adapter public. Importé UNIQUEMENT par PublicPageClient.
// N'importe AUCUN adapter éditeur (isolation de bundle vérifiée par bundleBoundary.test).
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { PublicAdapterProps } from "./renderTypes"
import { PublicHeading } from "./blocks/heading/PublicHeading"
import { PublicValues } from "./blocks/values/PublicValues"
import { PublicPricing } from "./blocks/pricing/PublicPricing"

const PUBLIC_ADAPTERS: Record<string, ComponentType<PublicAdapterProps>> = {
  heading: PublicHeading,
  values: PublicValues,
  pricing: PublicPricing,
}

// Renvoie l'adapter public partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolvePublicBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<PublicAdapterProps> | null {
  if (!active.has(type)) return null
  return PUBLIC_ADAPTERS[type] ?? null
}
