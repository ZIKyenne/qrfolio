"use client"
import { spacerViewModel } from "../../models/spacer"
import type { EditorAdapterProps } from "../../renderTypes"

const SIZES: Record<string, number> = { xs: 6, sm: 12, md: 24, lg: 40, xl: 60 }

export function EditorSpacer({ content }: EditorAdapterProps) {
  const { size } = spacerViewModel(content)
  return <div style={{ height: SIZES[size] }} />
}
