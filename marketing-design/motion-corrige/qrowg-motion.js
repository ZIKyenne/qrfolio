/* @qrowg/motion — v2.0 "Studio"
   Moteur d'animation Qrowg. Trois lois : modules carrés, mouvement organique, lumière retenue.
   41 moteurs · 24 paramètres globaux · 9 palettes.
   window.QrowgMotion + <qrowg-fx effect="..."> . Aucune dépendance. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const TAU = Math.PI * 2;

  /* Palette alignee sur la charte QRowg officielle (voir guide-identite.md).
     gold = #D4AF45, gold2 = #B8922F, white = ivoire #F4F1E8,
     muted = gris chaud #A7A69F, red = rouge metier #A5122A.
     Les teintes froides restent disponibles pour les palettes non-marque. */
  const PAL = {
    turq: [45, 225, 194], emer: [18, 185, 129], cyan: [34, 211, 238],
    blue: [59, 130, 246], viol: [139, 92, 246],
    gold: [212, 175, 69], gold2: [184, 146, 47], sand: [244, 222, 170],
    white: [244, 241, 232], red: [165, 18, 42], muted: [167, 166, 159]
  };
  const PALETTES = {
    signature: [PAL.gold, PAL.sand, PAL.gold2, [230, 200, 120], PAL.gold],  /* = or : la marque par defaut */
    froid: [PAL.turq, PAL.cyan, PAL.blue, PAL.viol, PAL.emer],  /* ancienne signature, hors marque */
    glacier: [PAL.cyan, [160, 220, 255], PAL.blue, [120, 160, 255], PAL.turq],
    aurore: [PAL.emer, PAL.turq, PAL.cyan, [120, 255, 200], PAL.emer],
    nebula: [PAL.viol, [200, 120, 255], PAL.blue, PAL.cyan, PAL.viol],
    or: [PAL.gold, PAL.sand, PAL.gold2, [230, 200, 120], PAL.gold],  /* plus aucune teinte froide */
    braise: [[255, 120, 60], PAL.gold, [244, 113, 113], [255, 90, 140], [255, 160, 80]],
    sakura: [[255, 140, 190], [200, 120, 255], [255, 190, 220], PAL.cyan, [255, 140, 190]],
    menthe: [[120, 255, 200], PAL.turq, [200, 255, 230], PAL.emer, [120, 255, 200]],
    mono: [PAL.white, [190, 198, 208], PAL.muted, [190, 198, 208], PAL.white]
  };
  const PALETTE_KEYS = Object.keys(PALETTES);

  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function gradAt(t, pal) {
    pal = pal || PALETTES.signature; t = (t % 1 + 1) % 1;
    const n = pal.length, f = t * n, i = Math.floor(f) % n;
    return mix(pal[i], pal[(i + 1) % n], f - i);
  }
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

  const hs = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return hs(xi, yi) * (1 - u) * (1 - v) + hs(xi + 1, yi) * u * (1 - v) + hs(xi, yi + 1) * (1 - u) * v + hs(xi + 1, yi + 1) * u * v;
  }

  /* config courante — lue par la primitive */
  let CUR = null, T = 0;

  function chroma(c, k) {
    if (k === 1) return c;
    const l = c[0] * .299 + c[1] * .587 + c[2] * .114;
    return [l + (c[0] - l) * k, l + (c[1] - l) * k, l + (c[2] - l) * k];
  }

  /* LA primitive : un module. Toute forme dérive d'ici. */
  function module(ctx, x, y, s, color, alpha, glow) {
    const g = CUR; if (!g) return;
    if (glow === undefined) glow = 1;
    s *= g.size; if (s <= .12) return;
    alpha *= g.opacity; if (alpha <= .004) return;
    if (g.jitter) {
      const j = g.jitter * s * 1.6;
      x += (hs(Math.round(x), Math.round(y) + T | 0) - .5) * j;
      y += (hs(Math.round(y), Math.round(x) - (T | 0)) - .5) * j;
    }
    color = chroma(color, g.chroma);
    const r = Math.max(0, s * g.radius);
    const G = glow * g.glow;
    if (G > .02) {
      ctx.globalAlpha = Math.min(1, alpha * .16 * G); ctx.fillStyle = rgba(color, 1);
      shape(ctx, x, y, s * 2.8, r * 2.4, g.shape, true);
    }
    ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = rgba(color, 1); ctx.strokeStyle = rgba(color, 1);
    shape(ctx, x, y, s, r, g.shape, false);
  }

  function shape(ctx, x, y, s, r, kind, isGlow) {
    const h = s / 2;
    if (kind === 'losange') {
      ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h, y); ctx.lineTo(x, y + h); ctx.lineTo(x - h, y); ctx.closePath(); ctx.fill(); return;
    }
    if (kind === 'barre') { rr(ctx, x - h * 1.5, y - h * .38, s * 1.5, s * .76, Math.min(r, s * .19)); return; }
    if (kind === 'colonne') { rr(ctx, x - h * .38, y - h * 1.5, s * .76, s * 1.5, Math.min(r, s * .19)); return; }
    if (kind === 'croix') {
      rr(ctx, x - h, y - h * .3, s, s * .6, r * .5); rr(ctx, x - h * .3, y - h, s * .6, s, r * .5); return;
    }
    if (kind === 'cadre' && !isGlow) {
      ctx.lineWidth = Math.max(1, s * .22);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - h + s * .11, y - h + s * .11, s * .78, s * .78, r * .78);
      else ctx.rect(x - h, y - h, s, s);
      ctx.stroke(); return;
    }
    if (kind === 'point') { ctx.beginPath(); ctx.arc(x, y, h, 0, TAU); ctx.fill(); return; }
    rr(ctx, x - h, y - h, s, s, r);
  }
  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect && r > .4) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
  }
  const M = module;

  function fit(cv, fixed) {
    if (fixed) {
      cv.width = fixed[0]; cv.height = fixed[1];
      const c2 = cv.getContext('2d'); c2.setTransform(1, 0, 0, 1, 0, 0);
      return { c: c2, w: fixed[0], h: fixed[1], dpr: 1 };
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const b = cv.getBoundingClientRect();
    const w = Math.max(1, b.width), h = Math.max(1, b.height);
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h, dpr };
  }

  function qrMatrix(n, seed) {
    let s = seed || 1; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const m = []; for (let i = 0; i < n * n; i++) m.push(rnd() > 0.47);
    const block = (r, cc) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++)
      m[(r + i) * n + (cc + j)] = (i === 0 || i === 6 || j === 0 || j === 6) || (i >= 2 && i <= 4 && j >= 2 && j <= 4); };
    block(0, 0); block(0, n - 7); block(n - 7, 0);
    return m;
  }

  const P = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', e => { P.x = e.clientX; P.y = e.clientY; }, { passive: true });
  function localP(cv) {
    const b = cv.getBoundingClientRect();
    return { x: P.x - b.left, y: P.y - b.top, in: !TOUCH && P.x >= b.left && P.x <= b.right && P.y >= b.top && P.y <= b.bottom };
  }

  /* ============================ MOTEURS ============================ */
  const E = {};
  const CATS = {};
  function reg(key, cat, label, def) { E[key] = def; def.label = label; def.cat = cat; (CATS[cat] = CATS[cat] || []).push(key); }

  /* ---- Signature ---- */
  reg('tunnel', 'Signature', 'Tunnel QR', {
    init(c, w, h, st, cfg) {
      const N = RM ? 220 : Math.min(cfg.density, Math.floor(w * h / 700) + 200);
      st.p = []; st.rot = 0; st.mx = .5; st.my = .5;
      for (let i = 0; i < N; i++) st.p.push({ a: Math.random() * TAU, r: Math.random(), sp: .03 + Math.random() * .055, tw: Math.random() * TAU, layer: Math.random() });
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const rx = ptr.in ? ptr.x / w : .5, ry = ptr.in ? ptr.y / h : .5;
      st.mx += (rx - st.mx) * .05; st.my += (ry - st.my) * .05;
      st.rot += dt * .12 * cfg.speed;
      const cx = w * .5 + (st.mx - .5) * 70 * cfg.react, cy = h * .46 + (st.my - .5) * 70 * cfg.react;
      const maxR = Math.hypot(w, h) * .62 * cfg.spread, sym = cfg.symmetry;
      for (const p of st.p) {
        p.r -= p.sp * dt * 1.7 * cfg.speed; if (p.r <= .02) { p.r = 1; p.a = Math.random() * TAU; }
        const depth = 1 - p.r, swirl = depth * cfg.spiral;
        const rad = p.r * maxR * (.7 + p.layer * .5);
        const s = 2 + depth * depth * (12 + p.layer * 8);
        const col = gradAt(p.a / TAU + st.rot * .15 + depth * .2 + cfg.hue, cfg.pal);
        const tw = 1 - cfg.wave * (.5 - .5 * Math.sin(now / 500 + p.tw));
        const alpha = Math.min(1, depth * 1.6) * Math.min(1, p.r * 4) * tw * .9;
        for (let k = 0; k < sym; k++) {
          const ang = p.a + st.rot + swirl + k * TAU / sym + chaosOf(p.tw, now, cfg);
          M(c, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * .92 + grav(depth, cfg, h), s, col, alpha, .8);
        }
      }
    }
  });

  function chaosOf(seed, now, cfg) { return cfg.chaos ? Math.sin(now / 700 + seed * 9) * cfg.chaos * 1.2 : 0; }
  function grav(t, cfg, h) { return cfg.gravity ? cfg.gravity * t * t * h * .25 : 0; }

  reg('vortex', 'Signature', 'Vortex Pixel', {
    init(c, w, h, st, cfg) {
      st.p = []; st.rot = 0;
      const N = RM ? 90 : Math.round(cfg.density * .3);
      for (let i = 0; i < N; i++) st.p.push({ a: Math.random() * TAU, r: Math.random(), sp: .2 + Math.random() * .5, sz: 2 + Math.random() * 4 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.rot += dt * .4 * cfg.speed; const cx = w / 2, cy = h / 2;
      for (const p of st.p) {
        p.r += p.sp * dt * .12 * cfg.speed; if (p.r > 1) { p.r = .05; p.a = Math.random() * TAU; }
        const ang = p.a + st.rot + p.r * cfg.spiral * 2, rad = p.r * Math.min(w, h) * .55 * cfg.spread;
        M(c, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, p.sz * (.5 + p.r),
          gradAt(p.a / TAU + p.r * .3 + cfg.hue, cfg.pal), Math.min(1, p.r * 2) * .9, .7);
      }
    }
  });

  reg('scan', 'Signature', 'Onde de scan', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      st.t += dt * .35 * cfg.speed;
      const cols = grid(w, cfg), rows = Math.max(3, Math.floor(cols * h / w));
      const cw = w / cols, ch = h / rows;
      const scan = ptr.in && cfg.react ? ptr.x : (.5 + .5 * Math.sin(st.t * 2)) * w;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = i * cw + cw / 2, y = j * ch + ch / 2;
        const react = Math.max(0, 1 - Math.abs(x - scan) / (70 * cfg.spread));
        M(c, x, y, Math.min(cw, ch) * .5 * (.5 + react * .9),
          react > .02 ? gradAt(i / cols * .5 + st.t + cfg.hue, cfg.pal) : PAL.white, .12 + react * .9, react);
      }
    }
  });

  reg('flow', 'Signature', 'Matrix Flow', {
    init(c, w, h, st, cfg) {
      const cols = grid(w, cfg); st.cols = cols; st.o = [];
      for (let i = 0; i < cols; i++) st.o.push({ y: Math.random() * h, sp: 20 + Math.random() * 40, len: 4 + Math.random() * 7 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cw = w / st.cols;
      for (let i = 0; i < st.cols; i++) {
        const o = st.o[i]; o.y += o.sp * dt * 3 * cfg.speed * (1 + cfg.gravity); if (o.y - o.len * cw > h) o.y = -o.len * cw;
        for (let k = 0; k < o.len; k++) {
          const a = 1 - k / o.len;
          M(c, i * cw + cw / 2, o.y - k * cw, cw * .5, gradAt(i / st.cols * .4 + now / 4000 + cfg.hue, cfg.pal), a * .85, a * .6);
        }
      }
    }
  });

  reg('pulse', 'Signature', 'Pulse', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const cols = grid(w, cfg, .7), rows = Math.max(3, Math.floor(cols * h / w));
      const cw = w / cols, ch = h / rows;
      const ox = ptr.in && cfg.react ? ptr.x : w / 2, oy = ptr.in && cfg.react ? ptr.y : h / 2;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = i * cw + cw / 2, y = j * ch + ch / 2, d = Math.hypot(x - ox, y - oy) / Math.hypot(w, h);
        const wv = .5 + .5 * Math.sin(now / 600 * cfg.speed - d * 9 * cfg.spread);
        M(c, x, y, Math.min(cw, ch) * .5 * (.35 + wv * .6), gradAt(d * .6 + now / 6000 + cfg.hue, cfg.pal), .18 + wv * .72, wv * .7);
      }
    }
  });

  reg('gen', 'Signature', 'Génération / Dissolution', {
    init(c, w, h, st, cfg) {
      st.n = 13; st.mat = qrMatrix(st.n, cfg.seed);
      st.order = [...Array(st.n * st.n).keys()].sort(() => Math.random() - .5); st.t = 0;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .35 * cfg.speed;
      const cyc = st.t % 2, p = cyc < 1 ? cyc : 1 - (cyc - 1);
      const cell = Math.min(w, h) * .9 / st.n, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      const shown = Math.floor(p * st.order.length);
      for (let idx = 0; idx < st.order.length; idx++) {
        const m = st.order[idx]; if (!st.mat[m] || idx > shown) continue;
        const i = m % st.n, j = Math.floor(m / st.n), age = Math.min(1, (shown - idx) / 6);
        M(c, ox + i * cell + cell / 2, oy + j * cell + cell / 2, cell * .82 * (.6 + age * .4),
          gradAt((i + j) / (2 * st.n) + now / 5000 + cfg.hue, cfg.pal), .35 + age * .6, .5);
      }
    }
  });

  /* ---- Parcours produit ---- */
  reg('magnet', 'Produit', 'Aimant', {
    init(c, w, h, st, cfg) {
      st.p = []; const cols = Math.max(6, Math.round(grid(w, cfg, .42))), rows = Math.max(4, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = i * cw + cw / 2, y = j * ch + ch / 2;
        st.p.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, c: (i + j) / (cols + rows) });
      }
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      for (const p of st.p) {
        let ax = (p.hx - p.x) * 6, ay = (p.hy - p.y) * 6 + cfg.gravity * 900;
        if (ptr.in) {
          const dx = p.x - ptr.x, dy = p.y - ptr.y, d = Math.hypot(dx, dy) + .001;
          const R = 130 * cfg.spread;
          if (d < R) { const f = (1 - d / R) * 900 * cfg.react; ax += dx / d * f; ay += dy / d * f; }
        }
        p.vx = (p.vx + ax * dt) * .86; p.vy = (p.vy + ay * dt) * .86;
        p.x += p.vx * dt * cfg.speed; p.y += p.vy * dt * cfg.speed;
        const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 300);
        M(c, p.x, p.y, 7 + sp * 5, gradAt(p.c + now / 5000 + sp * .3 + cfg.hue, cfg.pal), .5 + sp * .5, .5 + sp);
      }
    }
  });

  reg('laser', 'Produit', "Laser d'analyse", {
    init(c, w, h, st, cfg) {
      st.cols = grid(w, cfg, .95); st.rows = Math.max(4, Math.floor(st.cols * h / w));
      st.heat = new Float32Array(st.cols * st.rows); st.y = 0; st.dir = 1;
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cw = w / st.cols, ch = h / st.rows;
      st.y += st.dir * dt * h * .38 * cfg.speed;
      if (st.y > h) { st.y = h; st.dir = -1; } if (st.y < 0) { st.y = 0; st.dir = 1; }
      for (let j = 0; j < st.rows; j++) {
        const y = j * ch + ch / 2, hit = Math.max(0, 1 - Math.abs(y - st.y) / (ch * 2.2 * cfg.spread));
        for (let i = 0; i < st.cols; i++) {
          const k = j * st.cols + i;
          st.heat[k] = Math.max(st.heat[k] * (1 - dt * 1.4), hit * (.55 + .45 * Math.sin(i * .7 + now / 400)));
          const v = st.heat[k]; if (v < .015) continue;
          M(c, i * cw + cw / 2, y, Math.min(cw, ch) * .52 * (.5 + v * .8), gradAt(i / st.cols * .3 + cfg.hue, cfg.pal), Math.min(1, v * 1.1), v);
        }
      }
      c.globalAlpha = 1; c.fillStyle = rgba(gradAt(.02 + cfg.hue, cfg.pal), .55); c.fillRect(0, st.y - 1, w, 2);
    }
  });

  reg('glitch', 'Produit', 'Glitch', {
    init(c, w, h, st, cfg) { st.n = 15; st.mat = qrMatrix(st.n, cfg.seed); st.off = new Float32Array(st.n); st.next = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.next -= dt * cfg.speed;
      if (st.next <= 0) {
        st.next = .35 + Math.random() * 1.1;
        const rows = 1 + Math.floor(Math.random() * (2 + cfg.chaos * 6)), start = Math.floor(Math.random() * st.n);
        for (let k = 0; k < rows; k++) { const j = (start + k) % st.n; st.off[j] = (Math.random() - .5) * 1.8 * (1 + cfg.chaos); }
      }
      const cell = Math.min(w, h) * .86 / st.n, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      for (let j = 0; j < st.n; j++) {
        st.off[j] *= (1 - dt * 3.4);
        for (let i = 0; i < st.n; i++) {
          if (!st.mat[j * st.n + i]) continue;
          const dx = st.off[j] * cell * 2.2 * cfg.spread;
          M(c, ox + i * cell + cell / 2 + dx, oy + j * cell + cell / 2, cell * .8,
            gradAt((i + j) / (2 * st.n) + now / 5000 + cfg.hue, cfg.pal), .55 + Math.min(.45, Math.abs(st.off[j]) * 2), .45 + Math.abs(st.off[j]));
        }
      }
    }
  });

  reg('focus', 'Produit', 'Mise au point', {
    init(c, w, h, st, cfg) {
      st.n = 13; st.mat = qrMatrix(st.n, cfg.seed); st.t = 0; st.p = [];
      for (let i = 0; i < st.n; i++) for (let j = 0; j < st.n; j++) {
        if (!st.mat[j * st.n + i]) continue;
        st.p.push({ i, j, a: Math.random() * TAU, d: .4 + Math.random() * 1.4 });
      }
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .3 * cfg.speed;
      const cyc = st.t % 2, k = cyc < 1 ? cyc : 1 - (cyc - 1);
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const cell = Math.min(w, h) * .84 / st.n, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      const spread = (1 - e) * Math.min(w, h) * .5 * cfg.spread;
      for (const p of st.p) {
        const tx = ox + p.i * cell + cell / 2, ty = oy + p.j * cell + cell / 2;
        M(c, tx + Math.cos(p.a + st.t * cfg.spiral * .3) * spread * p.d, ty + Math.sin(p.a + st.t * cfg.spiral * .3) * spread * p.d,
          cell * (.5 + e * .32), gradAt((p.i + p.j) / (2 * st.n) + now / 5000 + cfg.hue, cfg.pal), .25 + e * .7, .9 - e * .5);
      }
    }
  });

  reg('stats', 'Produit', 'Stats premium', {
    init(c, w, h, st) { st.t = 0; st.bars = [.42, .68, .35, .9, .55, .78, .48]; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const n = st.bars.length, gap = w / n, cell = Math.min(gap * .34, h / 14);
      const grow = Math.min(1, st.t / 1.4);
      for (let i = 0; i < n; i++) {
        const target = st.bars[i] * (1 - cfg.wave * .16 + cfg.wave * .16 * Math.sin(now / 900 + i));
        const steps = Math.max(1, Math.round(target * grow * (h * .74) / (cell * 1.5)));
        for (let k = 0; k < steps; k++) {
          const top = k === steps - 1;
          M(c, gap * (i + .5), h * .88 - k * cell * 1.5, cell, top ? PAL.gold : gradAt(i / n * .35 + k * .02 + cfg.hue, cfg.pal),
            top ? 1 : .32 + (k / steps) * .5, top ? 1 : .35);
        }
      }
    }
  });

  reg('publish', 'Produit', 'Publication', {
    init(c, w, h, st, cfg) {
      st.n = 11; st.mat = qrMatrix(st.n, cfg.seed); st.t = 0; st.p = [];
      for (let i = 0; i < st.n; i++) for (let j = 0; j < st.n; j++) {
        if (!st.mat[j * st.n + i]) continue;
        st.p.push({ i, j, a: Math.atan2(j - st.n / 2, i - st.n / 2) + (Math.random() - .5) * .5, d: .5 + Math.random() });
      }
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .38 * cfg.speed;
      const cyc = st.t % 1, out = cyc < .62 ? cyc / .62 : 1 - (cyc - .62) / .38;
      const e = 1 - Math.pow(1 - out, 3);
      const cell = Math.min(w, h) * .58 / st.n, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      for (const p of st.p) {
        const bx = ox + p.i * cell + cell / 2, by = oy + p.j * cell + cell / 2;
        const r = e * Math.min(w, h) * .34 * p.d * cfg.spread;
        M(c, bx + Math.cos(p.a) * r, by + Math.sin(p.a) * r - e * 12, cell * .82 * (1 - e * .35),
          gradAt((p.i + p.j) / (2 * st.n) + now / 4500 + cfg.hue, cfg.pal), .95 - e * .55, .5 + e * .6);
      }
    }
  });

  reg('share', 'Produit', 'Partage', {
    init(c, w, h, st) {
      st.t = 0; st.nodes = [[.18, .22], [.84, .34], [.5, .86]];
      st.pk = []; for (let i = 0; i < 3; i++) for (let k = 0; k < 7; k++) st.pk.push({ n: i, p: k / 7, sp: .18 + Math.random() * .18 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cx = w / 2, cy = h / 2;
      for (const q of st.pk) {
        q.p += q.sp * dt * cfg.speed; if (q.p > 1) q.p -= 1;
        const n = st.nodes[q.n], tx = n[0] * w, ty = n[1] * h;
        const bend = .22 * cfg.spiral / 3.1;
        const mx = (cx + tx) / 2 + (ty - cy) * bend, my = (cy + ty) / 2 - (tx - cx) * bend;
        const t = q.p, u = 1 - t;
        M(c, u * u * cx + 2 * u * t * mx + t * t * tx, u * u * cy + 2 * u * t * my + t * t * ty,
          5 + (1 - Math.abs(t - .5) * 2) * 3, gradAt(q.n / 3 + t * .3 + cfg.hue, cfg.pal), .35 + (1 - t) * .55, .8);
      }
      for (let i = 0; i < 3; i++) {
        const n = st.nodes[i], pulse = 1 - cfg.wave * .4 + cfg.wave * .4 * Math.sin(now / 500 + i);
        M(c, n[0] * w, n[1] * h, 12 * pulse, gradAt(i / 3 + cfg.hue, cfg.pal), .9, 1.2);
      }
      M(c, cx, cy, 20, PAL.white, .95, 1.4);
    }
  });

  reg('ambient', 'Produit', 'Grille ambiante', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      const step = Math.max(8, 26 / (cfg.gridScale || 1)), cols = Math.ceil(w / step), rows = Math.ceil(h / step);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const wv = .5 + .5 * Math.sin(now / 2600 * cfg.speed + (i + j) * .5 * cfg.spread);
        M(c, i * step + step / 2, j * step + step / 2, 3 + wv * 1.6,
          gradAt((i + j) / (cols + rows) + now / 12000 + cfg.hue, cfg.pal), .07 + wv * .13, wv * .3);
      }
    }
  });

  function glyphEffect(ok) {
    const path = ok ? [[[1, 2], [2, 3]], [[2, 3], [3, 1.2]]] : [[[1, 1], [3, 3]], [[3, 1], [1, 3]]];
    return {
      init(c, w, h, st) { st.t = 0; },
      draw(c, w, h, st, dt, now, cfg) {
        st.t += dt * 1.6 * cfg.speed;
        const col = ok ? gradAt(cfg.hue, cfg.pal) : PAL.red;
        const cell = Math.min(w, h) / 4.2, ox = w / 2 - cell * 2, oy = h / 2 - cell * 2;
        const prog = Math.min(1, st.t % 3.2), total = path.length;
        for (let pi = 0; pi < total; pi++) {
          const local = Math.max(0, Math.min(1, prog * total - pi)), A = path[pi][0], B = path[pi][1];
          for (let k = 0; k <= 6 * local; k++) {
            const t = k / 6;
            M(c, ox + (A[0] + (B[0] - A[0]) * t) * cell, oy + (A[1] + (B[1] - A[1]) * t) * cell, cell * .5, col, .95, .9);
          }
        }
      }
    };
  }
  reg('success', 'Produit', 'Succès', glyphEffect(true));
  reg('error', 'Produit', 'Erreur', glyphEffect(false));

  reg('loader', 'Produit', 'Loader 3×3', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cell = Math.min(w, h) / 4.4, ox = w / 2 - cell * 1.6, oy = h / 2 - cell * 1.6;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const ph = ((st.t / 1.4) - (i + j) * .08) % 1;
        const v = ph < .35 ? Math.sin(ph / .35 * Math.PI) : 0;
        M(c, ox + i * cell * 1.6, oy + j * cell * 1.6, cell * (.62 + v * .38),
          v > .05 ? gradAt(.02 + cfg.hue, cfg.pal) : PAL.muted, .35 + v * .65, v);
      }
    }
  });

  /* ---- Orbites & géométrie ---- */
  const gridN = (w, cfg, k) => Math.max(3, Math.floor(w / (16 / (cfg.gridScale || 1)) * (k || 1)));
  function grid(w, cfg, k) { return gridN(w, cfg, k); }

  reg('orbit', 'Géométrie', 'Orbites', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.round(cfg.density * .22);
      for (let i = 0; i < N; i++) st.p.push({ ring: Math.floor(Math.random() * 7), a: Math.random() * TAU, sp: (.2 + Math.random() * .6) * (Math.random() < .3 ? -1 : 1) });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .46 * cfg.spread;
      for (const p of st.p) {
        p.a += p.sp * dt * cfg.speed * (1 + p.ring * .1);
        const rad = R * (.16 + p.ring / 7 * .84), tilt = 1 - .45 * Math.sin(now / 4000 + p.ring) * cfg.wave;
        const a = p.a + p.ring * cfg.spiral * .1;
        for (let k = 0; k < cfg.symmetry; k++) {
          const aa = a + k * TAU / cfg.symmetry;
          M(c, cx + Math.cos(aa) * rad, cy + Math.sin(aa) * rad * tilt, 4 + p.ring * .9,
            gradAt(p.ring / 7 + cfg.hue + now / 9000, cfg.pal), .8, .7);
        }
      }
    }
  });

  reg('rings', 'Géométrie', 'Anneaux concentriques', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed; const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .47 * cfg.spread;
      const rings = 9;
      for (let r = 1; r <= rings; r++) {
        const rad = R * r / rings, n = Math.max(6, Math.round(rad / 14));
        const spin = st.t * (r % 2 ? .4 : -.4) + r * cfg.spiral * .12;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + spin;
          const pulse = .6 + .4 * Math.sin(st.t * 2 - r * .6 + i * cfg.wave);
          M(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3.4 + pulse * 3.2,
            gradAt(r / rings + cfg.hue, cfg.pal), .35 + pulse * .6, pulse);
        }
      }
    }
  });

  reg('helix', 'Géométrie', 'Hélice', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const N = 120, amp = Math.min(w, h) * .3 * cfg.spread;
      for (let s = 0; s < cfg.symmetry + 1; s++) {
        for (let i = 0; i < N; i++) {
          const t = i / N, ph = t * cfg.spiral * 2 + st.t + s * TAU / (cfg.symmetry + 1);
          const x = w * t, z = Math.sin(ph);
          M(c, x, h / 2 + Math.cos(ph) * amp, 3 + (z + 1) * 4, gradAt(t + s * .2 + cfg.hue, cfg.pal), .28 + (z + 1) * .35, (z + 1) * .5);
        }
      }
    }
  });

  reg('wave3d', 'Géométrie', 'Nappe ondulante', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cols = grid(w, cfg, .55), rows = Math.max(6, Math.round(cols * .55));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const u = i / (cols - 1), v = j / (rows - 1);
        const z = Math.sin(u * 6 * cfg.spread + st.t * 1.4) * Math.cos(v * 4 + st.t) * (.5 + cfg.wave);
        const persp = .55 + v * .55;
        const x = w * (.06 + u * .88) + (u - .5) * (1 - persp) * w * .18;
        const y = h * (.22 + v * .62) - z * h * .09;
        M(c, x, y, 3.6 * persp * 1.6, gradAt(v * .4 + z * .18 + cfg.hue, cfg.pal), .3 + (z + 1) * .3, .35 + (z + 1) * .3);
      }
    }
  });

  reg('kaleido', 'Géométrie', 'Kaléidoscope', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.round(cfg.density * .1);
      for (let i = 0; i < N; i++) st.p.push({ r: Math.random(), a: Math.random() * .8, sp: .1 + Math.random() * .5, s: 2 + Math.random() * 6 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .5 * cfg.spread;
      const sym = Math.max(3, cfg.symmetry * 2);
      for (const p of st.p) {
        p.a += p.sp * dt * .2 * cfg.speed; p.r += Math.sin(now / 3000 + p.s) * dt * .02;
        const rad = (p.r % 1) * R;
        for (let k = 0; k < sym; k++) {
          const a = p.a + k * TAU / sym + rad / R * cfg.spiral * .3;
          const mir = k % 2 ? -1 : 1;
          M(c, cx + Math.cos(a * mir) * rad, cy + Math.sin(a * mir) * rad, p.s, gradAt(p.r + cfg.hue, cfg.pal), .7, .8);
        }
      }
    }
  });

  reg('fractal', 'Géométrie', 'Fractale de modules', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const S = Math.min(w, h) * .8 * cfg.spread, ox = (w - S) / 2, oy = (h - S) / 2;
      const depth = 4, n = Math.pow(3, depth);
      const cell = S / n, breathe = .5 + .5 * Math.sin(st.t);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        let x = i, y = j, hole = false;
        for (let d = 0; d < depth; d++) { if (x % 3 === 1 && y % 3 === 1) { hole = true; break; } x = (x / 3) | 0; y = (y / 3) | 0; }
        if (hole) continue;
        const t = (i + j) / (2 * n);
        M(c, ox + i * cell + cell / 2, oy + j * cell + cell / 2, cell * (.7 + breathe * .3),
          gradAt(t + st.t * .1 + cfg.hue, cfg.pal), .45 + breathe * .45, .3);
      }
    }
  });

  reg('lattice', 'Géométrie', 'Treillis', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cols = grid(w, cfg, .5), rows = Math.max(4, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const sh = Math.sin(i * .6 + st.t) * cfg.spiral * 2 + Math.cos(j * .5 - st.t * .7) * cfg.spiral * 2;
        const v = .5 + .5 * Math.sin(i * .4 + j * .4 + st.t * 2);
        M(c, i * cw + cw / 2 + sh, j * ch + ch / 2 + sh * cfg.wave, Math.min(cw, ch) * .44,
          gradAt((i - j) / cols * .5 + cfg.hue, cfg.pal), .3 + v * .6, v * .8);
      }
    }
  });

  reg('pendulum', 'Géométrie', 'Pendules', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const N = 26;
      for (let i = 0; i < N; i++) {
        const len = h * (.3 + i / N * .55) * cfg.spread, per = 2 + i * .07 * (1 + cfg.chaos * 2);
        const a = Math.sin(st.t * TAU / per) * (.6 + cfg.wave * .5);
        const px = w / 2 + Math.sin(a) * len, py = h * .1 + Math.cos(a) * len;
        for (let k = 0; k < 8; k++) {
          const t = k / 8;
          M(c, w / 2 + (px - w / 2) * t, h * .1 + (py - h * .1) * t, 2 + t * 5,
            gradAt(i / N + cfg.hue, cfg.pal), .12 + t * .8, t);
        }
      }
    }
  });

  /* ---- Particules & physique ---- */
  reg('starfield', 'Particules', 'Champ d\'étoiles', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.round(cfg.density * .5);
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cx = w / 2, cy = h / 2;
      for (const p of st.p) {
        p.z -= dt * .25 * cfg.speed; if (p.z <= .02) { p.z = 1; p.x = Math.random() * 2 - 1; p.y = Math.random() * 2 - 1; }
        const k = .4 / p.z * cfg.spread;
        const a = Math.atan2(p.y, p.x) + (1 - p.z) * cfg.spiral * .3, r = Math.hypot(p.x, p.y);
        M(c, cx + Math.cos(a) * r * k * w * .5, cy + Math.sin(a) * r * k * h * .5, 1.5 + (1 - p.z) * 9,
          gradAt(r * .4 + cfg.hue, cfg.pal), Math.min(1, (1 - p.z) * 1.6), (1 - p.z));
      }
    }
  });

  reg('swarm', 'Particules', 'Essaim', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.min(280, Math.round(cfg.density * .18));
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, c: Math.random() });
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const tx = ptr.in && cfg.react ? ptr.x : w / 2 + Math.cos(now / 2600) * w * .28;
      const ty = ptr.in && cfg.react ? ptr.y : h / 2 + Math.sin(now / 2100) * h * .28;
      for (const p of st.p) {
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) + .01;
        p.vx += (dx / d) * 130 * dt - (dx / d) * (d < 90 ? 260 : 0) * dt + (Math.random() - .5) * 320 * cfg.chaos * dt;
        p.vy += (dy / d) * 130 * dt - (dy / d) * (d < 90 ? 260 : 0) * dt + (Math.random() - .5) * 320 * cfg.chaos * dt + cfg.gravity * 300 * dt;
        const sp = Math.hypot(p.vx, p.vy), max = 260;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        p.x += p.vx * dt * cfg.speed; p.y += p.vy * dt * cfg.speed;
        if (p.x < 0) p.x += w; if (p.x > w) p.x -= w; if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
        M(c, p.x, p.y, 4 + sp / 90, gradAt(p.c + now / 7000 + cfg.hue, cfg.pal), .55 + Math.min(.4, sp / 400), .8);
      }
    }
  });

  reg('field', 'Particules', 'Champ de flux', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.min(600, Math.round(cfg.density * .4));
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * w, y: Math.random() * h, c: Math.random(), life: Math.random() * 4 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const sc = .004 / cfg.spread, t = now / 5000 * cfg.speed;
      for (const p of st.p) {
        const a = vnoise(p.x * sc + t, p.y * sc) * TAU * (1 + cfg.chaos * 2) + cfg.spiral * .3;
        p.x += Math.cos(a) * 60 * dt * cfg.speed; p.y += Math.sin(a) * 60 * dt * cfg.speed + cfg.gravity * 90 * dt;
        p.life -= dt;
        if (p.life <= 0 || p.x < -5 || p.x > w + 5 || p.y < -5 || p.y > h + 5) { p.x = Math.random() * w; p.y = Math.random() * h; p.life = 2 + Math.random() * 4; }
        M(c, p.x, p.y, 3.4, gradAt(p.c * .3 + a / TAU * .5 + cfg.hue, cfg.pal), .55, .5);
      }
    }
  });

  reg('rain', 'Particules', 'Pluie de modules', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.round(cfg.density * .3);
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * w, y: Math.random() * h, v: 60 + Math.random() * 200, s: 2 + Math.random() * 5, c: Math.random() });
    },
    draw(c, w, h, st, dt, now, cfg) {
      for (const p of st.p) {
        p.y += p.v * dt * cfg.speed * (1 + cfg.gravity * 2);
        p.x += Math.sin(now / 900 + p.c * 9) * cfg.wave * 40 * dt;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        M(c, p.x, p.y, p.s, gradAt(p.c + cfg.hue, cfg.pal), .5 + p.v / 500, .6);
      }
    }
  });

  reg('fireworks', 'Particules', 'Éclats', {
    init(c, w, h, st) { st.p = []; st.next = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.next -= dt * cfg.speed;
      if (st.next <= 0 && st.p.length < 700) {
        st.next = .5 + Math.random() * .9;
        const cx = w * (.2 + Math.random() * .6), cy = h * (.2 + Math.random() * .5), hue = Math.random();
        const n = 40 + Math.round(cfg.density * .03);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, v = 60 + Math.random() * 220 * cfg.spread;
          st.p.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: hue });
        }
      }
      for (let i = st.p.length - 1; i >= 0; i--) {
        const p = st.p[i];
        p.vy += (140 + cfg.gravity * 400) * dt; p.vx *= .99; p.vy *= .99;
        p.x += p.vx * dt * cfg.speed; p.y += p.vy * dt * cfg.speed; p.life -= dt * .45 * cfg.speed;
        if (p.life <= 0) { st.p.splice(i, 1); continue; }
        M(c, p.x, p.y, 2 + p.life * 5, gradAt(p.c + (1 - p.life) * .25 + cfg.hue, cfg.pal), p.life, p.life * 1.2);
      }
    }
  });

  reg('wells', 'Particules', 'Puits gravitationnels', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.min(420, Math.round(cfg.density * .3));
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, c: Math.random() });
      st.g = [[.3, .35], [.72, .3], [.5, .74]];
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const wells = st.g.map((g, i) => [w * (g[0] + Math.sin(now / 4000 + i) * .07 * cfg.wave), h * (g[1] + Math.cos(now / 3400 + i) * .07 * cfg.wave)]);
      if (ptr.in && cfg.react) wells.push([ptr.x, ptr.y]);
      for (const p of st.p) {
        for (const g of wells) {
          const dx = g[0] - p.x, dy = g[1] - p.y, d2 = dx * dx + dy * dy + 900;
          const f = 26000 / d2 * cfg.spread;
          p.vx += dx * f * dt; p.vy += dy * f * dt;
        }
        p.vx *= .995; p.vy *= .995;
        p.x += p.vx * dt * cfg.speed; p.y += p.vy * dt * cfg.speed;
        if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) { p.x = Math.random() * w; p.y = Math.random() * h; p.vx = p.vy = 0; }
        const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 300);
        M(c, p.x, p.y, 2.6 + sp * 4, gradAt(p.c + sp * .35 + cfg.hue, cfg.pal), .4 + sp * .6, .4 + sp);
      }
      for (const g of wells) M(c, g[0], g[1], 13, PAL.white, .8, 1.4);
    }
  });

  reg('blackhole', 'Particules', 'Trou noir', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.min(900, Math.round(cfg.density * .6));
      for (let i = 0; i < N; i++) st.p.push({ a: Math.random() * TAU, r: .2 + Math.random() * .8, c: Math.random() });
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const cx = ptr.in && cfg.react ? ptr.x : w / 2, cy = ptr.in && cfg.react ? ptr.y : h / 2;
      const R = Math.min(w, h) * .55 * cfg.spread;
      for (const p of st.p) {
        p.a += dt * cfg.speed * (.25 / Math.max(.06, p.r)) * (1 + cfg.spiral * .06);
        p.r -= dt * .035 * cfg.speed;
        if (p.r < .05) { p.r = 1; p.a = Math.random() * TAU; }
        const rad = p.r * R, sq = 1 - .45 * cfg.wave;
        M(c, cx + Math.cos(p.a) * rad, cy + Math.sin(p.a) * rad * sq, 1.6 + (1 - p.r) * 7,
          gradAt(p.c * .2 + (1 - p.r) * .5 + cfg.hue, cfg.pal), Math.min(1, (1 - p.r) * 1.5 + .2), (1 - p.r) * 1.3);
      }
      c.globalAlpha = 1; c.fillStyle = '#080A08';
      c.beginPath(); c.arc(cx, cy, Math.min(w, h) * .05, 0, TAU); c.fill();
    }
  });

  reg('shatter', 'Particules', 'Éclatement', {
    init(c, w, h, st, cfg) {
      st.n = 15; st.mat = qrMatrix(st.n, cfg.seed); st.t = 0; st.p = [];
      for (let i = 0; i < st.n; i++) for (let j = 0; j < st.n; j++) {
        if (!st.mat[j * st.n + i]) continue;
        st.p.push({ i, j, a: Math.random() * TAU, v: .4 + Math.random(), rot: (Math.random() - .5) * 6 });
      }
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .5 * cfg.speed;
      const cyc = st.t % 2.4, e = cyc < .3 ? 0 : Math.min(1, (cyc - .3) / 1.6);
      const ease = 1 - Math.pow(1 - e, 2);
      const cell = Math.min(w, h) * .62 / st.n, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      for (const p of st.p) {
        const bx = ox + p.i * cell + cell / 2, by = oy + p.j * cell + cell / 2;
        const d = ease * Math.min(w, h) * .55 * p.v * cfg.spread;
        M(c, bx + Math.cos(p.a) * d, by + Math.sin(p.a) * d + ease * ease * cfg.gravity * h,
          cell * .84 * (1 - ease * .5), gradAt((p.i + p.j) / (2 * st.n) + cfg.hue, cfg.pal), 1 - ease * .85, .4 + ease);
      }
    }
  });

  reg('drift', 'Particules', 'Dérive lente', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.round(cfg.density * .25);
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random(), y: Math.random(), s: 2 + Math.random() * 7, ph: Math.random() * TAU, sp: .01 + Math.random() * .04 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      for (const p of st.p) {
        p.y -= p.sp * dt * cfg.speed * .6; if (p.y < -.05) p.y = 1.05;
        const x = (p.x + Math.sin(now / 4000 + p.ph) * .04 * cfg.wave) * w;
        M(c, x, p.y * h, p.s, gradAt(p.x * .4 + p.ph / TAU * .2 + cfg.hue, cfg.pal), .25 + p.s / 14, .4);
      }
    }
  });

  /* ---- Systèmes & données ---- */
  reg('life', 'Systèmes', 'Jeu de la vie', {
    init(c, w, h, st, cfg) {
      st.cols = Math.max(12, Math.min(90, grid(w, cfg, .38))); st.rows = Math.max(8, Math.round(st.cols * h / w));
      st.a = new Uint8Array(st.cols * st.rows); st.age = new Float32Array(st.cols * st.rows);
      for (let i = 0; i < st.a.length; i++) st.a[i] = Math.random() > .72 ? 1 : 0;
      st.acc = 0;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.acc += dt * cfg.speed;
      const stepT = .14;
      if (st.acc > stepT) {
        st.acc = 0;
        const b = new Uint8Array(st.a.length), C = st.cols, R = st.rows;
        let alive = 0;
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            n += st.a[((y + dy + R) % R) * C + ((x + dx + C) % C)];
          }
          const k = y * C + x, cur = st.a[k];
          b[k] = (cur && (n === 2 || n === 3)) || (!cur && n === 3) ? 1 : 0;
          if (b[k]) alive++;
          st.age[k] = b[k] ? Math.min(1, st.age[k] + .18) : Math.max(0, st.age[k] - .22);
        }
        st.a = b;
        if (alive < st.a.length * .03) for (let i = 0; i < st.a.length; i++) if (Math.random() > .8) st.a[i] = 1;
        if (cfg.chaos > .02) for (let i = 0; i < st.a.length * cfg.chaos * .02; i++) st.a[(Math.random() * st.a.length) | 0] ^= 1;
      }
      const cw = w / st.cols, ch = h / st.rows;
      for (let y = 0; y < st.rows; y++) for (let x = 0; x < st.cols; x++) {
        const v = st.age[y * st.cols + x]; if (v < .02) continue;
        M(c, x * cw + cw / 2, y * ch + ch / 2, Math.min(cw, ch) * .78 * v,
          gradAt((x + y) / (st.cols + st.rows) + now / 9000 + cfg.hue, cfg.pal), v * .95, v * .7);
      }
    }
  });

  reg('sort', 'Systèmes', 'Tri visualisé', {
    init(c, w, h, st, cfg) {
      st.n = Math.max(14, Math.min(70, Math.round(grid(w, cfg, .3))));
      st.v = [...Array(st.n).keys()].map(i => (i + 1) / st.n).sort(() => Math.random() - .5);
      st.i = 0; st.j = 0; st.acc = 0; st.hit = -1;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.acc += dt * cfg.speed * 26;
      while (st.acc > 1) {
        st.acc -= 1;
        if (st.j < st.n - st.i - 1) {
          if (st.v[st.j] > st.v[st.j + 1]) { const t = st.v[st.j]; st.v[st.j] = st.v[st.j + 1]; st.v[st.j + 1] = t; }
          st.hit = st.j; st.j++;
        } else { st.j = 0; st.i++; if (st.i >= st.n - 1) { st.v.sort(() => Math.random() - .5); st.i = 0; } }
      }
      const cw = w / st.n, cell = Math.min(cw * .8, h / 26);
      for (let i = 0; i < st.n; i++) {
        const steps = Math.max(1, Math.round(st.v[i] * h * .8 / (cell * 1.4)));
        for (let k = 0; k < steps; k++) {
          const top = k === steps - 1, act = i === st.hit || i === st.hit + 1;
          M(c, cw * (i + .5), h * .92 - k * cell * 1.4, cell, act ? PAL.gold : gradAt(st.v[i] * .6 + cfg.hue, cfg.pal),
            act ? 1 : .25 + (k / steps) * .6, act ? 1.2 : (top ? .7 : .25));
        }
      }
    }
  });

  reg('terrain', 'Systèmes', 'Relief de bruit', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .12 * cfg.speed;
      const cols = grid(w, cfg, .5), rows = Math.max(5, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const n = vnoise(i * .18 / cfg.spread + st.t, j * .18 / cfg.spread - st.t * .4);
        const lvl = Math.floor(n * 6) / 6;
        M(c, i * cw + cw / 2, j * ch + ch / 2 - n * h * .06 * cfg.wave, Math.min(cw, ch) * (.3 + n * .55),
          gradAt(lvl + cfg.hue, cfg.pal), .2 + n * .8, n * .8);
      }
    }
  });

  reg('radar', 'Systèmes', 'Radar', {
    init(c, w, h, st, cfg) {
      st.a = 0; st.blips = [];
      for (let i = 0; i < 22; i++) st.blips.push({ a: Math.random() * TAU, r: .15 + Math.random() * .85, lit: 0 });
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .46 * cfg.spread;
      const prev = st.a; st.a = (st.a + dt * cfg.speed * 1.1) % TAU;
      for (let r = 1; r <= 4; r++) {
        const rad = R * r / 4, n = Math.round(rad / 12);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU;
          M(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 2.4, gradAt(.5 + cfg.hue, cfg.pal), .16, .1);
        }
      }
      for (let k = 0; k < 26; k++) {
        const t = k / 26, a = st.a - t * .5 * (1 + cfg.spiral * .06);
        for (let s = 0; s < 12; s++) {
          const rad = R * (s + 1) / 12;
          M(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3.2, gradAt(.02 + cfg.hue, cfg.pal), (1 - t) * .5, (1 - t));
        }
      }
      for (const b of st.blips) {
        const hit = (prev <= b.a && b.a <= st.a) || (prev > st.a && (b.a >= prev || b.a <= st.a));
        if (hit) b.lit = 1; b.lit = Math.max(0, b.lit - dt * .45);
        if (b.lit < .02) continue;
        M(c, cx + Math.cos(b.a) * b.r * R, cy + Math.sin(b.a) * b.r * R, 5 + b.lit * 5, PAL.gold, b.lit, b.lit * 1.4);
      }
    }
  });

  reg('constellation', 'Systèmes', 'Constellation', {
    init(c, w, h, st, cfg) {
      st.p = []; const N = Math.min(120, Math.round(cfg.density * .08));
      for (let i = 0; i < N; i++) st.p.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * 22, vy: (Math.random() - .5) * 22 });
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      for (const p of st.p) {
        p.x += p.vx * dt * cfg.speed; p.y += p.vy * dt * cfg.speed;
        if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      const R = 120 * cfg.spread;
      for (let i = 0; i < st.p.length; i++) for (let j = i + 1; j < st.p.length; j++) {
        const a = st.p[i], b = st.p[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > R) continue;
        const steps = Math.max(2, Math.round(d / 13)), al = (1 - d / R);
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          M(c, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.2, gradAt(t * .3 + cfg.hue, cfg.pal), al * .45, al * .3);
        }
      }
      for (const p of st.p) M(c, p.x, p.y, 5, gradAt(p.x / w * .4 + cfg.hue, cfg.pal), .9, .9);
    }
  });

  reg('equalizer', 'Systèmes', 'Égaliseur', {
    init(c, w, h, st, cfg) {
      st.n = Math.max(10, Math.min(48, Math.round(grid(w, cfg, .22))));
      st.v = new Float32Array(st.n); st.ph = [...Array(st.n)].map(() => Math.random() * TAU);
    },
    draw(c, w, h, st, dt, now, cfg) {
      const cw = w / st.n, cell = Math.min(cw * .62, h / 24);
      for (let i = 0; i < st.n; i++) {
        const target = Math.abs(Math.sin(now / 600 * cfg.speed + st.ph[i]) * .6 + Math.sin(now / 230 * cfg.speed + i) * .4 * (1 + cfg.chaos));
        st.v[i] += (target - st.v[i]) * Math.min(1, dt * 9);
        const steps = Math.max(1, Math.round(st.v[i] * h * .8 / (cell * 1.45)));
        for (let k = 0; k < steps; k++) {
          const top = k === steps - 1;
          M(c, cw * (i + .5), h * .9 - k * cell * 1.45, cell, top ? PAL.gold : gradAt(k * .05 + i / st.n * .3 + cfg.hue, cfg.pal),
            top ? .95 : .3 + k / steps * .55, top ? 1 : .3);
        }
      }
    }
  });

  reg('maze', 'Systèmes', 'Labyrinthe', {
    init(c, w, h, st, cfg) {
      st.cols = Math.max(10, Math.min(70, grid(w, cfg, .32))); st.rows = Math.max(6, Math.round(st.cols * h / w));
      st.m = []; let s = cfg.seed || 7;
      const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < st.cols * st.rows; i++) st.m.push(rnd() > .5 ? 1 : 0);
      st.t = 0;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cw = w / st.cols, ch = h / st.rows, cell = Math.min(cw, ch);
      for (let j = 0; j < st.rows; j++) for (let i = 0; i < st.cols; i++) {
        const k = st.m[j * st.cols + i];
        const wave = .5 + .5 * Math.sin(st.t * 2 - (i + j) * .25 * cfg.spread);
        const x = i * cw + cw / 2, y = j * ch + ch / 2;
        const dx = k ? cell * .22 : -cell * .22;
        M(c, x - dx, y - cell * .22, cell * .34, gradAt((i + j) / (st.cols + st.rows) + cfg.hue, cfg.pal), .25 + wave * .6, wave * .6);
        M(c, x + dx, y + cell * .22, cell * .34, gradAt((i + j) / (st.cols + st.rows) + .12 + cfg.hue, cfg.pal), .25 + (1 - wave) * .6, (1 - wave) * .6);
      }
    }
  });

  reg('dna', 'Systèmes', 'Double hélice', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const N = 46, amp = Math.min(w, h) * .22 * cfg.spread;
      for (let i = 0; i < N; i++) {
        const t = i / N, ph = t * cfg.spiral * 2.4 + st.t * 1.2;
        const y = h * (.06 + t * .88);
        const x1 = w / 2 + Math.sin(ph) * amp, x2 = w / 2 - Math.sin(ph) * amp;
        const z = Math.cos(ph);
        if (i % 3 === 0) for (let k = 1; k < 5; k++) {
          const tt = k / 5;
          M(c, x1 + (x2 - x1) * tt, y, 2.4, gradAt(t + cfg.hue, cfg.pal), .22, .2);
        }
        M(c, x1, y, 4 + (z + 1) * 2.4, gradAt(t + cfg.hue, cfg.pal), .5 + (z + 1) * .25, (z + 1) * .6);
        M(c, x2, y, 4 + (1 - z) * 2.4, gradAt(t + .3 + cfg.hue, cfg.pal), .5 + (1 - z) * .25, (1 - z) * .6);
      }
    }
  });

  reg('ripple', 'Systèmes', 'Ondes concentriques', {
    init(c, w, h, st) { st.waves = []; st.next = 0; },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      st.next -= dt * cfg.speed;
      if (st.next <= 0) {
        st.next = .8;
        st.waves.push({ x: ptr.in && cfg.react ? ptr.x : w * (.25 + Math.random() * .5), y: ptr.in && cfg.react ? ptr.y : h * (.25 + Math.random() * .5), r: 0 });
        if (st.waves.length > 6) st.waves.shift();
      }
      const cols = grid(w, cfg, .55), rows = Math.max(4, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (const wv of st.waves) wv.r += dt * 260 * cfg.speed * cfg.spread;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * cw + cw / 2, y = j * ch + ch / 2;
        let v = 0;
        for (const wv of st.waves) {
          const d = Math.abs(Math.hypot(x - wv.x, y - wv.y) - wv.r);
          if (d < 46) v = Math.max(v, (1 - d / 46) * Math.max(0, 1 - wv.r / (Math.max(w, h) * .9)));
        }
        if (v < .03) { M(c, x, y, Math.min(cw, ch) * .22, PAL.muted, .1, 0); continue; }
        M(c, x, y, Math.min(cw, ch) * (.25 + v * .5), gradAt(v * .4 + cfg.hue, cfg.pal), .15 + v * .85, v);
      }
    }
  });

  reg('portal', 'Systèmes', 'Portail', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .44 * cfg.spread;
      const arms = Math.max(2, cfg.symmetry * 2);
      for (let a = 0; a < arms; a++) for (let i = 0; i < 46; i++) {
        const t = i / 46;
        const ang = a * TAU / arms + t * cfg.spiral + st.t * (1 - t * .6);
        const rad = R * (.1 + t * .9);
        const pulse = .5 + .5 * Math.sin(st.t * 3 - t * 8 * cfg.wave);
        M(c, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 2 + (1 - t) * 7,
          gradAt(t + a / arms * .1 + cfg.hue, cfg.pal), .25 + pulse * .7, pulse * (1 - t) * 1.4);
      }
      M(c, cx, cy, 16 + Math.sin(st.t * 2) * 4, PAL.white, .9, 1.6);
    }
  });

  reg('cascade', 'Systèmes', 'Cascade', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cols = grid(w, cfg, .4), rows = Math.max(5, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const delay = (i * .06 + j * .09) * cfg.spread;
        const ph = (st.t * .6 - delay) % 2;
        const v = ph < 0 ? 0 : ph < 1 ? Math.sin(ph * Math.PI) : 0;
        if (v < .02) continue;
        M(c, i * cw + cw / 2, j * ch + ch / 2 + (1 - v) * cfg.gravity * 40, Math.min(cw, ch) * .5 * (.4 + v * .7),
          gradAt(j / rows * .4 + i / cols * .2 + cfg.hue, cfg.pal), v * .95, v);
      }
    }
  });

  reg('breathe', 'Systèmes', 'Respiration', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed * .35;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .44 * cfg.spread;
      const b = .5 + .5 * Math.sin(st.t);
      for (let r = 1; r <= 8; r++) {
        const rad = R * (r / 8) * (.6 + b * .5), n = Math.max(6, Math.round(rad / 15));
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + r * cfg.spiral * .08 + st.t * (r % 2 ? .3 : -.3);
          M(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3 + b * 4,
            gradAt(r / 8 + b * .2 + cfg.hue, cfg.pal), .25 + b * .6, b);
        }
      }
    }
  });

  reg('typegrid', 'Systèmes', 'Trame typographique', {
    init(c, w, h, st, cfg) { st.n = 17; st.mat = qrMatrix(st.n, cfg.seed); st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cell = Math.min(w / st.n, h / st.n) * .92, ox = (w - cell * st.n) / 2, oy = (h - cell * st.n) / 2;
      for (let j = 0; j < st.n; j++) for (let i = 0; i < st.n; i++) {
        const on = st.mat[j * st.n + i];
        const scroll = (i + Math.floor(st.t * 3 * cfg.speed)) % st.n;
        const v = st.mat[j * st.n + scroll] ? 1 : .12;
        M(c, ox + i * cell + cell / 2, oy + j * cell + cell / 2, cell * (on ? .82 : .3) * (.6 + v * .5),
          gradAt(i / st.n * .5 + cfg.hue, cfg.pal), on ? v : v * .5, on ? v * .8 : .1);
      }
    }
  });

  reg('heat', 'Systèmes', 'Carte de chaleur', {
    init(c, w, h, st, cfg) {
      st.cols = Math.max(8, Math.min(60, grid(w, cfg, .34))); st.rows = Math.max(5, Math.round(st.cols * h / w));
      st.v = new Float32Array(st.cols * st.rows);
    },
    draw(c, w, h, st, dt, now, cfg, ptr) {
      const cw = w / st.cols, ch = h / st.rows;
      if (ptr.in && cfg.react) {
        const i = Math.floor(ptr.x / cw), j = Math.floor(ptr.y / ch);
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= st.cols || y >= st.rows) continue;
          st.v[y * st.cols + x] = Math.min(1, st.v[y * st.cols + x] + (1 - Math.hypot(di, dj) / 3) * dt * 6);
        }
      }
      for (let j = 0; j < st.rows; j++) for (let i = 0; i < st.cols; i++) {
        const k = j * st.cols + i;
        st.v[k] = Math.max(vnoise(i * .3, j * .3 + now / 4000 * cfg.speed) * .55, st.v[k] - dt * .35);
        const v = st.v[k];
        M(c, i * cw + cw / 2, j * ch + ch / 2, Math.min(cw, ch) * (.28 + v * .5),
          gradAt(v * .8 + cfg.hue, cfg.pal), .12 + v * .85, v * 1.1);
      }
    }
  });

  reg('snake', 'Systèmes', 'Serpents', {
    init(c, w, h, st, cfg) {
      st.cols = Math.max(10, Math.min(60, grid(w, cfg, .3))); st.rows = Math.max(6, Math.round(st.cols * h / w));
      st.s = []; const n = 3 + Math.round(cfg.symmetry);
      for (let i = 0; i < n; i++) st.s.push({ x: (Math.random() * st.cols) | 0, y: (Math.random() * st.rows) | 0, d: (Math.random() * 4) | 0, tail: [], c: Math.random() });
      st.acc = 0;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.acc += dt * cfg.speed * 12;
      const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      while (st.acc > 1) {
        st.acc -= 1;
        for (const s of st.s) {
          if (Math.random() < .16 + cfg.chaos * .4) s.d = (s.d + (Math.random() < .5 ? 1 : 3)) % 4;
          s.x = (s.x + D[s.d][0] + st.cols) % st.cols; s.y = (s.y + D[s.d][1] + st.rows) % st.rows;
          s.tail.push([s.x, s.y]); if (s.tail.length > 16 * cfg.spread) s.tail.shift();
        }
      }
      const cw = w / st.cols, ch = h / st.rows;
      for (const s of st.s) for (let i = 0; i < s.tail.length; i++) {
        const t = i / s.tail.length;
        M(c, s.tail[i][0] * cw + cw / 2, s.tail[i][1] * ch + ch / 2, Math.min(cw, ch) * .48 * (.4 + t * .7),
          gradAt(s.c + t * .2 + cfg.hue, cfg.pal), .15 + t * .8, t);
      }
    }
  });

  reg('mosaic', 'Systèmes', 'Mosaïque révélée', {
    init(c, w, h, st, cfg) {
      st.cols = Math.max(8, Math.min(48, grid(w, cfg, .28))); st.rows = Math.max(5, Math.round(st.cols * h / w));
      st.ord = [...Array(st.cols * st.rows).keys()].sort(() => Math.random() - .5); st.t = 0;
    },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * .3 * cfg.speed;
      const cyc = st.t % 2, p = cyc < 1 ? cyc : 1 - (cyc - 1);
      const cw = w / st.cols, ch = h / st.rows, shown = p * st.ord.length;
      for (let idx = 0; idx < st.ord.length; idx++) {
        if (idx > shown) break;
        const k = st.ord[idx], i = k % st.cols, j = (k / st.cols) | 0;
        const age = Math.min(1, (shown - idx) / 12);
        M(c, i * cw + cw / 2, j * ch + ch / 2, Math.min(cw, ch) * .82 * (.3 + age * .7),
          gradAt(vnoise(i * .25, j * .25) + cfg.hue, cfg.pal), .2 + age * .75, age * .6);
      }
    }
  });

  reg('tide', 'Systèmes', 'Marée', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed;
      const cols = grid(w, cfg, .5), rows = Math.max(5, Math.round(cols * h / w));
      const cw = w / cols, ch = h / rows;
      for (let i = 0; i < cols; i++) {
        const u = i / cols;
        const level = .5 + .32 * Math.sin(u * 5 * cfg.spread + st.t) * Math.sin(u * 2.3 - st.t * .7) * (1 + cfg.wave);
        for (let j = 0; j < rows; j++) {
          const v = j / rows; if (v < level) continue;
          const depth = (v - level) / (1 - level + .001);
          M(c, i * cw + cw / 2, j * ch + ch / 2, Math.min(cw, ch) * .48,
            gradAt(depth * .5 + cfg.hue, cfg.pal), .25 + (1 - depth) * .7, (1 - depth) * .9);
        }
      }
    }
  });

  reg('bloom', 'Systèmes', 'Floraison', {
    init(c, w, h, st) { st.t = 0; },
    draw(c, w, h, st, dt, now, cfg) {
      st.t += dt * cfg.speed * .5;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .45 * cfg.spread;
      const petals = Math.max(3, cfg.symmetry * 3), N = 300;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const a = t * TAU * petals / 3 + st.t * .4;
        const r = R * Math.abs(Math.sin(a * petals / 2 + st.t * .2)) * (.25 + t * .8);
        M(c, cx + Math.cos(a + t * cfg.spiral * .2) * r, cy + Math.sin(a + t * cfg.spiral * .2) * r,
          2.4 + t * 5, gradAt(t + cfg.hue, cfg.pal), .3 + t * .6, .6);
      }
    }
  });

  /* ============================ RUNNER ============================ */
  const DEFAULTS = {
    effect: 'tunnel', density: 900, speed: 1, spiral: 3.1, symmetry: 1, hue: 0,
    palette: 'signature', seed: 7, size: 1, radius: .28, glow: 1, trail: 0,
    jitter: 0, gravity: 0, wave: .6, chaos: 0, spread: 1, zoom: 1, tilt: 0,
    blend: 'lighter', shape: 'carré', mirror: 0, opacity: 1, chromaAmt: 1,
    gridScale: 1, react: 1, bg: 'noir', deterministic: 0
  };
  const NUMERIC = ['density', 'speed', 'spiral', 'symmetry', 'hue', 'seed', 'size', 'radius', 'glow', 'trail', 'jitter', 'gravity', 'wave', 'chaos', 'spread', 'zoom', 'tilt', 'mirror', 'opacity', 'chromaAmt', 'gridScale', 'react'];
  const SHAPES = ['carré', 'losange', 'barre', 'colonne', 'croix', 'cadre', 'point'];
  const BLENDS = ['lighter', 'source-over', 'screen', 'difference', 'overlay'];
  const BGS = ['noir', 'vignette', 'lueur', 'grille', 'transparent'];

  /* RNG déterministe : Math.random est remplacé pendant init/draw quand cfg.deterministic */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function run(cv, effect, opts) {
    opts = opts || {};
    let fx = E[effect] || E.tunnel;
    let c, w, h, dpr, st = {}, raf = 0, running = false, last = 0;
    const cfg = Object.assign({}, DEFAULTS, opts);
    cfg.pal = PALETTES[cfg.palette] || PALETTES.signature;
    cfg.chroma = cfg.chromaAmt;

    let rngCall = 0;
    function sealed(fn) {
      if (!cfg.deterministic) return fn();
      const real = Math.random;
      Math.random = mulberry32((cfg.seed | 0) * 2654435761 + (rngCall++));
      try { return fn(); } finally { Math.random = real; }
    }

    function build() {
      const g = fit(cv, opts.fixedSize); c = g.c; w = g.w; h = g.h; dpr = g.dpr; st = {}; CUR = cfg;
      rngCall = 0; sealed(() => fx.init(c, w, h, st, cfg));
    }
    build();
    const ro = opts.fixedSize ? null : new ResizeObserver(() => build());
    if (ro) ro.observe(cv);

    function bg() {
      if (cfg.bg === 'transparent') return;
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      if (cfg.bg === 'vignette') {
        const g2 = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .7);
        g2.addColorStop(0, '#0b0e13'); g2.addColorStop(1, '#050609'); c.fillStyle = g2; c.fillRect(0, 0, w, h);
      } else if (cfg.bg === 'lueur') {
        c.fillStyle = '#080A08'; c.fillRect(0, 0, w, h);
        const col = gradAt(cfg.hue, cfg.pal);
        const g2 = c.createRadialGradient(w / 2, h * .45, 0, w / 2, h * .45, Math.max(w, h) * .55);
        g2.addColorStop(0, rgba(col, .1)); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, w, h);
      } else if (cfg.bg === 'grille') {
        c.fillStyle = '#080A08'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,.045)'; c.lineWidth = 1; const s = 32;
        c.beginPath();
        for (let x = 0; x < w; x += s) { c.moveTo(x + .5, 0); c.lineTo(x + .5, h); }
        for (let y = 0; y < h; y += s) { c.moveTo(0, y + .5); c.lineTo(w, y + .5); }
        c.stroke();
      } else { c.fillStyle = '#080A08'; c.fillRect(0, 0, w, h); }
    }

    function render(now, dt) {
      CUR = cfg; T = now / 1000;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (cfg.trail > .01 && cfg.bg !== 'transparent') { c.fillStyle = 'rgba(6,7,10,' + Math.max(.02, 1 - cfg.trail) + ')'; c.fillRect(0, 0, w, h); }
      else if (cfg.trail > .01) { c.clearRect(0, 0, w, h); bg(); }
      else { c.clearRect(0, 0, w, h); bg(); }
      c.save();
      if (cfg.zoom !== 1 || cfg.tilt || cfg.mirror) {
        c.translate(w / 2, h / 2);
        if (cfg.tilt) c.rotate(cfg.tilt * Math.PI / 180);
        c.scale(cfg.zoom * (cfg.mirror ? -1 : 1), cfg.zoom);
        c.translate(-w / 2, -h / 2);
      }
      c.globalCompositeOperation = cfg.blend;
      const ptr = opts.pointer ? opts.pointer(w, h, now) : localP(cv);
      sealed(() => fx.draw(c, w, h, st, dt, now, cfg, ptr));
      c.restore();
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      render(now, dt);
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    let io = null;
    if (opts.manual) { /* piloté par step() */ }
    else if (opts.always) start();
    else {
      io = new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? start() : stop()), { threshold: .02 });
      io.observe(cv);
    }

    return {
      cfg,
      set(k, v) {
        if (k === 'effect') { fx = E[v] || fx; cfg.effect = v; build(); return; }
        if (k === 'palette') { cfg.palette = v; cfg.pal = PALETTES[v] || PALETTES.signature; return; }
        cfg[k] = v;
        if (k === 'chromaAmt') cfg.chroma = v;
        if (k === 'density' || k === 'seed' || k === 'gridScale') build();
      },
      apply(obj) { Object.keys(obj).forEach(k => this.set(k, obj[k])); },
      /* rendu manuel, pas à pas — base de l'export vidéo déterministe */
      step(dt, now) { render(now === undefined ? (last += dt * 1000) : now, dt); },
      warmup(seconds, fps) {
        const step = 1 / (fps || 30); let t = 0;
        while (t < seconds) { render(t * 1000, step); t += step; }
      },
      get size() { return { w, h }; },
      rebuild: build,
      destroy() { stop(); if (io) io.disconnect(); if (ro) ro.disconnect(); }
    };
  }

  window.QrowgMotion = {
    PAL, PALETTES, PALETTE_KEYS, SHAPES, BLENDS, BGS, DEFAULTS, CATS,
    gradAt, rgba, module, fit, qrMatrix, vnoise, effects: E, run, RM, TOUCH, pointer: P,
    list: () => Object.keys(E).map(k => ({ key: k, label: E[k].label, cat: E[k].cat }))
  };

  /* ============================ <qrowg-fx> ============================ */
  if (!customElements.get('qrowg-fx')) {
    const ATTRS = ['effect', 'palette', 'blend', 'shape', 'bg'].concat(NUMERIC);
    class QrowgFx extends HTMLElement {
      static get observedAttributes() { return ATTRS; }
      connectedCallback() {
        if (this._cv) return;
        this.style.display = 'block';
        if (!this.style.width) this.style.width = '100%';
        if (!this.style.height) this.style.height = '100%';
        if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
        const cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0';
        this._cv = cv; this.appendChild(cv);
        requestAnimationFrame(() => this._start());
      }
      _opts() {
        const o = { always: this.hasAttribute('always') };
        NUMERIC.forEach(k => { const v = parseFloat(this.getAttribute(k)); if (!isNaN(v)) o[k] = v; });
        ['palette', 'blend', 'shape', 'bg'].forEach(k => { const v = this.getAttribute(k); if (v) o[k] = v; });
        return o;
      }
      _start() {
        if (!this.isConnected) return;
        this._h = run(this._cv, this.getAttribute('effect') || 'tunnel', this._opts());
      }
      attributeChangedCallback(name, o, v) {
        if (!this._h || o === v) return;
        if (NUMERIC.indexOf(name) >= 0) { const n = parseFloat(v); if (!isNaN(n)) this._h.set(name, n); return; }
        this._h.set(name, v);
      }
      disconnectedCallback() { if (this._h) { this._h.destroy(); this._h = null; } this._cv = null; this.innerHTML = ''; }
    }
    customElements.define('qrowg-fx', QrowgFx);
  }
})();
