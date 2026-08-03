// Modèle pur du bloc `advantages` (liste d'avantages, champs adv{i}). Aucun React/Supabase.
export type AdvantagesViewModel = { visible: boolean; title?: string; items: string[] }
export function advantagesViewModel(content: Record<string, any> | null | undefined): AdvantagesViewModel {
  const c = content || {}
  const items = Array.from({ length: 50 }, (_, k) => c[`adv${k + 1}`]).filter(Boolean) as string[]
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
