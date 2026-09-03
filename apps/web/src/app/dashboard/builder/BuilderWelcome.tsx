"use client"

// Guide de bienvenue au 1er lancement du builder (QWG-0016).
// Auto-contenu : se gere seul via localStorage ("qrfolio_builder_coach_done"),
// s'affiche une seule fois, robuste dans TOUS les etats du builder (desktop,
// mobile, Focus, apercu) car il ne depend d'AUCUN element du DOM du builder.
// Chaque etape surligne la bonne zone sur une mini-carte de l'interface.
import { useEffect, useState, type CSSProperties } from "react"

const KEY = "qrfolio_builder_coach_done"
const G = "#C9A84C"
const INK = "#F5F0E8"
const MUT = "rgba(168,161,144,0.94)"

type Zone = "canvas" | "library" | "panel" | "topbar" | "theme" | "publish"
type Step = { zone: Zone; icon: string; title: string; body: string; hintD: string; hintM: string }

const STEPS: Step[] = [
  {
    zone: "canvas", icon: "👋",
    title: "Voici votre page",
    body: "Trois blocs sont déjà en place (profil, bio, bouton) : pas de page blanche, il ne reste qu'à les personnaliser. Ce guide ne s'affiche qu'une seule fois.",
    hintD: "au centre", hintM: "onglet Page",
  },
  {
    zone: "library", icon: "🧩",
    title: "Ajoutez des blocs",
    body: "Choisissez un bloc, il s'ajoute à votre page. Les plus utiles sont proposés en premier ; vous pouvez aussi chercher un bloc précis ou parcourir les catégories.",
    hintD: "← à gauche", hintM: "onglet Blocs",
  },
  {
    zone: "panel", icon: "✏️",
    title: "Modifiez un bloc",
    body: "Touchez un bloc de votre page : ses réglages s'ouvrent. Changez le texte, l'image ou le lien. Le style et les animations sont sous le mode « Avancé ».",
    hintD: "réglages, à droite", hintM: "onglet Réglages",
  },
  {
    zone: "topbar", icon: "↩️",
    title: "Déplacez, annulez, prévisualisez",
    body: "Glissez un bloc pour le déplacer. Tout est enregistré au fur et à mesure, et une erreur s'annule. « Aperçu » montre la page telle que la verront vos visiteurs.",
    hintD: "↑ en haut", hintM: "barre du haut",
  },
  {
    zone: "theme", icon: "🎨",
    title: "Changez de thème",
    body: "Couleurs, polices, ambiance : choisissez un thème et toute la page s'adapte d'un coup. La couleur principale se règle ensuite en un geste.",
    hintD: "réglages, à droite", hintM: "onglet Réglages",
  },
  {
    zone: "publish", icon: "🚀",
    title: "Publiez quand vous voulez",
    body: "« Publier », et la page est en ligne. Votre QR code, lui, ne change jamais : vous pouvez modifier et republier autant de fois que vous voulez, sans réimprimer.",
    hintD: "↑ en haut à droite", hintM: "bouton Publier",
  },
]

