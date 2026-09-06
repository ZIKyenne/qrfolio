"use client"
import Link from "next/link"
import { useState } from "react"
import { PLANS } from "@/lib/plans"

// ── Design tokens ────────────────────────────────────────────────────────────
import { creerUrl, creerUrlSecteur } from "../creer/entry"

const G   = "#C9A84C"
const INK = "#F5F0E8"
const MUT = "rgba(138,132,120,0.82)"
const BG  = "#080808"
const BOR = "rgba(201,168,76,0.18)"

// ── Sous-composants ──────────────────────────────────────────────────────────

function Chip({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: "rgba(201,168,76,0.08)",
      border: "1px solid rgba(201,168,76,0.22)",
      borderRadius: 100, padding: "5px 14px",
      color: G, fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
      textTransform: "uppercase",
    }}>{label}</span>
  )
}

function Check({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: "var(--success)", fontWeight: 800,
      }}>✓</span>
      <span style={{ color: MUT, fontSize: 14, lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function SectionHeader({ chip, title, sub }: { chip: string; title: React.ReactNode; sub: string }) {
  return (
    <div style={{ maxWidth: 600, marginBottom: 56 }}>
      <div style={{ marginBottom: 16 }}><Chip label={chip} /></div>
      <h2 style={{
        fontFamily: "Fraunces, serif",
        fontSize: "clamp(26px, 3.5vw, 44px)",
        color: INK, fontWeight: 700,
        lineHeight: 1.1, letterSpacing: "-0.02em",
        margin: "0 0 16px",
      }}>{title}</h2>
      <p style={{ color: MUT, fontSize: 16, lineHeight: 1.7, margin: 0 }}>{sub}</p>
    </div>
  )
}

function CtaInline({ label = "Essayer gratuitement" }: { label?: string }) {
  return (
    <Link href={creerUrl()} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: "linear-gradient(90deg, #C9A84C, #b8953f)",
      color: BG, textDecoration: "none",
      fontSize: 14, fontWeight: 700,
      minHeight: 44, padding: "0 26px", borderRadius: 11,
      boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
      transition: "transform 0.2s var(--mo-ease-spring), box-shadow 0.2s",
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = "translateY(-2px) scale(1.03)"
        el.style.boxShadow = "0 6px 28px rgba(201,168,76,0.45)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = "none"
        el.style.boxShadow = "0 4px 20px rgba(201,168,76,0.3)"
      }}>
      {label} →
    </Link>
  )
}

// ── Mockups SVG ───────────────────────────────────────────────────────────────

