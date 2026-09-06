"use client";

import { useMemo, useState, useTransition } from "react";
import styles from "./AvatarStudio.module.css";
import {
  buildExportSvg,
  currentGrid,
  FAMILIES,
  PRESETS,
  type AvatarConfig,
  type AvatarShape,
  type Family,
  type ModuleShape,
} from "./templates";
import { saveAvatar } from "./actions";

/* SVG de modules rendu en React (pas de dangerouslySetInnerHTML) */
function QrSvg({
  grid,
  gap,
  shape,
  fg,
}: {
  grid: number[][];
  gap: number;
  shape: ModuleShape;
  fg: string;
}) {
  const G = grid.length;
  const rx = shape === "dot" ? (1 - gap) / 2 : shape === "rounded" ? 0.2 : 0;
  return (
    <svg
      viewBox={`-1 -1 ${G + 2} ${G + 2}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering={shape === "square" ? "crispEdges" : "geometricPrecision"}
      width="100%"
      height="100%"
      aria-hidden
    >
      {grid.flatMap((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${y}_${x}`}
              x={x + gap / 2}
              y={y + gap / 2}
              width={1 - gap}
              height={1 - gap}
              rx={rx}
              fill={fg}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function download(filename: string, url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* HSL -> hex (#rrggbb) pour les couleurs aléatoires (compatible <input type=color>) */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* Tirage 100% aléatoire de TOUS les paramètres (famille, modèle, formes, espacement, cadre, couleurs) */
function randomAvatar(): AvatarConfig {
  const family = pick(Object.keys(FAMILIES) as Family[]);
  // Couleurs : soit un preset soigné, soit une paire générée à fort contraste
  let fg: string, bg: string;
  if (Math.random() < 0.45) {
    const p = pick(PRESETS);
    fg = p.fg;
    bg = p.bg;
  } else {
    const hue = Math.floor(rand(0, 360));
    fg = hslToHex(hue, rand(62, 92), rand(54, 72));
    bg = Math.random() < 0.72
      ? hslToHex((hue + Math.floor(rand(-20, 20)) + 360) % 360, rand(18, 42), rand(5, 11))   // fond sombre teinté
      : hslToHex((hue + 180) % 360, rand(8, 18), rand(92, 97));                               // fond clair complémentaire
  }
  return {
    family,
    index: Math.floor(Math.random() * FAMILIES[family].count),
    avatarShape: pick(["rounded", "circle"] as const),
    moduleShape: pick(["square", "rounded", "dot"] as const),
    gap: Math.round(rand(0, 0.32) / 0.02) * 0.02,
    showFrame: family !== "patterns" && Math.random() < 0.6,
    fg,
    bg,
  };
}

export default function AvatarStudio({
  initialConfig,
  signedIn,
  refCode = "",
}: {
  initialConfig: AvatarConfig;
  signedIn: boolean;
  refCode?: string;
}) {
  const [cfg, setCfg] = useState<AvatarConfig>(initialConfig);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const set = (patch: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const previewGrid = useMemo(
    () => currentGrid(cfg.family, cfg.index, cfg.showFrame),
    [cfg.family, cfg.index, cfg.showFrame]
  );

  const onSave = () => {
    setStatus(null);
    startTransition(async () => {
      const res = await saveAvatar(buildExportSvg(cfg), cfg);
      if (res.ok) setStatus("Avatar enregistré dans votre profil.");
      else setStatus((res as { error: string }).error);
    });
  };

  const onPng = () => {
    const svg = buildExportSvg(cfg);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024;
      c.getContext("2d")!.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);
      download("qrfolio-avatar.png", c.toDataURL("image/png"));
    };
    img.src = url;
  };

  const onSvg = () => {
    const blob = new Blob([buildExportSvg(cfg)], { type: "image/svg+xml" });
    download("qrfolio-avatar.svg", URL.createObjectURL(blob));
  };

  // ── Partage (croissance : chaque partage met en avant QRowg + son lien) ──
  // Le lien porte le code d'affiliation (?ref=) : chaque inscription via ce lien
  // devient un parrainage traçable (cf. onglet Parrainage du profil).
  const SHARE_URL = refCode ? `https://qrowg.com?ref=${refCode}` : "https://qrowg.com";
  const SHARE_TEXT = "J'ai créé mon avatar QR-art avec QRowg ✨ Créez le vôtre gratuitement :";
  const u = encodeURIComponent(SHARE_URL);
  const t = encodeURIComponent(SHARE_TEXT);
  const shareTargets: { label: string; href: string; color: string }[] = [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, color: "#25D366" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, color: "#F5F0E8" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, color: "#0A66C2" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: "#1877F2" },
    { label: "E-mail", href: `mailto:?subject=${encodeURIComponent("Mon avatar QRowg")}&body=${t}%20${u}`, color: "#A8A190" },
  ];

  function avatarPngFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const blob = new Blob([buildExportSvg(cfg)], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = 1024; c.height = 1024;
        c.getContext("2d")!.drawImage(img, 0, 0, 1024, 1024);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b ? new File([b], "qrfolio-avatar.png", { type: "image/png" }) : null), "image/png");
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  const onShareNative = async () => {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (!nav.share) { copyShareLink(); return; }
    try {
      const file = await avatarPngFile();
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "QRowg — Avatar QR-art", text: `${SHARE_TEXT} ${SHARE_URL}` } as ShareData);
      } else {
        await nav.share({ title: "QRowg — Avatar QR-art", text: SHARE_TEXT, url: SHARE_URL });
      }
    } catch { /* partage annulé */ }
  };

  const copyShareLink = async () => {
    try { await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`); setStatus("Lien copié — partagez-le pour faire découvrir QRowg !"); } catch { /* noop */ }
  };

  return (
    <div className={styles.wrap}>
      <header>
        <a href="/dashboard/profile" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#A8A29A", textDecoration: "none", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Retour au profil
        </a>
        <div className={styles.eyebrow}>QRowg · Studio d&apos;avatar</div>
        <h1 className={styles.title}>
          Composez votre <em>photo de profil</em>.
        </h1>
        <p className={styles.lede}>
          Choisissez un modèle, ajustez les modules et les couleurs, puis
          enregistrez votre avatar en QR-art sur votre profil.
        </p>
      </header>

      <div className={styles.grid}>
        {/* Aperçu */}
        <div className={`${styles.panel} ${styles.stage}`}>
          <div
            className={`${styles.preview} ${cfg.avatarShape === "circle" ? styles.circle : styles.rounded}`}
            style={{ background: cfg.bg }}
          >
            <span className={styles.ring} />
            <QrSvg grid={previewGrid} gap={cfg.gap} shape={cfg.moduleShape} fg={cfg.fg} />
          </div>

          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.primary}`} onClick={onSave} disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer sur mon profil"}
            </button>
            <button
              className={`${styles.btn} ${styles.ghost}`}
              aria-label="Tout aléatoire (formes, couleurs, modèle)"
              title="Surprends-moi — tout aléatoire"
              onClick={() => setCfg(randomAvatar())}
            >
              ⤮
            </button>
          </div>
          {status && (
            <p className={styles.status}>
              {signedIn ? status : "Connectez-vous pour enregistrer. Le téléchargement reste disponible."}
            </p>
          )}
        </div>

        {/* Réglages */}
        <div className={`${styles.panel} ${styles.settings}`}>
          <div className={styles.block}>
            <span className={styles.label}>Famille</span>
            <div className={styles.tabs} role="tablist">
              {(Object.keys(FAMILIES) as Family[]).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={cfg.family === key}
                  className={styles.tab}
                  onClick={() => set({ family: key, index: 0 })}
                >
                  {FAMILIES[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Modèle</span>
            <div className={styles.gallery}>
              {Array.from({ length: FAMILIES[cfg.family].count }).map((_, i) => (
                <div
                  key={i}
                  className={styles.swatch}
                  aria-selected={cfg.index === i}
                  onClick={() => set({ index: i })}
                >
                  <QrSvg
                    grid={currentGrid(cfg.family, i, cfg.showFrame)}
                    gap={cfg.gap}
                    shape={cfg.moduleShape}
                    fg="currentColor"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Forme de l&apos;avatar</span>
            <Seg<AvatarShape>
              value={cfg.avatarShape}
              options={[
                { v: "rounded", label: "Carré arrondi" },
                { v: "circle", label: "Cercle" },
              ]}
              onChange={(v) => set({ avatarShape: v })}
            />
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Forme des modules</span>
            <Seg<ModuleShape>
              value={cfg.moduleShape}
              options={[
                { v: "square", label: "Carré" },
                { v: "rounded", label: "Arrondi" },
                { v: "dot", label: "Point" },
              ]}
              onChange={(v) => set({ moduleShape: v })}
            />
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Espacement des modules</span>
            <div className={styles.row}>
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.02}
                aria-label="Espacement" value={cfg.gap}
                onChange={(e) => set({ gap: parseFloat(e.target.value) })}
                className={styles.range}
              />
              <span className={styles.val}>{cfg.gap.toFixed(2)}</span>
            </div>
          </div>

          {cfg.family !== "patterns" && (
            <div className={styles.block}>
              <div className={styles.row}>
                <span className={styles.label} style={{ margin: 0 }}>Cadre QR</span>
                <button
                  role="switch"
                  aria-checked={cfg.showFrame}
                  className={styles.switch}
                  onClick={() => set({ showFrame: !cfg.showFrame })}
                />
              </div>
            </div>
          )}

          <div className={styles.block}>
            <span className={styles.label}>Couleurs</span>
            <div className={styles.presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={styles.preset}
                  title={p.name}
                  aria-selected={cfg.fg === p.fg && cfg.bg === p.bg}
                  onClick={() => set({ fg: p.fg, bg: p.bg })}
                >
                  <i style={{ background: p.bg }} />
                  <i className={styles.presetFg} style={{ background: p.fg }} />
                </button>
              ))}
            </div>
            <div className={styles.colors}>
              <label className={styles.colorField}>
                <span>Modules</span>
                <div className={styles.colorInput}>
                  <input type="color" value={cfg.fg} onChange={(e) => set({ fg: e.target.value })} />
                  <code>{cfg.fg.toUpperCase()}</code>
                </div>
              </label>
              <label className={styles.colorField}>
                <span>Fond</span>
                <div className={styles.colorInput}>
                  <input type="color" value={cfg.bg} onChange={(e) => set({ bg: e.target.value })} />
                  <code>{cfg.bg.toUpperCase()}</code>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Export + partage — en bas sur mobile (l'aperçu et les réglages passent avant) */}
        <div className={`${styles.panel} ${styles.secondaryActions}`}>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={onPng}>Télécharger PNG</button>
            <button className={styles.btn} onClick={onSvg}>SVG</button>
          </div>

          {/* Partage — met en avant QRowg (croissance / trafic) */}
          <div className={styles.actions} style={{ position: "relative" }}>
            <button
              className={styles.btn}
              onClick={() => setShareOpen((v) => !v)}
              style={{ borderColor: "rgba(57,255,143,0.35)", background: "rgba(57,255,143,0.10)", color: "var(--success)", fontWeight: 700 }}
            >
              🔗 Partager mon avatar
            </button>

            {shareOpen && (
              <div
                style={{ position: "absolute", left: 0, right: 0, bottom: "calc(100% + 8px)", zIndex: 20, background: "#15130b", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 14, padding: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}
              >
                <p style={{ margin: "0 0 4px", color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>Faites découvrir QRowg</p>
                <p style={{ margin: "0 0 10px", color: "#A8A190", fontSize: 11, lineHeight: 1.5 }}>Partagez votre avatar avec le lien — chaque partage fait grandir la communauté ✨</p>
                <button
                  type="button"
                  onClick={() => { onShareNative(); setShareOpen(false); }}
                  style={{ width: "100%", marginBottom: 8, padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#0b0b0b", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Partage rapide
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {shareTargets.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}40`, color: s.color, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                    >
                      {s.label}
                    </a>
                  ))}
                  <button
                    type="button"
                    onClick={() => { copyShareLink(); setShareOpen(false); }}
                    style={{ gridColumn: "1 / -1", padding: "9px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Copier le lien
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.seg}>
      {options.map((o) => (
        <button
          key={o.v}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
