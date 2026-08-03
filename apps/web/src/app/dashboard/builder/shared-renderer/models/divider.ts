// Modèle pur du bloc `divider` (séparateur statique). Aucun React/Supabase.
export type DividerViewModel = { visible: true; style: string }
export function dividerViewModel(content: Record<string, any> | null | undefined): DividerViewModel {
  const c = content || {}
  return { visible: true, style: typeof c.style === "string" && c.style ? c.style : "gold" }
}
