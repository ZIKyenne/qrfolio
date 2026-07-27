"use client"
import Link from "next/link"
import { useEffect, useRef } from "react"

const G   = "#C9A84C"
const INK = "#F5F0E8"
const MUT = "rgba(138,132,120,0.8)"
const BG  = "#080808"

// Mini QR animé SVG
function QR404() {
  const cells = [
    1,1,1,0,0,0,1,1,1,
    1,0,1,0,0,0,1,0,1,
    1,0,1,0,1,0,1,0,1,
    1,1,1,0,0,0,1,1,1,
    0,0,0,0,1,0,0,0,0,
    1,1,1,0,0,0,1,1,1,
    1,0,1,0,1,0,1,0,1,
    1,0,1,0,0,0,1,0,1,
    1,1,1,0,0,0,1,1,1,
  ]
  const gold = new Set([4, 20, 40])
  return (
    <div style={{
      position: "relative",
      width: 160, height: 160,
      margin: "0 auto",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", inset: -30,
        background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 65%)",
        animation: "glow404 3s ease-in-out infinite",
        borderRadius: "50%",
        pointerEvents: "none",
      }}/>
      {/* Card */}
      <div style={{
        width: 160, height: 160,
        background: "linear-gradient(145deg, #151210, #111009)",
        border: "1px solid rgba(201,168,76,0.35)",
        borderRadius: 20,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10,
        boxShadow: "0 0 60px rgba(201,168,76,0.15)",
        animation: "float404 4s ease-in-out infinite",
      }}>
        {/* QR grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(9,1fr)",
          gap: 2.5, padding: 4,
        }}>
          {cells.map((c, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 1.5,
              background: c === 0
                ? "transparent"
                : gold.has(i) ? G : INK,
              opacity: c === 0 ? 0 : gold.has(i) ? 1 : 0.9,
              boxShadow: gold.has(i) ? "0 0 4px rgba(201,168,76,0.6)" : "none",
            }}/>
          ))}
        </div>
        <p style={{
          color: G, fontSize: 8, letterSpacing: 2.5,
          fontWeight: 700, textTransform: "uppercase",
        }}>QROWG.COM</p>
      </div>
      {/* Badge 404 */}
      <div style={{
        position: "absolute", top: -12, right: -12,
        background: "linear-gradient(135deg, var(--danger), #F97316)",
        borderRadius: 20, padding: "4px 12px",
        fontSize: 11, fontWeight: 800, color: "#fff",
        boxShadow: "0 2px 12px rgba(255,107,107,0.4)",
        letterSpacing: 0.5,
      }}>404</div>
    </div>
  )
}

export default function NotFound() {
  return (
    <div style={{
      background: BG, minHeight: "100vh",
      fontFamily: "DM Sans, sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        * { box-sizing:border-box; }
        body { background:${BG}; }
        @keyframes float404 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow404  { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .au1{animation:fadeUp 0.5s ease 0.1s both}
        .au2{animation:fadeUp 0.5s ease 0.25s both}
        .au3{animation:fadeUp 0.5s ease 0.4s both}
        .au4{animation:fadeUp 0.5s ease 0.55s both}
        .au5{animation:fadeUp 0.5s ease 0.7s both}
        .ql-grid { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; }
        .ql-link { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:100px; border:1px solid rgba(255,255,255,0.1); color:rgba(138,132,120,0.75); text-decoration:none; font-size:13px; transition:all 0.2s; }
        .ql-link:hover { border-color:rgba(201,168,76,0.4); color:#F5F0E8; background:rgba(201,168,76,0.06); }
        .ql-link:focus-visible { outline:2px solid rgba(201,168,76,0.5); outline-offset:3px; border-radius:100px; }
        .cta-main { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(90deg,#C9A84C,#b8953f); color:#080808; text-decoration:none; font-size:15px; font-weight:700; padding:14px 32px; border-radius:12px; box-shadow:0 4px 24px rgba(201,168,76,0.35); transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s; }
        .cta-main:hover { transform:translateY(-3px) scale(1.03); box-shadow:0 8px 32px rgba(201,168,76,0.5); }
        .cta-main:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:4px; border-radius:12px; }
        .cta-sec { display:inline-flex; align-items:center; gap:8px; background:transparent; border:1px solid rgba(201,168,76,0.28); color:rgba(201,168,76,0.9); text-decoration:none; font-size:15px; font-weight:600; padding:14px 28px; border-radius:12px; transition:all 0.2s; }
        .cta-sec:hover { background:rgba(201,168,76,0.08); border-color:rgba(201,168,76,0.55); }
        .cta-sec:focus-visible { outline:2px solid rgba(201,168,76,0.5); outline-offset:4px; border-radius:12px; }
        @media(max-width:480px){ .cta-main,.cta-sec{ width:100%; justify-content:center; } .ctas{ flex-direction:column!important; align-items:center!important; } }
        @media(prefers-reduced-motion:reduce){ *{ animation:none!important; transition:none!important; } }
      `}</style>

      {/* Nav minimaliste */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 48px",
        background: "rgba(8,8,8,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(201,168,76,0.1)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: G, fontWeight: 700 }}>QRowg</span>
        </Link>
        <Link href="/auth/signup" style={{
          background: "linear-gradient(90deg,#C9A84C,#b8953f)",
          color: BG, textDecoration: "none", fontSize: 13,
          fontWeight: 700, padding: "8px 18px", borderRadius: 9,
        }}>Commencer</Link>
      </nav>

      {/* Contenu */}
      <div style={{ maxWidth: 580, width: "100%", paddingTop: 64 }}>

        {/* Illustration */}
        <div style={{ marginBottom: 40 }} className="au1">
          <QR404 />
        </div>

        {/* Texte */}
        <p style={{ color: G, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }} className="au2">
          Erreur 404
        </p>
        <h1 style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 5vw, 52px)",
          color: INK, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: "-0.02em", margin: "0 0 18px",
        }} className="au2">
          Cette page n'existe pas.
        </h1>
        <p style={{
          color: MUT, fontSize: 17, lineHeight: 1.7,
          margin: "0 0 40px", maxWidth: 440, marginLeft: "auto", marginRight: "auto",
        }} className="au3">
          Mais ton prochain QRowg peut exister dans moins de 5 minutes.
        </p>

        {/* CTAs */}
        <div className="au4 ctas" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
          <Link href="/" className="cta-sec">← Retour à l'accueil</Link>
          <Link href="/auth/signup" className="cta-main">Créer mon QRowg gratuit →</Link>
        </div>

        {/* Séparateur */}
        <div style={{
          height: 1, maxWidth: 320, margin: "0 auto 32px",
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)",
        }} className="au4"/>

        {/* Liens rapides */}
        <div className="au5">
          <p style={{ color: MUT.replace("0.8","0.45"), fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
            Liens rapides
          </p>
          <div className="ql-grid">
            {[
              ["✦ Fonctionnalités", "/features"],
              ["✦ Templates",       "/#templates"],
              ["✦ Tarifs",          "/#pricing"],
              ["✦ Contact",         "/contact"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="ql-link">{label}</Link>
            ))}
          </div>
        </div>

      </div>

      {/* Footer minimaliste */}
      <div style={{ position: "absolute", bottom: 24, color: MUT.replace("0.8","0.35"), fontSize: 12 }}>
        © {new Date().getFullYear()} QRowg
      </div>
    </div>
  )
}
