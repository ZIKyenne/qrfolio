// batchQr.ts — Génération de QR EN LOT (B2B). Cœur PUR et testable : parsing de la
// liste saisie/collée, normalisation en lignes {valeur, étiquette}, et génération de
// noms de fichiers UNIQUES pour l'export ZIP. La génération réelle des QR (getQRBlob)
// et le ZIP sont branchés côté client par l'adaptateur (Print/QR Studio).
// Voir docs/QR-STUDIO-PLAN.md §2.20 (Batch).

import { slugifyBase } from "@/lib/slug"

export type BatchRow = {
  value: string   // contenu encodé par le QR (URL, texte…)
  label: string   // étiquette lisible (défaut = la valeur) — sert au nom de fichier
}

// Parse une saisie multi-lignes. Chaque ligne :
//   "valeur"            -> étiquette = valeur
//   "valeur<sep>label"  -> séparateur = 1er TAB, ";" ou "," rencontré
// Ignore les lignes vides et les espaces de bord. Ne dédoublonne PAS les valeurs
// (des QR identiques peuvent être voulus) ; borne le nombre à `max`.
export function parseBatchInput(text: string, max = 500): { rows: BatchRow[]; truncated: boolean } {
  const lines = (text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows: BatchRow[] = []
  for (const line of lines) {
    const m = line.match(/^(.*?)[\t;,](.*)$/) // 1er séparateur tab / ; / ,
    const value = (m ? m[1] : line).trim()
    const label = (m ? m[2] : "").trim() || value
    if (value) rows.push({ value, label })
  }
  const truncated = rows.length > max
  return { rows: truncated ? rows.slice(0, max) : rows, truncated }
}

// Noms de fichiers UNIQUES pour un lot : slug de l'étiquette (repli "qr-N"), suffixe
// -2/-3… en cas de collision. Garantit l'unicité stricte au sein du lot.
export function batchFilenames(rows: BatchRow[], ext: string): string[] {
  const used = new Set<string>()
  return rows.map((r, i) => {
    const base = slugifyBase(r.label, 60) || `qr-${i + 1}`
    let name = base, k = 1
    while (used.has(name)) { k++; name = `${base}-${k}` }
    used.add(name)
    return `${name}.${ext}`
  })
}
