// server.js — Service d'export print QRowg.
// SVG de composition -> Chromium (PDF vectoriel, vraies polices) -> Ghostscript
// (CMYK color-managé, intention ICC) -> PDF prêt imprimeur.
// NE tourne PAS sur Vercel : image Docker avec Chromium + Ghostscript.

import express from "express"
import { execa } from "execa"
import puppeteer from "puppeteer"
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const PORT = process.env.PORT || 8080
const TOKEN = process.env.PRINT_EXPORT_TOKEN || ""
const ICC = process.env.PRINT_ICC || "./icc/CoatedFOGRA39.icc"
const MM = 3.7795275591 // 1 mm en px CSS (96 dpi) — Chromium accepte aussi l'unité "mm"

const app = express()
app.use(express.json({ limit: "25mb" }))

// Navigateur partagé (lancé à la demande, réutilisé).
let browserP = null
const getBrowser = () => (browserP ??= puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
}))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.post("/export", async (req, res) => {
  // Auth partagée avec l'app Next (jamais exposée au client).
  if (TOKEN && req.get("authorization") !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" })
  }
  const { svg, widthMm, heightMm, bleedMm = 3, cmyk = true, cropMarks = true } = req.body || {}
  if (typeof svg !== "string" || !svg.includes("<svg")) return res.status(400).json({ error: "svg manquant" })
  if (!(widthMm > 0) || !(heightMm > 0)) return res.status(400).json({ error: "widthMm/heightMm requis" })

  const bleed = Math.max(0, Number(bleedMm) || 0)
  const pageW = Number(widthMm) + bleed * 2
  const pageH = Number(heightMm) + bleed * 2

  let dir
  try {
    // 1) HTML minimal : le SVG occupe la zone (fond perdu inclus).
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>@page{size:${pageW}mm ${pageH}mm;margin:0}html,body{margin:0;padding:0}
      .sheet{width:${pageW}mm;height:${pageH}mm;overflow:hidden}
      .sheet svg{width:100%;height:100%;display:block}</style></head>
      <body><div class="sheet">${svg}</div></body></html>`

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    // Attendre le chargement des polices installées.
    await page.evaluateHandle("document.fonts.ready")
    const rgbPdf = await page.pdf({
      width: `${pageW}mm`, height: `${pageH}mm`,
      printBackground: true, pageRanges: "1", preferCSSPageSize: true,
    })
    await page.close()

    // 2) SVG sRGB -> pas de CMYK demandé : on renvoie le PDF vectoriel tel quel.
    if (!cmyk) return sendPdf(res, Buffer.from(rgbPdf))

    // 3) Ghostscript : conversion CMYK color-managée (intention ICC).
    dir = await mkdtemp(join(tmpdir(), "qrowg-"))
    const inPdf = join(dir, "in.pdf"), outPdf = join(dir, "out.pdf")
    await writeFile(inPdf, rgbPdf)
    await execa("gs", [
      "-dBATCH", "-dNOPAUSE", "-dSAFER", "-q",
      "-sDEVICE=pdfwrite",
      "-dProcessColorModel=/DeviceCMYK",
      "-sColorConversionStrategy=CMYK",
      "-dOverrideICC=true",
      `-sOutputICCProfile=${ICC}`,
      "-dPDFSETTINGS=/prepress",
      `-sOutputFile=${outPdf}`,
      inPdf,
    ])
    const out = await readFile(outPdf)
    return sendPdf(res, out)
  } catch (e) {
    return res.status(500).json({ error: "export échoué", detail: String(e?.shortMessage || e?.message || e) })
  } finally {
    if (dir) rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})

function sendPdf(res, buf) {
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", 'attachment; filename="qrowg-print.pdf"')
  res.send(buf)
}

app.listen(PORT, () => console.log(`print-export sur :${PORT}`))
