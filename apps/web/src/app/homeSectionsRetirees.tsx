"use client"

// Sections de l'accueil ÉCRITES, PUIS RETIRÉES de la page (décluttage) — conservées
// ici, intactes, pour pouvoir être réactivées : il suffit de les importer dans
// HomeClient et de les rendre. Tant que ce fichier n'est importé nulle part, il ne
// pèse rien : il restait sinon dans le même module que la page, où il gonflait le
// JavaScript de l'accueil sans qu'aucun visiteur ne voie jamais ces sections.
import { useEffect, useState } from "react"
import Link from "next/link"
import QrowgLogo from "@/components/QrowgLogo"
import { PLANS as PLANS_DEF } from "@/lib/plans"
import { useInView, Eyebrow, QRFinder, QRMiniSvg } from "./homeUi"
import { creerUrl } from "./creer/entry"

function BrandProSection() {
  const { ref, visible } = useInView(0.08)
  const [open, setOpen] = useState(false)
  const G = "#C9A84C"
  const MiniPage = ({ pro }: { pro: boolean }) => (
    <div style={{ flex: 1, minWidth: 0, background: "#0E0D0B", border: `1px solid ${pro ? G : "rgba(255,255,255,0.08)"}`, borderRadius: 16, overflow: "hidden", boxShadow: pro ? `0 12px 40px rgba(201,168,76,0.18)` : "none", position: "relative" }}>
      {pro && <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2, background: G, color: "#080808", fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 20, letterSpacing: 0.5 }}>PRO</div>}
      {/* barre d'URL */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: pro ? "var(--success)" : "rgba(188,182,166,0.5)" }} />
        <span style={{ color: pro ? "#F5F0E8" : "rgba(188,182,166,0.7)", fontSize: 10.5, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pro ? "carte.votremarque.fr" : "qrowg.com/p/votre-page"}</span>
      </div>
      {/* contenu mock */}
      <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: pro ? `${G}22` : "rgba(255,255,255,0.06)", border: `1px solid ${pro ? G + "55" : "rgba(255,255,255,0.1)"}` }} />
        <div style={{ height: 7, width: "55%", borderRadius: 4, background: "rgba(245,240,232,0.85)" }} />
        <div style={{ height: 5, width: "38%", borderRadius: 3, background: "rgba(188,182,166,0.5)" }} />
        <div style={{ height: 30, width: "70%", borderRadius: 8, background: pro ? `linear-gradient(90deg,${G},#b8953f)` : "rgba(255,255,255,0.08)", marginTop: 4 }} />
      </div>
      {/* pied de page : mention QRowg sur le gratuit, rien sur le Pro */}
      <div style={{ padding: "9px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", minHeight: 30 }}>
        {pro
          ? <span style={{ color: G, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5 }}>✓ 100 % votre marque</span>
          : <span style={{ color: "rgba(188,182,166,0.65)", fontSize: 9.5 }}>✦ Propulsé par QRowg</span>}
      </div>
    </div>
  )
  return (
    <section ref={ref} aria-labelledby="brandpro-title" style={{ padding: "90px 48px", position: "relative", zIndex: 1 }}>
      <div className="brandpro-wrap" style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
        {/* Texte */}
        <div>
          <p style={{ color: G, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Marque professionnelle</p>
          <h2 id="brandpro-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(30px,3.6vw,46px)", color: "#F5F0E8", fontWeight: 700, lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Votre marque.<br /><span style={{ color: G }}>Pas la nôtre.</span>
          </h2>
          <p style={{ color: "rgba(188,182,166,0.9)", fontSize: 16, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 420 }}>
            Dès un <strong style={{ color: "#E8E6E0" }}>plan payant</strong>, la mention QRowg disparaît ; à partir du plan <strong style={{ color: "#E8E6E0" }}>{PLANS_DEF.pro.label}</strong>, votre page s'affiche sur votre propre nom de domaine. Vos clients ne voient que vous.
          </p>
          <button type="button" onClick={() => setOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.1)", border: `1px solid ${G}55`, color: G, fontSize: 14, fontWeight: 700, padding: "12px 22px", borderRadius: 12, cursor: "pointer" }}>
            Découvrir la marque professionnelle →
          </button>
        </div>
        {/* Avant / Après */}
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
            <MiniPage pro={false} />
            <MiniPage pro={true} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <span style={{ flex: 1, textAlign: "center", color: "rgba(188,182,166,0.7)", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Plan gratuit</span>
            <span style={{ flex: 1, textAlign: "center", color: G, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Plan {PLANS_DEF.pro.label}</span>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:820px){ .brandpro-wrap{ grid-template-columns:1fr!important; gap:32px!important; } } @media(max-width:640px){ section[aria-labelledby="brandpro-title"]{ padding:64px 22px!important; } }`}</style>

      {/* Modale explicative */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg,#16140E,#0C0B08)", border: `1px solid ${G}40`, borderRadius: 20, padding: "30px 28px", position: "relative", boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 50px ${G}12`, fontFamily: "DM Sans, sans-serif" }}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", color: "#BCB6A6", fontSize: 16, cursor: "pointer" }}>✕</button>
            <p style={{ color: G, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>Marque professionnelle</p>
            <p style={{ color: "#F5F0E8", fontSize: 22, fontWeight: 800, margin: "4px 0 18px", fontFamily: "Fraunces, serif" }}>Une image 100 % à vous</p>
            {([
              ["🌐", "Votre nom de domaine", "Au lieu de qrowg.com/p/…, votre page vit sur carte.votremarque.fr. Plus crédible, plus mémorisable."],
              ["🚫", "Zéro mention QRowg", "La mention « Propulsé par QRowg » disparaît : vos visiteurs ne voient que votre marque."],
              ["✨", "Design premium", "Polices, couleurs et finitions soignées pour une page qui inspire confiance dès le premier coup d'œil."],
            ] as const).map(([emo, h, txt]) => (
              <div key={h} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{emo}</span>
                <div>
                  <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: "0 0 2px" }}>{h}</p>
                  <p style={{ color: "rgba(188,182,166,0.9)", fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{txt}</p>
                </div>
              </div>
            ))}
            <Link href="/upgrade" style={{ display: "block", textAlign: "center", marginTop: 18, padding: "12px", borderRadius: 11, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 13.5, fontWeight: 800 }}>
              Activer ma marque (dès le plan {PLANS_DEF.pro.label})
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}


// ── Pricing card ──────────────────────────────────────────────────────────────
// Pricing landing : derive de la source unique (lib/plans) -> 4 plans, Pro en avant

const ROADMAP_STEPS = [
  { icon: "🎨", title: "Choisissez un modèle", sub: "Un modèle adapté à votre métier, prêt à l'emploi." },
  { icon: "✏️", title: "Personnalisez", sub: "Vos textes, photos, liens et boutons d'action." },
  { icon: "📱", title: "Obtenez votre QR", sub: "Un QR code dynamique généré automatiquement." },
  { icon: "📊", title: "Partagez & suivez", sub: "Diffusez partout et suivez chaque scan." },
] as const

function ProofStrip() {
  const { ref, visible } = useInView(0.1)
  return (
    <section
      ref={ref}
      aria-label="Comment ça marche, en 4 étapes"
      style={{ padding: "0 48px 80px", position: "relative", zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: "rgba(200,194,178,0.88)", fontSize: 14.5, margin: "0 0 30px", letterSpacing: 0.2, lineHeight: 1.6 }}>
          De l'idée au QR code partagé — <span style={{ color: "#C9A84C", fontWeight: 600 }}>4 étapes, 5 minutes</span>.
        </p>
        <div className="rm-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {/* ligne de liaison derrière les badges */}
          <div aria-hidden className="rm-line" style={{ position: "absolute", top: 23, left: "12.5%", right: "12.5%", height: 2, background: "linear-gradient(90deg, rgba(201,168,76,0.35), rgba(201,168,76,0.18))", opacity: visible ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
          {ROADMAP_STEPS.map((s, i) => (
            <div key={s.title} style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10,
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.5s ease ${i * 110}ms, transform 0.5s ease ${i * 110}ms`,
            }}>
              {/* badge numéro */}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #14120C, #0C0B08)", border: "1px solid rgba(201,168,76,0.4)", boxShadow: "0 6px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, position: "relative", zIndex: 1 }}>
                {s.icon}
                <span style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#b8953f)", color: "#080808", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(201,168,76,0.4)" }}>{i + 1}</span>
              </div>
              <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{s.title}</p>
              <p style={{ color: "rgba(188,182,166,0.8)", fontSize: 12.5, margin: 0, lineHeight: 1.5, maxWidth: 200 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .rm-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .rm-line { display: none !important; }
          .rm-grid > div { flex-direction: row !important; text-align: left !important; align-items: flex-start !important; gap: 16px !important; padding: 18px 0 !important; border-bottom: 1px solid rgba(201,168,76,0.08) !important; max-width: 460px; margin: 0 auto; }
          .rm-grid > div:last-child { border-bottom: none !important; }
          .rm-grid > div p { max-width: none !important; }
        }
        @media (max-width: 640px) { section[aria-label="Comment ça marche, en 4 étapes"] { padding: 0 22px 64px !important; } }
      `}</style>
    </section>
  )
}
// ── Templates section ─────────────────────────────────────────────────────────

const BM_BLOCKS = [
  { key: "profil", icon: "👤", label: "Profil" },
  { key: "liens", icon: "🔗", label: "Liens" },
  { key: "galerie", icon: "📸", label: "Galerie" },
  { key: "whatsapp", icon: "💬", label: "WhatsApp" },
  { key: "reservation", icon: "📅", label: "Réservation" },
  { key: "paiement", icon: "💳", label: "Paiement" },
] as const
const BM_ACCENTS = ["#C9A84C", "#38BDF8", "#39FF8F", "#F97316", "#A78BFA"]
const BM_COL: Record<string, string> = { profil: "", liens: "#38BDF8", galerie: "#A78BFA", whatsapp: "#39FF8F", reservation: "#F97316", paiement: "#F43F5E" }

function BuilderMockup() {
  const [added, setAdded] = useState<string[]>(["profil", "liens", "galerie"])
  const [accent, setAccent] = useState("#C9A84C")
  const toggle = (k: string) => setAdded(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k])
  const col = (k: string) => (k === "profil" ? accent : BM_COL[k])

  const canvasBlock = (k: string) => {
    const c = col(k)
    if (k === "profil") return (
      <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: `${accent}0d`, border: `1px dashed ${accent}55`, borderRadius: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${accent},${accent}bb)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
        <div style={{ height: 7, width: "60%", borderRadius: 4, background: "rgba(245,240,232,0.22)" }} />
        <div style={{ height: 5, width: "40%", borderRadius: 4, background: "rgba(245,240,232,0.12)" }} />
      </div>
    )
    if (k === "galerie") return (
      <div key={k} style={{ padding: "10px 12px", borderRadius: 9, background: `${c}10`, border: `1px solid ${c}22`, display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 28, borderRadius: 6, background: `${c}33` }} />)}
      </div>
    )
    const labels: Record<string, string> = { liens: "Mes liens", whatsapp: "Discuter sur WhatsApp", reservation: "Réserver", paiement: "Payer" }
    const icon = BM_BLOCKS.find(b => b.key === k)?.icon
    return (
      <div key={k} style={{ padding: "11px 12px", borderRadius: 9, background: `${c}12`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ height: 6, flex: 1, borderRadius: 3, background: `${c}55` }} />
      </div>
    )
  }

  return (
    <div className="bm" style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr 1fr", gap: 12, alignItems: "start", maxWidth: 820, margin: "0 auto" }}>
      {/* Palette de blocs (cliquables) */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 14, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ color: "rgba(201,168,76,0.7)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4, paddingLeft: 4 }}>Blocs · cliquez</p>
        {BM_BLOCKS.map(b => { const on = added.includes(b.key); return (
          <button key={b.key} type="button" onClick={() => toggle(b.key)} aria-pressed={on}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, cursor: "pointer", textAlign: "left",
              background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.06)"}`, transition: "all .15s" }}>
            <span style={{ fontSize: 14 }}>{b.icon}</span>
            <span style={{ color: on ? "#F5F0E8" : "rgba(245,240,232,0.7)", fontSize: 11, fontWeight: on ? 700 : 500 }}>{b.label}</span>
            <span style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: on ? "#C9A84C" : "rgba(255,255,255,0.08)", color: on ? "#080808" : "rgba(245,240,232,0.5)" }}>{on ? "✓" : "+"}</span>
          </button>
        ) })}
      </div>

      {/* Canvas — se construit en direct */}
      <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["var(--danger)", "#F97316", "var(--success)"].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
          <span style={{ flex: 1, textAlign: "center", color: "rgba(201,168,76,0.5)", fontSize: 10, letterSpacing: 1 }}>Canvas</span>
          <div style={{ padding: "3px 10px", borderRadius: 5, background: `${accent}20`, border: `1px solid ${accent}40`, fontSize: 9, color: accent, fontWeight: 700 }}>PUBLIER</div>
        </div>
        {added.length === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(188,182,166,0.5)", fontSize: 12, textAlign: "center", padding: "24px 12px" }}>Cliquez un bloc à gauche pour construire votre page ✨</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{added.map(canvasBlock)}</div>}
      </div>

      {/* Aperçu téléphone + accent */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <p style={{ color: "rgba(201,168,76,0.5)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Aperçu</p>
        <div style={{ width: 92, border: "2px solid rgba(201,168,76,0.25)", borderRadius: 18, padding: "10px 7px", background: "rgba(8,8,8,0.85)", boxShadow: "0 0 24px rgba(201,168,76,0.08)", display: "flex", flexDirection: "column", minHeight: 150 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 8px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
            {added.includes("profil") && <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${accent},${accent}bb)`, marginBottom: 2, transition: "background .2s" }} />}
            {added.filter(k => k !== "profil").map((k, i) => (
              <div key={i} style={{ height: k === "galerie" ? 22 : 14, width: "88%", borderRadius: 5, background: `${col(k)}55`, transition: "background .2s" }} />
            ))}
            {added.length === 0 && <div style={{ color: "rgba(188,182,166,0.35)", fontSize: 8, textAlign: "center", marginTop: 20 }}>vide</div>}
          </div>
        </div>
        {/* Accent live */}
        <div style={{ display: "flex", gap: 6 }}>
          {BM_ACCENTS.map(c => (
            <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Accent ${c}`}
              style={{ width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer", border: accent === c ? "2px solid #F5F0E8" : "2px solid transparent", boxShadow: accent === c ? `0 0 0 2px ${c}` : "none", padding: 0 }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", animation: "livePulse 1.5s ease-in-out infinite" }} />
          <span style={{ color: "var(--success)", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
        </div>
      </div>
    </div>
  )
}
function BuilderSection(){
  const {ref,visible}=useInView(0.07)
  const BEN=[
    {icon:"🧱",title:"Blocs prêts à l'emploi",desc:"Profil, liens, galerie, WhatsApp, paiement — tout y est."},
    {icon:"🎨",title:"Modèles par métier",desc:"Restaurant, indépendant, artiste, coach — adaptés dès le départ."},
    {icon:"📱",title:"Aperçu mobile instantané",desc:"Voyez le rendu en temps réel pendant que vous modifiez votre page."},
  ]
  return(
    <section id="builder" ref={ref} aria-labelledby="builder-title"
      style={{
        padding:"100px 48px",position:"relative",zIndex:1,
        background:"radial-gradient(120% 70% at 50% 50%, rgba(201,168,76,0.05), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25))",
        borderTop:"1px solid rgba(255,255,255,0.04)",
        borderBottom:"1px solid rgba(255,255,255,0.04)",
        boxShadow:"inset 0 30px 60px -40px rgba(0,0,0,0.8), inset 0 -30px 60px -40px rgba(0,0,0,0.8)",
      }}>
      <style>{`
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        @media(max-width:900px){.bm{grid-template-columns:1fr 1fr!important;}}
        @media(max-width:640px){#builder{padding:72px 20px!important;}.bm{grid-template-columns:1fr!important;}}
        @media(max-width:900px){.bben{grid-template-columns:1fr!important;}}
      `}</style>
      <div style={{maxWidth:1140,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:64,opacity:visible?1:0,
          transform:visible?"translateY(0)":"translateY(24px)",transition:"opacity 0.6s,transform 0.6s"}}>
          <p style={{color:"#C9A84C",fontSize:11,letterSpacing:3.5,textTransform:"uppercase",fontWeight:600,marginBottom:16}}>Éditeur</p>
          <h2 id="builder-title" style={{fontFamily:"Fraunces, serif",fontSize:"clamp(28px,4vw,52px)",
            color:"#F5F0E8",fontWeight:700,margin:"0 auto 20px",lineHeight:1.1,maxWidth:680,letterSpacing:"-0.02em"}}>
            Créez une page professionnelle{" "}<span style={{color:"#C9A84C"}}>en quelques minutes.</span>
          </h2>
          <p style={{color:"rgba(188,182,166,0.85)",fontSize:16,maxWidth:540,margin:"0 auto",lineHeight:1.7}}>
            <strong style={{color:"#F5F0E8",fontWeight:600}}>Essayez maintenant</strong> : cliquez un bloc à gauche, il apparaît dans votre page. Changez la couleur — tout se met à jour en direct.
          </p>
        </div>
        <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(32px)",
          transition:"opacity 0.7s ease 0.15s,transform 0.7s ease 0.15s",marginBottom:56}}>
          <BuilderMockup/>
        </div>
        <div className="bben" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:860,margin:"0 auto"}}>
          {BEN.map((b,i)=>(
            <div key={b.title} style={{display:"flex",flexDirection:"column",gap:10,padding:"20px",
              background:"rgba(255,255,255,0.02)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:14,
              opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(20px)",
              transition:`opacity 0.5s ease ${0.35+i*0.1}s,transform 0.5s ease ${0.35+i*0.1}s`}}>
              <span style={{fontSize:22}}>{b.icon}</span>
              <h3 style={{color:"#F5F0E8",fontSize:14,fontWeight:700,margin:0}}>{b.title}</h3>
              <p style={{color:"rgba(200,194,178,0.9)",fontSize:14,margin:0,lineHeight:1.6}}>{b.desc}</p>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:48,opacity:visible?1:0,transition:"opacity 0.6s ease 0.7s"}}>
          <a href={creerUrl()} style={{display:"inline-flex",alignItems:"center",gap:10,
            background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:"#080808",textDecoration:"none",
            fontSize:14,fontWeight:700,padding:"13px 30px",borderRadius:11,
            boxShadow:"0 4px 24px rgba(201,168,76,0.35)",transition:"transform 0.2s var(--mo-ease-spring),box-shadow 0.2s"}}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-3px) scale(1.03)";el.style.boxShadow="0 8px 32px rgba(201,168,76,0.5)"}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 4px 24px rgba(201,168,76,0.35)"}}>
            Ouvrir l'éditeur <span style={{fontSize:16}}>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ── QR Dynamique section ──────────────────────────────────────────────────────

// Mini QR code SVG généré en pur SVG (performance max, 0 dépendance)

const QR_STYLES = [
  {
    id: "classic",
    name: "Classic",
    desc: "Intemporel",
    fg: "#1a1a1a", bg: "#ffffff", accent: "#C9A84C",
    cardBg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
    tag: "#BCB6A6",
  },
  {
    id: "gold",
    name: "Gold",
    desc: "Premium",
    fg: "#C9A84C", bg: "#111009", accent: "#F5F0E8",
    cardBg: "rgba(201,168,76,0.06)",
    border: "rgba(201,168,76,0.3)",
    tag: "#C9A84C",
  },
  {
    id: "neon",
    name: "Neon",
    desc: "Impact",
    fg: "var(--success)", bg: "#050505", accent: "#A78BFA",
    cardBg: "rgba(57,255,143,0.05)",
    border: "rgba(57,255,143,0.25)",
    tag: "var(--success)",
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Chaleureux",
    fg: "#F97316", bg: "#0d0805", accent: "#F43F5E",
    cardBg: "rgba(249,115,22,0.06)",
    border: "rgba(249,115,22,0.25)",
    tag: "#F97316",
  },
  {
    id: "business",
    name: "Business",
    desc: "Institutionnel",
    fg: "var(--action)", bg: "#030d14", accent: "#7C3AED",
    cardBg: "rgba(56,189,248,0.05)",
    border: "rgba(56,189,248,0.2)",
    tag: "var(--action)",
  },
] as const

const QR_BENEFITS = [
  { icon: "🔄", text: "Destination modifiable à tout moment" },
  { icon: "🎨", text: "Couleurs et styles personnalisés" },
  { icon: "⬇️", text: "Téléchargement PNG · SVG · PDF" },
  { icon: "📊", text: "Analytics par scan en temps réel" },
  { icon: "🖨️", text: "Résolution print HD incluse" },
] as const

function QRDynamicSection() {
  const { ref, visible } = useInView(0.07)
  const [active, setActive] = useState(0)

  return (
    <section id="qr-dynamique" ref={ref} aria-labelledby="qr-dyn-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .qr-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
        .qr-card { display:flex; flex-direction:column; align-items:center; gap:14px;
          padding:20px 16px; border-radius:18px; cursor:pointer;
          transition:transform 0.3s var(--mo-ease-spring), border-color 0.25s, background 0.25s; }
        .qr-card:hover { transform:translateY(-6px) scale(1.03); }
        .qr-card:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:4px; border-radius:18px; }
        .qr-ben { display:flex; flex-direction:column; gap:14px; }
        @media(max-width:900px){ .qr-grid{ grid-template-columns:repeat(3,1fr)!important; } }
        @media(max-width:580px){
          .qr-grid{ grid-template-columns:repeat(2,1fr)!important; gap:10px!important; }
          #qr-dynamique{ padding:72px 20px!important; }
        }
        @keyframes qrFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes qrGlow  { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* Ambiance dorée (impression / QR) — variation de fond par section */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "0%", right: "-6%", width: "min(640px,72vw)", height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.09), transparent 64%)", filter: "blur(54px)" }} />
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64,
          alignItems: "center", marginBottom: 72,
        }} className="qr-header">
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
              textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>
              QR Codes dynamiques
            </p>
            <h2 id="qr-dyn-title" style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(28px, 3.5vw, 48px)",
              color: "#F5F0E8", fontWeight: 700,
              margin: "0 0 20px", lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}>
              Un QR code dynamique,{" "}
              <span style={{ color: "#C9A84C" }}>pas une image figée.</span>
            </h2>
            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16,
              lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
              Modifiez votre page ou votre destination sans jamais réimprimer votre QR code.
            </p>

            {/* Bénéfices */}
            <div className="qr-ben">
              {QR_BENEFITS.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-16px)",
                  transition: `opacity 0.5s ease ${0.2 + i * 0.08}s, transform 0.5s ease ${0.2 + i * 0.08}s`,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13,
                  }}>{b.icon}</span>
                  <span style={{ color: "rgba(245,240,232,0.8)", fontSize: 13.5 }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{
              marginTop: 36,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.7s",
            }}>
              <a href="/creer" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "linear-gradient(90deg,#C9A84C,#b8953f)",
                color: "#080808", textDecoration: "none",
                fontSize: 14, fontWeight: 700,
                padding: "12px 26px", borderRadius: 11,
                boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
                transition: "transform 0.2s var(--mo-ease-spring), box-shadow 0.2s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "translateY(-2px) scale(1.03)"
                  el.style.boxShadow = "0 8px 28px rgba(201,168,76,0.5)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "none"
                  el.style.boxShadow = "0 4px 20px rgba(201,168,76,0.35)"
                }}>
                Personnaliser mon QR code <span style={{ fontSize: 16 }}>→</span>
              </a>
            </div>
          </div>

          {/* QR actif en grand */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.2s",
          }}>
            <div style={{
              position: "relative",
              animation: "qrFloat 4s ease-in-out infinite", willChange: "transform",
            }}>
              {/* Glow */}
              <div style={{
                position: "absolute", inset: -24,
                background: "radial-gradient(circle, " + QR_STYLES[active].tag + "25 0%, transparent 65%)",
                borderRadius: "50%",
                animation: "qrGlow 3s ease-in-out infinite", willChange: "opacity",
                pointerEvents: "none",
              }} />
              {/* Card principale */}
              <div style={{
                width: 180, height: 180,
                background: QR_STYLES[active].cardBg,
                border: "1px solid " + QR_STYLES[active].border,
                borderRadius: 22,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 12,
                boxShadow: "0 0 60px " + QR_STYLES[active].tag + "30, 0 0 0 1px " + QR_STYLES[active].border,
                transition: "all 0.4s ease",
              }}>
                <QRMiniSvg
                  fg={QR_STYLES[active].fg}
                  bg={QR_STYLES[active].bg}
                  accent={QR_STYLES[active].accent}
                  size={130}
                />
                <span style={{
                  color: QR_STYLES[active].tag,
                  fontSize: 10, letterSpacing: 2.5,
                  textTransform: "uppercase", fontWeight: 700,
                }}>QROWG.COM</span>
              </div>
              {/* Badge style */}
              <div style={{
                position: "absolute", top: -10, right: -10,
                background: "linear-gradient(135deg, #C9A84C, #b8953f)",
                borderRadius: 20, padding: "4px 10px",
                fontSize: 10, fontWeight: 800, color: "#080808",
                boxShadow: "0 2px 12px rgba(201,168,76,0.5)",
              }}>{QR_STYLES[active].name}</div>
            </div>
          </div>
        </div>

        {/* Grille de styles */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s",
        }}>
          <p style={{ color: "rgba(188,182,166,0.6)", fontSize: 11,
            letterSpacing: 2, textTransform: "uppercase", textAlign: "center",
            marginBottom: 20 }}>Choisir un style</p>

          <div className="qr-grid">
            {QR_STYLES.map((style, i) => (
              <button
                key={style.id}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                aria-label={"Style " + style.name}
                className="qr-card"
                style={{
                  background: active === i ? style.cardBg : "rgba(255,255,255,0.015)",
                  border: "1px solid " + (active === i ? style.border : "rgba(255,255,255,0.07)"),
                  boxShadow: active === i ? "0 0 32px " + style.tag + "20" : "none",
                }}
              >
                <QRMiniSvg fg={style.fg} bg={style.bg} accent={style.accent} size={64} />
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    color: active === i ? style.tag : "#F5F0E8",
                    fontSize: 13, fontWeight: 700, margin: "0 0 2px",
                    transition: "color 0.25s",
                  }}>{style.name}</p>
                  <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 10, margin: 0 }}>
                    {style.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          .qr-header { grid-template-columns:1fr!important; }
        }
      `}</style>
    </section>
  )
}

// ── Analytics section ─────────────────────────────────────────────────────────

// Données démo cohérentes (pas de chiffres marketing abusifs)

const STORY = [
  { key: "Création",        icon: "🧱", desc: "Glissez vos blocs : profil, liens, galerie, boutons d'action." },
  { key: "Personnalisation", icon: "🎨", desc: "Couleurs, thème, logo — votre page, votre identité." },
  { key: "QR code",         icon: "⬛", desc: "Votre QR code est généré automatiquement, prêt à partager." },
  { key: "Scan",            icon: "📲", desc: "Vos clients scannent et accèdent à tout, en un geste." },
  { key: "Analytics",       icon: "📊", desc: "Chaque scan devient une donnée, mesurée en temps réel." },
] as const

function StoryPhone({ step }: { step: number }) {
  // Contenu de l'écran selon l'étape (re-monté via key -> ré-animé)
  const G = "#C9A84C"
  if (step === 0 || step === 1) {
    const colored = step === 1
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: 16 }}>
        {[42, 14, 34, 14, 30].map((h, i) => (
          <div key={i} style={{
            height: h, width: i === 1 || i === 3 ? "62%" : "100%", borderRadius: 9,
            background: colored
              ? (i === 0 ? `linear-gradient(90deg, ${G}, #b8953f)` : i === 2 ? "rgba(56,189,248,0.4)" : i === 4 ? "rgba(57,255,143,0.35)" : "rgba(255,255,255,0.14)")
              : "rgba(255,255,255,0.07)",
            border: colored ? "none" : "1px dashed rgba(201,168,76,0.28)",
            animation: `mo-fade-up 0.45s ease ${i * 0.09}s both`,
          }} />
        ))}
        {colored && (
          <div style={{ display: "flex", gap: 7, marginTop: 4, animation: "mo-fade-up 0.4s ease 0.4s both" }}>
            {[G, "var(--action)", "#A78BFA", "var(--success)"].map(c => (
              <span key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}88` }} />
            ))}
          </div>
        )}
      </div>
    )
  }
  if (step === 2 || step === 3) {
    return (
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ position: "relative", animation: "mo-fade-up 0.5s ease both" }}>
          <QRMiniSvg fg="#F5F0E8" bg="transparent" accent={G} size={140} />
          {step === 3 && (
            <div aria-hidden style={{ position: "absolute", left: "4%", right: "4%", top: "10%", height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${G}, transparent)`, boxShadow: `0 0 16px 3px ${G}88`, animation: "scanLine 1.8s ease-in-out infinite" }} />
          )}
        </div>
        {step === 3 && (
          <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, background: "rgba(57,255,143,0.14)", border: "1px solid rgba(57,255,143,0.4)", color: "var(--success)", fontSize: 12, fontWeight: 700, animation: "mo-fade-up 0.4s ease 0.3s both" }}>✓ Scanné</div>
        )}
      </div>
    )
  }
  // step 4 : analytics
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, height: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["1 248", "Scans"], ["86%", "Mobile"]].map(([v, l], i) => (
          <div key={l} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.18)", animation: `mo-fade-up 0.4s ease ${i * 0.1}s both` }}>
            <p style={{ margin: 0, color: G, fontSize: 17, fontWeight: 800 }}>{v}</p>
            <p style={{ margin: 0, color: "#BCB6A6", fontSize: 9.5 }}>{l}</p>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 7, padding: "8px 4px 0" }}>
        {[40, 65, 50, 80, 58, 92, 70].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg, ${G}, ${G}33)`, transformOrigin: "bottom", animation: `barGrow 0.5s var(--mo-ease-spring) ${i * 0.07}s both` }} />
        ))}
      </div>
    </div>
  )
}

function StoryFlow() {
  const { ref, visible } = useInView(0.2)
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => setStep(s => (s + 1) % STORY.length), 2600)
    return () => clearInterval(t)
  }, [visible])
  return (
    <section ref={ref} aria-labelledby="story-title" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes barGrow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .story-grid { display:grid; grid-template-columns:1fr 0.9fr; gap:64px; align-items:center; max-width:1040px; margin:0 auto; }
        @media(max-width:880px){ .story-grid{ grid-template-columns:1fr!important; gap:40px!important; } }
        @media(max-width:640px){ #story{ padding:76px 22px!important; } }
      `}</style>
      <div id="story" style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <Eyebrow>Voyez-le en action</Eyebrow>
          <h2 id="story-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,52px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto", lineHeight: 1.1, maxWidth: 580, letterSpacing: "-0.02em" }}>
            De l'idée au{" "}<span style={{ color: "#C9A84C" }}>premier client.</span>
          </h2>
        </div>
        <div className="story-grid">
          {/* Étapes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STORY.map((s, i) => {
              const active = step === i
              return (
                <button key={s.key} type="button" onClick={() => setStep(i)} style={{
                  display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer",
                  padding: "16px 18px", borderRadius: 14,
                  background: active ? "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(255,255,255,0.02))" : "transparent",
                  border: `1px solid ${active ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.3s ease",
                }}>
                  <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: active ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`, boxShadow: active ? "0 0 22px rgba(201,168,76,0.3)" : "none", transition: "all 0.3s ease" }}>
                    {s.icon}
                    <span style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: active ? "linear-gradient(135deg,#d4a843,#C9A84C)" : "rgba(255,255,255,0.1)", color: active ? "#080808" : "#BCB6A6", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: active ? "#F5F0E8" : "#A8A29A", fontSize: 14.5, fontWeight: 700 }}>{s.key}</p>
                    <p style={{ margin: "3px 0 0", color: "rgba(188,182,166,0.85)", fontSize: 12.5, lineHeight: 1.5, maxHeight: active ? 60 : 0, opacity: active ? 1 : 0, overflow: "hidden", transition: "all 0.35s ease" }}>{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {/* Téléphone */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "relative", width: "min(250px, 74vw)", aspectRatio: "9 / 18",
              borderRadius: 32, padding: 10,
              background: "linear-gradient(160deg, #1a1712, #0c0b08)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.12)",
              animation: "float 6s ease-in-out infinite",
            }}>
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", background: "#0A0907", display: "flex", flexDirection: "column" }}>
                <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <StoryPhone step={step} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Motif signature : « finder pattern » d'un QR code (carré niché) ───────────

