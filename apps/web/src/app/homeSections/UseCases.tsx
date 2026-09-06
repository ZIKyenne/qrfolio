"use client"

import { useState } from "react"
import { useInView } from "../homeUi"

const USE_CASES = [
  {
    id: "restaurant",
    icon: "🍽️",
    label: "Restaurant",
    title: "Transformez votre table en expérience connectée.",
    desc: "Vos clients scannent, consultent votre menu à jour, réservent et laissent un avis en 2 gestes.",
    color: "#F97316",
    blocks: [
      { icon:"📋", label:"Menu interactif",   note:"Mis à jour sans réimprimer" },
      { icon:"📅", label:"Réservations",      note:"Lien direct vers votre système" },
      { icon:"⭐", label:"Avis Google",        note:"Redirection automatique" },
      { icon:"🕐", label:"Horaires",          note:"Modifiables à tout moment" },
      { icon:"📍", label:"Itinéraire",         note:"Google Maps intégré" },
      { icon:"🎉", label:"Événements spéciaux",note:"Soirées, menus du jour" },
    ],
    cta: "Créer ma page restaurant",
  },
  {
    id: "freelance",
    icon: "💼",
    label: "Freelance",
    title: "Votre carte de visite devient une vitrine interactive.",
    desc: "Un seul QR sur vos cartes pro. Le client arrive sur votre portfolio, vos services et votre contact.",
    color: "var(--action)",
    blocks: [
      { icon:"🖼️",  label:"Portfolio",       note:"Galerie de projets" },
      { icon:"🛠️",  label:"Services & tarifs",note:"Vos prestations" },
      { icon:"💬", label:"WhatsApp direct",   note:"Bouton de prise de contact" },
      { icon:"📄", label:"CV téléchargeable", note:"PDF en un clic" },
      { icon:"🔗", label:"Liens sociaux",     note:"LinkedIn, Behance…" },
      { icon:"📅", label:"Calendly",          note:"Prise de RDV intégrée" },
    ],
    cta: "Créer ma page indépendant",
  },
  {
    id: "creator",
    icon: "🎵",
    label: "Créateur",
    title: "Un lien unique pour tous vos contenus.",
    desc: "Centralisez vos réseaux, musiques, vidéos et collaborations sur une page élégante.",
    color: "#A78BFA",
    blocks: [
      { icon:"📸", label:"Instagram / TikTok", note:"Vos dernières publications" },
      { icon:"🎬", label:"YouTube / Twitch",   note:"Lien vers votre chaîne" },
      { icon:"🎵", label:"Streaming",          note:"Spotify, Apple Music…" },
      { icon:"🤝", label:"Partenariats",       note:"Vos codes promo" },
      { icon:"💌", label:"Newsletter",         note:"Formulaire d'inscription" },
      { icon:"🛍️",  label:"Boutique",          note:"Vos produits / merch" },
    ],
    cta: "Créer ma page créateur",
  },
  {
    id: "immo",
    icon: "🏠",
    label: "Immobilier",
    title: "Chaque panneau devient un outil de vente.",
    desc: "Collez votre QR sur vos panneaux et brochures. L'acheteur accède à tous les détails en 1 scan.",
    color: "#C9A84C",
    blocks: [
      { icon:"🏡", label:"Fiche du bien",      note:"Photos, surface, prix" },
      { icon:"📞", label:"Contact direct",     note:"Appel ou message" },
      { icon:"📅", label:"Visites",            note:"Demande de visite en ligne" },
      { icon:"📄", label:"Brochure PDF",       note:"Téléchargement instantané" },
      { icon:"🗺️",  label:"Localisation",      note:"Plan interactif" },
      { icon:"💶", label:"Financement",        note:"Simulateur de crédit" },
    ],
    cta: "Créer ma page immobilier",
  },
  {
    id: "event",
    icon: "🎪",
    label: "Événement",
    title: "Tenez vos participants informés en temps réel.",
    desc: "Programme, billets, accès et mises à jour — tout sur une page modifiable même la veille.",
    color: "var(--success)",
    blocks: [
      { icon:"📋", label:"Programme",          note:"Mis à jour en direct" },
      { icon:"🎫", label:"Billetterie",        note:"Lien d'achat direct" },
      { icon:"⏳", label:"Compte à rebours",   note:"Décompte automatique" },
      { icon:"📍", label:"Lieu & accès",       note:"Plan et transport" },
      { icon:"📸", label:"Galerie",            note:"Photos de l'édition passée" },
      { icon:"📣", label:"Intervenants",       note:"Biographies et horaires" },
    ],
    cta: "Créer ma page événement",
  },
  {
    id: "commerce",
    icon: "🛍️",
    label: "Commerce local",
    title: "Attirez plus de clients avec un QR sur votre vitrine.",
    desc: "Vos promotions, vos produits et vos horaires toujours à jour. Un scan depuis la rue suffit.",
    color: "#F43F5E",
    blocks: [
      { icon:"🏷️",  label:"Promotions",        note:"Offres du moment" },
      { icon:"📦", label:"Catalogue produits", note:"Mis à jour facilement" },
      { icon:"🕐", label:"Horaires",           note:"Jours fériés inclus" },
      { icon:"⭐", label:"Avis clients",        note:"Lien Google / Tripadvisor" },
      { icon:"📍", label:"Itinéraire",          note:"Depuis n'importe où" },
      { icon:"💬", label:"Contact rapide",      note:"WhatsApp ou appel" },
    ],
    cta: "Créer ma page commerce",
  },
] as const

