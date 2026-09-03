/* @qrowg/social — v1.0
   Couche "contenu social" au-dessus de @qrowg/motion.
   Formats réseaux, scènes typographiques, export WebM + séquence PNG.
   Dépend de qrowg-motion.js (chargé avant). Expose window.QrowgSocial.

   Exemple minimal :
     const clip = QrowgSocial.createClip({
       format: 'reel',
       motion: { effect: 'tunnel', palette: 'signature', density: 1500 },
       scenes: [
         { dur: 2.2, kicker: 'QR CODE', title: 'Ton menu.\nEn 1 scan.' },
         { dur: 2.4, title: 'Zéro appli.', sub: 'Le client scanne, la carte s’ouvre.',
           motion: { effect: 'scan', speed: 1.4 } },
         { dur: 2.0, title: 'qrowg.com', cta: 'Crée le tien' }
       ]
     });
     const blob = await QrowgSocial.record(clip);          // WebM
     const pngs = await QrowgSocial.frames(clip, { fps: 30 }); // Blob[] -> ffmpeg
*/
(function () {
  let Q = window.QrowgMotion;
  if (!Q) {
    /* les scripts du helmet peuvent être injectés en parallèle : on attend le moteur */
    let tries = 0;
    const wait = setInterval(() => {
      if (window.QrowgMotion) { clearInterval(wait); boot(window.QrowgMotion); }
      else if (++tries > 200) { clearInterval(wait); console.error('[qrowg-social] qrowg-motion.js introuvable'); }
    }, 25);
  } else boot(Q);

  function boot(QM) {
  Q = QM;

  /* ---------------- Formats ---------------- */
  const FORMATS = {
    reel:     { w: 1080, h: 1920, label: 'Reel / Short',       net: 'Instagram · TikTok · YouTube', safe: { t: 220, b: 380, x: 90 } },
    story:    { w: 1080, h: 1920, label: 'Story',              net: 'Instagram · Facebook',         safe: { t: 250, b: 320, x: 90 } },
    tiktok:   { w: 1080, h: 1920, label: 'TikTok',             net: 'TikTok',                       safe: { t: 200, b: 500, x: 110 } },
    square:   { w: 1080, h: 1080, label: 'Carré',              net: 'Instagram · LinkedIn',         safe: { t: 90,  b: 90,  x: 90 } },
    portrait: { w: 1080, h: 1350, label: 'Portrait 4:5',       net: 'Instagram feed',               safe: { t: 100, b: 100, x: 90 } },
    pin:      { w: 1000, h: 1500, label: 'Épingle 2:3',        net: 'Pinterest',                    safe: { t: 90,  b: 90,  x: 80 } },
    wide:     { w: 1920, h: 1080, label: 'Paysage 16:9',       net: 'YouTube · LinkedIn',           safe: { t: 90,  b: 90,  x: 120 } },
    x:        { w: 1600, h: 900,  label: 'X / Twitter 16:9',   net: 'X',                            safe: { t: 70,  b: 70,  x: 100 } }
  };
  const FORMAT_KEYS = Object.keys(FORMATS);

  /* ---------------- Défauts ---------------- */
  const CLIP_DEFAULTS = {
    format: 'reel', fps: 30, duration: null, background: '#080A08',
    font: 'Inter', mono: 'JetBrains Mono',
    brand: { handle: '', cta: '', logo: true },
    motion: { effect: 'tunnel', palette: 'signature', deterministic: 1, seed: 7 },
    scrim: .5, progress: true, safeZones: false
  };
  const SCENE_DEFAULTS = {
    dur: 2.4, kicker: '', title: '', sub: '', cta: '',
    align: 'bottom', anim: 'rise', accent: null, motion: null
  };

  const ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack: t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
  };
  const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

  /* ---------------- Clip ---------------- */
  function createClip(opts) {
    const clip = Object.assign({}, CLIP_DEFAULTS, opts || {});
    clip.brand = Object.assign({}, CLIP_DEFAULTS.brand, opts && opts.brand);
    clip.motion = Object.assign({}, CLIP_DEFAULTS.motion, opts && opts.motion);
    clip.fmt = FORMATS[clip.format] || FORMATS.reel;
    clip.scenes = (clip.scenes || []).map(s => Object.assign({}, SCENE_DEFAULTS, s));
    let t = 0;
    clip.scenes.forEach(s => { s.start = t; t += s.dur; s.end = t; });
    clip.duration = clip.duration || t || 6;
    return clip;
  }

  /* ---------------- Typo ---------------- */
  function wrap(ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach(para => {
      const words = para.split(' '); let line = '';
      words.forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
        else line = test;
      });
      out.push(line);
    });
    return out;
  }

  function drawModule(ctx, x, y, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    const r = s * .28;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - s / 2, y - s / 2, s, s, r); else ctx.rect(x - s / 2, y - s / 2, s, s);
    ctx.fill(); ctx.restore();
  }

  function pal(clip) { return Q.PALETTES[clip.motion.palette] || Q.PALETTES.signature; }
  function accentOf(clip, scene) {
    if (scene && scene.accent) return scene.accent;
    return Q.rgba(Q.gradAt(clip.motion.hue || 0, pal(clip)), 1);
  }

  /* ---------------- Overlay ---------------- */
  /* Le titre ne doit jamais sortir de la zone sûre : on réduit par pas de 4 % jusqu'à 60 %. */
  function fitTitle(ctx, text, clip, maxW, maxH, base) {
    if (!text) return { size: Math.round(base), lines: [] };
    let size = Math.round(base);
    const min = Math.max(28, Math.round(base * .55));
    for (;;) {
      ctx.font = '700 ' + size + 'px "' + clip.font + '", sans-serif';
      const lines = wrap(ctx, text, maxW);
      const tooWide = lines.some(l => ctx.measureText(l).width > maxW + 1);
      if ((lines.length * size * 1.02 <= maxH && !tooWide) || size <= min) return { size, lines, clipped: size <= min && (lines.length * size * 1.02 > maxH || tooWide) };
      size = Math.round(size * .96);
    }
  }

  function drawOverlay(ctx, clip, t) {
    const F = clip.fmt, W = F.w, H = F.h;
    const scene = clip.scenes.find(s => t >= s.start && t < s.end) || clip.scenes[clip.scenes.length - 1];
    if (!scene) return;

    const local = t - scene.start, dur = scene.dur;
    const inT = clamp01(local / .55), outT = clamp01((dur - local) / .4);
    const vis = Math.min(inT === 1 ? 1 : ease.out(inT), outT === 1 ? 1 : ease.out(outT));
    const accent = accentOf(clip, scene);
    const padX = F.safe.x;
    const maxW = W - padX * 2;

    /* voile de lisibilité */
    if (clip.scrim > 0) {
      const g = ctx.createLinearGradient(0, H * (scene.align === 'center' ? 0 : .35), 0, H);
      const a = clip.scrim;
      if (scene.align === 'center') {
        const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .62);
        rg.addColorStop(0, 'rgba(6,7,10,' + (a * .8) + ')'); rg.addColorStop(1, 'rgba(6,7,10,0)');
        ctx.fillStyle = rg;
      } else {
        g.addColorStop(0, 'rgba(6,7,10,0)'); g.addColorStop(.55, 'rgba(6,7,10,' + (a * .82) + ')');
        g.addColorStop(1, 'rgba(6,7,10,' + Math.min(1, a * 1.1) + ')');
        ctx.fillStyle = g;
      }
      ctx.fillRect(0, 0, W, H);
    }

    const S = W / 1080;
    const subSize = Math.round((scene.subSize || 40) * S);
    const kickSize = Math.round(26 * S);
    const kickH0 = scene.kicker ? kickSize * 2.6 : 0;
    const ctaH0 = scene.cta ? 96 * S : 0;

    ctx.textBaseline = 'alphabetic';

    /* mesure du sous-titre (taille fixe) */
    ctx.font = '400 ' + subSize + 'px "' + clip.font + '", sans-serif';
    const subLines = scene.sub ? wrap(ctx, scene.sub, maxW * .92) : [];
    const subH = subLines.length * subSize * 1.35;

    /* le titre s'auto-ajuste : jamais de débordement hors zone sûre */
    const availH = H - F.safe.t - F.safe.b - kickH0 - (subLines.length ? subH + 22 * S : 0) - (ctaH0 ? ctaH0 + 34 * S : 0);
    const fit = fitTitle(ctx, scene.title, clip, maxW, availH, (scene.titleSize || 96) * S);
    const titleSize = fit.size, titleLines = fit.lines, lineH = titleSize * 1.02;

    const kickH = kickH0, ctaH = ctaH0;
    const blockH = kickH + titleLines.length * lineH + (subLines.length ? subH + 22 * S : 0) + (ctaH ? ctaH + 26 * S : 0);

    let y = scene.align === 'center'
      ? (H - blockH) / 2 + titleSize * .82
      : H - F.safe.b - blockH + titleSize * .82 + kickH;

    const cx = scene.align === 'center' ? W / 2 : padX;
    ctx.textAlign = scene.align === 'center' ? 'center' : 'left';

    /* kicker : module clignotant + mono */
    if (scene.kicker) {
      const ky = y - titleSize * .82 - kickSize * 1.1;
      const kx = scene.align === 'center' ? W / 2 : padX;
      ctx.font = '500 ' + kickSize + 'px "' + clip.mono + '", monospace';
      const tw = ctx.measureText(scene.kicker.toUpperCase()).width;
      const dotX = scene.align === 'center' ? kx - tw / 2 - 26 * S : kx + 7 * S;
      const blink = .55 + .45 * Math.sin(t * 6);
      drawModule(ctx, dotX, ky - kickSize * .32, 14 * S, accent, vis * blink);
      ctx.save(); ctx.globalAlpha = vis * .92; ctx.fillStyle = accent;
      ctx.letterSpacing && (ctx.letterSpacing = (4 * S) + 'px');
      ctx.fillText(scene.kicker.toUpperCase(), scene.align === 'center' ? kx + 13 * S : kx + 30 * S, ky);
      ctx.restore();
    }

    /* titre : révélation ligne par ligne */
    ctx.font = '700 ' + titleSize + 'px "' + clip.font + '", sans-serif';
    titleLines.forEach((line, i) => {
      const d = clamp01((local - .1 - i * .09) / .5);
      const e = ease.out(d) * outT;
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(0, (1 - ease.out(d)) * titleSize * .42);
      ctx.fillStyle = '#F4F1E8';
      ctx.fillText(line, cx, y + i * lineH);
      ctx.restore();
    });
    y += titleLines.length * lineH;

    /* sous-titre */
    if (subLines.length) {
      ctx.font = '400 ' + subSize + 'px "' + clip.font + '", sans-serif';
      y += 22 * S;
      subLines.forEach((line, i) => {
        const d = clamp01((local - .34 - i * .07) / .5);
        ctx.save();
        ctx.globalAlpha = ease.out(d) * outT * .82;
        ctx.translate(0, (1 - ease.out(d)) * subSize * .5);
        ctx.fillStyle = '#A7A69F';
        ctx.fillText(line, cx, y + i * subSize * 1.35);
        ctx.restore();
      });
      y += subH;
    }

    /* CTA : pilule construite en modules */
    if (scene.cta) {
      const d = clamp01((local - .5) / .5), e = ease.out(d) * outT;
      ctx.font = '600 ' + Math.round(34 * S) + 'px "' + clip.font + '", sans-serif';
      const tw = ctx.measureText(scene.cta).width;
      const pw = tw + 68 * S, ph = 84 * S;
      const px = scene.align === 'center' ? W / 2 - pw / 2 : padX;
      const py = y + 34 * S;
      ctx.save();
      ctx.globalAlpha = e;
      const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
      g.addColorStop(0, accent); g.addColorStop(1, Q.rgba(Q.gradAt((clip.motion.hue || 0) + .12, pal(clip)), 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 20 * S); else ctx.rect(px, py, pw, ph);
      ctx.fill();
      ctx.fillStyle = '#04120e'; ctx.textAlign = 'center';
      ctx.fillText(scene.cta, px + pw / 2, py + ph / 2 + 12 * S);
      ctx.restore();
    }

    /* marque : logo modules + handle */
    if (clip.brand.logo || clip.brand.handle) {
      const by = F.safe.t * .55, bx = padX;
      ctx.save(); ctx.globalAlpha = .9; ctx.textAlign = 'left';
      if (clip.brand.logo) {
        const u = 13 * S, g0 = 5 * S;
        const on = [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const lit = on.some(p => p[0] === i && p[1] === j);
          drawModule(ctx, bx + i * (u + g0), by + j * (u + g0), u, lit ? (i === 1 && j === 1 ? accent : '#F4F1E8') : '#252A32', lit ? 1 : .6);
        }
      }
      if (clip.brand.handle) {
        ctx.font = '500 ' + Math.round(24 * S) + 'px "' + clip.mono + '", monospace';
        ctx.fillStyle = '#A7A69F';
        ctx.fillText(clip.brand.handle, bx + (clip.brand.logo ? 72 * S : 0), by + 16 * S);
      }
      ctx.restore();
    }

    /* progression : barre de modules */
    if (clip.progress && clip.scenes.length > 1) {
      const n = clip.scenes.length, gapx = 8 * S;
      const barW = (W - padX * 2 - gapx * (n - 1)) / n, barY = F.safe.t * .28, barH = 7 * S;
      clip.scenes.forEach((s, i) => {
        const p = clamp01((t - s.start) / s.dur);
        const x = padX + i * (barW + gapx);
        ctx.save();
        ctx.globalAlpha = .22; ctx.fillStyle = '#F4F1E8';
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, barY, barW, barH, barH / 2); else ctx.rect(x, barY, barW, barH);
        ctx.fill();
        if (p > 0) {
          ctx.globalAlpha = .95; ctx.fillStyle = accent;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, barY, Math.max(barH, barW * p), barH, barH / 2); else ctx.rect(x, barY, barW * p, barH);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    /* zones sûres (aperçu seulement) */
    if (clip.safeZones) {
      ctx.save();
      ctx.strokeStyle = 'rgba(231,198,122,.5)'; ctx.setLineDash([12, 10]); ctx.lineWidth = 2;
      ctx.strokeRect(F.safe.x, F.safe.t, W - F.safe.x * 2, H - F.safe.t - F.safe.b);
      ctx.restore();
    }
  }

  /* ---------------- Moteur d'un clip ---------------- */
  function mount(clip, canvas) {
    canvas.width = clip.fmt.w; canvas.height = clip.fmt.h;
    const motionCv = document.createElement('canvas');
    const handle = Q.run(motionCv, clip.motion.effect, Object.assign({}, clip.motion, {
      manual: true, fixedSize: [clip.fmt.w, clip.fmt.h], deterministic: 1,
      pointer: (w, h, now) => ({ x: w / 2 + Math.cos(now / 2600) * w * .22, y: h / 2 + Math.sin(now / 2000) * h * .18, in: true })
    }));
    const ctx = canvas.getContext('2d');
    let applied = -1;
    return {
      handle, motionCv, ctx,
      /* avance d'un pas fixe puis compose */
      step(t, dt) {
        const idx = clip.scenes.findIndex(s => t >= s.start && t < s.end);
        if (idx !== applied) {
          applied = idx;
          const s = clip.scenes[idx];
          if (s && s.motion) handle.apply(s.motion);
          else if (idx >= 0) handle.apply({ effect: clip.motion.effect });
        }
        handle.step(dt, t * 1000);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = clip.background; ctx.fillRect(0, 0, clip.fmt.w, clip.fmt.h);
        ctx.drawImage(motionCv, 0, 0);
        drawOverlay(ctx, clip, t);
      },
      destroy() { handle.destroy(); }
    };
  }

  async function fonts(clip) {
    if (!document.fonts) return;
    const list = ['700 96px "' + clip.font + '"', '400 40px "' + clip.font + '"', '500 26px "' + clip.mono + '"'];
    try { await Promise.all(list.map(f => document.fonts.load(f, 'Aq'))); await document.fonts.ready; } catch (e) { }
  }

  /* Rendu d'une frame isolée (miniature, couverture, épingle statique). */
  async function frame(clip, t, canvas) {
    await fonts(clip);
    const cv = canvas || document.createElement('canvas');
    const m = mount(clip, cv);
    const step = 1 / clip.fps;
    for (let k = 0, tt = 0; tt <= t + 1e-6; k++, tt = k * step) m.step(tt, step);
    m.destroy();
    return cv;
  }

  /* Séquence PNG déterministe — la voie propre vers un MP4 (ffmpeg). */
  async function frames(clip, opts) {
    opts = opts || {};
    await fonts(clip);
    const fps = opts.fps || clip.fps, step = 1 / fps;
    const total = Math.round(clip.duration * fps);
    const cv = document.createElement('canvas');
    const m = mount(clip, cv);
    const out = [];
    for (let i = 0; i < total; i++) {
      m.step(i * step, step);
      out.push(await new Promise(r => cv.toBlob(r, 'image/png')));
      if (opts.onProgress) opts.onProgress((i + 1) / total, i + 1, total);
      if (i % 6 === 5) await new Promise(r => setTimeout(r, 0));
    }
    m.destroy();
    return out;
  }

  /* Enregistrement WebM en temps réel (MediaRecorder). */
  async function record(clip, opts) {
    opts = opts || {};
    await fonts(clip);
    const fps = opts.fps || clip.fps;
    const cv = document.createElement('canvas');
    const m = mount(clip, cv);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'video/webm';
    const stream = cv.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: opts.bitrate || 14e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })); });
    rec.start();
    const step = 1000 / fps, total = Math.round(clip.duration * fps);
    let i = 0, t0 = performance.now();
    await new Promise(res => {
      function tick() {
        const target = Math.min(total, Math.floor((performance.now() - t0) / step) + 1);
        while (i < target) { m.step(i / fps, 1 / fps); track.requestFrame && track.requestFrame(); i++; }
        if (opts.onProgress) opts.onProgress(i / total, i, total);
        if (i >= total) return res();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    rec.stop();
    const blob = await done;
    m.destroy();
    return blob;
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------------- Recettes prêtes à l'emploi ---------------- */
  const RECIPES = {
    hook_promesse_cta: (o) => ({
      format: o.format || 'reel',
      motion: { effect: 'tunnel', palette: o.palette || 'signature', density: 1500, speed: 1.1 },
      brand: { handle: o.handle || '@qrowg', logo: true },
      scenes: [
        { dur: 2.2, kicker: o.kicker || 'QROWG', title: o.hook, align: 'center', titleSize: 104 },
        { dur: 2.6, title: o.promesse, sub: o.detail || '', motion: { effect: 'scan', speed: 1.3 } },
        { dur: 2.2, title: o.cta_title || 'Essaie maintenant', cta: o.cta || 'qrowg.com', align: 'center', motion: { effect: 'publish', speed: 1 } }
      ]
    }),
    probleme_solution: (o) => ({
      format: o.format || 'reel',
      motion: { effect: 'glitch', palette: o.palette || 'braise', speed: 1.2 },
      brand: { handle: o.handle || '@qrowg', logo: true },
      scenes: [
        { dur: 2.4, kicker: 'LE PROBLÈME', title: o.probleme, motion: { effect: 'glitch', chaos: .5 } },
        { dur: 2.6, kicker: 'LA SOLUTION', title: o.solution, motion: { effect: 'focus', palette: o.palette || 'signature', speed: 1.1 } },
        { dur: 2.0, title: o.cta_title || 'Un QR. Tout change.', cta: o.cta || 'qrowg.com', align: 'center', motion: { effect: 'publish' } }
      ]
    }),
    liste_3_points: (o) => ({
      format: o.format || 'reel',
      motion: { effect: 'flow', palette: o.palette || 'glacier', speed: 1.1 },
      brand: { handle: o.handle || '@qrowg', logo: true },
      scenes: [
        { dur: 1.8, kicker: o.kicker || '3 RAISONS', title: o.titre, align: 'center' },
        { dur: 2.0, kicker: '01', title: o.points[0], motion: { effect: 'scan' } },
        { dur: 2.0, kicker: '02', title: o.points[1], motion: { effect: 'laser' } },
        { dur: 2.0, kicker: '03', title: o.points[2], motion: { effect: 'stats', palette: 'or' } },
        { dur: 1.8, title: o.cta_title || 'À toi de jouer.', cta: o.cta || 'qrowg.com', align: 'center', motion: { effect: 'publish' } }
      ]
    }),
    chiffre_choc: (o) => ({
      format: o.format || 'square',
      motion: { effect: 'stats', palette: 'or', speed: 1 },
      brand: { handle: o.handle || '@qrowg', logo: true },
      progress: false,
      scenes: [
        { dur: 2.6, kicker: o.kicker || 'DONNÉE', title: o.chiffre, sub: o.contexte, align: 'center', titleSize: 168 },
        { dur: 2.4, title: o.consequence, sub: o.detail || '', motion: { effect: 'equalizer', palette: 'signature' } }
      ]
    }),
    pin_statique: (o) => ({
      format: 'pin',
      motion: { effect: o.effect || 'gen', palette: o.palette || 'signature', speed: .8 },
      brand: { handle: o.handle || '@qrowg', logo: true },
      progress: false,
      scenes: [{ dur: 4, kicker: o.kicker || '', title: o.titre, sub: o.sous_titre || '', cta: o.cta || '', align: 'bottom' }]
    })
  };

  /* ---------------- Contrôle qualité ----------------
     Un agent ne voit pas le rendu : validate() est son garde-fou.
     -> { ok, errors[], warnings[], duration, scenes } */
  function validate(input) {
    const clip = input && input.fmt ? input : createClip(input || {});
    const errors = [], warnings = [];
    const push = (arr, scene, msg) => arr.push(scene === null ? msg : 'scène ' + (scene + 1) + ' : ' + msg);

    if (!FORMATS[clip.format]) push(errors, null, 'format inconnu « ' + clip.format + ' » (' + FORMAT_KEYS.join(' ') + ')');
    if (!Q.PALETTES[clip.motion.palette]) push(errors, null, 'palette inconnue « ' + clip.motion.palette + ' » (' + Q.PALETTE_KEYS.join(' ') + ')');
    if (!clip.scenes.length) push(errors, null, 'aucune scène');

    const F = clip.fmt, W = F.w, H = F.h, S = W / 1080;
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
    const ctx = cv.getContext('2d');
    const maxW = W - F.safe.x * 2;
    let ctas = 0;

    clip.scenes.forEach((s, i) => {
      const eff = (s.motion && s.motion.effect) || clip.motion.effect;
      if (!Q.effects[eff]) push(errors, i, 'moteur inconnu « ' + eff + ' »');
      if (!s.title && !s.sub && !s.cta) push(warnings, i, 'plan muet (aucun texte)');
      if (s.dur < 1.8) push(warnings, i, 'durée ' + s.dur.toFixed(1) + 's — en dessous de 1,8 s le texte n’est pas lisible');
      if (s.dur > 6) push(warnings, i, 'durée ' + s.dur.toFixed(1) + 's — au-delà de 6 s le plan traîne');
      const words = String(s.title || '').trim().split(/\s+/).filter(Boolean).length;
      if (words > 9) push(warnings, i, 'titre de ' + words + ' mots — coupe en deux scènes (max ~7)');
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.title + s.sub + s.cta)) push(warnings, i, 'emoji détecté — hors marque');
      if (/!{2,}/.test(s.title + s.sub)) push(warnings, i, 'ponctuation surjouée');
      if (s.cta) { ctas++; if (i !== clip.scenes.length - 1) push(warnings, i, 'CTA ailleurs que sur la dernière scène'); }

      /* débordement réel, mesuré */
      const subSize = Math.round((s.subSize || 40) * S), kickSize = Math.round(26 * S);
      ctx.font = '400 ' + subSize + 'px "' + clip.font + '", sans-serif';
      const subLines = s.sub ? wrap(ctx, s.sub, maxW * .92) : [];
      const availH = H - F.safe.t - F.safe.b - (s.kicker ? kickSize * 2.6 : 0)
        - (subLines.length ? subLines.length * subSize * 1.35 + 22 * S : 0) - (s.cta ? 96 * S + 34 * S : 0);
      const f = fitTitle(ctx, s.title, clip, maxW, availH, (s.titleSize || 96) * S);
      if (f.clipped) push(errors, i, 'le titre déborde de la zone sûre même réduit — raccourcis-le');
      else if (f.size < (s.titleSize || 96) * S * .8) push(warnings, i, 'titre réduit à ' + Math.round(f.size / S) + 'px pour tenir — il gagnerait à être plus court');
    });

    if (ctas === 0) push(warnings, null, 'aucun CTA — le clip ne dit pas quoi faire');
    if (ctas > 1) push(errors, null, ctas + ' CTA — un seul par clip');
    const d = clip.duration;
    const vertical = F.h > F.w;
    /* Seuil parametrable : un clip long assume (30-35 s) ne doit plus obliger a rendre
       avec --no-validate, ce qui desactivait AUSSI les vraies erreurs.
       Poser "maxDuration": 36 dans le clip pour un format long. */
    const maxDur = (typeof clip.maxDuration === 'number' && clip.maxDuration > 0) ? clip.maxDuration : 15;
    if (vertical && d > maxDur) push(warnings, null, 'durée ' + d.toFixed(1) + 's — au-delà de ' + maxDur + ' s l’audience décroche');
    if (vertical && d < 4) push(warnings, null, 'durée ' + d.toFixed(1) + 's — trop court pour raconter quelque chose');
    const effs = clip.scenes.map(s => (s.motion && s.motion.effect) || clip.motion.effect);
    if (effs.length > 2 && new Set(effs).size === 1) push(warnings, null, 'un seul moteur sur tout le clip — change de moteur à chaque scène, c’est le montage');
    const pals = clip.scenes.map(s => (s.motion && s.motion.palette) || clip.motion.palette);
    if (new Set(pals).size > 1) push(warnings, null, 'palette variable — garde la même sur tout le clip');

    return { ok: !errors.length, errors, warnings, duration: d, scenes: clip.scenes.length, format: clip.format };
  }

  /* Planche-contact : une seule image pour juger tout le clip d'un coup d'œil. */
  async function contactSheet(clip, opts) {
    opts = opts || {};
    const n = opts.count || 6, cols = opts.cols || 3, pad = 16;
    await fonts(clip);
    const src = document.createElement('canvas');
    const m = mount(clip, src);
    const tw = opts.thumbWidth || 340, th = Math.round(tw * clip.fmt.h / clip.fmt.w);
    const rows = Math.ceil(n / cols);
    const out = document.createElement('canvas');
    out.width = cols * tw + pad * (cols + 1); out.height = rows * th + pad * (rows + 1) + 34;
    const o = out.getContext('2d');
    o.fillStyle = '#080A08'; o.fillRect(0, 0, out.width, out.height);
    const step = 1 / clip.fps;
    const marks = [];
    for (let i = 0; i < n; i++) marks.push(Math.min(clip.duration - .05, (i + .45) * clip.duration / n));
    let mi = 0;
    for (let k = 0; k * step <= clip.duration; k++) {
      const t = k * step;
      m.step(t, step);
      if (mi < marks.length && t >= marks[mi]) {
        const col = mi % cols, row = (mi / cols) | 0;
        const x = pad + col * (tw + pad), y = pad + row * (th + pad);
        o.drawImage(src, x, y, tw, th);
        o.strokeStyle = 'rgba(255,255,255,.1)'; o.strokeRect(x + .5, y + .5, tw, th);
        o.fillStyle = '#A7A69F'; o.font = '500 12px "JetBrains Mono", monospace';
        o.fillText(t.toFixed(2) + 's', x + 6, y + th + 14);
        mi++;
      }
      if (k % 30 === 29) await new Promise(r => setTimeout(r, 0));
    }
    o.fillStyle = '#565D67'; o.font = '500 13px "JetBrains Mono", monospace';
    o.fillText(clip.format + ' · ' + clip.fmt.w + '×' + clip.fmt.h + ' · ' + clip.duration.toFixed(1) + 's · ' + clip.scenes.length + ' scènes',
      pad, out.height - 12);
    m.destroy();
    return out;
  }

  window.QrowgSocial = {
    VERSION: '1.1',
    FORMATS, FORMAT_KEYS, CLIP_DEFAULTS, SCENE_DEFAULTS, RECIPES,
    createClip, mount, drawOverlay, frame, frames, record, download, validate, contactSheet,
    recipe(name, opts) { return createClip(RECIPES[name](opts)); }
  };
  window.dispatchEvent(new Event('qrowg-social-ready'));
  }
})();
