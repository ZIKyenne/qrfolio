"use client"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { PLANS as PLANS_DEF } from "@/lib/plans"

// ── Tokens ───────────────────────────────────────────────────────────────────
import { creerUrl, creerUrlSecteur } from "../creer/entry"

const G   = "#C9A84C"
const INK = "#F5F0E8"
const MUT = "rgba(138,132,120,0.82)"
const BG  = "#080808"

// ── Données exemples ──────────────────────────────────────────────────────────
// Identifiants de plans.ts : le libellé affiché est PLANS_DEF[id].label, jamais un texte à part.
type Plan = "free" | "pro" | "business"
type Category = "Restaurant" | "Freelance" | "Coach" | "Artiste" | "Immobilier" | "Commerce"

interface Example {
  id: string
  name: string
  category: Category
  plan: Plan
  blocks: number
  accent: string
  icon: string
  tagline: string
  tags: string[]
  preview: { label: string; icon: string; color: string }[]
}

const EXAMPLES: Example[] = [
  {
    id: "brasserie-le-moulin",
    name: "Brasserie Le Moulin",
    category: "Restaurant",
    plan: "free",
    blocks: 6,
    accent: "#F97316",
    icon: "🍽️",
    tagline: "Menu, réservation & avis",
    tags: ["Menu", "Réservation", "Google Avis", "Horaires"],
    preview: [
      { label:"Menu du jour", icon:"📋", color:"rgba(249,115,22,0.25)" },
      { label:"Réserver une table", icon:"📅", color:"rgba(249,115,22,0.15)" },
      { label:"Voir les avis", icon:"⭐", color:"rgba(249,115,22,0.1)" },
      { label:"Horaires & accès", icon:"🕐", color:"rgba(249,115,22,0.08)" },
    ],
  },
  {
    id: "thomas-dupont-dev",
    name: "Thomas Dupont · Dev",
    category: "Freelance",
    plan: "pro",
    blocks: 7,
    accent: "var(--action)",
    icon: "💼",
    tagline: "Portfolio, services & contact",
    tags: ["Portfolio", "Services", "Tarifs", "WhatsApp"],
    preview: [
      { label:"Mes projets récents", icon:"🖼️", color:"rgba(56,189,248,0.25)" },
      { label:"Services & tarifs", icon:"💰", color:"rgba(56,189,248,0.15)" },
      { label:"Me contacter", icon:"💬", color:"rgba(56,189,248,0.1)" },
      { label:"Prendre RDV", icon:"📅", color:"rgba(56,189,248,0.08)" },
    ],
  },
  {
    id: "coach-sarah-martin",
    name: "Sarah Martin · Coach",
    category: "Coach",
    plan: "pro",
    blocks: 8,
    accent: "var(--success)",
    icon: "🧘",
    tagline: "Bien-être & accompagnement",
    tags: ["RDV", "Programme", "Témoignages", "Newsletter"],
    preview: [
      { label:"Mon programme", icon:"🌿", color:"rgba(57,255,143,0.2)" },
      { label:"Réserver une séance", icon:"📅", color:"rgba(57,255,143,0.14)" },
      { label:"Témoignages", icon:"💬", color:"rgba(57,255,143,0.09)" },
      { label:"S'inscrire newsletter", icon:"📩", color:"rgba(57,255,143,0.06)" },
    ],
  },
  {
    id: "lucas-beats-artist",
    name: "Lucas Beats · Artiste",
    category: "Artiste",
    plan: "pro",
    blocks: 7,
    accent: "#A78BFA",
    icon: "🎵",
    tagline: "Musique, médias & partenariats",
    tags: ["Spotify", "YouTube", "Instagram", "Booking"],
    preview: [
      { label:"Écouter sur Spotify", icon:"🎵", color:"rgba(167,139,250,0.25)" },
      { label:"Ma chaîne YouTube", icon:"▶️", color:"rgba(167,139,250,0.15)" },
      { label:"Booking & partenariats", icon:"🤝", color:"rgba(167,139,250,0.1)" },
      { label:"Mon Instagram", icon:"📸", color:"rgba(167,139,250,0.07)" },
    ],
  },
  {
    id: "immo-paris-prestige",
    name: "Paris Prestige Immo",
    category: "Immobilier",
    plan: "business",
    blocks: 6,
    accent: "#C9A84C",
    icon: "🏠",
    tagline: "Biens, visites & contact agent",
    tags: ["Catalogue", "Visites", "Brochure PDF", "Contact"],
    preview: [
      { label:"Nos biens disponibles", icon:"🏡", color:"rgba(201,168,76,0.25)" },
      { label:"Demander une visite", icon:"🗓️", color:"rgba(201,168,76,0.15)" },
      { label:"Brochure PDF", icon:"📄", color:"rgba(201,168,76,0.1)" },
      { label:"Contacter l'agent", icon:"📞", color:"rgba(201,168,76,0.07)" },
    ],
  },
  {
    id: "boutique-leonie",
    name: "Boutique Léonie",
    category: "Commerce",
    plan: "pro",
    blocks: 8,
    accent: "#F43F5E",
    icon: "🛍️",
    tagline: "Promos, catalogue & horaires",
    tags: ["Catalogue", "Promotions", "Horaires", "WhatsApp"],
    preview: [
      { label:"Nos promotions", icon:"🏷️", color:"rgba(244,63,94,0.25)" },
      { label:"Catalogue produits", icon:"📦", color:"rgba(244,63,94,0.15)" },
      { label:"Horaires d'ouverture", icon:"🕐", color:"rgba(244,63,94,0.1)" },
      { label:"Contacter la boutique", icon:"💬", color:"rgba(244,63,94,0.07)" },
    ],
  },
]

