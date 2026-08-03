// Modèle pur `brands`. items filtrés sur `name` (clés brand{i}). Limite 50.
import { extractIndexed } from "./repeaterExtract"

export type BrandItem = { icon?: string; name: string }
export type BrandsViewModel = { visible: boolean; title?: string; items: BrandItem[] }

export function brandsViewModel(content: Record<string, any> | null | undefined): BrandsViewModel {
  const c = content || {}
  const items = extractIndexed<BrandItem>(c, 50, (cc, i) => cc[`brand${i}_name`] ? { icon: cc[`brand${i}_icon`], name: cc[`brand${i}_name`] } : null)
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
