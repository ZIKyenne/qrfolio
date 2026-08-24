"use client"

// L'écran qui suit la toute première mise en ligne.
//
// Jusqu'ici, publier se soldait par un bouton qui affichait « Page publiée ! »
// pendant trois secondes et demie, dans un coin. Le moment le plus important du
// produit — celui où le travail devient utilisable — passait inaperçu, et rien ne
// disait ce qu'il restait à faire pour qu'un client puisse enfin scanner.
//
// Composant PRÉSENTATIONNEL : il ne sait rien du reste de l'éditeur, tout arrive
// par ses propriétés. C'est ce qui permet de le regarder isolément.

import { useState } from "react"
import { Check, Copy, ExternalLink, Download } from "lucide-react"
import QRCanvas from "../qr-codes/QRCanvas"
import { etapes, adresseLisible } from "./firstPublish"

const G = "#C9A84C", INK = "#F5F0E8", MUT = "#8A8478"

export type Support = { id: string; label: string; why: string }

export default function PublishedScreen({
  pageUrl, qrTarget, metier, supports, printUrl, onDownloadQr, onClose, mobile = false,
}: {
  /** Adresse publique de la page (absolue). */
  pageUrl: string
  /** Ce qu'encode le QR — le lien traçable /q/<code>, pas l'adresse de la page. */
  qrTarget: string
  metier?: string | null
  supports: Support[]
  printUrl: (itemId: string) => string
  onDownloadQr: () => void
  onClose: () => void
  mobile?: boolean
}) {
  const [copie, setCopie] = useState(false)
  const pas = etapes(mobile, metier)

  async function copier() {
    try { await navigator.clipboard.writeText(pageUrl); setCopie(true); setTimeout(() => setCopie(false), 2000) } catch { /* refus du navigateur : l'adresse reste lisible à l'écran */ }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Votre page est en ligne"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: mobile ? "16px 12px 40px" : "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#0F0E0B", border: `1px solid ${G}38`, borderRadius: 20, padding: mobile ? "22px 18px" : "28px 26px", boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}>

        {/* Le moment mérite d'être marqué : c'est là que le travail devient utile. */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, margin: "0 auto 12px", background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} color="var(--success,#39FF8F)" />
          </div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: mobile ? 20 : 23, fontWeight: 700, color: INK, margin: "0 0 6px" }}>Votre page est en ligne</h2>
          <p style={{ color: MUT, fontSize: 13, margin: 0, lineHeight: 1.5 }}>Il reste trois gestes pour qu'un client puisse la scanner.</p>
        </div>

        {/* L'adresse, lisible et copiable — c'est ce qu'on dicte au téléphone. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0A0A0A", border: `1px solid ${G}33`, borderRadius: 11, padding: "10px 12px", marginBottom: 20 }}>
          <span style={{ flex: 1, minWidth: 0, color: G, fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adresseLisible(pageUrl)}</span>
          <button type="button" onClick={copier} aria-label="Copier l'adresse"
            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, background: `${G}1A`, border: `1px solid ${G}40`, borderRadius: 8, padding: "5px 9px", color: G, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {copie ? <Check size={12} /> : <Copy size={12} />} {copie ? "Copié" : "Copier"}
          </button>
        </div>

        {/* ── 1 · Tester ─────────────────────────────────────────────────────── */}
        <Etape e={pas[0]}>
          {mobile ? (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={boutonPrincipal}>
              <ExternalLink size={15} /> Ouvrir ma page
            </a>
          ) : (
            <>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 12, display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <QRCanvas value={qrTarget} size={150} />
              </div>
              <button type="button" onClick={onDownloadQr} style={boutonSecondaire}>
                <Download size={14} /> Télécharger le QR (PNG)
              </button>
            </>
          )}
        </Etape>

        {/* ── 2 · Imprimer ───────────────────────────────────────────────────── */}
        <Etape e={pas[1]}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {supports.map(s => (
              <a key={s.id} href={printUrl(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", textDecoration: "none" }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", color: INK, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                  <span style={{ display: "block", color: MUT, fontSize: 10.5, lineHeight: 1.35 }}>{s.why}</span>
                </span>
                <span aria-hidden style={{ color: MUT, fontSize: 14 }}>›</span>
              </a>
            ))}
          </div>
        </Etape>

        {/* ── 3 · Poser ──────────────────────────────────────────────────────── */}
        <Etape e={pas[2]} dernier />

        <button type="button" onClick={onClose}
          style={{ width: "100%", marginTop: 18, background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "12px", color: MUT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Revenir à ma page
        </button>
      </div>
    </div>
  )
}

const boutonPrincipal: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
  minHeight: 46, borderRadius: 11, background: G, color: "#080808",
  fontSize: 14, fontWeight: 800, textDecoration: "none", boxSizing: "border-box",
}
const boutonSecondaire: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%",
  minHeight: 42, borderRadius: 10, background: `${G}1A`, border: `1px solid ${G}40`,
  color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
}

function Etape({ e, dernier = false, children }: { e: { n: number; titre: string; pourquoi: string }; dernier?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: dernier ? 0 : 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4 }}>
        <span aria-hidden style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: `${G}1F`, border: `1px solid ${G}45`, color: G, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{e.n}</span>
        <h3 style={{ color: INK, fontSize: 14, fontWeight: 700, margin: 0 }}>{e.titre}</h3>
      </div>
      <p style={{ color: MUT, fontSize: 12, lineHeight: 1.5, margin: "0 0 10px", paddingLeft: 29 }}>{e.pourquoi}</p>
      {children && <div style={{ paddingLeft: 29 }}>{children}</div>}
    </div>
  )
}