type CmpCell = readonly [status: "yes" | "partial" | "no", note?: string]
const COMPARE_ROWS: { label: string; q: CmpCell; l: CmpCell; p: CmpCell }[] = [
  { label: "Page pro sur-mesure (blocs, menu, portfolio)", q: ["yes"], l: ["partial", "Liste de liens"], p: ["no"] },
  { label: "QR code dynamique repointable",                 q: ["yes"], l: ["partial", "Vers la page"],  p: ["no"] },
  { label: "Studio QR — design du code (couleurs, logo)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Modifiable sans réimprimer",                    q: ["yes"], l: ["yes"],                       p: ["no"] },
  { label: "Statistiques de scans & visites",               q: ["yes", "Détaillées"], l: ["partial", "Payant"], p: ["no"] },
  { label: "Modèles par métier (resto, immo, créateur…)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Supports imprimables générés (sticker, PDF)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Domaine personnalisé",                          q: ["yes"], l: ["partial", "Payant"],         p: ["no"] },
]

function CmpMark({ cell, strong = false }: { cell: CmpCell; strong?: boolean }) {
  const [status, note] = cell
  const cfg = status === "yes"
    ? { ic: "✓", fg: strong ? "#0A0A0A" : "#C9A84C", bg: strong ? "linear-gradient(135deg,#EBCE72,#C9A84C)" : "rgba(201,168,76,0.14)", bd: strong ? "transparent" : "rgba(201,168,76,0.4)" }
    : status === "partial"
    ? { ic: "–", fg: "#B9B2A0", bg: "rgba(255,255,255,0.05)", bd: "rgba(255,255,255,0.14)" }
    : { ic: "✕", fg: "#7C766B", bg: "rgba(255,255,255,0.03)", bd: "rgba(255,255,255,0.08)" }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span aria-label={status === "yes" ? "oui" : status === "partial" ? "partiel" : "non"} style={{
        width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: cfg.fg, background: cfg.bg, border: `1px solid ${cfg.bd}`,
        boxShadow: strong && status === "yes" ? "0 2px 10px rgba(201,168,76,0.35)" : "none",
      }}>{cfg.ic}</span>
      {note && <span style={{ fontSize: 10.5, color: "#8A8478", lineHeight: 1.1, textAlign: "center" }}>{note}</span>}
    </div>
  )
}

