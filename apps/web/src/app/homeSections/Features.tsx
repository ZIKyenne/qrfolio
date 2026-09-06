"use client"

import { useState } from "react"
import Link from "next/link"
import { useInView, Eyebrow } from "../homeUi"

const FEATURES = [
  {
    icon: "⚡",
    tag: "Éditeur simple",
    title: "Créez votre page sans rien coder",
    desc: "Un éditeur en glisser-déposer, des blocs prêts à l'emploi : votre page est en ligne en 5 minutes.",
    accent: "#C9A84C",
    detail: {
      role: "Un éditeur visuel où vous assemblez votre page en glissant des blocs (titre, photo, liens, boutons) — aucune ligne de code.",
      example: "Un coach ajoute sa photo, ses tarifs et un bouton « Réserver » en quelques clics, depuis son téléphone.",
      benefit: "Vous êtes autonome : plus besoin d'un développeur ni d'attendre des semaines pour publier.",
    },
  },
  {
    icon: "🔄",
    tag: "QR dynamique",
    title: "Un QR code que vous modifiez à volonté",
    desc: "Changez la destination, le contenu et les liens quand vous voulez — sans jamais réimprimer votre QR code.",
    accent: "var(--action)",
    detail: {
      role: "Le QR code pointe vers votre page QRowg. Vous modifiez la page, le QR code imprimé reste valable.",
      example: "Un restaurant imprime le QR sur ses tables une seule fois, puis change son menu chaque semaine.",
      benefit: "Vous économisez les réimpressions et vous corrigez une erreur en 30 secondes.",
    },
  },
  {
    icon: "📊",
    tag: "Statistiques",
    title: "Sachez exactement qui scanne",
    desc: "Vues, scans, appareils et sources de trafic, en temps réel. Vous pilotez vos résultats.",
    accent: "var(--success)",
    detail: {
      role: "Un tableau de bord qui mesure les scans, les vues, les appareils utilisés et d'où viennent vos visiteurs.",
      example: "Un commerce voit que 70 % des scans viennent de sa vitrine le week-end, et adapte ses promos.",
      benefit: "Vous prenez des décisions sur des chiffres réels, pas au feeling.",
    },
  },
  {
    icon: "🎯",
    tag: "Conversion",
    title: "Transformez vos visiteurs en clients",
    desc: "Boutons WhatsApp, réservation, paiement, formulaire de contact… toutes vos actions au même endroit.",
    accent: "#F97316",
    detail: {
      role: "Des boutons d'action prêts à l'emploi : appel, WhatsApp, réservation, paiement, formulaire de contact.",
      example: "Un artisan place un bouton « Demander un devis » qui ouvre directement WhatsApp.",
      benefit: "Chaque visite a une chance de devenir un contact ou une vente.",
    },
  },
  {
    icon: "🎨",
    tag: "Modèles",
    title: "Démarrez avec un modèle fait pour votre métier",
    desc: "Restaurant, indépendant, coach, artiste, immobilier, commerce : un modèle adapté à votre activité.",
    accent: "#A78BFA",
    detail: {
      role: "Des modèles déjà conçus par métier, qu'il suffit de personnaliser avec vos informations.",
      example: "Une agence immobilière part du modèle « fiche de bien » et publie une annonce en 5 minutes.",
      benefit: "Vous ne partez jamais d'une page blanche et le résultat est pro dès le départ.",
    },
  },
  {
    icon: "🏢",
    tag: "Marque professionnelle",
    title: "Affichez votre propre marque",
    desc: "Votre domaine personnalisé, sans mention QRowg, avec un design premium. Une image irréprochable.",
    accent: "#C9A84C",
    detail: {
      role: "Votre page sur votre propre nom de domaine, sans aucune mention QRowg.",
      example: "Un cabinet utilise carte.soncabinet.fr : ses clients ne voient que sa marque.",
      benefit: "Une image 100 % professionnelle qui inspire confiance et crédibilité.",
    },
  },
] as const