function BuilderMockupSvg() {
  const BLOCKS = [
    { icon: "👤", label: "Profil", c: "#C9A84C" },
    { icon: "🔗", label: "Liens", c: "var(--action)" },
    { icon: "📸", label: "Galerie", c: "#A78BFA" },
    { icon: "💬", label: "WhatsApp", c: "var(--success)" },
  ]
  return (
    <div style={{
      background: "linear-gradient(145deg, #0e0c08, #111009)",
      border: "1px solid " + BOR,
      borderRadius: 20, padding: 20, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    }}>
      {/* Barre titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        {["var(--danger)", "#F97316", "var(--success)"].map((c, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.65 }} />
        ))}
        <span style={{ color: "rgba(201,168,76,0.4)", fontSize: 9, letterSpacing: 1.5, marginLeft: 8 }}>BUILDER — QRowg</span>
        <div style={{
          marginLeft: "auto", padding: "3px 10px", borderRadius: 5,
          background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)",
          fontSize: 9, color: G, fontWeight: 700,
        }}>PUBLIER</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px", gap: 10 }}>
        {/* Blocs */}
        <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ color: "rgba(201,168,76,0.5)", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Blocs</p>
          {BLOCKS.map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12 }}>{b.icon}</span>
              <span style={{ color: "rgba(245,240,232,0.65)", fontSize: 9 }}>{b.label}</span>
              <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: b.c }} />
            </div>
          ))}
        </div>
        {/* Canvas */}
        <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 10px", background: "rgba(201,168,76,0.04)", border: "1px dashed rgba(201,168,76,0.18)", borderRadius: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#b8953f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
            <div style={{ height: 6, width: "65%", borderRadius: 3, background: "rgba(245,240,232,0.2)" }} />
            <div style={{ height: 4, width: "45%", borderRadius: 3, background: "rgba(245,240,232,0.1)" }} />
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12 }}>💬</span>
            <div style={{ height: 5, width: "55%", borderRadius: 3, background: "rgba(201,168,76,0.6)" }} />
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", display: "flex", gap: 5 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 22, borderRadius: 5, background: "rgba(167,139,250,0.2)" }} />)}
          </div>
        </div>
        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <p style={{ color: "rgba(201,168,76,0.45)", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" }}>Aperçu</p>
          <div style={{ width: 60, border: "2px solid rgba(201,168,76,0.25)", borderRadius: 14, padding: "8px 5px", background: "rgba(8,8,8,0.8)" }}>
            <div style={{ width: 18, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 6px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#b8953f)" }} />
              {[[80, "#C9A84C", 0.4], [60, "#fff", 0.1], [90, "var(--action)", 0.2], [70, "#fff", 0.08]].map(([w, c, o], i) => (
                <div key={i} style={{ height: i === 2 ? 18 : 5, width: w + "%", borderRadius: 4, background: c as string, opacity: o as number }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 12, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--success)" }} />
            <span style={{ color: "var(--success)", fontSize: 7, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsMockupSvg() {
  const bars = [38, 52, 41, 67, 84, 121, 93]
  const maxV = 121
  const days = ["L","M","M","J","V","S","D"]
  return (
    <div style={{ background: "linear-gradient(145deg, #0e0c08, #111009)", border: "1px solid " + BOR, borderRadius: 20, padding: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        {["var(--danger)","#F97316","var(--success)"].map((c,i) => <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:c,opacity:0.65 }}/>)}
        <span style={{ color:"rgba(201,168,76,0.4)",fontSize:9,letterSpacing:1.5,marginLeft:8 }}>ANALYTICS — QRowg</span>
      </div>
      {/* KPI */}
      <div className="rcols-4" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
        {[["📱","847","Scans","var(--success)"],["👁","2 341","Vues","var(--action)"],["🎯","36%","Clic","#C9A84C"],["✅","5","QR actifs","#A78BFA"]].map(([icon,val,lbl,c])=>(
          <div key={lbl as string} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,padding:"8px 10px" }}>
            <span style={{fontSize:13}}>{icon}</span>
            <p style={{color:c as string,fontSize:15,fontWeight:800,margin:"3px 0 2px",lineHeight:1}}>{val}</p>
            <p style={{color:"rgba(138,132,120,0.6)",fontSize:8,margin:0}}>{lbl}</p>
          </div>
        ))}
      </div>
      {/* Chart */}
      <div style={{ background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 12px" }}>
        <p style={{color:INK,fontSize:10,fontWeight:600,margin:"0 0 10px"}}>Scans · 7 jours</p>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:60}}>
          {bars.map((v,i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,height:"100%"}}>
              <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                <div style={{width:"100%",height:Math.round((v/maxV)*52)+"px",borderRadius:"3px 3px 0 0",background:"linear-gradient(to top,#C9A84C,#d4a843)"}}/>
              </div>
              <span style={{color:"rgba(138,132,120,0.5)",fontSize:8}}>{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QRMockupSvg() {
  const STYLES = [
    { fg:"#1a1a1a", bg:"#ffffff", acc:"#C9A84C", name:"Classic" },
    { fg:"#C9A84C", bg:"#111009", acc:"#F5F0E8", name:"Gold" },
    { fg:"var(--success)", bg:"#050505", acc:"#A78BFA", name:"Neon" },
  ]
  const [active, setActive] = useState(0)
  const s = STYLES[active]
  const cells = [1,1,1,1,1,1,1,0,1,0,0,1,0,1,1,1,1,1,1,1,1,
                 1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1,
                 1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,1,1,0,1,
                 1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,1,0,1,
                 1,0,1,1,1,0,1,0,1,0,0,0,1,0,1,0,1,1,1,0,1,
                 1,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,1,
                 1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1]
  const goldIdx = new Set([10,11,24,25,31,32])
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20,alignItems:"center" }}>
      {/* QR card */}
      <div style={{ width:200,height:200,background:s.bg,border:"2px solid rgba(201,168,76,0.35)",borderRadius:18,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 0 60px rgba(201,168,76,0.15)",transition:"all 0.4s ease" }}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(21,1fr)",gap:1.5,padding:6}}>
          {cells.map((c,i) => c === 0 ? <div key={i}/> : (
            <div key={i} style={{ aspectRatio:"1",borderRadius:1.5,background:goldIdx.has(Math.floor(i/21)*7+(i%7)) ? s.acc : s.fg,transition:"background 0.4s" }}/>
          ))}
        </div>
        <p style={{color:s.acc,fontSize:8,letterSpacing:2.5,fontWeight:700}}>QROWG.COM</p>
      </div>
      {/* Sélecteur de style */}
      <div style={{display:"flex",gap:8}}>
        {STYLES.map((st,i) => (
          <button key={st.name} onClick={()=>setActive(i)} style={{
            display:"inline-flex",alignItems:"center",minHeight:44,padding:"0 16px",borderRadius:22,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",
            background:active===i?"rgba(201,168,76,0.1)":"transparent",
            borderColor:active===i?"rgba(201,168,76,0.5)":"rgba(255,255,255,0.12)",
            color:active===i?G:"rgba(245,240,232,0.5)",transition:"all 0.2s",
          }}>{st.name}</button>
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function FeaturesPage() {
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; }
        body { background:${BG}; }
        a { cursor:pointer; }
        .feat-2col { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
        .feat-2col.rev { }
        @media(max-width:900px){ .feat-2col{ grid-template-columns:1fr !important; gap:40px !important; } }
        @media(max-width:640px){ .feat-sec{ padding:72px 24px !important; } .feat-hero{ padding:120px 24px 80px !important; } }
        .au1{animation:mo-fade-up 0.6s ease 0.1s both}
        .au2{animation:mo-fade-up 0.6s ease 0.25s both}
        .au3{animation:mo-fade-up 0.6s ease 0.4s both}
        .au4{animation:mo-fade-up 0.6s ease 0.55s both}
      `}</style>

      {/* NAV */}
      <nav className="nav-page" style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,
        background:"rgba(8,8,8,0.92)",backdropFilter:"blur(24px)",
        borderBottom:"1px solid rgba(201,168,76,0.12)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 48px",
      }}>
        <Link href="/" style={{textDecoration:"none"}}>
          <span style={{fontFamily:"Fraunces,serif",fontSize:20,color:G,fontWeight:700}}>QRowg</span>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <Link href="/#pricing" style={{color:MUT,textDecoration:"none",fontSize:13,transition:"color 0.2s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=INK}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=MUT}}>Tarifs</Link>
          <Link href="/auth/login" style={{color:MUT,textDecoration:"none",fontSize:13,transition:"color 0.2s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=INK}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=MUT}}>Connexion</Link>
          <Link href={creerUrl()} style={{
            background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:BG,
            textDecoration:"none",fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:9,
            boxShadow:"0 2px 14px rgba(201,168,76,0.3)",transition:"transform 0.2s,box-shadow 0.2s",
          }}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-1px) scale(1.02)";el.style.boxShadow="0 4px 20px rgba(201,168,76,0.45)"}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 2px 14px rgba(201,168,76,0.3)"}}>
            Composer ma page
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding:"140px 48px 100px",textAlign:"center",position:"relative",zIndex:1 }} className="feat-hero">
        <div style={{maxWidth:780,margin:"0 auto"}}>
          <div style={{marginBottom:20}} className="au1"><Chip label="Fonctionnalités" /></div>
          <h1 style={{
            fontFamily:"Fraunces, serif",
            fontSize:"clamp(32px,4.5vw,64px)",
            color:INK,fontWeight:700,lineHeight:1.08,
            letterSpacing:"-0.02em",margin:"0 0 24px",
          }} className="au2">
            Tout ce dont tu as besoin pour transformer<br/>
            un QR code en <span style={{color:G}}>outil business.</span>
          </h1>
          <p style={{color:MUT,fontSize:18,lineHeight:1.7,maxWidth:560,margin:"0 auto 44px"}} className="au3">
            Crée une page mobile, génère un QR dynamique et mesure chaque interaction.
          </p>
          <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}} className="au4">
            <CtaInline label="Créer gratuitement" />
            <Link href="/#pricing" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              color:MUT,textDecoration:"none",fontSize:14,fontWeight:500,
              padding:"11px 22px",borderRadius:11,
              border:"1px solid rgba(255,255,255,0.1)",transition:"all 0.2s",
            }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.color=INK;el.style.borderColor="rgba(201,168,76,0.3)"}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.color=MUT;el.style.borderColor="rgba(255,255,255,0.1)"}}>
              Voir les tarifs
            </Link>
          </div>
        </div>

        {/* Badges features rapides */}
        <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginTop:56,maxWidth:700,margin:"56px auto 0"}}>
          {["Builder drag & drop","QR codes dynamiques","Analytics en temps réel","Templates métiers","Domaine personnalisé","Sans coder"].map(f => (
            <span key={f} style={{
              display:"inline-flex",alignItems:"center",gap:6,
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:100,padding:"6px 14px",
              color:"rgba(245,240,232,0.6)",fontSize:12.5,
            }}>
              <span style={{color:G,fontSize:10}}>✦</span>{f}
            </span>
          ))}
        </div>
      </section>

      {/* ── 1. BUILDER ───────────────────────────────────────────────────────── */}
      <section style={{padding:"100px 48px",position:"relative",zIndex:2}} className="feat-sec">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="feat-2col">
            <div>
              <SectionHeader
                chip="Builder visuel"
                title={<>Crée ta page en <span style={{color:G}}>5 minutes.</span></>}
                sub="Drag & drop, blocs prêts à l'emploi, aperçu mobile en temps réel. Sans coder, sans designer."
              />
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Check text="Interface drag & drop — réorganise tes blocs en glissant" />
                <Check text="Blocs prêts à l'emploi : profil, liens, galerie, WhatsApp, paiement" />
                <Check text="Aperçu mobile instantané pendant que tu édites" />
                <Check text="Personnalisation couleurs, polices et styles en un clic" />
                <Check text="Publication en un clic — ta page est live immédiatement" />
              </div>
              <div style={{marginTop:32}}><CtaInline label="Ouvrir le builder" /></div>
            </div>
            <BuilderMockupSvg />
          </div>
        </div>
      </section>

      {/* ── 2. QR DYNAMIQUE ──────────────────────────────────────────────────── */}
      <section style={{padding:"100px 48px",position:"relative",zIndex:2,background:"rgba(255,255,255,0.012)"}} className="feat-sec">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="feat-2col" style={{direction:"rtl" as const}}>
            <div style={{direction:"ltr" as const}}>
              <SectionHeader
                chip="QR Dynamique"
                title={<>Modifie ta destination sans <span style={{color:G}}>réimprimer.</span></>}
                sub="Le QR code imprimé reste identique. Toi tu changes le contenu quand tu veux."
              />
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Check text="Destination modifiable à tout moment depuis ton dashboard" />
                <Check text="Zéro réimpression — le QR continue de fonctionner" />
                <Check text="Couleurs, forme des points et des coins, logo au centre" />
                <Check text={`Export PNG HD ; SVG et PDF pour l'impression dès ${PLANS.pro.label}`} />
                <Check text="Logo intégré dans le QR code avec ton image" />
              </div>
              <div style={{marginTop:32}}><CtaInline label="Créer mon QR code" /></div>
            </div>
            <div style={{direction:"ltr" as const}}>
              <QRMockupSvg />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. ANALYTICS ─────────────────────────────────────────────────────── */}
      <section style={{padding:"100px 48px",position:"relative",zIndex:2}} className="feat-sec">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="feat-2col">
            <div>
              <SectionHeader
                chip="Analytics"
                title={<>Comprends ce qui se passe <span style={{color:G}}>après chaque scan.</span></>}
                sub={`Vues, scans, sources et pages les plus performantes — en temps réel. Statistiques de base incluses, détail par appareil dès ${PLANS.pro.label}.`}
              />
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Check text="Suivi des scans et vues par jour, semaine, mois" />
                <Check text={`Détail par appareil (mobile, tablette, ordinateur) — dès ${PLANS.pro.label}`} />
                <Check text="Sources de trafic : direct QR, réseaux, email" />
                <Check text="Top pages les plus visitées" />
                <Check text="Inclus nativement — sans plugin, sans configuration" />
              </div>
              <div style={{marginTop:32}}><CtaInline label="Voir mes analytics" /></div>
            </div>
            <AnalyticsMockupSvg />
          </div>
        </div>
      </section>

      {/* ── 4. TEMPLATES ─────────────────────────────────────────────────────── */}
      <section style={{padding:"100px 48px",position:"relative",zIndex:2,background:"rgba(255,255,255,0.012)"}} className="feat-sec">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{marginBottom:16}}><Chip label="Templates" /></div>
            <h2 style={{fontFamily:"Fraunces,serif",fontSize:"clamp(26px,3.5vw,44px)",color:INK,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",margin:"0 auto 16px",maxWidth:560}}>
              Démarre avec un template <span style={{color:G}}>fait pour ton métier.</span>
            </h2>
            <p style={{color:MUT,fontSize:16,lineHeight:1.7,margin:"0 auto",maxWidth:480}}>
              Restaurant, freelance, artiste, immobilier, événement, commerce — une page structurée prête en 1 clic.
            </p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:860,margin:"0 auto"}} className="tpl-grid">
            <style>{`@media(max-width:700px){.tpl-grid{grid-template-columns:1fr !important;}}`}</style>
            {[
              { icon:"🍽️", name:"Restaurant & Bar",    color:"#F97316", blocks:7, secteur:"Restaurant" },
              { icon:"💼", name:"Freelance Pro",         color:"var(--action)", blocks:6, secteur:"Freelance" },
              { icon:"🎵", name:"Artiste & Musicien",    color:"#A78BFA", blocks:7, secteur:"Musicien" },
              { icon:"🏠", name:"Agent Immobilier",      color:"#C9A84C", blocks:6, secteur:"Immobilier" },
              { icon:"🎪", name:"Événement",             color:"var(--success)", blocks:6, secteur:"Evenement" },
              { icon:"🛍️",  name:"Commerce local",       color:"#F43F5E", blocks:8, secteur:"Ecommerce" },
            ].map(t => (
              <Link key={t.name} href={creerUrlSecteur(t.secteur)} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"16px 18px",borderRadius:14,textDecoration:"none",
                background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(255,255,255,0.07)",
                transition:"all 0.2s ease",
              }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background=t.color+"0d";el.style.borderColor=t.color+"40"}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(255,255,255,0.02)";el.style.borderColor="rgba(255,255,255,0.07)"}}>
                <span style={{fontSize:22}}>{t.icon}</span>
                <div>
                  <p style={{color:INK,fontSize:13,fontWeight:600,margin:"0 0 2px"}}>{t.name}</p>
                  <p style={{color:MUT,fontSize:11,margin:0}}>{t.blocks} blocs inclus</p>
                </div>
                <span style={{marginLeft:"auto",color:t.color,fontSize:12,fontWeight:700}}>→</span>
              </Link>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:40}}>
            <CtaInline label="Choisir un template" />
          </div>
        </div>
      </section>

      {/* ── 5-6-7. AUTRES FEATURES ───────────────────────────────────────────── */}
      <section style={{padding:"100px 48px",position:"relative",zIndex:2}} className="feat-sec">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{marginBottom:16}}><Chip label="Et aussi" /></div>
            <h2 style={{fontFamily:"Fraunces,serif",fontSize:"clamp(26px,3.5vw,44px)",color:INK,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",margin:"0 auto",maxWidth:480}}>
              Tout le reste pour une <span style={{color:G}}>image pro.</span>
            </h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}} className="other-grid">
            <style>{`@media(max-width:700px){.other-grid{grid-template-columns:1fr !important;}}`}</style>
            {[
              { icon:"🌐", color:"var(--action)", title:"Domaine personnalisé",   desc:"Connecte ton sous-domaine (carte.tonsite.fr). Ton image, pas la nôtre.", tag:PLANS.pro.label },
              { icon:"✨", color:"#A78BFA", title:"Branding personnalisé",   desc:"Retire le branding QRowg. Ta page, tes couleurs, ton identité.", tag:PLANS.pro.label },
              { icon:"👥", color:"var(--success)", title:"Collaboration équipe",     desc:"Gérez vos pages à plusieurs avec des rôles et permissions.", tag:PLANS.business.label },
            ].map(f => (
              <div key={f.title} style={{
                background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:18,padding:"28px 24px",
                display:"flex",flexDirection:"column",gap:14,
                position:"relative",overflow:"hidden",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${f.color}40,transparent)`}}/>
                <div style={{
                  width:44,height:44,borderRadius:12,
                  background:f.color+"12",border:"1px solid "+f.color+"28",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                }}>{f.icon}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <h3 style={{color:INK,fontSize:16,fontWeight:700,margin:0}}>{f.title}</h3>
                    <span style={{
                      fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:4,
                      background:f.tag===PLANS.pro.label?"rgba(201,168,76,0.12)":"rgba(167,139,250,0.12)",
                      color:f.tag===PLANS.pro.label?G:"#A78BFA",border:"1px solid",
                      borderColor:f.tag===PLANS.pro.label?"rgba(201,168,76,0.3)":"rgba(167,139,250,0.3)",
                    }}>{f.tag}</span>
                  </div>
                  <p style={{color:MUT,fontSize:13.5,lineHeight:1.6,margin:0}}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section style={{padding:"100px 48px 120px",position:"relative",zIndex:2,textAlign:"center"}} className="feat-sec">
        <div style={{
          maxWidth:660,margin:"0 auto",
          background:"linear-gradient(145deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03))",
          border:"1px solid rgba(201,168,76,0.28)",
          borderRadius:24,padding:"56px 48px",position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#C9A84C,transparent)"}}/>
          <h2 style={{fontFamily:"Fraunces,serif",fontSize:"clamp(26px,3.5vw,44px)",color:INK,fontWeight:700,lineHeight:1.12,margin:"0 0 18px",letterSpacing:"-0.02em"}}>
            Prêt à créer ta page <span style={{color:G}}>professionnelle ?</span>
          </h2>
          <p style={{color:MUT,fontSize:16,lineHeight:1.7,margin:"0 0 36px",maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>
            Commence gratuitement. Pas de carte bancaire. Prêt en 5 minutes.
          </p>
          <CtaInline label="Créer mon QRowg gratuit" />
          <p style={{color:"rgba(138,132,120,0.45)",fontSize:11.5,margin:"18px 0 0"}}>Gratuit · Sans carte bancaire · Annulation à tout moment</p>
        </div>
      </section>

    </div>
  )
}
