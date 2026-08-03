// impositionLayout.ts — Imposition PURE d'une planche de QR (N QR par page, prêts à
// massicoter). Calcule la grille (colonnes/lignes/pages) et la position de chaque QR,
// en millimètres, grille centrée dans la zone utile. Aucune dépendance -> testable.
// L'adaptateur (BatchQrModal) place ensuite chaque QR au PDF selon ces positions.
// Voir docs/QR-STUDIO-PLAN.md §2.28 (Packaging / planches).

export type ImpoInput = {
  count: number    // nombre de QR à imposer
  pageW: number    // largeur page (mm)
  pageH: number    // hauteur page (mm)
  cell: number     // côté d'un QR (mm)
  margin: number   // marge de la page (mm)
  gutter: number   // gouttière entre QR (mm)
}

export type ImpoCell = { page: number; col: number; row: number; x: number; y: number }

export type ImpoLayout = {
  cols: number
  rows: number
  perPage: number
  pages: number
  cellSize: number
  cells: ImpoCell[] // une entrée par QR, dans l'ordre, avec sa page et sa position (mm)
}

export function impositionLayout(i: ImpoInput): ImpoLayout {
  const cell = Math.max(1, i.cell)
  const gutter = Math.max(0, i.gutter)
  const margin = Math.max(0, i.margin)
  const usableW = Math.max(0, i.pageW - 2 * margin)
  const usableH = Math.max(0, i.pageH - 2 * margin)
  // Nb de cellules qui tiennent : n*cell + (n-1)*gutter <= usable  <=>  n <= (usable+gutter)/(cell+gutter)
  const cols = Math.max(1, Math.floor((usableW + gutter) / (cell + gutter)))
  const rows = Math.max(1, Math.floor((usableH + gutter) / (cell + gutter)))
  const perPage = cols * rows
  const count = Math.max(0, Math.floor(i.count))
  const pages = perPage > 0 ? Math.ceil(count / perPage) : 0

  // Grille centrée dans la zone utile.
  const gridW = cols * cell + (cols - 1) * gutter
  const gridH = rows * cell + (rows - 1) * gutter
  const offX = margin + (usableW - gridW) / 2
  const offY = margin + (usableH - gridH) / 2

  const cells: ImpoCell[] = []
  for (let n = 0; n < count; n++) {
    const page = Math.floor(n / perPage)
    const idx = n % perPage
    const col = idx % cols
    const row = Math.floor(idx / cols)
    cells.push({
      page, col, row,
      x: offX + col * (cell + gutter),
      y: offY + row * (cell + gutter),
    })
  }
  return { cols, rows, perPage, pages, cellSize: cell, cells }
}
