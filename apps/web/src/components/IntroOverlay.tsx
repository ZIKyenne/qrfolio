"use client"

// Animation d'intro plein écran de QRowg. 100 % auto-contenue et isolée :
// tout est scopé sous #qw-intro / .qw-*, l'overlay est position:fixed et se
// retire seul après ~4,5 s → aucun impact possible sur le design du site.
// Space Grotesk est self-hébergée (pas de CDN Google, cohérent avec la perf).
import { useEffect, useRef, useState, type CSSProperties } from "react"

const ONCE_PER_SESSION = true   // true = une seule fois par session (recommandé en prod)
const DURATION_MS = 4500        // BAR_DELAY(250) + LOAD(2400) + HOLD_FULL(1000) + EXIT(850)

const cssVars = (o: Record<string, string | number>) => o as CSSProperties

export default function IntroOverlay() {
  const [visible, setVisible] = useState(true)
  const pctRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ONCE_PER_SESSION && sessionStorage.getItem("qw-intro-seen")) { setVisible(false); return }
    if (ONCE_PER_SESSION) sessionStorage.setItem("qw-intro-seen", "1")

    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = "hidden"

    // Compteur de pourcentage (identique à la démo : easing sur la barre).
    const BAR_DELAY = 250, LOAD = 2400
    const start = performance.now() + BAR_DELAY
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / LOAD))
      if (pctRef.current) pctRef.current.textContent = Math.round((1 - Math.pow(1 - p, 2.2)) * 100) + "%"
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const t = setTimeout(() => { html.style.overflow = prevOverflow; setVisible(false) }, DURATION_MS)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); html.style.overflow = prevOverflow }
  }, [])

  if (!visible) return null

  return (
    <div id="qw-intro" role="presentation" aria-hidden="true">
      <style>{QW_CSS}</style>
      <div className="qw-halo" />
      <div className="qw-vig" />
      <div className="qw-grain" />

      <div className="qw-stack">
        <div className="qw-mark">
          <div className="qw-mark-glow" />
          <div className="qw-tile">
            <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="#070707" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M30 22 H21 V31" style={cssVars({ "--len": 20, "--d": ".34s" })} />
              <path d="M70 22 H79 V31" style={cssVars({ "--len": 20, "--d": ".44s" })} />
              <path d="M30 78 H21 V69" style={cssVars({ "--len": 20, "--d": ".54s" })} />
              <path d="M70 78 H79 V69" style={cssVars({ "--len": 20, "--d": ".64s" })} />
              <path className="qw-line" d="M25 50 H75" strokeWidth="7" style={cssVars({ "--len": 50, "--d": "1.05s" })} />
              <g fill="#070707" stroke="none">
                <rect x="38" y="33" width="7" height="7" rx="2" style={cssVars({ transformOrigin: "41px 36px", "--d": ".82s" })} />
                <rect x="46.5" y="33" width="7" height="7" rx="2" style={cssVars({ transformOrigin: "50px 36px", "--d": ".9s" })} />
                <rect x="55" y="33" width="7" height="7" rx="2" style={cssVars({ transformOrigin: "58px 36px", "--d": ".98s" })} />
                <rect x="40" y="61" width="7" height="7" rx="2" style={cssVars({ transformOrigin: "43px 64px", "--d": "1.06s" })} />
                <rect x="53" y="61" width="7" height="7" rx="2" style={cssVars({ transformOrigin: "56px 64px", "--d": "1.14s" })} />
              </g>
            </svg>
            <div className="qw-scan" />
            <div className="qw-shine" />
          </div>
          <div className="qw-flash" />
        </div>

        <div className="qw-word">
          <div className="qw-lockup">
            <div className="qw-qr">QR</div>
            <div className="qw-owg">
              <span style={cssVars({ "--d": "1.92s" })}>o</span>
              <span style={cssVars({ "--d": "1.99s" })}>w</span>
              <span style={cssVars({ "--d": "2.06s" })}>g</span>
            </div>
          </div>
          <div className="qw-pill">
            <div className="qw-dot" />
            <div className="qw-tag">Une page pro. Un QR code dynamique.</div>
          </div>
        </div>

        <div className="qw-loader">
          <div className="qw-track"><div className="qw-fill" /></div>
          <div className="qw-pct" ref={pctRef}>0%</div>
        </div>
      </div>

      <div className="qw-domain">qrowg.com</div>
    </div>
  )
}

