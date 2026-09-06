"use client"

import { useInView, Eyebrow } from "../homeUi"

const HOW_STEPS = [
  {icon:"✏️", title:"Créer",       desc:"Composez votre page : menu, portfolio, promo, contact…"},
  {icon:"🔗", title:"Connecter",   desc:"Générez le QR code dynamique relié à cette page."},
  {icon:"🎨", title:"Personnaliser",desc:"Couleurs, logo, style — le QR et la page à votre image."},
  {icon:"🖨️", title:"Imprimer",    desc:"Affiche, sticker, carte, chevalet, flyer — prêt à imprimer."},
  {icon:"🎯", title:"Convertir",   desc:"Réservation, WhatsApp, appel, achat, avis Google."},
  {icon:"📊", title:"Mesurer",     desc:"Suivez chaque scan et optimisez ce qui marche."},
] as const
export function HowItWorks() {
  const {ref,visible}=useInView(0.08)
  return(
    <section id="how" ref={ref} aria-labelledby="how-title"
      style={{padding:"100px 48px",position:"relative",zIndex:1}}>
      <style>{`
        .hsteps{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;position:relative;}
        .hstep{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;}
        .hbadge{transition:transform 0.3s var(--mo-ease-spring),box-shadow 0.3s ease,border-color 0.3s ease;}
        .hstep:hover .hbadge{transform:translateY(-6px) scale(1.05);border-color:rgba(201,168,76,0.6)!important;box-shadow:0 16px 38px rgba(201,168,76,0.3),0 0 0 7px rgba(8,8,8,0.92)!important;}
        .hline{display:none;position:absolute;top:31px;left:calc(16.66% + 36px);right:calc(16.66% + 36px);height:2px;
          background:linear-gradient(90deg,transparent,rgba(201,168,76,0.55) 6%,rgba(201,168,76,0.55) 94%,transparent);
          box-shadow:0 0 14px rgba(201,168,76,0.3);pointer-events:none;}
        .hline-v{display:none;}
        @media(max-width:900px){.hsteps{grid-template-columns:1fr!important;gap:0!important;}
          .hline{display:none!important;}
          .hline-v{display:block;position:absolute;top:40px;bottom:40px;left:31px;width:2px;z-index:0;
            background:linear-gradient(180deg,transparent,rgba(201,168,76,0.5) 5%,rgba(201,168,76,0.5) 95%,transparent);
            box-shadow:0 0 12px rgba(201,168,76,0.25);pointer-events:none;}
          .hstep{flex-direction:row!important;text-align:left!important;align-items:flex-start!important;
            gap:20px!important;padding:24px 0!important;border-bottom:1px solid rgba(201,168,76,0.07)!important;
            position:relative!important;z-index:1!important;}
          .hstep:last-child{border-bottom:none!important;}}
        @media(max-width:640px){#how{padding:72px 24px!important;}}
      `}</style>
      <div style={{maxWidth:1140,margin:"0 auto 72px",textAlign:"center",
        opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(24px)",
        transition:"opacity 0.6s ease,transform 0.6s ease"}}>
        <Eyebrow>Le système QRowg</Eyebrow>
        <h2 id="how-title" style={{fontFamily:"Fraunces, serif",fontSize:"clamp(28px,4vw,52px)",
          color:"#F5F0E8",fontWeight:700,margin:"0 auto",lineHeight:1.12,maxWidth:640,letterSpacing:"-0.02em"}}>
          Du support physique{" "}<span style={{color:"#C9A84C"}}>à la mesure</span>
        </h2>
      </div>
      <div style={{maxWidth:1140,margin:"0 auto",position:"relative"}}>
        <div aria-hidden="true" className="hline" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.3s"}}/>
        <div aria-hidden="true" className="hline-v" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.3s"}}/>
        <div className="hsteps">
          {HOW_STEPS.map((step,i)=>(
            <div key={step.title} className="hstep"
              style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(28px)",
                transition:`opacity 0.55s ease ${i*110}ms,transform 0.55s ease ${i*110}ms`}}>
              <div style={{position:"relative",flexShrink:0}}>
                <span style={{position:"absolute",top:-7,right:-9,width:23,height:23,borderRadius:"50%",
                  background:"linear-gradient(135deg,#d4a843,#C9A84C,#b8953f)",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:11,fontWeight:800,color:"#080808",zIndex:2,
                  boxShadow:"0 0 0 3px #080808, 0 3px 10px rgba(201,168,76,0.5)"}}>{i+1}</span>
                <div className="hbadge" style={{width:64,height:64,borderRadius:18,
                  background:"linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.05))",
                  border:"1px solid rgba(201,168,76,0.35)",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:27,boxShadow:"0 8px 22px rgba(0,0,0,0.4), 0 0 0 6px rgba(8,8,8,0.92)"}}>{step.icon}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <h3 style={{color:"#F5F0E8",fontSize:16.5,fontWeight:700,margin:0,lineHeight:1.3,letterSpacing:"-0.01em"}}>{step.title}</h3>
                <p style={{color:"rgba(200,194,178,0.9)",fontSize:14.5,margin:0,lineHeight:1.6}}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:64,opacity:visible?1:0,transition:"opacity 0.6s ease 0.7s"}}>
        <a href="/creer" style={{display:"inline-flex",alignItems:"center",gap:10,
          background:"transparent",border:"1px solid rgba(201,168,76,0.3)",
          color:"#C9A84C",textDecoration:"none",fontSize:14,fontWeight:600,
          padding:"12px 28px",borderRadius:10,transition:"all 0.2s ease"}}
          onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(201,168,76,0.08)";el.style.borderColor="rgba(201,168,76,0.55)"}}
          onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="transparent";el.style.borderColor="rgba(201,168,76,0.3)"}}>
          Composer ma page — sans compte <span style={{fontSize:16}}>→</span>
        </a>
      </div>
    </section>
  )
}

// ── Builder section ───────────────────────────────────────────────────────────
// Mini-builder JOUABLE : cliquer un bloc l'ajoute/retire dans le canvas ET dans
// l'aperçu téléphone, en direct. Un sélecteur d'accent recolore tout instantanément.
