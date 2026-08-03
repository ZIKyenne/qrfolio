// Modèle pur du bloc `skills` (étiquettes séparées par virgules). Aucun React/Supabase.
export type SkillsViewModel = { visible: true; title?: string; tags: string[] }
export function skillsViewModel(content: Record<string, any> | null | undefined): SkillsViewModel {
  const c = content || {}
  const tags = (typeof c.tags === "string" ? c.tags : "").split(",").map((t: string) => t.trim()).filter(Boolean)
  return { visible: true, title: typeof c.title === "string" && c.title ? c.title : undefined, tags }
}