const QW_CSS = `
@font-face { font-family:'Space Grotesk'; font-style:normal; font-weight:300 700; font-display:swap;
  src:url('/fonts/space-grotesk-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Space Grotesk'; font-style:normal; font-weight:300 700; font-display:swap;
  src:url('/fonts/space-grotesk-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
#qw-intro{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;animation:qw-exit .85s cubic-bezier(.6,0,.75,0) 3.65s forwards}
#qw-intro .qw-halo{position:absolute;inset:0;background:radial-gradient(56% 44% at 50% 44%,rgba(212,169,74,.15),transparent 72%);animation:qw-halo 4s ease-in-out infinite}
#qw-intro .qw-vig{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 50%,transparent 40%,rgba(0,0,0,.85) 100%)}
#qw-intro .qw-grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:screen;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
#qw-intro .qw-stack{position:relative;display:flex;flex-direction:column;align-items:center;gap:clamp(30px,5vh,46px)}
#qw-intro .qw-mark{position:relative;animation:qw-float 5s ease-in-out 1.6s infinite}
#qw-intro .qw-mark-glow{position:absolute;inset:-38px;border-radius:60px;background:radial-gradient(circle,rgba(212,169,74,.3),transparent 68%);filter:blur(22px);animation:qw-fade .9s ease-out both}
#qw-intro .qw-tile{position:relative;width:clamp(112px,15vh,148px);height:clamp(112px,15vh,148px);border-radius:26%;background:linear-gradient(148deg,#f7e3a8 0%,#e6c672 38%,#caa240 72%,#a9812b 100%);box-shadow:0 34px 90px -34px rgba(212,169,74,.85),0 0 0 1px rgba(255,255,255,.12),inset 0 2px 0 rgba(255,255,255,.5),inset 0 -2px 12px rgba(120,86,15,.4);animation:qw-tile .95s var(--mo-ease-entrance) both;overflow:hidden}
#qw-intro .qw-tile svg{position:absolute;inset:0}
#qw-intro .qw-tile path{stroke-dasharray:var(--len);animation:qw-draw .42s cubic-bezier(.33,1,.68,1) var(--d) both}
#qw-intro .qw-tile .qw-line{animation-duration:.55s;animation-timing-function:cubic-bezier(.65,0,.35,1)}
#qw-intro .qw-tile rect{animation:qw-pop .34s var(--mo-ease-spring) var(--d) both}
#qw-intro .qw-scan{position:absolute;left:-10%;right:-10%;top:50%;height:30%;margin-top:-15%;background:linear-gradient(180deg,transparent,rgba(255,255,255,.9) 48%,rgba(255,255,255,.95) 52%,transparent);filter:blur(1px);animation:qw-sweep 1.25s cubic-bezier(.45,0,.55,1) 1.5s both}
#qw-intro .qw-shine{position:absolute;top:-60%;bottom:-60%;width:34%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:qw-shine 1.1s var(--mo-ease-emphasized) 2.5s both}
#qw-intro .qw-flash{position:absolute;inset:-6px;border-radius:30%;background:rgba(255,255,255,.9);filter:blur(18px);pointer-events:none;animation:qw-flash .5s ease-out 2.5s both}
#qw-intro .qw-word{display:flex;flex-direction:column;align-items:center;gap:22px}
#qw-intro .qw-lockup{display:flex;align-items:center;gap:14px}
#qw-intro .qw-qr{display:flex;align-items:center;justify-content:center;padding:6px 14px 8px;border-radius:14px;background:linear-gradient(145deg,#f0d488,#c9a13f);color:#000;font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-.02em;line-height:1;box-shadow:0 0 40px -12px rgba(212,169,74,.9);animation:qw-letter .85s var(--mo-ease-entrance) 1.78s both}
#qw-intro .qw-owg{display:flex;font-size:clamp(28px,4vw,44px);font-weight:600;letter-spacing:-.01em;color:#f5efe3}
#qw-intro .qw-owg span{animation:qw-letter .85s var(--mo-ease-entrance) var(--d) both}
#qw-intro .qw-pill{display:flex;align-items:center;gap:10px;padding:9px 20px;border:1px solid rgba(212,169,74,.35);border-radius:999px;background:rgba(212,169,74,.05);animation:qw-rise .9s var(--mo-ease-entrance) 2.3s both}
#qw-intro .qw-dot{width:5px;height:5px;border-radius:50%;background:#d4a94a}
#qw-intro .qw-tag{font-size:clamp(10px,1.1vw,12px);font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:#d9b45a;text-align:center}
#qw-intro .qw-loader{display:flex;align-items:center;gap:14px;animation:qw-fade .6s ease-out .3s both}
#qw-intro .qw-track{width:clamp(150px,22vw,220px);height:2px;background:rgba(245,239,227,.09);border-radius:2px;overflow:hidden}
#qw-intro .qw-fill{width:100%;height:100%;transform-origin:left center;background:linear-gradient(90deg,#a9812b,#f0d488);box-shadow:0 0 12px rgba(212,169,74,.65);animation:qw-bar 2.4s cubic-bezier(.32,.72,.26,1) .25s both}
#qw-intro .qw-pct{min-width:38px;font-size:11px;letter-spacing:.14em;color:#7d776c;font-variant-numeric:tabular-nums}
#qw-intro .qw-domain{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:#55504a;animation:qw-fade .9s ease-out 2.6s both}
@keyframes qw-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes qw-pop{0%{opacity:0;transform:scale(.1)}55%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:scale(1)}}
@keyframes qw-sweep{0%{transform:translateY(-62%);opacity:0}10%{opacity:1}85%{opacity:1}100%{transform:translateY(62%);opacity:0}}
@keyframes qw-rise{from{opacity:0;transform:translateY(18px);filter:blur(8px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
@keyframes qw-letter{0%{opacity:0;transform:translateY(24px) scale(.94);filter:blur(9px)}100%{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
@keyframes qw-fade{from{opacity:0}to{opacity:1}}
@keyframes qw-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes qw-tile{0%{opacity:0;transform:scale(.7) rotate(-6deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes qw-halo{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.45;transform:scale(1.07)}}
@keyframes qw-shine{0%{transform:translateX(-140%) rotate(18deg)}100%{transform:translateX(240%) rotate(18deg)}}
@keyframes qw-flash{0%{opacity:0}40%{opacity:.5}100%{opacity:0}}
@keyframes qw-exit{0%{opacity:1;transform:scale(1);filter:blur(0)}40%{opacity:.92}100%{opacity:0;transform:scale(1.08);filter:blur(12px)}}
@keyframes qw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@media (prefers-reduced-motion: reduce){#qw-intro,#qw-intro *{animation-duration:.001ms!important;animation-delay:0s!important}}
`