export default function BuilderWelcome({ mobile = false }: { mobile?: boolean }) {
  const [show, setShow] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    try { if (localStorage.getItem(KEY) !== "1") setShow(true) } catch {}
  }, [])

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish()
      else if (e.key === "ArrowRight") setI(v => Math.min(STEPS.length - 1, v + 1))
      else if (e.key === "ArrowLeft") setI(v => Math.max(0, v - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  function finish() {
    try { localStorage.setItem(KEY, "1") } catch {}
    setShow(false)
  }

  if (!show) return null
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  return (
    <div role="dialog" aria-modal="true" aria-label="Bienvenue dans votre éditeur"
      style={{
        position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, background: "rgba(4,4,3,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        animation: "bwFade .22s ease",
      }}>
      <style>{`@keyframes bwFade{from{opacity:0}to{opacity:1}}@keyframes bwPop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}`}</style>

      <div style={{
        width: "min(560px, 100%)", maxHeight: "92dvh", overflowY: "auto",
        background: "linear-gradient(180deg,#151109,#0E0C08)", border: `1px solid ${G}44`, borderRadius: 22,
        padding: "clamp(20px,4vw,30px)", boxShadow: "0 30px 90px rgba(0,0,0,.7), 0 0 0 1px rgba(201,168,76,.08)",
        animation: "bwPop .3s cubic-bezier(.22,1,.36,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: G }}>Bienvenue dans votre éditeur</span>
          <button onClick={finish} aria-label="Passer le guide"
            style={{ background: "transparent", border: "none", color: MUT, fontSize: 13, cursor: "pointer", minHeight: 44, padding: "0 8px", margin: "-10px -8px -10px 0", display: "inline-flex", alignItems: "center" }}>
            Passer
          </button>
        </div>

        {/* Mini-carte de l'interface — la zone de l'etape est surlignee */}
        <MiniMap zone={step.zone} />

        {/* Contenu de l'etape */}
        <div style={{ marginTop: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div aria-hidden style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{step.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 800, color: INK, margin: 0, letterSpacing: "-0.01em" }}>{step.title}</h2>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: G, background: `${G}18`, border: `1px solid ${G}33`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>
                {mobile ? step.hintM : step.hintD}
              </span>
            </div>
            <p style={{ color: MUT, fontSize: 14, lineHeight: 1.6, margin: "7px 0 0" }}>{step.body}</p>
          </div>
        </div>

        {/* Pied : progression + navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {STEPS.map((_, k) => (
                // Le point mesure 8 px — joli, intapable. Le BOUTON qui le porte est
                // transparent et fait 24 x 40 : même dessin, vraie cible. Mesuré au
                // navigateur : la version précédente ne faisait que 14 px de large,
                // sous le minimum de 24 px, et les six points se touchaient.
                <button key={k} onClick={() => setI(k)} aria-label={`Étape ${k + 1}`}
                  style={{ background: "none", border: "none", width: 24, minWidth: 24, height: 40, padding: 0, margin: "-16px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span aria-hidden style={{ display: "block", width: k === i ? 20 : 8, height: 8, borderRadius: 999, background: k === i ? G : "rgba(255,255,255,0.18)", transition: "width .2s ease, background .2s ease" }} />
                </button>
              ))}
            </div>
            <span style={{ color: "rgba(168,161,144,0.6)", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{i + 1}/{STEPS.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            {i > 0 && (
              <button onClick={() => setI(i - 1)}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.14)", color: INK, borderRadius: 10, minHeight: 44, padding: "0 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Précédent
              </button>
            )}
            <button onClick={() => (last ? finish() : setI(i + 1))}
              style={{ background: `linear-gradient(90deg,${G},#b8953f)`, color: "#0a0a0a", border: "none", borderRadius: 10, minHeight: 44, padding: "0 22px", fontSize: 13.5, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}>
              {last ? "C'est parti !" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniMap({ zone }: { zone: Zone }) {
  const on = (z: Zone) => zone === z
  const rightActive = on("panel") || on("theme")
  const cell = (active: boolean): CSSProperties => ({
    background: active ? `${G}22` : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? G + "99" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 9, transition: "background .25s ease, border-color .25s ease, box-shadow .25s ease",
    boxShadow: active ? `0 0 0 3px ${G}22` : "none",
  })
  const barCol = (active: boolean) => (active ? `${G}66` : "rgba(255,255,255,0.09)")
  const dot = (active: boolean): CSSProperties => ({ width: 5, height: 5, borderRadius: "50%", background: active ? G : "rgba(255,255,255,0.22)" })
  return (
    <div aria-hidden style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0A0A0A" }}>
      {/* Barre du haut : nom + annuler/refaire + Apercu (gauche) · Publier (droite) */}
      <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0D0D0D" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ ...cell(on("topbar")), width: 30, height: 13, borderRadius: 4, boxShadow: on("topbar") ? `0 0 0 3px ${G}22` : "none" }} />
          <span style={dot(on("topbar"))} />
          <span style={dot(on("topbar"))} />
          <div style={{ ...cell(on("topbar")), width: 34, height: 14, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6.5, fontWeight: 800, color: on("topbar") ? G : "rgba(255,255,255,0.4)" }}>Aperçu</div>
        </div>
        <div style={{ ...cell(on("publish")), height: 15, width: 52, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, fontWeight: 800, letterSpacing: 0.3, color: on("publish") ? G : "rgba(255,255,255,0.4)" }}>Publier</div>
      </div>
      {/* 3 colonnes : bibliotheque | page | reglages(+theme) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: 6, padding: 8, height: 120 }}>
        <div style={{ ...cell(on("library")), display: "flex", flexDirection: "column", gap: 5, padding: 7 }}>
          {[0, 1, 2, 3].map(k => <div key={k} style={{ height: 10, borderRadius: 3, background: barCol(on("library")) }} />)}
        </div>
        <div style={{ ...cell(on("canvas")), display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "9px 6px" }}>
          <div style={{ width: 23, height: 23, borderRadius: "50%", background: on("canvas") ? `${G}77` : "rgba(255,255,255,0.11)" }} />
          <div style={{ width: "68%", height: 6, borderRadius: 3, background: barCol(on("canvas")) }} />
          <div style={{ width: "88%", height: 14, borderRadius: 4, background: barCol(on("canvas")) }} />
        </div>
        <div style={{ ...cell(rightActive), display: "flex", flexDirection: "column", gap: 6, padding: 7 }}>
          {on("theme")
            ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{["#C9A84C", "#39FF8F", "#38BDF8", "#E5556B"].map(c => <div key={c} style={{ width: 13, height: 13, borderRadius: 4, background: c }} />)}</div>
            : <><div style={{ height: 10, borderRadius: 3, background: barCol(on("panel")) }} /><div style={{ height: 10, borderRadius: 3, background: barCol(on("panel")) }} /></>}
          <div style={{ height: 9, borderRadius: 3, background: rightActive ? `${G}44` : "rgba(255,255,255,0.06)" }} />
        </div>
      </div>
    </div>
  )
}