const CATEGORIES: (Category | "Tous")[] = ["Tous","Restaurant","Freelance","Coach","Artiste","Immobilier","Commerce"]
const PLANS: (Plan | "Tous")[] = ["Tous","free","pro","business"]
const PLAN_COLOR: Record<Plan,string> = { free:"var(--success)", pro:"#C9A84C", business:"#A78BFA" }

// ── Mini QR SVG ───────────────────────────────────────────────────────────────
function MiniQR({ accent }: { accent: string }) {
  const cells = [
    1,1,1,0,1,1,1,
    1,0,1,0,1,0,1,
    1,0,1,0,1,0,1,
    0,0,0,0,0,0,0,
    1,1,1,0,1,0,1,
    1,0,0,0,0,0,1,
    1,1,1,0,1,1,1,
  ]
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="6" fill="rgba(8,8,8,0.9)"/>
      {cells.map((c, i) => {
        if (!c) return null
        const col = i % 7
        const row = Math.floor(i / 7)
        const isGold = (row < 3 && col < 3) || (row > 3 && col > 3)
        return (
          <rect key={i}
            x={3 + col * 5} y={3 + row * 5}
            width={4} height={4} rx={0.8}
            fill={isGold ? accent : INK}
            opacity={isGold ? 1 : 0.85}
          />
        )
      })}
    </svg>
  )
}