export function FeaturesSection() {
  const { ref, visible } = useInView(0.06)
  const [hovered, setHovered] = useState<number | null>(null)
  const [info, setInfo] = useState<number | null>(null)
  const fInfo = info !== null ? FEATURES[info] : null
  return (
    <section
      id="features"
      ref={ref}
      aria-labelledby="features-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}
    >
      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Fonctionnalités</Eyebrow>
        <h2 id="features-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto",
          lineHeight: 1.1, maxWidth: 560, letterSpacing: "-0.02em",
        }}>
          Tout ce qu'il faut pour{" "}
          <span style={{ color: "#C9A84C" }}>convertir</span>
        </h2>
      </div>

      {/* Grid */}
      <div
        className="feat-grid"
        style={{
          maxWidth: 1140, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {FEATURES.map((f, i) => {
          const isHovered = hovered === i
          const big = i === 0   // carte vedette pleine largeur
          const wide = i === 5  // carte large secondaire
          return (
            <div
              key={f.tag}
              className={big ? "feat-big" : wide ? "feat-wide" : undefined}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                gridColumn: big ? "1 / -1" : wide ? "span 2" : "auto",
                background: big
                  ? `linear-gradient(135deg, ${f.accent}16, rgba(255,255,255,0.02))`
                  : isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)",
                border: `1px solid ${isHovered ? f.accent + "45" : big ? f.accent + "33" : "rgba(201,168,76,0.1)"}`,
                borderRadius: big ? 22 : 18,
                padding: big ? "38px 36px" : "28px 26px",
                display: "flex",
                flexDirection: big ? "row" : "column",
                alignItems: big ? "center" : "stretch",
                gap: big ? 30 : 14,
                position: "relative", overflow: "hidden",
                cursor: "default",
                transform: visible
                  ? isHovered ? "translateY(-4px)" : "translateY(0)"
                  : "translateY(28px)",
                opacity: visible ? 1 : 0,
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.35s var(--mo-ease-spring) ${visible ? "0ms" : i * 80 + "ms"}, border-color 0.25s ease, background 0.25s ease`,
                boxShadow: big
                  ? `0 14px 50px rgba(0,0,0,0.38), 0 0 70px ${f.accent}12`
                  : isHovered ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${f.accent}18` : "none",
              }}
            >
              {/* Top accent */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: isHovered
                  ? `linear-gradient(90deg, transparent, ${f.accent}55, transparent)`
                  : "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)",
                transition: "background 0.3s ease",
              }} />

              {/* Bouton info -> fenêtre explicative */}
              {/* La pastille fait 22 px — joli, mais intapable au doigt. Le bouton
                  qui la porte fait 40 px et reste transparent : même dessin,
                  cible tactile conforme. */}
              <button type="button" onClick={() => setInfo(i)} aria-label={"En savoir plus : " + f.title}
                style={{ position: "absolute", top: 7, right: 7, width: 40, height: 40, borderRadius: "50%", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: "50%", background: isHovered ? `${f.accent}22` : "rgba(255,255,255,0.05)", border: `1px solid ${isHovered ? f.accent + "55" : "rgba(255,255,255,0.12)"}`, color: isHovered ? f.accent : "rgba(188,182,166,0.8)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>?</span>
              </button>

              {big ? (
                <>
                  {/* Icône vedette */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: `${f.accent}1c`, border: `1px solid ${f.accent}45`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 32, flexShrink: 0,
                    boxShadow: `0 0 30px ${f.accent}25`,
                  }}>{f.icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 0 }}>
                    <span style={{ color: f.accent, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", opacity: 0.85 }}>{f.tag}</span>
                    <h3 style={{ color: "#F8F4EC", fontSize: "clamp(20px,2.4vw,27px)", fontWeight: 700, margin: 0, lineHeight: 1.2, fontFamily: "Fraunces, serif", letterSpacing: "-0.01em" }}>{f.title}</h3>
                    <p style={{ color: "rgba(200,194,182,0.82)", fontSize: 14.5, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>{f.desc}</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Icon + tag row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: `linear-gradient(135deg, ${f.accent}30, ${f.accent}0d)`,
                      border: `1px solid ${f.accent}${isHovered ? "55" : "30"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 21, flexShrink: 0,
                      boxShadow: isHovered ? `0 0 22px ${f.accent}38` : `0 0 12px ${f.accent}14`,
                      transform: isHovered ? "scale(1.08) rotate(-3deg)" : "scale(1)",
                      transition: "all 0.28s var(--mo-ease-spring)",
                    }}>{f.icon}</div>
                    <span style={{
                      color: f.accent,
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: 2, textTransform: "uppercase",
                      opacity: 0.8,
                    }}>{f.tag}</span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    color: "#F5F0E8", fontSize: 16, fontWeight: 700,
                    margin: 0, lineHeight: 1.3,
                  }}>{f.title}</h3>

                  {/* Desc */}
                  <p style={{
                    color: "rgba(188,182,166,0.85)", fontSize: 13,
                    margin: 0, lineHeight: 1.65,
                  }}>{f.desc}</p>
                </>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 580px) {
          .feat-grid { grid-template-columns: 1fr !important; }
          /* En mono-colonne, on annule les spans inline (sinon span 2 crée une 2e colonne implicite -> grille cassée) */
          .feat-grid > * { grid-column: auto !important; }
          .feat-big { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 26px 22px !important; }
        }
        @media (max-width: 640px) { #features { padding: 72px 24px !important; } }
      `}</style>

      {/* Fenetre explicative d'une fonctionnalite (Pb 6) */}
      {fInfo && (
        <div onClick={() => setInfo(null)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "linear-gradient(180deg,#16140E,#0C0B08)", border: `1px solid ${fInfo.accent}40`, borderRadius: 20, padding: "30px 28px", position: "relative", boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 50px ${fInfo.accent}12`, fontFamily: "DM Sans, sans-serif" }}>
            <button type="button" onClick={() => setInfo(null)} aria-label="Fermer" style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", color: "#BCB6A6", fontSize: 16, cursor: "pointer" }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${fInfo.accent}18`, border: `1px solid ${fInfo.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{fInfo.icon}</div>
              <div>
                <p style={{ color: fInfo.accent, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>{fInfo.tag}</p>
                <p style={{ color: "#F5F0E8", fontSize: 17, fontWeight: 800, margin: "2px 0 0", fontFamily: "Fraunces, serif" }}>{fInfo.title}</p>
              </div>
            </div>
            {([["À quoi ça sert", fInfo.detail.role], ["Exemple concret", fInfo.detail.example], ["Ce que ça vous apporte", fInfo.detail.benefit]] as const).map(([h, txt]) => (
              <div key={h} style={{ marginBottom: 14 }}>
                <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 4px" }}>{h}</p>
                <p style={{ color: "#EDEBE4", fontSize: 15, lineHeight: 1.65, margin: 0 }}>{txt}</p>
              </div>
            ))}
            <Link href="/creer" style={{ display: "block", textAlign: "center", marginTop: 20, padding: "12px", borderRadius: 11, background: `linear-gradient(90deg, ${fInfo.accent}, ${fInfo.accent}cc)`, color: "#080808", textDecoration: "none", fontSize: 13.5, fontWeight: 800 }}>
              Essayer gratuitement
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}


// ── Marque professionnelle (Pb 5) ──────────────────────────────────────────────
