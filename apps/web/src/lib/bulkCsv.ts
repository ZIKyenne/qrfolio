// Parseur PUR pour la génération EN MASSE de liens dynamiques (palier Business).
// Lit un CSV « destination[, libellé] » tolérant : délimiteur , ou ; (Excel FR), en-têtes
// optionnels FR/EN, guillemets, normalisation/validation des URL. Aucune I/O — testable.

export type BulkRow = { label: string; dest: string; valid: boolean; error?: string; raw: string }
export type BulkParse = { rows: BulkRow[]; validCount: number; truncated: number }

// Normalise + valide une destination : http(s) uniquement, hôte avec un point. null si invalide.
export function normalizeBulkUrl(raw: string): string | null {
  const v = (raw || "").trim()
  if (!v) return null
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withProto)
    if ((u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".")) return u.toString()
    return null
  } catch { return null }
}

// Découpe une ligne CSV en champs, en respectant les guillemets doubles ("" = guillemet littéral).
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = "", inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false }
      else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === delim) { out.push(cur); cur = "" }
      else cur += c
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+/.test(s.trim())
const HEADER_DEST = /^(url|lien|destination|adresse|link)$/i
const HEADER_LABEL = /^(label|libell[ée]|nom|titre|name|title)$/i

// Parse un CSV en lignes {label, dest, valid}. `max` borne le nombre de lignes traitées.
export function parseBulkCsv(text: string, max = 200): BulkParse {
  const lines = (text || "").replace(/\r\n?/g, "\n").split("\n").map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return { rows: [], validCount: 0, truncated: 0 }

  // Délimiteur : ; s'il est plus fréquent que , sur la 1re ligne (Excel FR), sinon ,
  const first = lines[0]
  const delim = (first.split(";").length > first.split(",").length) ? ";" : ","

  // En-tête ? (mappe les colonnes dest/label ; sinon devine par le contenu)
  let destCol = -1, labelCol = -1, startIdx = 0
  const head = splitCsvLine(first, delim)
  if (head.some(h => HEADER_DEST.test(h)) || head.some(h => HEADER_LABEL.test(h))) {
    head.forEach((h, i) => { if (destCol < 0 && HEADER_DEST.test(h)) destCol = i; if (labelCol < 0 && HEADER_LABEL.test(h)) labelCol = i })
    startIdx = 1
  }

  const rows: BulkRow[] = []
  let truncated = 0
  for (let i = startIdx; i < lines.length; i++) {
    if (rows.length >= max) { truncated++; continue }
    const raw = lines[i]
    const f = splitCsvLine(raw, delim)

    let destRaw = "", label = ""
    if (destCol >= 0) { // colonnes connues par l'en-tête
      destRaw = f[destCol] ?? ""
      label = labelCol >= 0 ? (f[labelCol] ?? "") : ""
    } else if (f.length === 1) {
      destRaw = f[0]
    } else {
      // 2+ colonnes sans en-tête : la colonne qui ressemble à une URL = destination, l'autre = libellé.
      const urlIdx = f.findIndex(looksLikeUrl)
      if (urlIdx >= 0) { destRaw = f[urlIdx]; label = f[(urlIdx === 0 ? 1 : 0)] ?? "" }
      else { destRaw = f[0]; label = f[1] ?? "" }
    }

    const dest = normalizeBulkUrl(destRaw)
    if (!dest) { rows.push({ label: label.slice(0, 80), dest: destRaw, valid: false, error: "URL invalide", raw }); continue }
    // Libellé par défaut : le nom d'hôte sans www.
    const finalLabel = (label.trim() || (() => { try { return new URL(dest).hostname.replace(/^www\./, "") } catch { return "" } })()).slice(0, 80)
    rows.push({ label: finalLabel, dest, valid: true, raw })
  }

  return { rows, validCount: rows.filter(r => r.valid).length, truncated }
}
