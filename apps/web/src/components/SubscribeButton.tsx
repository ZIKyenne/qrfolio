"use client";

/**
 * SubscribeButton — CTA d'abonnement avec séquence de chargement "Scan QR".
 *
 * Séquence : idle -> collapse (le bouton se replie en carré) -> scan (QR + faisceau,
 * dure au moins `minScanMs` et attend la fin de `onSubscribe`) -> verify (flash vert
 * + étincelles) -> success (la pilule se ré-étend) -> redirection.
 *
 * Zéro dépendance : React uniquement. Styles inline + keyframes injectées une seule fois.
 * `onSubscribe` renvoie une string (URL) => redirection auto en fin d'animation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ types */

export type SubscribeButtonProps = {
  /** Libellé du bouton au repos. */
  label?: string;
  /**
   * Action déclenchée au clic (création de la session de paiement).
   * Si elle renvoie une string, le composant y redirige à la fin de l'animation.
   */
  onSubscribe?: () => Promise<string | void> | string | void;
  /** Texte affiché dans la pilule de succès. */
  successLabel?: string;
  /** Durée minimale de la phase de scan, même si l'API répond plus vite (ms). */
  minScanMs?: number;
  /** Couleur d'accent (or par défaut). */
  accent?: string;
  /** Couleur de validation. */
  success?: string;
  /** Largeur du bouton au repos. */
  width?: number | string;
  /** Hauteur (le carré de scan reprend cette valeur). */
  height?: number;
  /** Appelé si `onSubscribe` échoue — le bouton revient à l'état initial. */
  onError?: (error: unknown) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
};

type Phase = "idle" | "collapse" | "scan" | "verify" | "success";

/* ------------------------------------------------------- keyframes (once) */

const STYLE_ID = "subscribe-button-keyframes";

const KEYFRAMES = `
@keyframes sb-sweep { 0% { transform: translateX(-130%); } 55%,100% { transform: translateX(260%); } }
@keyframes sb-pop { 0% { transform: scale(.6); opacity:0; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity:1; } }
@keyframes sb-collapse { 0% { width: var(--sb-w); } 62% { width: calc(var(--sb-h) * 1.28); } 100% { width: var(--sb-h); } }
@keyframes sb-expand { 0% { width: var(--sb-h); } 100% { width: var(--sb-w); } }
@keyframes sb-labelout { 0% { opacity:1; letter-spacing:-.01em; } 100% { opacity:0; letter-spacing:-.14em; } }
@keyframes sb-qrpop { 0% { opacity:0; transform: scale(.15) rotate(-25deg); } 60% { opacity:1; transform: scale(1.18) rotate(3deg); } 100% { opacity:1; transform: scale(1) rotate(0deg); } }
@keyframes sb-scan { 0% { top:-10%; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { top:104%; opacity:0; } }
@keyframes sb-halo { 0% { transform: scale(.92); opacity:.65; } 100% { transform: scale(2); opacity:0; } }
@keyframes sb-bracket { 0%,100% { transform: scale(1); opacity:.85; } 50% { transform: scale(1.12); opacity:.45; } }
@keyframes sb-shake { 0%,100% { transform: translate3d(0,0,0); } 20% { transform: translate3d(-1.2px,.6px,0); } 55% { transform: translate3d(1.2px,-.6px,0); } 80% { transform: translate3d(-.6px,-.4px,0); } }
@keyframes sb-verify { 0% { opacity:0; } 22% { opacity:1; } 100% { opacity:.9; } }
@keyframes sb-burst { 0% { transform: scale(.5); opacity:.9; } 100% { transform: scale(2.4); opacity:0; } }
@keyframes sb-spark { 0% { transform: translateY(0) scale(1); opacity:0; } 15% { opacity:1; } 100% { transform: translateY(-46px) scale(.2); opacity:0; } }
@keyframes sb-draw { to { stroke-dashoffset: 0; } }
@keyframes sb-rise { 0% { opacity:0; transform: translateY(6px); filter:blur(3px); } 100% { opacity:1; transform: translateY(0); filter:blur(0); } }
@media (prefers-reduced-motion: reduce) {
  [data-sb] *, [data-sb] { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
`;

function useKeyframes() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
  }, []);
}

/* --------------------------------------------------------------- helpers */

