// Modèle pur `menu_section`. items filtrés sur `name` (item{i}), limite 50. Prix conservé
// brut (aucun reformatage). Toujours visible : le public rend le conteneur même vide.
import { extractIndexed } from "./repeaterExtract"

export type MenuItem = { name: string; price?: string; desc?: string }
export type MenuSectionViewModel = { visible: boolean; category?: string; items: MenuItem[]; collapsible: boolean }

export function menuSectionViewModel(content: Record<string, any> | null | undefined): MenuSectionViewModel {
  const c = content || {}
  const items = extractIndexed<MenuItem>(c, 50, (cc, i) => cc[`item${i}_name`] ? { name: cc[`item${i}_name`], price: cc[`item${i}_price`], desc: cc[`item${i}_desc`] } : null)
  // Affichage « Grande carte dépliable » : section dans une carte, en-tête cliquable qui déplie/replie
  // les plats (idéal pour les gros menus). Sinon liste simple (historique).
  const collapsible = c.menu_display === "Grande carte dépliable"
  return { visible: true, category: typeof c.category === "string" && c.category ? c.category : undefined, items, collapsible }
}
