// Modèle pur `menu_section`. items filtrés sur `name` (item{i}), limite 50. Prix conservé
// brut (aucun reformatage). Toujours visible : le public rend le conteneur même vide.
import { extractIndexed } from "./repeaterExtract"

export type MenuItem = { name: string; price?: string; desc?: string }
export type MenuSectionViewModel = { visible: boolean; category?: string; items: MenuItem[] }

export function menuSectionViewModel(content: Record<string, any> | null | undefined): MenuSectionViewModel {
  const c = content || {}
  const items = extractIndexed<MenuItem>(c, 50, (cc, i) => cc[`item${i}_name`] ? { name: cc[`item${i}_name`], price: cc[`item${i}_price`], desc: cc[`item${i}_desc`] } : null)
  return { visible: true, category: typeof c.category === "string" && c.category ? c.category : undefined, items }
}
