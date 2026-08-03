// Modèle pur du bloc `languages` (liste langue + niveau). Aucun React/Supabase.
export type LanguageItem = { flag?: string; name: string; level?: string }
export type LanguagesViewModel = { visible: boolean; title?: string; items: LanguageItem[] }
export function languagesViewModel(content: Record<string, any> | null | undefined): LanguagesViewModel {
  const c = content || {}
  const items = Array.from({ length: 50 }, (_, k) => k + 1)
    .map(i => ({ flag: c[`lang_${i}_flag`], name: c[`lang_${i}_name`], level: c[`lang_${i}_level`] }))
    .filter(l => l.name) as LanguageItem[]
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
