"use client"
import Link from "next/link"
import { useState, FormEvent } from "react"

const G   = "#C9A84C"
const INK = "#F5F0E8"
const MUT = "rgba(138,132,120,0.8)"
const BG  = "#080808"
const BOR = "rgba(201,168,76,0.18)"
const ERR = "var(--danger)"

type FormState = {
  name: string; email: string; subject: string; message: string; website: string
}
type Status = "idle" | "loading" | "success" | "error"

function InputField({
  label, id, type = "text", value, onChange, error, placeholder, required = true,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string; placeholder?: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const isArea = type === "textarea"
  const baseStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.03)",
    border: "1px solid " + (error ? ERR + "60" : focused ? "rgba(201,168,76,0.45)" : "rgba(255,255,255,0.1)"),
    borderRadius: 10, padding: isArea ? "12px 14px" : "11px 14px",
    color: INK, fontSize: 14, fontFamily: "DM Sans, sans-serif",
    outline: "none", resize: isArea ? "vertical" : "none",
    transition: "border-color 0.2s",
    minHeight: isArea ? 120 : "auto",
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ color: "rgba(245,240,232,0.75)", fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: G, marginLeft: 2 }}>*</span>}
      </label>
      {isArea ? (
        <textarea
          id={id} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={baseStyle}
          rows={5}
        />
      ) : (
        <input
          id={id} type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={baseStyle}
          autoComplete={type === "email" ? "email" : type === "text" && id === "name" ? "name" : "off"}
        />
      )}
      {error && <span style={{ color: ERR, fontSize: 12 }}>{error}</span>}
    </div>
  )
}

const SUBJECTS = [
  "Support technique", "Question sur les tarifs", "Partenariat",
  "Signalement d'un bug", "Demande de fonctionnalité", "Autre",
]