// ── Aperçu mobile ─────────────────────────────────────────────────────────────
function MobilePreview({ example }: { example: Example }) {
  return (
    <div style={{
      width: 120, flexShrink: 0,
      border: "2px solid rgba(255,255,255,0.12)",
      borderRadius: 18, padding: "10px 7px",
      background: "rgba(12,10,8,0.95)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      position: "relative",
    }}>
      {/* Notch */}
      <div style={{ width: 28, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 8px" }}/>
      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${example.accent}, ${example.accent}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{example.icon}</div>
        <div style={{ height: 5, width: "75%", borderRadius: 3, background: "rgba(245,240,232,0.25)" }}/>
        <div style={{ height: 3, width: "55%", borderRadius: 3, background: "rgba(245,240,232,0.12)" }}/>
      </div>
      {/* Blocs */}
      {example.preview.slice(0, 3).map((p, i) => (
        <div key={i} style={{ padding: "5px 6px", borderRadius: 5, background: p.color, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9 }}>{p.icon}</span>
          <div style={{ height: 4, flex: 1, borderRadius: 2, background: "rgba(245,240,232,0.3)" }}/>
        </div>
      ))}
    </div>
  )
}

// ── Aperçu desktop ────────────────────────────────────────────────────────────
function DesktopPreview({ example }: { example: Example }) {
  return (
    <div style={{
      flex: 1,
      border: "1.5px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden",
      background: "rgba(14,12,10,0.95)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      {/* Barre top */}
      <div style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "5px 8px", display: "flex", alignItems: "center", gap: 5 }}>
        {["var(--danger)","#F97316","var(--success)"].map((c,i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, opacity: 0.6 }}/>)}
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, margin: "0 8px" }}/>
      </div>
      {/* Contenu */}
      <div style={{ padding: "10px 10px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <div style={{ width: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${example.accent}, ${example.accent}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{example.icon}</div>
          <div style={{ height: 3, width: "90%", borderRadius: 2, background: "rgba(245,240,232,0.2)" }}/>
          <div style={{ height: 3, width: "70%", borderRadius: 2, background: "rgba(245,240,232,0.12)" }}/>
        </div>
        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          {example.preview.map((p, i) => (
            <div key={i} style={{ padding: "4px 7px", borderRadius: 5, background: p.color, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9 }}>{p.icon}</span>
              <div style={{ height: 3, flex: 1, borderRadius: 2, background: "rgba(245,240,232,0.3)" }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Carte exemple ─────────────────────────────────────────────────────────────
function ExampleCard({ example }: { example: Example }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? example.accent + "35" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 20, overflow: "hidden",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s var(--mo-ease-spring)",
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${example.accent}18` : "none",
        cursor: "default",
        position: "relative",
      }}
    >
      {/* Accent top */}
      <div style={{
        height: 2, background: hovered
          ? `linear-gradient(90deg, transparent, ${example.accent}, transparent)`
          : "transparent",
        transition: "background 0.3s",
      }}/>

      {/* Aperçus */}
      <div style={{ padding: "20px 20px 16px", background: "rgba(0,0,0,0.2)", display: "flex", gap: 12, alignItems: "flex-end", minHeight: 140 }}>
        <MobilePreview example={example} />
        <DesktopPreview example={example} />
      </div>

      {/* Infos */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div>
            <h2 style={{ color: INK, fontSize: 15, fontWeight: 700, margin: "0 0 3px", lineHeight: 1.3 }}>{example.name}</h2>
            <p style={{ color: MUT, fontSize: 12, margin: 0 }}>{example.tagline}</p>
          </div>
          <MiniQR accent={example.accent} />
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {example.tags.map(t => (
            <span key={t} style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 20,
              background: `${example.accent}10`,
              border: `1px solid ${example.accent}25`,
              color: example.accent, fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4,
              background: `${PLAN_COLOR[example.plan]}14`,
              border: `1px solid ${PLAN_COLOR[example.plan]}30`,
              color: PLAN_COLOR[example.plan], letterSpacing: 1,
            }}>{PLANS_DEF[example.plan].label.toUpperCase()}</span>
          </div>
          <Link href={creerUrlSecteur(example.category)} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            color: hovered ? example.accent : G,
            textDecoration: "none", fontSize: 12, fontWeight: 600,
            transition: "color 0.2s",
          }}>
            Utiliser ce modèle →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ExamplesPage() {
  const [filterCat, setFilterCat] = useState<Category | "Tous">("Tous")
  const [filterPlan, setFilterPlan] = useState<Plan | "Tous">("Tous")

  const filtered = EXAMPLES.filter(e =>
    (filterCat === "Tous" || e.category === filterCat) &&
    (filterPlan === "Tous" || e.plan === filterPlan)
  )

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; }
        body { background:${BG}; }
        .ex-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .filter-btn { display:inline-flex; align-items:center; min-height:44px; background:none; border:1px solid; border-radius:100px; padding:0 18px; cursor:pointer; font-size:13px; font-weight:500; font-family:inherit; transition:all 0.2s; white-space:nowrap; }
        .filter-btn:focus-visible { outline:2px solid rgba(201,168,76,0.5); outline-offset:3px; }
        @media(max-width:1000px){ .ex-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(max-width:640px){ .ex-grid{ grid-template-columns:1fr!important; } .ex-hero{ padding:120px 24px 60px!important; } .ex-main{ padding:0 24px 80px!important; } .filters-row{ flex-direction:column!important; gap:12px!important; } }
        .au1{ animation:mo-fade-up 0.5s ease 0.1s both; }
        .au2{ animation:mo-fade-up 0.5s ease 0.25s both; }
        .au3{ animation:mo-fade-up 0.5s ease 0.4s both; }
        @media(prefers-reduced-motion:reduce){ *{ animation:none!important; } }
      `}</style>

      {/* NAV */}
      <nav className="nav-page" style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:"rgba(8,8,8,0.93)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(201,168,76,0.12)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px" }}>
        <Link href="/" style={{ textDecoration:"none" }}>
          <span style={{ fontFamily:"Fraunces,serif",fontSize:20,color:G,fontWeight:700 }}>QRowg</span>
        </Link>
        <div style={{ display:"flex",alignItems:"center",gap:20 }}>
          <Link href="/" style={{ color:MUT,textDecoration:"none",fontSize:13,display:"flex",alignItems:"center",gap:6,transition:"color 0.2s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=INK}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=MUT}}>
            ← Retour
          </Link>
          <Link href={creerUrl()} style={{ background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:BG,textDecoration:"none",fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:9,boxShadow:"0 2px 14px rgba(201,168,76,0.3)" }}>
            Composer ma page
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding:"130px 48px 70px",textAlign:"center" }} className="ex-hero">
        <div style={{ maxWidth:680,margin:"0 auto" }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.22)",borderRadius:100,padding:"5px 16px",marginBottom:20,color:G,fontSize:11,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase" }} className="au1">
            <span style={{ fontSize:9 }}>✦</span> Galerie d'exemples
          </div>
          <h1 style={{ fontFamily:"Fraunces,serif",fontSize:"clamp(30px,4vw,58px)",color:INK,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",margin:"0 0 20px" }} className="au2">
            Ce que tu peux créer<br/><span style={{color:G}}>avec QRowg.</span>
          </h1>
          <p style={{ color:MUT,fontSize:17,lineHeight:1.7,margin:"0 0 16px" }} className="au3">
            Restaurants, freelances, artistes, agents immobiliers — des pages professionnelles créées en moins de 5 minutes.
          </p>
          <p style={{ color:`${G}90`,fontSize:13,margin:0 }} className="au3">
            {EXAMPLES.length} exemples · {EXAMPLES.filter(e => e.plan === "free").length} accessibles en {PLANS_DEF.free.label}, les autres dès {PLANS_DEF.pro.label}
          </p>
        </div>
      </section>

      {/* FILTRES + GRILLE */}
      <section style={{ padding:"0 48px 100px" }} className="ex-main">
        <div style={{ maxWidth:1100,margin:"0 auto" }}>

          {/* Filtres */}
          <div style={{ display:"flex",gap:24,marginBottom:40,flexWrap:"wrap" }} className="filters-row">
            {/* Catégories */}
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
              <span style={{ color:MUT,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginRight:4 }}>Métier</span>
              {CATEGORIES.map(cat => {
                const isActive = filterCat === cat
                return (
                  <button key={cat} onClick={()=>setFilterCat(cat as typeof filterCat)}
                    className="filter-btn"
                    style={{
                      color: isActive ? BG : MUT,
                      borderColor: isActive ? G : "rgba(255,255,255,0.12)",
                      background: isActive ? G : "transparent",
                    }}>
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Plans */}
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
              <span style={{ color:MUT,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginRight:4 }}>Plan</span>
              {PLANS.map(plan => {
                const isActive = filterPlan === plan
                const c = plan === "Tous" ? G : PLAN_COLOR[plan as Plan]
                return (
                  <button key={plan} onClick={()=>setFilterPlan(plan as typeof filterPlan)}
                    className="filter-btn"
                    style={{
                      color: isActive ? BG : MUT,
                      borderColor: isActive ? c : "rgba(255,255,255,0.12)",
                      background: isActive ? c : "transparent",
                    }}>
                    {plan === "Tous" ? "Tous" : PLANS_DEF[plan].label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Compteur résultats */}
          <div style={{ marginBottom:24,display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ color:MUT,fontSize:13 }}>
              {filtered.length} exemple{filtered.length > 1 ? "s" : ""} {filterCat !== "Tous" || filterPlan !== "Tous" ? "trouvé" + (filtered.length > 1 ? "s" : "") : ""}
            </span>
            {(filterCat !== "Tous" || filterPlan !== "Tous") && (
              <button onClick={()=>{setFilterCat("Tous");setFilterPlan("Tous")}} style={{
                background:"none",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:20,padding:"3px 10px",color:MUT,fontSize:11,
                cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
              }}
                onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor="rgba(201,168,76,0.3)";el.style.color=INK}}
                onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor="rgba(255,255,255,0.1)";el.style.color=MUT}}>
                Réinitialiser
              </button>
            )}
          </div>

          {/* Grille */}
          {filtered.length > 0 ? (
            <div className="ex-grid">
              {filtered.map(ex => <ExampleCard key={ex.id} example={ex} />)}
            </div>
          ) : (
            <div style={{ textAlign:"center",padding:"80px 0",color:MUT }}>
              <p style={{ fontSize:40,marginBottom:16 }}>🔍</p>
              <p style={{ fontSize:16,marginBottom:8,color:INK }}>Aucun exemple trouvé</p>
              <p style={{ fontSize:14 }}>Essayez un autre filtre.</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION "5 minutes" */}
      <section style={{ padding:"80px 48px",borderTop:"1px solid rgba(255,255,255,0.06)",position:"relative",zIndex:1 }}>
        <div style={{ maxWidth:1100,margin:"0 auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"center" }} className="minutes-grid">
            <style>{`@media(max-width:800px){.minutes-grid{grid-template-columns:1fr!important;gap:40px!important;text-align:center!important;} .minutes-steps{align-items:center!important;} .minutes-grid .step-item{text-align:left;}}`}</style>
            <div>
              <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:"rgba(57,255,143,0.08)",border:"1px solid rgba(57,255,143,0.2)",borderRadius:100,padding:"5px 14px",marginBottom:20,color:"var(--success)",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase" }}>
                ⚡ 5 minutes chrono
              </div>
              <h2 style={{ fontFamily:"Fraunces,serif",fontSize:"clamp(26px,3.5vw,44px)",color:INK,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",margin:"0 0 18px" }}>
                Créé en moins de<br/><span style={{color:G}}>5 minutes.</span>
              </h2>
              <p style={{ color:MUT,fontSize:16,lineHeight:1.7,margin:"0 0 36px" }}>
                Choisir un template, ajouter son contenu, publier — et recevoir son QR code. C'est tout.
              </p>
              <Link href={creerUrl()} style={{
                display:"inline-flex",alignItems:"center",gap:8,
                background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                color:BG,textDecoration:"none",fontSize:14,fontWeight:700,
                padding:"13px 28px",borderRadius:11,
                boxShadow:"0 4px 20px rgba(201,168,76,0.35)",
                transition:"transform 0.2s,box-shadow 0.2s",
              }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-2px) scale(1.03)";el.style.boxShadow="0 6px 28px rgba(201,168,76,0.5)"}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 4px 20px rgba(201,168,76,0.35)"}}>
                Créer mon QRowg gratuit →
              </Link>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }} className="minutes-steps">
              {[
                { n:"01", icon:"🎨", title:"Choisissez un modèle", desc:"Restaurant, freelance, artiste — adapté à votre secteur." },
                { n:"02", icon:"✏️",  title:"Personnalisez votre page",  desc:"Ajoutez votre contenu, vos liens, vos couleurs. Sans coder." },
                { n:"03", icon:"📱", title:"Publiez et partagez",     desc:"Votre QR code est généré. Prêt à imprimer et partager." },
              ].map(step => (
                <div key={step.n} style={{ display:"flex",gap:16,alignItems:"flex-start" }} className="step-item">
                  <div style={{ width:44,height:44,borderRadius:12,background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{step.icon}</div>
                  <div>
                    <p style={{ color:G,fontSize:9,fontWeight:800,letterSpacing:2,textTransform:"uppercase",margin:"0 0 4px" }}>{step.n}</p>
                    <p style={{ color:INK,fontSize:14,fontWeight:700,margin:"0 0 3px" }}>{step.title}</p>
                    <p style={{ color:MUT,fontSize:13,margin:0,lineHeight:1.5 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
