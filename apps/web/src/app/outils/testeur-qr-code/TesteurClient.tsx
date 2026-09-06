"use client"
// L'îlot interactif du testeur. Tout se passe dans le navigateur : l'image
// n'est jamais envoyée à un serveur, et c'est écrit noir sur blanc à l'écran.
import { useCallback, useRef, useState, type CSSProperties } from "react"
import {
  diagnostiquer, diagnosticIllisible, mesurerLuminances, modulesDeLaVersion,
  type Diagnostic, type Gravite,
} from "./diagnostic"

const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BOR = "rgba(201,168,76,0.18)"
const ROUGE = "#E06A5A", VERT = "#6FBF8B"

/** Au-delà, on décode sur une copie réduite : le calcul reste juste, il va plus vite. */
const COTE_MAX_ANALYSE = 1600
const POIDS_MAX = 12 * 1024 * 1024

const COULEUR: Record<Gravite, string> = { bloquant: ROUGE, risque: G, bon: VERT }
const SIGNE: Record<Gravite, string> = { bloquant: "✕", risque: "!", bon: "✓" }

export default function TesteurClient() {
  const [diag, setDiag] = useState<Diagnostic | null>(null)
  const [apercu, setApercu] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [analyse, setAnalyse] = useState(false)
  const [survol, setSurvol] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const analyser = useCallback(async (fichier: File) => {
    setErreur(null); setDiag(null); setAnalyse(true)
    try {
      if (!fichier.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.")
      if (fichier.size > POIDS_MAX) throw new Error("L'image dépasse 12 Mo. Réduisez-la avant de la tester.")

      const url = URL.createObjectURL(fichier)
      setApercu(url)

      const img = await new Promise<HTMLImageElement>((ok, ko) => {
        const i = new Image()
        i.onload = () => ok(i)
        i.onerror = () => ko(new Error("Cette image n'a pas pu être ouverte."))
        i.src = url
      })

      const largeurVraie = img.naturalWidth, hauteurVraie = img.naturalHeight
      if (!largeurVraie || !hauteurVraie) throw new Error("Cette image n'a pas de dimensions exploitables.")

      // On décode sur une copie réduite pour la vitesse, puis on ramène toutes
      // les coordonnées à l'échelle de l'image d'origine : sinon on jugerait la
      // définition de la copie, pas celle du fichier que l'utilisateur imprimera.
      const echelle = Math.min(1, COTE_MAX_ANALYSE / Math.max(largeurVraie, hauteurVraie))
      const l = Math.round(largeurVraie * echelle), h = Math.round(hauteurVraie * echelle)

      const canvas = document.createElement("canvas")
      canvas.width = l; canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("Votre navigateur n'a pas pu analyser l'image.")
      ctx.drawImage(img, 0, 0, l, h)
      const donnees = ctx.getImageData(0, 0, l, h)

      const { default: jsQR } = await import("jsqr")
      const lu = jsQR(donnees.data, l, h, { inversionAttempts: "attemptBoth" })
      if (!lu) { setDiag(diagnosticIllisible()); return }

      const p = lu.location
      const xs = [p.topLeftCorner.x, p.topRightCorner.x, p.bottomLeftCorner.x, p.bottomRightCorner.x]
      const ys = [p.topLeftCorner.y, p.topRightCorner.y, p.bottomLeftCorner.y, p.bottomRightCorner.y]

      const gris = new Uint8ClampedArray(l * h)
      for (let i = 0; i < gris.length; i++) {
        const o = i * 4
        gris[i] = 0.299 * donnees.data[o] + 0.587 * donnees.data[o + 1] + 0.114 * donnees.data[o + 2]
      }
      const lum = mesurerLuminances(gris, l, {
        x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys),
      })

      const r = 1 / echelle
      setDiag(diagnostiquer({
        texte: lu.data,
        hautGauche: { x: p.topLeftCorner.x * r, y: p.topLeftCorner.y * r },
        hautDroit: { x: p.topRightCorner.x * r, y: p.topRightCorner.y * r },
        basGauche: { x: p.bottomLeftCorner.x * r, y: p.bottomLeftCorner.y * r },
        largeurImage: largeurVraie, hauteurImage: hauteurVraie,
        luminanceSombre: lum.sombre, luminanceClaire: lum.claire,
      }, modulesDeLaVersion(lu.version)))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'analyse a échoué.")
    } finally {
      setAnalyse(false)
    }
  }, [])

  const zone: CSSProperties = {
    border: `1.5px dashed ${survol ? G : BOR}`,
    background: survol ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.025)",
    borderRadius: 18, padding: "38px 22px", textAlign: "center", cursor: "pointer",
    transition: "border-color .15s, background .15s",
  }

  return (
    <div>
      <div
        style={zone}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setSurvol(true) }}
        onDragLeave={() => setSurvol(false)}
        onDrop={e => {
          e.preventDefault(); setSurvol(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void analyser(f)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
        aria-label="Déposer l'image d'un QR code à tester"
      >
        <p style={{ color: INK, fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
          {analyse ? "Analyse en cours…" : "Déposez l'image de votre QR code"}
        </p>
        <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
          PNG, JPG ou WEBP — ou cliquez pour choisir un fichier.<br />
          L&apos;image reste sur votre appareil : rien n&apos;est envoyé sur Internet.
        </p>
        <input
          ref={inputRef} type="file" aria-label="Choisir l'image du QR code à tester" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) void analyser(f) }}
        />
      </div>

      {erreur && (
        <p style={{ color: ROUGE, fontSize: 14, marginTop: 16, textAlign: "center" }}>{erreur}</p>
      )}

      {diag && (
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
            {apercu && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercu} alt="Le QR code testé" style={{ width: 128, height: 128, objectFit: "contain", background: "#fff", borderRadius: 12, border: `1px solid ${BOR}`, flexShrink: 0 }} />
            )}
            <p style={{ color: INK, fontSize: "clamp(17px,3vw,21px)", fontWeight: 800, lineHeight: 1.4, margin: 0, flex: "1 1 240px" }}>
              {diag.verdict}
            </p>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {diag.constats.map(c => (
              <li key={c.cle} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${c.gravite === "bon" ? BOR : COULEUR[c.gravite]}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span aria-hidden style={{ color: COULEUR[c.gravite], fontWeight: 900, fontSize: 15 }}>{SIGNE[c.gravite]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: INK, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                      {c.titre}
                      {c.mesure && (
                        <span style={{ color: MUT, fontWeight: 500, fontSize: 13, marginLeft: 10, wordBreak: "break-all" }}>{c.mesure}</span>
                      )}
                    </p>
                    <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{c.detail}</p>
                    {c.correction && (
                      <p style={{ color: INK, fontSize: 13.5, lineHeight: 1.65, margin: "8px 0 0" }}>
                        <strong style={{ color: COULEUR[c.gravite] }}>À faire :</strong> {c.correction}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