const FAQ = [
  {
    q: "Puis-je utiliser QRowg gratuitement ?",
    a: "Oui. Le plan Free donne accès à 3 pages, 200 vues/mois, 1 QR statique permanent et 2 QR dynamiques/mois — sans carte bancaire.",
  },
  {
    q: "Puis-je connecter mon propre domaine ?",
    a: "Oui, à partir du plan Pro. Tu connectes ton sous-domaine (carte.tonsite.fr) en quelques clics.",
  },
  {
    q: "Comment fonctionne le QR dynamique ?",
    a: "Le QR code reste identique à l'impression. Tu modifies ta page ou destination à tout moment depuis ton dashboard — sans réimprimer.",
  },
]

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name:"", email:"", subject:"", message:"", website:"" })
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [status, setStatus] = useState<Status>("idle")
  const [errMsg, setErrMsg] = useState("")
  const [openFaq, setOpenFaq] = useState<number|null>(null)

  const set = (k: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }))
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Merci d'indiquer ton nom."
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Email invalide."
    if (!form.subject) e.subject = "Choisis un sujet."
    if (!form.message.trim() || form.message.trim().length < 10) e.message = "Message trop court (min. 10 caractères)."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setStatus("loading")
    setErrMsg("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error || "Erreur."); setStatus("error"); return }
      setStatus("success")
      setForm({ name:"", email:"", subject:"", message:"", website:"" })
    } catch {
      setErrMsg("Erreur réseau. Vérifie ta connexion.")
      setStatus("error")
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; }
        body { background:${BG}; }
        input,textarea,select { color-scheme:dark; }
        input::placeholder,textarea::placeholder { color:rgba(138,132,120,0.45); }
        select option { background:#1a1714; color:#F5F0E8; }
        .contact-grid { display:grid; grid-template-columns:1fr 420px; gap:64px; align-items:start; }
        .card-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        @media(max-width:1000px){ .contact-grid{ grid-template-columns:1fr !important; } .card-row{ grid-template-columns:1fr !important; } }
        @media(max-width:640px){ .contact-hero{ padding:120px 24px 60px !important; } .contact-main{ padding:60px 24px 80px !important; } }
        .au1{animation:mo-fade-up 0.5s ease 0.1s both}
        .au2{animation:mo-fade-up 0.5s ease 0.2s both}
        .au3{animation:mo-fade-up 0.5s ease 0.35s both}
        .faq-ans { overflow:hidden; transition:max-height 0.35s var(--mo-ease-emphasized), opacity 0.3s; }
        @media(prefers-reduced-motion:reduce){ *{ animation:none !important; transition:none !important; } }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:"rgba(8,8,8,0.93)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(201,168,76,0.12)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px" }}>
        <Link href="/" style={{ textDecoration:"none" }}>
          <span style={{ fontFamily:"Fraunces,serif",fontSize:20,color:G,fontWeight:700 }}>QRowg</span>
        </Link>
        <div style={{ display:"flex",gap:20,alignItems:"center" }}>
          <Link href="/" style={{ color:MUT,textDecoration:"none",fontSize:13,display:"flex",alignItems:"center",gap:6,transition:"color 0.2s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=INK}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=MUT}}>
            ← Retour
          </Link>
          <Link href="/auth/signup" style={{ background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:BG,textDecoration:"none",fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:9,boxShadow:"0 2px 14px rgba(201,168,76,0.3)" }}>
            Commencer
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding:"120px 48px 64px",textAlign:"center" }} className="contact-hero">
        <div style={{ maxWidth:600,margin:"0 auto" }}>
          <h1 style={{ fontFamily:"Fraunces,serif",fontSize:"clamp(32px,4vw,56px)",color:INK,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",margin:"0 0 18px" }} className="au1">
            Une question ?<br /><span style={{color:G}}>Parlons-en.</span>
          </h1>
          <p style={{ color:MUT,fontSize:17,lineHeight:1.7,margin:0 }} className="au2">
            Nous répondons généralement sous 24h.
          </p>
        </div>
      </section>

      {/* MAIN */}
      <section style={{ padding:"0 48px 100px" }} className="contact-main">
        <div style={{ maxWidth:1060,margin:"0 auto" }} className="au3">
          <div className="contact-grid">

            {/* Formulaire */}
            <div>
              {status === "success" ? (
                <div style={{
                  background:"rgba(57,255,143,0.06)",
                  border:"1px solid rgba(57,255,143,0.25)",
                  borderRadius:18,padding:"48px 40px",textAlign:"center",
                }}>
                  <div style={{ fontSize:40,marginBottom:20 }}>✅</div>
                  <h2 style={{ fontFamily:"Fraunces,serif",fontSize:28,color:INK,fontWeight:700,margin:"0 0 12px" }}>
                    Message envoyé !
                  </h2>
                  <p style={{ color:MUT,fontSize:15,lineHeight:1.7,margin:"0 0 28px" }}>
                    Merci pour ton message. Nous reviendrons vers toi sous 24h.
                  </p>
                  <button onClick={()=>setStatus("idle")} style={{
                    background:"transparent",border:"1px solid rgba(201,168,76,0.3)",
                    color:G,fontSize:13,fontWeight:600,padding:"10px 24px",
                    borderRadius:9,cursor:"pointer",fontFamily:"inherit",
                  }}>
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate style={{ display:"flex",flexDirection:"column",gap:20 }}>
                  {/* Honeypot anti-bot */}
                  <div style={{ position:"absolute",left:"-9999px",opacity:0,height:0,overflow:"hidden" }} aria-hidden="true">
                    <input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set("website")(e.target.value)} />
                  </div>

                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }} className="name-email">
                    <style>{`@media(max-width:500px){.name-email{grid-template-columns:1fr !important;}}`}</style>
                    <InputField id="name"    label="Ton nom"          value={form.name}    onChange={set("name")}    error={errors.name}    placeholder="Jean Dupont" />
                    <InputField id="email"   label="Ton email"        type="email"         value={form.email}   onChange={set("email")}   error={errors.email}   placeholder="jean@exemple.fr" />
                  </div>

                  {/* Sujet select */}
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    <label htmlFor="subject" style={{ color:"rgba(245,240,232,0.75)",fontSize:13,fontWeight:500 }}>
                      Sujet<span style={{color:G,marginLeft:2}}>*</span>
                    </label>
                    <select id="subject" value={form.subject} onChange={e=>set("subject")(e.target.value)} style={{
                      width:"100%",background:"rgba(255,255,255,0.03)",
                      border:"1px solid "+(errors.subject?ERR+"60":"rgba(255,255,255,0.1)"),
                      borderRadius:10,padding:"11px 14px",
                      color:form.subject?INK:"rgba(138,132,120,0.45)",
                      fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",cursor:"pointer",
                    }}>
                      <option value="" disabled>Choisir un sujet...</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.subject && <span style={{color:ERR,fontSize:12}}>{errors.subject}</span>}
                  </div>

                  <InputField id="message" label="Ton message" type="textarea" value={form.message} onChange={set("message")} error={errors.message} placeholder="Décris ta question ou ton besoin..." />

                  {/* Compteur message */}
                  <div style={{ display:"flex",justifyContent:"flex-end",marginTop:-12 }}>
                    <span style={{ color:form.message.length>1800?"#F97316":MUT.replace("0.8","0.4"),fontSize:11 }}>
                      {form.message.length}/2000
                    </span>
                  </div>

                  {errMsg && (
                    <div style={{ background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:9,padding:"10px 14px",color:ERR,fontSize:13 }}>
                      {errMsg}
                    </div>
                  )}

                  <button type="submit" disabled={status==="loading"} style={{
                    background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                    color:BG,border:"none",cursor:status==="loading"?"not-allowed":"pointer",
                    fontSize:15,fontWeight:700,padding:"14px 32px",borderRadius:11,
                    fontFamily:"DM Sans,sans-serif",
                    opacity:status==="loading"?0.75:1,
                    boxShadow:"0 4px 20px rgba(201,168,76,0.35)",
                    transition:"transform 0.2s,box-shadow 0.2s,opacity 0.2s",
                  }}
                    onMouseEnter={e=>{if(status!=="loading"){const el=e.currentTarget;el.style.transform="translateY(-2px)";el.style.boxShadow="0 6px 28px rgba(201,168,76,0.45)"}}}
                    onMouseLeave={e=>{const el=e.currentTarget;el.style.transform="none";el.style.boxShadow="0 4px 20px rgba(201,168,76,0.35)"}}>
                    {status==="loading" ? "Envoi en cours..." : "Envoyer le message →"}
                  </button>
                  <p style={{ color:MUT.replace("0.8","0.45"),fontSize:11.5,textAlign:"center" }}>
                    En envoyant ce message, tu acceptes notre{" "}
                    <Link href="/privacy" style={{color:G,textDecoration:"none"}}>politique de confidentialité</Link>.
                  </p>
                </form>
              )}
            </div>

            {/* Sidebar: cartes + FAQ */}
            <div style={{ display:"flex",flexDirection:"column",gap:24 }}>

              {/* Cartes contact */}
              <div>
                <p style={{ color:MUT.replace("0.8","0.55"),fontSize:10,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,marginBottom:14 }}>Contacts directs</p>
                <div className="card-row">
                  {[
                    { icon:"🛠", label:"Support",       email:"support@qrowg.com",  color:"var(--action)" },
                    { icon:"🤝", label:"Partenariat",   email:"partners@qrowg.com", color:"#A78BFA" },
                    { icon:"👋", label:"Business",      email:"hello@qrowg.com",    color:"#C9A84C" },
                  ].map(c => (
                    <a key={c.label} href={"mailto:"+c.email} style={{
                      display:"flex",flexDirection:"column",gap:8,padding:"14px 14px",
                      background:"rgba(255,255,255,0.025)",
                      border:"1px solid rgba(255,255,255,0.07)",
                      borderRadius:12,textDecoration:"none",
                      transition:"all 0.2s",
                    }}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor=c.color+"40";el.style.background=c.color+"08"}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor="rgba(255,255,255,0.07)";el.style.background="rgba(255,255,255,0.025)"}}>
                      <span style={{fontSize:18}}>{c.icon}</span>
                      <p style={{color:c.color,fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",margin:0}}>{c.label}</p>
                      <p style={{color:"rgba(245,240,232,0.6)",fontSize:11,margin:0,wordBreak:"break-all"}}>{c.email}</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* FAQ rapide */}
              <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden" }}>
                <div style={{ padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ color:MUT.replace("0.8","0.55"),fontSize:10,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,margin:0 }}>FAQ rapide</p>
                </div>
                {FAQ.map((item,i) => {
                  const isOpen = openFaq === i
                  return (
                    <div key={i} style={{ borderBottom: i<FAQ.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                      <button onClick={()=>setOpenFaq(isOpen?null:i)} style={{
                        width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                        gap:12,padding:"14px 18px",background:"none",border:"none",
                        cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                      }}>
                        <span style={{color:isOpen?INK:"rgba(245,240,232,0.72)",fontSize:13,fontWeight:isOpen?600:500,lineHeight:1.4,transition:"color 0.2s"}}>{item.q}</span>
                        <span style={{
                          width:18,height:18,borderRadius:"50%",flexShrink:0,
                          border:"1px solid rgba(201,168,76,0.25)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"transform 0.25s,background 0.2s",
                          transform:isOpen?"rotate(45deg)":"none",
                          background:isOpen?"rgba(201,168,76,0.12)":"transparent",
                        }}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <line x1="4" y1="1" x2="4" y2="7" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="1" y1="4" x2="7" y2="4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </span>
                      </button>
                      <div className="faq-ans" style={{ maxHeight:isOpen?"200px":"0px",opacity:isOpen?1:0 }}>
                        <p style={{color:MUT,fontSize:13,lineHeight:1.65,margin:0,padding:"0 18px 14px"}}>{item.a}</p>
                      </div>
                    </div>
                  )
                })}
                <div style={{ padding:"14px 18px",borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                  <Link href="/#faq" style={{color:G,fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:5,transition:"gap 0.2s"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.gap="8px"}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.gap="5px"}}>
                    Voir toutes les questions →
                  </Link>
                </div>
              </div>

              {/* CTA */}
              <div style={{ background:"linear-gradient(145deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03))",border:BOR,borderRadius:14,padding:"22px 20px",textAlign:"center" }}>
                <p style={{color:INK,fontSize:14,fontWeight:600,margin:"0 0 8px"}}>Pas encore sur QRowg ?</p>
                <p style={{color:MUT.replace("0.8","0.65"),fontSize:12.5,margin:"0 0 16px",lineHeight:1.5}}>Crée ta page gratuitement en 5 minutes.</p>
                <Link href="/auth/signup" style={{
                  display:"block",textAlign:"center",
                  background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                  color:BG,textDecoration:"none",fontSize:13,fontWeight:700,
                  padding:"11px 20px",borderRadius:9,
                  boxShadow:"0 3px 16px rgba(201,168,76,0.3)",
                }}>
                  Créer mon QRowg →
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
