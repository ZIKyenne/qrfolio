// Modèle pur du bloc `bio` (texte de présentation). Aucun React/Supabase.
export type BioViewModel = { visible: true; text: string; align: string }
export function bioViewModel(content: Record<string, any> | null | undefined): BioViewModel {
  const c = content || {}
  return { visible: true, text: typeof c.text === "string" ? c.text : "", align: typeof c.align === "string" && c.align ? c.align : "left" }
}
