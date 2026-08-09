// menuImport.ts — Parseur PUR pour importer un menu depuis un tableur (Excel / Google Sheets /
// Numbers) par copier-coller. Détecte le séparateur (tabulation à la copie d'un tableur, sinon
// point-virgule, sinon virgule), saute une éventuelle ligne d'en-têtes, et mappe les colonnes
// positionnellement : Nom, Prix, Description, Catégorie. Aucune dépendance, aucun réseau, ne mute rien.

export type ParsedMenuItem = { name: string; price: string; desc: string; category: string }

const HEADER_WORDS = ["nom", "name", "plat", "produit", "item", "prix", "price", "tarif", "description", "desc", "détail", "detail", "categorie", "catégorie", "category", "section"]

// Détecte le séparateur de colonnes le plus probable sur l'ensemble du texte.
function detectDelimiter(lines: string[]): string {
  const joined = lines.join("\n")
  if (joined.includes("\t")) return "\t"          // copie directe d'un tableur
  if (joined.includes("|")) return "|"            // tableau markdown (fréquent avec ChatGPT)
  if (joined.includes(";")) return ";"            // CSV FR (Excel FR exporte en ;)
  if (joined.includes(",")) return ","
  return "\t"                                      // une seule colonne : peu importe
}

// Ligne de séparation d'un tableau markdown (ex : | --- | :---: |) → à ignorer.
function isMarkdownSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c.trim()))
}

// Une ligne ressemble-t-elle à des en-têtes ? (aucun prix numérique + mots d'en-tête connus)
function looksLikeHeader(cells: string[]): boolean {
  const low = cells.map(c => c.toLowerCase().trim())
  const hasHeaderWord = low.some(c => HEADER_WORDS.includes(c))
  const hasNumber = cells.some(c => /\d/.test(c))
  return hasHeaderWord && !hasNumber
}

// Sépare un « Nom 12€ » (mono-colonne) en nom + prix si un prix est détecté en fin de chaîne.
function splitTrailingPrice(s: string): { name: string; price: string } {
  const m = s.match(/^(.*?)[\s—–-]*((?:\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?|\$|£|chf)?)\s*$/i)
  if (m && m[1].trim() && /\d/.test(m[2])) return { name: m[1].trim(), price: m[2].trim() }
  return { name: s.trim(), price: "" }
}

export function parseMenuPaste(text: string, max = 50): ParsedMenuItem[] {
  if (!text || typeof text !== "string") return []
  // On garde les lignes telles quelles (on ne rogne PAS toute la ligne, sinon un tab de tête décalerait
  // les colonnes) ; on ne retire que les lignes entièrement vides et on rogne cellule par cellule.
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "")
  if (lines.length === 0) return []
  const delim = detectDelimiter(lines)
  let rows = lines.map(l => l.split(delim).map(c => c.trim()))
  if (delim === "|") {
    // Tableau markdown : retire les cellules de bord vides (| au début/fin), ignore les séparateurs.
    rows = rows
      .map(cells => { const cc = [...cells]; if (cc[0] === "") cc.shift(); if (cc[cc.length - 1] === "") cc.pop(); return cc })
      .filter(cells => cells.length > 0 && !isMarkdownSeparator(cells))
  }
  if (rows.length === 0) return []

  // Saute l'en-tête éventuel (uniquement s'il y a plus d'une ligne).
  let start = 0
  if (rows.length > 1 && looksLikeHeader(rows[0])) start = 1

  const out: ParsedMenuItem[] = []
  for (let i = start; i < rows.length && out.length < max; i++) {
    const cells = rows[i]
    let name = cells[0] || ""
    let price = cells[1] || ""
    const desc = cells[2] || ""
    const category = cells[3] || ""
    // Mono-colonne « Nom 12€ » → on récupère le prix en fin de nom.
    if (!price && cells.length === 1) { const sp = splitTrailingPrice(name); name = sp.name; price = sp.price }
    if (!name) continue
    out.push({ name, price, desc, category })
  }
  return out
}
