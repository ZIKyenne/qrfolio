// Modèle pur du bloc `spacer` (espace vertical statique). Aucun React/Supabase.
export type SpacerViewModel = { visible: true; size: string }
export function spacerViewModel(content: Record<string, any> | null | undefined): SpacerViewModel {
  const c = content || {}
  return { visible: true, size: typeof c.size === "string" && c.size ? c.size : "md" }
}
