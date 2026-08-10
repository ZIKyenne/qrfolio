// Modèle pur `menu_tabs` — « Grande carte » : plusieurs sections (onglets) dans UN bloc, chacune
// remplie par du texte collé (tableur ou réponse IA) parsé via parseMenuPaste. Idéal pour les gros
// menus (150+ produits) : vue d'ensemble par onglets, sans scroll interminable. Réglages taille de
// texte + densité. Aucune dépendance DOM, ne mute rien.
import { extractIndexed } from "./repeaterExtract"
import { parseMenuPaste, type ParsedMenuItem } from "../../menuImport"

export type MenuTabSection = { i: number; title: string; items: ParsedMenuItem[] }
export type MenuTabsViewModel = {
  visible: boolean
  title?: string
  sections: MenuTabSection[]
  textScale: number   // multiplicateur de taille de police
  rowPad: number      // padding vertical d'une ligne (densité), en px
}

const TEXT_SCALE: Record<string, number> = { Compact: 0.86, Normal: 1, Grand: 1.16 }
const ROW_PAD: Record<string, number> = { "Serré": 6, "Normal": 11, "Aéré": 16 }

export function menuTabsViewModel(content: Record<string, any> | null | undefined): MenuTabsViewModel {
  const c = content || {}
  const sections = extractIndexed<MenuTabSection>(c, 20, (cc, i) => {
    const title = (cc[`sec${i}_title`] || "").trim()
    const raw = cc[`sec${i}_items`] || ""
    const items = parseMenuPaste(raw)
    // Une section n'existe que si elle a un titre OU des produits.
    if (!title && items.length === 0) return null
    return { i, title: title || `Section ${i}`, items }
  })
  return {
    visible: sections.length > 0,
    title: typeof c.title === "string" && c.title ? c.title : undefined,
    sections,
    textScale: TEXT_SCALE[c.text_size] ?? 1,
    rowPad: ROW_PAD[c.row_density] ?? ROW_PAD.Normal,
  }
}