export function UseCasesSection() {
  const { ref, visible } = useInView(0.06)
  const [active, setActive] = useState(0)
  const uc = USE_CASES[active]

  return (
    <section id="examples" ref={ref} aria-labelledby="uc-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .uc-tabs  { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
        .uc-tab   { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:100px;
                    cursor:pointer; border:1px solid; transition:all 0.2s ease; font-size:13px; font-weight:500;
                    background:transparent; white-space:nowrap; }
        .uc-tab:focus-visible{ outline:2px solid rgba(201,168,76,0.6); outline-offset:3px; border-radius:100px; }
        .uc-blocks{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        @media(max-width:640px){
          .uc-blocks{ grid-template-columns:repeat(2,1fr)!important; }
          .uc-tabs { gap:6px!important; }
          .uc-tab  { padding:7px 12px!important; font-size:12px!important; }
          #examples{ padding:72px 20px!important; }
        }
        @media(max-width:400px){
          .uc-blocks{ grid-template-columns:1fr!important; }
        }
        @keyframes ucFade{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 56px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Cas d'usage</p>
        <h2 id="uc-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700,
          margin: "0 auto 16px", lineHeight: 1.1,
          maxWidth: 600, letterSpacing: "-0.02em",
        }}>
          Fait pour <span style={{ color: "#C9A84C" }}>votre métier.</span>
        </h2>
        <p style={{ color: "rgba(188,182,166,0.8)", fontSize: 16,
          maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
          Sélectionnez votre activité et voyez exactement ce que QRowg peut faire pour vous.
        </p>
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        {/* Tabs */}
        <div className="uc-tabs" style={{
          marginBottom: 40,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease 0.15s",
        }}>
          {USE_CASES.map((uc_item, i) => (
            <button
              key={uc_item.id}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              aria-label={uc_item.label}
              className="uc-tab"
              style={{
                color: active === i ? "#080808" : "rgba(245,240,232,0.65)",
                borderColor: active === i ? uc_item.color : "rgba(255,255,255,0.1)",
                background: active === i
                  ? uc_item.color
                  : "rgba(255,255,255,0.02)",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 15 }}>{uc_item.icon}</span>
              {uc_item.label}
            </button>
          ))}
        </div>

        {/* Contenu actif */}
        <div key={uc.id} style={{
          display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 40,
          alignItems: "start",
          animation: "ucFade 0.35s ease",
        }} className="uc-content">
          <style>{`@media(max-width:800px){.uc-content{grid-template-columns:1fr!important;}}`}</style>

          {/* Info gauche */}
          <div style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid " + uc.color + "25",
            borderRadius: 18, padding: "28px 24px",
            position: "sticky", top: 88,
          }}>
            {/* Header card */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: uc.color + "14",
                border: "1px solid " + uc.color + "30",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{uc.icon}</div>
              <div>
                <p style={{ color: uc.color, fontSize: 10, fontWeight: 700,
                  letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>{uc.label}</p>
                <h3 style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 700,
                  margin: 0, lineHeight: 1.3 }}>{uc.title}</h3>
              </div>
            </div>

            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 13.5,
              lineHeight: 1.65, marginBottom: 22 }}>{uc.desc}</p>

            {/* Aperçu du rendu : mini-téléphone (Pb 9) */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div style={{ width: 168, borderRadius: 22, padding: 7, background: "#080705", border: "1px solid rgba(255,255,255,0.12)", boxShadow: `0 18px 50px rgba(0,0,0,0.5), 0 0 0 1px ${uc.color}14` }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: "#0E0D0B" }}>
                  {/* en-tête coloré + encoche */}
                  <div style={{ position: "relative", height: 58, background: `linear-gradient(135deg, ${uc.color}, ${uc.color}99)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 3, background: "rgba(0,0,0,0.35)" }} />
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginTop: 6 }}>{uc.icon}</div>
                  </div>
                  {/* corps */}
                  <div style={{ padding: "12px 13px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <div style={{ height: 6, width: "62%", borderRadius: 4, background: "rgba(245,240,232,0.9)" }} />
                    <div style={{ height: 4, width: "44%", borderRadius: 3, background: "rgba(188,182,166,0.55)" }} />
                    {/* mini QR */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1.5, width: 40, height: 40, marginTop: 4, padding: 4, background: "#fff", borderRadius: 5 }}>
                      {Array.from({ length: 25 }).map((_, k) => <div key={k} style={{ background: (k * 7 + 3) % 3 === 0 ? "#0E0D0B" : "transparent", borderRadius: 1 }} />)}
                    </div>
                    {/* CTA */}
                    <div style={{ marginTop: 6, height: 22, width: "82%", borderRadius: 7, background: uc.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontSize: 8.5, fontWeight: 800, padding: "0 4px", textAlign: "center", lineHeight: 1 }}>{uc.cta.replace(/^Créer ma page /i, "").replace(/^./, c => c.toUpperCase())}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ligne d'accent */}
            <div style={{
              height: 1, marginBottom: 24,
              background: "linear-gradient(90deg, " + uc.color + "40, transparent)",
            }} />

            <a href="/creer" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: uc.color,
              color: "#080808", textDecoration: "none",
              fontSize: 13, fontWeight: 700,
              padding: "12px 20px", borderRadius: 10,
              transition: "opacity 0.2s, transform 0.2s var(--mo-ease-spring)",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = "0.85"
                el.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = "1"
                el.style.transform = "none"
              }}>
              {uc.cta} →
            </a>
          </div>

          {/* Grille de blocs droite */}
          <div>
            <p style={{ color: "rgba(188,182,166,0.55)", fontSize: 10,
              letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
              Blocs inclus dans ce template
            </p>
            <div className="uc-blocks">
              {uc.blocks.map((block, i) => (
                <div key={block.label} style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px 14px",
                  display: "flex", flexDirection: "column", gap: 6,
                  transition: "border-color 0.2s, background 0.2s",
                  animationDelay: i * 0.04 + "s",
                  animation: "ucFade 0.35s ease both",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = uc.color + "40"
                    el.style.background = uc.color + "06"
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = "rgba(255,255,255,0.07)"
                    el.style.background = "rgba(255,255,255,0.025)"
                  }}>
                  <span style={{ fontSize: 18 }}>{block.icon}</span>
                  <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: 0 }}>{block.label}</p>
                  <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 11, margin: 0, lineHeight: 1.4 }}>{block.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ── FAQ section ───────────────────────────────────────────────────────────────