/** Motif QR déterministe 7x7 (3 marqueurs d'angle + modules pseudo-aléatoires). */
function buildCells(accent: string) {
  return Array.from({ length: 49 }, (_, i) => {
    const r = Math.floor(i / 7);
    const c = i % 7;
    const finder = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
    const on = finder || (r * 5 + c * 3 + ((r * c) % 5)) % 3 !== 0;
    return {
      delay: (0.03 + (r + c) * 0.042).toFixed(2) + "s",
      bg: on ? (finder ? "#f7e8b8" : accent) : "rgba(232,199,102,.12)",
    };
  });
}

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  delay: ((i % 3) * 0.035).toFixed(3) + "s",
}));

/* ------------------------------------------------------------- component */

export default function SubscribeButton({
  label = "Passer à Business",
  onSubscribe,
  successLabel = "Redirection vers le paiement",
  minScanMs = 1800,
  accent = "#e8c766",
  success = "#22c55e",
  width = "100%",
  height = 58,
  onError,
  className,
  style,
  disabled = false,
}: SubscribeButtonProps) {
  useKeyframes();

  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => buildCells(accent), [accent]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  const at = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const run = useCallback(async () => {
    if (phase !== "idle" || disabled) return;
    clear();
    setPhase("collapse");
    at(360, () => setPhase("scan"));

    const started = Date.now();
    let redirectTo: string | void;
    try {
      redirectTo = await onSubscribe?.();
    } catch (err) {
      clear();
      setPhase("idle");
      onError?.(err);
      return;
    }

    // le scan dure au moins minScanMs à partir du début de la phase collapse
    const wait = Math.max(0, 360 + minScanMs - (Date.now() - started));
    at(wait, () => {
      setPhase("verify");
      at(460, () => {
        setPhase("success");
        at(700, () => {
          if (typeof redirectTo === "string") window.location.assign(redirectTo);
          else at(1200, () => setPhase("idle"));
        });
      });
    });
  }, [phase, disabled, onSubscribe, onError, minScanMs, clear]);

  const cssVars = {
    "--sb-w": typeof width === "number" ? `${width}px` : width,
    "--sb-h": `${height}px`,
  } as React.CSSProperties;

  const box: React.CSSProperties = {
    position: "relative",
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  };

  const goldFace: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    height,
    borderRadius: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    background: `linear-gradient(180deg, ${lighten(accent)}, ${darken(accent)})`,
    color: "#1a1405",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "-.01em",
    whiteSpace: "nowrap",
    boxShadow: `0 12px 30px ${rgba(accent, 0.3)}, inset 0 1px 0 rgba(255,255,255,.55)`,
  };

  return (
    <div ref={wrapRef} data-sb style={{ ...cssVars, ...box, ...style }} className={className}>
      {phase === "idle" && (
        <button
          type="button"
          onClick={run}
          disabled={disabled}
          style={{
            ...goldFace,
            width: "var(--sb-w)",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.55 : 1,
            font: "inherit",
            fontSize: 16,
            fontWeight: 800,
            transition: "transform .18s cubic-bezier(.2,.8,.3,1), box-shadow .18s",
            animation: "sb-pop .32s cubic-bezier(.2,.8,.3,1)",
          }}
          onMouseEnter={(e) => {
            if (disabled) return;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 20px 42px ${rgba(accent, 0.42)}, inset 0 1px 0 rgba(255,255,255,.7)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = goldFace.boxShadow as string;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(1px) scale(.985)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
        >
          <span style={{ position: "relative", zIndex: 2 }}>{label}</span>
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "34%",
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)",
              animation: "sb-sweep 3.6s ease-in-out infinite",
            }}
          />
        </button>
      )}

      {phase === "collapse" && (
        <div style={{ ...goldFace, width: height, animation: "sb-collapse .36s cubic-bezier(.72,0,.24,1) both" }}>
          <span style={{ animation: "sb-labelout .18s ease-in both" }}>{label}</span>
        </div>
      )}

      {(phase === "scan" || phase === "verify") && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Préparation du paiement"
          style={{ position: "relative", width: height, height, animation: "sb-shake 2.8s ease-in-out infinite" }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: -9,
              borderRadius: 22,
              border: `1px solid ${rgba(accent, 0.45)}`,
              animation: "sb-halo 1.9s ease-out infinite",
            }}
          />
          {CORNERS.map((c, i) => (
            <span
              key={i}
              aria-hidden
              style={{
                position: "absolute",
                width: 13,
                height: 13,
                borderRadius: c.radius,
                ...c.pos,
                ...c.border(rgba(accent, 0.9)),
                animation: `sb-bracket 1.6s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}

          <div
            style={{
              position: "relative",
              width: height,
              height,
              borderRadius: 15,
              overflow: "hidden",
              background: "#0b0d11",
              border: `1px solid ${rgba(accent, 0.45)}`,
              boxShadow: `inset 0 0 22px ${rgba(accent, 0.14)}, 0 10px 26px rgba(0,0,0,.5)`,
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gridTemplateRows: "repeat(7,1fr)",
              gap: 1.5,
              padding: 7,
              boxSizing: "border-box",
            }}
          >
            {cells.map((c, i) => (
              <span
                key={i}
                style={{
                  borderRadius: 1,
                  background: c.bg,
                  opacity: 0,
                  animation: `sb-qrpop .44s cubic-bezier(.2,.8,.3,1) ${c.delay} forwards`,
                }}
              />
            ))}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 16,
                background: `linear-gradient(180deg,transparent,${rgba(success, 0.3)},transparent)`,
                animation: "sb-scan 1.15s cubic-bezier(.45,0,.55,1) infinite",
              }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 1.5,
                background: `linear-gradient(90deg,transparent,${lighten(success)},transparent)`,
                boxShadow: `0 0 12px ${success}`,
                animation: "sb-scan 1.15s cubic-bezier(.45,0,.55,1) infinite",
              }}
            />
            {phase === "verify" && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at 50% 50%, ${rgba(success, 0.9)}, ${rgba(success, 0.4)})`,
                  mixBlendMode: "screen",
                  animation: "sb-verify .42s ease-out both",
                }}
              />
            )}
          </div>

          {phase === "verify" && (
            <span
              aria-hidden
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
            >
              <span
                style={{
                  position: "absolute",
                  width: height,
                  height,
                  borderRadius: 16,
                  border: `3px solid ${rgba(success, 0.8)}`,
                  animation: "sb-burst .6s cubic-bezier(.2,.8,.3,1) forwards",
                }}
              />
              {SPARKS.map((s, i) => (
                <span key={i} style={{ position: "absolute", width: 0, height: 0, transform: `rotate(${s.angle}deg)` }}>
                  <span
                    style={{
                      display: "block",
                      width: 4,
                      height: 4,
                      borderRadius: 1,
                      background: lighten(success),
                      boxShadow: `0 0 8px ${success}`,
                      animation: `sb-spark .62s cubic-bezier(.2,.7,.3,1) ${s.delay} forwards`,
                    }}
                  />
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {phase === "success" && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "relative",
            overflow: "hidden",
            width: "var(--sb-w)",
            height,
            boxSizing: "border-box",
            borderRadius: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 11,
            background: `linear-gradient(180deg, ${rgba(success, 0.2)}, ${rgba(success, 0.08)})`,
            border: `1px solid ${rgba(success, 0.5)}`,
            color: lighten(success, 0.55),
            fontSize: 15.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: `0 12px 34px ${rgba(success, 0.18)}, inset 0 1px 0 rgba(255,255,255,.12)`,
            animation: "sb-expand .42s cubic-bezier(.2,.85,.3,1) both",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }} aria-hidden>
            <circle cx="12" cy="12" r="10.5" stroke={rgba(success, 0.55)} strokeWidth="1.4" />
            <path
              d="M7 12.4L10.6 16L17 9"
              stroke={lighten(success)}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              strokeDashoffset="20"
              style={{ animation: "sb-draw .45s .2s cubic-bezier(.2,.8,.3,1) forwards" }}
            />
          </svg>
          <span style={{ animation: "sb-rise .4s .22s cubic-bezier(.2,.8,.3,1) both" }}>{successLabel}</span>
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "34%",
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)",
              animation: "sb-sweep 1.6s .35s ease-in-out infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------ couleurs / coins */

const CORNERS = [
  { pos: { top: -11, left: -11 }, radius: "5px 0 0 0", border: (c: string) => ({ borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` }) },
  { pos: { top: -11, right: -11 }, radius: "0 5px 0 0", border: (c: string) => ({ borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` }) },
  { pos: { bottom: -11, left: -11 }, radius: "0 0 0 5px", border: (c: string) => ({ borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` }) },
  { pos: { bottom: -11, right: -11 }, radius: "0 0 5px 0", border: (c: string) => ({ borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` }) },
] as const;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mix(hex: string, target: number, amount: number) {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${r},${g},${b})`;
}
function lighten(hex: string, amount = 0.35) {
  return mix(hex, 255, amount);
}
function darken(hex: string, amount = 0.12) {
  return mix(hex, 0, amount);
}