function ComparisonSection() {
  const { ref, visible } = useInView()
  return (
    <section id="comparaison" ref={ref} aria-labelledby="cmp-title" style={{ padding: "96px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .cmp-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;align-items:stretch;}
        .cmp-cell{padding:16px 14px;display:flex;align-items:center;justify-content:center;border-top:1px solid rgba(255,255,255,0.05);}
        .cmp-lab{justify-content:flex-start;text-align:left;color:#D8D2C4;font-size:14px;font-weight:500;line-height:1.3;}
        .cmp-hl{background:linear-gradient(180deg,rgba(201,168,76,0.09),rgba(201,168,76,0.04));}
        @media(max-width:760px){
          .cmp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -20px;padding:0 20px;}
          .cmp-grid{min-width:640px;}
          section[aria-labelledby="cmp-title"]{padding:70px 20px!important;}
        }
      `}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow>Pourquoi QRowg</Eyebrow>
        <h2 id="cmp-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,48px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto 14px", lineHeight: 1.1, maxWidth: 640, letterSpacing: "-0.02em" }}>
          Une carte de visite, mais vivante.
        </h2>
        <p style={{ color: "rgba(226,220,206,0.8)", fontSize: 17, lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 520 }}>
          Ce que QRowg fait — et que les autres solutions laissent de côté.
        </p>

        <div className="cmp-scroll" style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{
            border: "1px solid rgba(201,168,76,0.16)", borderRadius: 20, overflow: "hidden",
            background: "linear-gradient(180deg, rgba(20,18,14,0.7), rgba(12,11,8,0.7))",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}>
            {/* En-tetes */}
            <div className="cmp-grid">
              <div className="cmp-cell cmp-lab" style={{ borderTop: "none" }} />
              <div className="cmp-cell cmp-hl" style={{ borderTop: "none", flexDirection: "column", gap: 8, position: "relative" }}>
                <span style={{
                  position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
                  fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#C9A84C",
                  background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap",
                }}>Recommandé</span>
                <span style={{ marginTop: 18 }}><QrowgLogo size={18} /></span>
              </div>
              <div className="cmp-cell" style={{ borderTop: "none", color: "#B9B2A0", fontSize: 15, fontWeight: 600 }}>Linktree</div>
              <div className="cmp-cell" style={{ borderTop: "none", color: "#B9B2A0", fontSize: 15, fontWeight: 600 }}>Carte papier</div>
            </div>
            {/* Lignes */}
            {COMPARE_ROWS.map((row) => (
              <div className="cmp-grid" key={row.label}>
                <div className="cmp-cell cmp-lab">{row.label}</div>
                <div className="cmp-cell cmp-hl"><CmpMark cell={row.q} strong /></div>
                <div className="cmp-cell"><CmpMark cell={row.l} /></div>
                <div className="cmp-cell"><CmpMark cell={row.p} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 34, display: "flex", justifyContent: "center" }}>
          <Link href="/creer" style={{
            background: "linear-gradient(90deg, #C9A84C, #b8953f)", color: "#080808", textDecoration: "none",
            fontSize: 15, fontWeight: 700, padding: "14px 30px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 9,
            boxShadow: "0 4px 24px rgba(201,168,76,0.4)", transition: "transform 0.2s var(--mo-ease-spring), box-shadow 0.2s",
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px) scale(1.02)"; el.style.boxShadow = "0 8px 34px rgba(201,168,76,0.5)" }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 24px rgba(201,168,76,0.4)" }}>
            Composer ma page — sans compte <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Atelier d'impression : supports imprimables (carrousel mobile) ────────────────────
const SUPPORTS = [
  { name: "Affiche",          emoji: "🖼️", accent: "#C9A84C", benefit: "Vitrine, événement, salle d'attente — visible de loin." },
  { name: "Sticker vitrine",  emoji: "🪟", accent: "var(--action)", benefit: "Instagram, avis Google ou Wi-Fi : collez, c'est prêt." },
  { name: "Carte de visite",  emoji: "💳", accent: "#A78BFA", benefit: "Partagez tout votre profil en un seul scan." },
  { name: "Chevalet de table", emoji: "🍽️", accent: "var(--success)", benefit: "Menu, avis ou réservation, directement à table." },
  { name: "Flyer",            emoji: "📄", accent: "#F97316", benefit: "Promo ou ouverture : distribuez, scannez, convertissez." },
  { name: "Avis Google",      emoji: "⭐", accent: "#F5D24E", benefit: "Un scan, un avis en 10 secondes. Boostez votre note." },
] as const

function PrintStudioSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section ref={ref} aria-labelledby="print-title" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .print-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:1040px; margin:0 auto; }
        @media(max-width:900px){ .print-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(max-width:560px){
          .print-grid{ display:flex!important; gap:14px!important; overflow-x:auto!important; scroll-snap-type:x mandatory!important; padding-bottom:14px!important; -webkit-overflow-scrolling:touch!important; }
          .print-grid > *{ min-width:240px!important; scroll-snap-align:start!important; }
          #print{ padding:76px 22px!important; }
        }
        .print-grid::-webkit-scrollbar{ height:4px; }
        .print-grid::-webkit-scrollbar-track{ background:rgba(255,255,255,0.04); border-radius:2px; }
        .print-grid::-webkit-scrollbar-thumb{ background:rgba(201,168,76,0.3); border-radius:2px; }
        .print-card{ transition:transform 0.3s var(--mo-ease-spring), border-color 0.25s, box-shadow 0.25s; }
        .print-card:hover{ transform:translateY(-6px); }
      `}</style>
      <div id="print" style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <Eyebrow>Supports imprimables</Eyebrow>
          <h2 id="print-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,52px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto 16px", lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em" }}>
            Vos QR codes en{" "}<span style={{ color: "#C9A84C" }}>supports prêts à imprimer.</span>
          </h2>
          <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Affiche, sticker, carte, chevalet, flyer… exportés en haute définition, prêts pour l'imprimeur.
          </p>
        </div>

        <div className="print-grid">
          {SUPPORTS.map((s, i) => (
            <div key={s.name} className="print-card" style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 18, overflow: "hidden",
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)",
              transition: `opacity 0.5s ease ${i * 80}ms, transform 0.45s var(--mo-ease-spring) ${i * 80}ms`,
            }}>
              {/* Aperçu du support */}
              <div style={{ position: "relative", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(120% 100% at 50% 0%, ${s.accent}14, transparent 65%), #0C0B08`, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 92, aspectRatio: "1 / 1.3", borderRadius: 8, background: "linear-gradient(160deg,#17140d,#0c0b08)", border: `1px solid ${s.accent}40`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: `0 12px 30px rgba(0,0,0,0.5), 0 0 26px ${s.accent}18` }}>
                  <QRMiniSvg fg="#F5F0E8" bg="transparent" accent={s.accent} size={40} />
                  <span style={{ width: "62%", height: 3, borderRadius: 2, background: `${s.accent}66` }} />
                </div>
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 18 }}>{s.emoji}</span>
              </div>
              {/* Texte */}
              <div style={{ padding: "16px 18px 20px" }}>
                <h3 style={{ color: "#F5F0E8", fontSize: 15.5, fontWeight: 700, margin: "0 0 6px" }}>{s.name}</h3>
                <p style={{ color: "rgba(200,194,178,0.9)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.benefit}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 44, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}>
          <Link href="/creer" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#080808", textDecoration: "none", fontSize: 14, fontWeight: 800, padding: "13px 28px", borderRadius: 11, boxShadow: "0 6px 22px rgba(201,168,76,0.3)" }}>
            Composer ma page — sans compte <span style={{ fontSize: 16 }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
