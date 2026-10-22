#!/usr/bin/env node
/**
 * Headless renderer. Drives the same renderFrame() the player uses, frame by frame.
 *
 *   node scripts/render.mjs stills [frames...]   PNG stills to .renders/stills/
 *   node scripts/render.mjs video                MP4 to public/media/ (needs ffmpeg)
 *   node scripts/render.mjs hero                 hero + social card PNGs to public/media/
 *   node scripts/render.mjs bench                time renderFrame() for every frame in headless Chrome
 *
 * Env: CHROME_PATH to override the browser binary.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'stills';
const args = process.argv.slice(3).map(Number).filter((n) => Number.isFinite(n));

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Chromium found. Set CHROME_PATH.');
  process.exit(1);
}

const server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const { port } = server.httpServer.address();
const base = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch({ executablePath, args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`${base}?render=1&frame=0`);
await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 60000 });

const grab = async (frame, hud = true) =>
  page.evaluate(
    ([n, h]) => {
      window.__pem.render(n, h);
      return document.getElementById('canvas').toDataURL('image/png');
    },
    [frame, hud],
  );
const toBuf = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');

try {
  if (mode === 'stills') {
    const out = join(root, '.renders', 'stills');
    mkdirSync(out, { recursive: true });
    const frames = args.length ? args : [0, 60, 120, 149, 200, 280, 340, 420, 490, 600, 700, 850, 1019];
    for (const f of frames) {
      const file = join(out, `F${String(f).padStart(4, '0')}.png`);
      writeFileSync(file, toBuf(await grab(f)));
      console.log(file);
    }
  } else if (mode === 'hero') {
    const out = join(root, 'public', 'media');
    mkdirSync(out, { recursive: true });
    const hero = await page.evaluate(() => {
      window.__pem.hero();
      return document.getElementById('canvas').toDataURL('image/png');
    });
    writeFileSync(join(out, 'hero-Cursor.png'), toBuf(hero));
    const og = await page.evaluate(() => {
      window.__pem.hero();
      const src = document.getElementById('canvas');
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 630;
      const g = c.getContext('2d');
      const scale = Math.max(1200 / 1920, 630 / 1080);
      const w = 1920 * scale;
      const h = 1080 * scale;
      g.drawImage(src, (1200 - w) / 2, (630 - h) / 2, w, h);
      return c.toDataURL('image/png');
    });
    writeFileSync(join(out, 'og-Cursor.png'), toBuf(og));
    const chapters = [140, 262, 420, 640, 1019];
    for (const f of chapters) {
      writeFileSync(join(out, `still-F${String(f).padStart(4, '0')}-Cursor.png`), toBuf(await grab(f)));
    }
    console.log(`hero, og and ${chapters.length} chapter stills written to ${out}`);
  } else if (mode === 'video') {
    const out = join(root, 'public', 'media');
    mkdirSync(out, { recursive: true });
    const file = join(out, 'pem-electrolyzer-explainer-Cursor.mp4');
    const total = await page.evaluate(() => window.__pem.total);
    const fps = await page.evaluate(() => window.__pem.fps);
    const ff = spawn(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      const buf = toBuf(await grab(f));
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${total - 1}`);
    }
    ff.stdin.end();
    const code = await new Promise((r) => ff.on('close', r));
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    console.log(`${file} (${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } else if (mode === 'bench') {
    const stats = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const times = [];
      for (let f = 0; f < window.__pem.total; f++) {
        const t = performance.now();
        window.__pem.render(f, true);
        ctx.getImageData(0, 0, 1, 1);
        times.push([performance.now() - t, f]);
      }
      times.sort((a, b) => a[0] - b[0]);
      const pick = (q) => times[Math.min(times.length - 1, Math.floor(q * times.length))][0];
      const mean = times.reduce((s, [ms]) => s + ms, 0) / times.length;
      const [worst, worstFrame] = times[times.length - 1];
      return { frames: times.length, meanMs: mean, p50Ms: pick(0.5), p95Ms: pick(0.95), maxMs: worst, worstFrame };
    });
    const r = (n) => Math.round(n * 10) / 10;
    console.log(
      `renderFrame over ${stats.frames} frames: mean ${r(stats.meanMs)} ms, p50 ${r(stats.p50Ms)} ms, ` +
        `p95 ${r(stats.p95Ms)} ms, max ${r(stats.maxMs)} ms (frame ${stats.worstFrame})`,
    );
  } else {
    throw new Error(`Unknown mode "${mode}"`);
  }
} finally {
  await browser.close();
  await server.close();
}
