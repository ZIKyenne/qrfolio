"use client"
import { spacerViewModel } from "../../models/spacer"
import type { PublicAdapterProps } from "../../renderTypes"

const SIZES: Record<string, number> = { xs: 8, sm: 16, md: 28, lg: 48, xl: 72 }

export function PublicSpacer({ content }: PublicAdapterProps) {
  const { size } = spacerViewModel(content)
  return <div style={{ height: SIZES[size] }} />
}
