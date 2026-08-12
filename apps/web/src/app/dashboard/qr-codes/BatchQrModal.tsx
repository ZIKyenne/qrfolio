"use client"

// Génération de QR EN LOT (B2B) — Phase Batch du plan (docs/QR-STUDIO-PLAN.md §2.20).
// L'utilisateur colle une liste (une valeur par ligne, "valeur,étiquette" possible) ;
// on génère un QR par ligne dans le STYLE courant, puis on télécharge un ZIP nommé.
// Overlay accessible (primitive Modal). Cœur pur testé (batchQr.ts) ; JSZip en import
// dynamique (hors bundle principal). Réservé Pro/Business.

import { useMemo, useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { parseBatchInput, batchFilenames } from "./batchQr"
import { impositionLayout } from "./impositionLayout"
import { supportById, pageMmOf } from "./printSupports"
import { blobToDataUrl, downloadBlob } from "./qrRender"

// Planches proposées (dérivées du catalogue de supports imprimables).
const SHEET_IDS = ["a4", "a3", "us_letter"] as const

interface Props {
  open: boolean
  onClose: () => void
  /** Génère le QR (dans le style courant) pour une valeur donnée. */
  genBlob: (value: string, ext: "png" | "svg") => Promise<Blob | null>
  isPro: boolean
  onUpsell?: (feature: string, plan?: "starter" | "pro" | "business") => void
  max?: number
}

const MUTED = "#8A8478"

export function BatchQrModal({ open, onClose, genBlob, isPro, onUpsell, max = 500 }: Props) {
  const [text, setText] = useState("")
  const [ext, setExt] = useState<"png" | "svg">("png")
  const [mode, setMode] = useState<"zip" | "sheet">("zip") // ZIP séparés vs planche PDF
  const [cellMm, setCellMm] = useState(40)                  // taille d'un QR sur la planche (mm)
  const [sheetId, setSheetId] = useState<string>("a4")      // format de la planche (catalogue)
  const [cutMarks, setCutMarks] = useState(true)            // traits de coupe sur la planche
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)

  const parsed = useMemo(() => parseBatchInput(text, max), [text, max])
  const count = parsed.rows.length
  // Planche choisie (dimensions physiques en mm depuis le catalogue).
  const sheetSup = supportById(sheetId) ?? supportById("a4")!
  const pageMm = pageMmOf(sheetSup)
  // Aperçu d'imposition (perPage/pages) pour le mode planche.
  const sheet = useMemo(() => impositionLayout({ count: count || 1, pageW: pageMm.w, pageH: pageMm.h, cell: cellMm, margin: 10, gutter: 5 }), [count, cellMm, pageMm.w, pageMm.h])

  if (!open) return null

  // ZIP de fichiers séparés (un par ligne).
  const runZip = async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    const names = batchFilenames(parsed.rows, ext)
    for (let i = 0; i < parsed.rows.length; i++) {
      const blob = await genBlob(parsed.rows[i].value, ext)
      if (blob) zip.file(names[i], blob)
      setDone(i + 1)
    }
    const out = await zip.generateAsync({ type: "blob" })
    downloadBlob(out, `qrowg-lot-${count}.zip`)
  }

  // Planche PDF A4 : N QR par page, grille centrée, traits de coupe optionnels.
  const runSheet = async () => {
    const { jsPDF } = await import("jspdf")
    const lay = impositionLayout({ count, pageW: pageMm.w, pageH: pageMm.h, cell: cellMm, margin: 10, gutter: 5 })
    const pdf = new jsPDF({ unit: "mm", orientation: pageMm.w > pageMm.h ? "l" : "p", format: [pageMm.w, pageMm.h] })
    let curPage = 0
    for (let n = 0; n < lay.cells.length; n++) {
      const c = lay.cells[n]
      if (c.page > curPage) { pdf.addPage(); curPage = c.page }
      const blob = await genBlob(parsed.rows[n].value, "png")
      if (blob) pdf.addImage(await blobToDataUrl(blob), "PNG", c.x, c.y, lay.cellSize, lay.cellSize)
      if (cutMarks) {
        pdf.setDrawColor(180); pdf.setLineWidth(0.1)
        pdf.rect(c.x, c.y, lay.cellSize, lay.cellSize) // contour de coupe leger
      }
      setDone(n + 1)
    }
    pdf.save(`qrowg-planche-${sheetId}-${count}.pdf`)
  }

  const run = async () => {
    if (!isPro) { onUpsell?.("la génération de QR en lot", "pro"); return }
    if (count === 0 || busy) return
    setBusy(true); setDone(0)
    try {
      if (mode === "sheet") await runSheet(); else await runZip()
      onClose()
    } catch {
      // silencieux : on relâche l'état ; l'utilisateur peut réessayer.
    } finally { setBusy(false) }
  }

  const chip = (active: boolean) => ({
    flex: 1, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700,
    border: `1px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.12)"}`,
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
    color: active ? "var(--accent)" : "var(--ink)",
  })

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Générer des QR en lot" maxWidth={520}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
        <Button variant="primary" onClick={run} loading={busy} disabled={count === 0}>
          {busy ? `Génération ${done}/${count}…` : mode === "sheet" ? `Générer la planche PDF (${count})` : `Générer le ZIP (${count})`}
        </Button>
      </>}>
      <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
        Une valeur par ligne (URL ou texte). Ajoute une étiquette après une virgule pour
        nommer le fichier : <code style={{ color: "var(--accent)" }}>https://…, Table 1</code>.
        Chaque QR reprend le <strong>style courant</strong>.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)", color: "var(--ink)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Importer un fichier (.csv)
          <input type="file" accept=".csv,.txt,text/csv,text/plain" style={{ display: "none" }}
            onChange={async e => { const f = e.target.files?.[0]; if (f) { try { setText(await f.text()) } catch {} } e.target.value = "" }} />
        </label>
        <span style={{ color: MUTED, fontSize: 11 }}>ou colle ta liste ci-dessous</span>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"https://exemple.com/t1, Table 1\nhttps://exemple.com/t2, Table 2\nhttps://exemple.com/t3, Table 3"}
        rows={8}
        style={{ width: "100%", boxSizing: "border-box", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "var(--ink)", fontSize: 14, padding: 12, resize: "vertical", outline: "none", fontFamily: "monospace" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span style={{ color: MUTED, fontSize: 12.5, minWidth: 46 }}>Sortie</span>
        <button type="button" onClick={() => setMode("zip")} style={chip(mode === "zip")}>Fichiers (ZIP)</button>
        <button type="button" onClick={() => setMode("sheet")} style={chip(mode === "sheet")}>Planche PDF</button>
      </div>

      {mode === "zip" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <span style={{ color: MUTED, fontSize: 12.5, minWidth: 46 }}>Format</span>
          <button type="button" onClick={() => setExt("png")} style={chip(ext === "png")}>PNG</button>
          <button type="button" onClick={() => setExt("svg")} style={chip(ext === "svg")}>SVG (vectoriel)</button>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: MUTED, fontSize: 12.5, minWidth: 46 }}>Planche</span>
            {SHEET_IDS.map(id => (
              <button key={id} type="button" onClick={() => setSheetId(id)} style={chip(sheetId === id)}>{supportById(id)?.label ?? id}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <span style={{ color: MUTED, fontSize: 12.5, minWidth: 46 }}>Taille</span>
            {[30, 40, 50].map(s => (
              <button key={s} type="button" onClick={() => setCellMm(s)} style={chip(cellMm === s)}>{s} mm</button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer", color: "var(--ink)", fontSize: 13 }}>
            <input type="checkbox" checked={cutMarks} onChange={e => setCutMarks(e.target.checked)} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
            Traits de coupe (contour de chaque QR)
          </label>
          <p style={{ color: MUTED, fontSize: 11, margin: "8px 0 0" }}>Planche {sheetSup.label} · {sheet.perPage} QR par page{count > 0 ? ` · ${sheet.pages} page${sheet.pages > 1 ? "s" : ""}` : ""}.</p>
        </div>
      )}

      <p style={{ color: MUTED, fontSize: 12, margin: "10px 0 0" }}>
        {count > 0 ? `${count} QR seront générés` : "Colle ta liste ci-dessus"}
        {parsed.truncated && ` · limité à ${max} (le reste est ignoré)`}
        {!isPro && " · réservé au plan Pro"}
      </p>
    </Modal>
  )
}
