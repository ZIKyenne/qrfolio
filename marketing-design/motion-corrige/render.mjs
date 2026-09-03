#!/usr/bin/env node
/* Qrowg render CLI — rend un clip JSON en MP4 / PNG / planche-contact, sans interface.
 *
 *   npm i -D playwright && npx playwright install chromium
 *
 *   node render.mjs clip.json                     # -> out/clip.mp4 (ffmpeg requis)
 *   node render.mjs clip.json --format png        # -> out/clip/frame_0001.png …
 *   node render.mjs clip.json --sheet             # -> out/clip.sheet.png (contrôle visuel)
 *   node render.mjs clip.json --still 1.2         # -> out/clip.cover.png
 *   node render.mjs clip.json --validate          # n'écrit rien, sort 1 si erreurs
 *   node render.mjs clips/ --format mp4           # lot : tous les .json du dossier
 *
 * Options : --out DIR (out/) · --fps 30 · --crf 18 · --no-validate · --keep-frames
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help')) { console.log(await readFile(new URL(import.meta.url)).then(b => b.toString().split('*/')[0].replace('#!/usr/bin/env node', '').trim())); process.exit(0); }

const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const has = n => argv.includes('--' + n);
const input = argv[0];
const OUT = path.resolve(String(flag('out', 'out')));
const FORMAT = has('sheet') ? 'sheet' : has('still') ? 'still' : String(flag('format', 'mp4'));
const FPS = +flag('fps', 0) || 0;
const CRF = +flag('crf', 18);

const log = (...a) => console.log('·', ...a);
const die = (m) => { console.error('✕ ' + m); process.exit(1); };

/* ---------- navigateur ---------- */
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { die('playwright manquant.  npm i -D playwright && npx playwright install chromium'); }

const harness = path.join(HERE, 'harness.html');
if (!existsSync(harness)) die('harness.html introuvable à côté de render.mjs');

function resolveChrome() {
  if (process.env.QROWG_CHROME && existsSync(process.env.QROWG_CHROME)) return process.env.QROWG_CHROME;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of readdirSync(root).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const p = path.join(root, d, 'chrome-linux', 'chrome');
      if (existsSync(p)) return p;
    }
  } catch {}
  return undefined;
}
const browser = await chromium.launch({ executablePath: resolveChrome(), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('  [page]', e.message));
await page.goto(pathToFileURL(harness).href);
await page.waitForFunction('window.__ready && window.__ready()', null, { timeout: 15000 });
const fontsOk = await page.evaluate(() => window.__fonts());
if (!fontsOk) console.warn('⚠ polices Inter / JetBrains Mono non chargées (hors ligne ?) — le rendu utilisera une police de repli');

/* ---------- entrées ---------- */
async function clipsFrom(p) {
  const abs = path.resolve(p);
  const stat = existsSync(abs) ? (await import('node:fs')).statSync(abs) : null;
  if (!stat) die('introuvable : ' + p);
  if (stat.isDirectory()) {
    const files = (await readdir(abs)).filter(f => f.endsWith('.json')).sort();
    if (!files.length) die('aucun .json dans ' + p);
    return Promise.all(files.map(async f => ({ name: path.basename(f, '.json'), def: JSON.parse(await readFile(path.join(abs, f), 'utf8')) })));
  }
  return [{ name: path.basename(abs).replace(/\.json$/, ''), def: JSON.parse(await readFile(abs, 'utf8')) }];
}

/* ---------- ffmpeg ---------- */
function ffmpeg(args) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', () => rej(new Error('ffmpeg introuvable dans le PATH')));
    p.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg a échoué :\n' + err.split('\n').slice(-12).join('\n'))));
  });
}

/* ---------- rendu ---------- */
let failed = 0;
const jobs = await clipsFrom(input);
await mkdir(OUT, { recursive: true });

for (const { name, def } of jobs) {
  if (FPS) def.fps = FPS;
  log(`clip « ${name} » · ${def.format || 'reel'}`);

  if (!has('no-validate')) {
    const v = await page.evaluate(d => window.__validate(d), def);
    v.errors.forEach(e => console.error('  ✕ ' + e));
    v.warnings.forEach(w => console.warn('  ⚠ ' + w));
    if (!v.errors.length && !v.warnings.length) log('  contrôle qualité : rien à signaler');
    if (!v.ok) { failed++; if (has('validate')) continue; die('clip invalide — corrige les erreurs ci-dessus'); }
    if (has('validate')) continue;
  }

  if (FORMAT === 'sheet') {
    const b64 = await page.evaluate(d => window.__sheet(d, { count: 6, cols: 3 }), def);
    const f = path.join(OUT, name + '.sheet.png');
    await writeFile(f, Buffer.from(b64, 'base64'));
    log('  planche-contact →', f);
    continue;
  }

  if (FORMAT === 'still') {
    const t = +flag('still', 1.2) || 1.2;
    const b64 = await page.evaluate(([d, tt]) => window.__still(d, tt), [def, t]);
    const f = path.join(OUT, name + '.cover.png');
    await writeFile(f, Buffer.from(b64, 'base64'));
    log('  image fixe →', f);
    continue;
  }

  const meta = await page.evaluate(d => window.__init(d), def);
  const dir = path.join(OUT, name);
  await mkdir(dir, { recursive: true });
  log(`  ${meta.w}×${meta.h} · ${meta.total} frames @ ${meta.fps} fps`);

  const t0 = Date.now();
  for (let i = 0; i < meta.total; i++) {
    const b64 = await page.evaluate(k => window.__next(k), i);
    await writeFile(path.join(dir, 'frame_' + String(i + 1).padStart(4, '0') + '.png'), Buffer.from(b64, 'base64'));
    if (i % 15 === 0 || i === meta.total - 1) {
      process.stdout.write(`\r  rendu ${Math.round((i + 1) / meta.total * 100)}%   `);
    }
  }
  process.stdout.write(`\r  rendu 100% en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  if (FORMAT === 'png') { log('  séquence →', dir); continue; }

  const target = path.join(OUT, name + (FORMAT === 'webm' ? '.webm' : '.mp4'));
  const common = ['-y', '-framerate', String(meta.fps), '-i', path.join(dir, 'frame_%04d.png')];
  const enc = FORMAT === 'webm'
    ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(CRF + 12), '-pix_fmt', 'yuv420p']
    : ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
  try {
    await ffmpeg([...common, ...enc, target]);
    log('  vidéo →', target);
    if (!has('keep-frames')) await rm(dir, { recursive: true, force: true });
  } catch (e) {
    console.error('  ✕ ' + e.message);
    log('  les PNG restent dans', dir);
    failed++;
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
