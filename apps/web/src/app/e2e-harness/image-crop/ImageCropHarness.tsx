"use client"

// Harness : génère une image de test (canvas) en File, monte la VRAIE modale de recadrage, et
// enregistre les dimensions du blob recadré → vérifiable par Playwright + capture, sans Supabase.
import { useEffect, useState } from "react"
import ImageCropModal from "@/app/dashboard/builder/ImageCropModal"

export function ImageCropHarness() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ w: number; h: number; kb: number } | null>(null)

  useEffect(() => {
    const c = document.createElement("canvas")
    c.width = 1200; c.height = 600
    const ctx = c.getContext("2d")!
    const g = ctx.createLinearGradient(0, 0, 1200, 600)
    g.addColorStop(0, "#C9A84C"); g.addColorStop(1, "#1a1408")
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 600)
    ctx.strokeStyle = "rgba(255,255,255,0.5)"
    for (let x = 0; x <= 1200; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke() }
    for (let y = 0; y <= 600; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke() }
    ctx.fillStyle = "#080808"; ctx.font = "bold 64px sans-serif"; ctx.fillText("1200×600", 60, 320)
    c.toBlob(b => { if (b) setFile(new File([b], "test.jpg", { type: "image/jpeg" })) }, "image/jpeg", 0.9)
  }, [])

  async function onConfirm(blob: Blob) {
    const bmp = await createImageBitmap(blob)
    setResult({ w: bmp.width, h: bmp.height, kb: Math.round(blob.size / 1024) })
    setFile(null)
  }

  // ?aspect=wide|square|… pour vérifier la présélection de ratio selon le contexte.
  const initialAspect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("aspect") || undefined : undefined

  return (
    <div data-testid="image-crop-harness" style={{ minHeight: "100vh", background: "#050505" }}>
      <div data-testid="crop-result"
        data-w={result?.w ?? ""} data-h={result?.h ?? ""} data-kb={result?.kb ?? ""}
        style={{ position: "fixed", top: 0, left: 0, padding: 8, color: "#888", fontSize: 12, zIndex: 1 }}>
        {result ? `recadré: ${result.w}×${result.h} · ${result.kb} Ko` : "en attente"}
      </div>
      {file && <ImageCropModal file={file} initialAspect={initialAspect} onCancel={() => setFile(null)} onConfirm={onConfirm} />}
    </div>
  )
}
