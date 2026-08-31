"use client"

// ImportEnMasse.tsx — La fenêtre d'import CSV, sortie de la page « Créer un QR ».
//
// Elle y occupait cinquante lignes de JSX et cinq états, au milieu de dix autres
// responsabilités, alors qu'elle ne partage rien avec le reste : elle prend un
// texte, appelle une route, et rend les liens créés. C'était le morceau le plus
// facile à sortir, et celui qui rendait le plus difficile de lire la page.

import { useMemo, useRef, useState } from "react"
import { Upload, X, Check } from "lucide-react"
import { parseBulkCsv } from "@/lib/bulkCsv"
import { useFermetureModale } from "@/lib/useFermetureModale"
import { Button } from "@/components/ui/Button"
import type { InstantQr } from "./instantQr"

const G = "#C9A84C"
const MUTED = "#A8A190"

export default function ImportEnMasse({ ouvert, onFermer, onCrees }: {
  ouvert: boolean
  onFermer: () => void
  /** Appelé avec les QR créés, pour les ajouter en tête de liste. */
  onCrees: (items: InstantQr[]) => void
}) {
  const [texte, setTexte] = useState("")
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const champFichier = useRef<HTMLInputElement | null>(null)
  const analyse = useMemo(() => parseBulkCsv(texte), [texte])

  useFermetureModale(ouvert, onFermer)

  function chargerFichier(file: File) {
    const r = new FileReader()
    r.onload = () => setTexte(String(r.result || ""))
    r.readAsText(file)
  }

  async function lancer() {
    const items = analyse.rows.filter(r => r.valid).map(r => ({ label: r.label, dest: r.dest }))
    if (items.length === 0 || occupe) return
    setOccupe(true); setMessage(null)
    try {
      const res = await fetch("/api/qr-instant/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(d.items)) {
        onCrees(d.items as InstantQr[])
        const extra = [d.skipped ? `${d.skipped} ignoré(s)` : "", d.truncated ? `${d.truncated} au-delà de la limite (100)` : ""].filter(Boolean).join(" · ")
        setMessage({ ok: true, text: `${d.created} QR créé(s)${extra ? " · " + extra : ""}` })
        setTexte("")
      } else setMessage({ ok: false, text: d.error || "Import impossible" })
    } catch { setMessage({ ok: false, text: "Erreur réseau" }) }
    finally { setOccupe(false) }
  }

  if (!ouvert) return null

  return (
        <div onClick={onFermer} style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        <Upload size={17} color={G} />
        <p style={{ flex: 1, color: "#F5F0E8", fontSize: 16, fontWeight: 800, margin: 0 }}>Importer en masse</p>
        <button onClick={onFermer} aria-label="Fermer l'import" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30 }}><X size={15} /></button>
      </div>
      <p style={{ color: MUTED, fontSize: 12, margin: "0 0 14px", lineHeight: 1.55 }}>
        Une ligne par lien : <code style={{ color: "#F5F0E8" }}>destination</code> ou <code style={{ color: "#F5F0E8" }}>libellé,destination</code>. En-tête (<code style={{ color: "#F5F0E8" }}>label,url</code>) et point-virgule acceptés. Jusqu'à 100 liens.
      </p>

      <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
        <button onClick={() => champFichier.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "9px 13px" }}><Upload size={14} /> Charger un .csv</button>
        {texte && <button onClick={() => { setTexte(""); setMessage(null) }} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12.5, cursor: "pointer" }}>Effacer</button>}
        <input ref={champFichier} type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) chargerFichier(f); e.target.value = "" }} />
      </div>

      <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={7} placeholder={"label,url\nMa boutique,maboutique.fr\nInstagram,instagram.com/moncompte"}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 130, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 13, padding: "12px 14px", lineHeight: 1.5, fontFamily: "monospace", outline: "none" }} />

      {texte.trim() && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: MUTED, fontSize: 11.5, margin: "0 0 8px" }}>
            <strong style={{ color: "var(--success)" }}>{analyse.validCount}</strong> valide{analyse.validCount > 1 ? "s" : ""}
            {analyse.rows.length - analyse.validCount > 0 && <> · <strong style={{ color: "#FF6B6B" }}>{analyse.rows.length - analyse.validCount}</strong> à corriger</>}
            {analyse.truncated > 0 && <> · {analyse.truncated} au-delà de 100 (ignorées)</>}
          </p>
          <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {analyse.rows.slice(0, 30).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                {r.valid ? <Check size={13} color="var(--success)" style={{ flexShrink: 0 }} /> : <X size={13} color="#FF6B6B" style={{ flexShrink: 0 }} />}
                <span style={{ color: "#D8D2C6", flexShrink: 0, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label || "—"}</span>
                <span style={{ color: r.valid ? MUTED : "#FF6B6B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.valid ? r.dest : `${r.dest || "(vide)"} · ${r.error}`}</span>
              </div>
            ))}
            {analyse.rows.length > 30 && <p style={{ color: "#6E685E", fontSize: 11, margin: 0 }}>… et {analyse.rows.length - 30} autres</p>}
          </div>
        </div>
      )}

      {message && <p style={{ color: message.ok ? "var(--success)" : "#FBBF24", fontSize: 12.5, textAlign: "center", margin: "12px 0 0" }}>{message.text}</p>}

      <Button onClick={lancer} disabled={analyse.validCount === 0 || occupe} style={{ width: "100%", marginTop: 14 }}>
        {occupe ? "Création…" : `Créer ${analyse.validCount} QR modifiable${analyse.validCount > 1 ? "s" : ""}`}
      </Button>
    </div>
    </div>
  )
}
