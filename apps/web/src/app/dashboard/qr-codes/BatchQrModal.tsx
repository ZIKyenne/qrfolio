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
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)

  const parsed = useMemo(() => parseBatchInput(text, max), [text, max])
  const count = parsed.rows.length

  if (!open) return null

  const run = async () => {
    if (!isPro) { onUpsell?.("la génération de QR en lot", "pro"); return }
    if (count === 0 || busy) return
    setBusy(true); setDone(0)
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      const names = batchFilenames(parsed.rows, ext)
      for (let i = 0; i < parsed.rows.length; i++) {
        const blob = await genBlob(parsed.rows[i].value, ext)
        if (blob) zip.file(names[i], blob)
        setDone(i + 1)
      }
      const out = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(out)
      const a = document.createElement("a")
      a.href = url; a.download = `qrowg-lot-${count}.zip`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      onClose()
    } catch {
      // silencieux : l'appelant peut afficher un toast si besoin ; on relâche l'état.
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
          {busy ? `Génération ${done}/${count}…` : `Générer le ZIP (${count})`}
        </Button>
      </>}>
      <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
        Une valeur par ligne (URL ou texte). Ajoute une étiquette après une virgule pour
        nommer le fichier : <code style={{ color: "var(--accent)" }}>https://…, Table 1</code>.
        Chaque QR reprend le <strong>style courant</strong>.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"https://exemple.com/t1, Table 1\nhttps://exemple.com/t2, Table 2\nhttps://exemple.com/t3, Table 3"}
        rows={8}
        style={{ width: "100%", boxSizing: "border-box", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "var(--ink)", fontSize: 14, padding: 12, resize: "vertical", outline: "none", fontFamily: "monospace" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span style={{ color: MUTED, fontSize: 12.5 }}>Format</span>
        <button type="button" onClick={() => setExt("png")} style={chip(ext === "png")}>PNG</button>
        <button type="button" onClick={() => setExt("svg")} style={chip(ext === "svg")}>SVG (vectoriel)</button>
      </div>
      <p style={{ color: MUTED, fontSize: 12, margin: "10px 0 0" }}>
        {count > 0 ? `${count} QR seront générés` : "Colle ta liste ci-dessus"}
        {parsed.truncated && ` · limité à ${max} (le reste est ignoré)`}
        {!isPro && " · réservé au plan Pro"}
      </p>
    </Modal>
  )
}
