import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './styles.css';

import { CHAPTERS, FPS, LAST_FRAME, TOTAL_FRAMES, chapterAt, timecode } from './engine/constants.ts';
import { renderFrame } from './engine/render.ts';
import { renderHero } from './engine/hero.ts';
import { BADGES, CAPTIONS, activeText } from './engine/scenes/hud.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
const params = new URLSearchParams(location.search);
const renderMode = params.has('render');

async function loadFonts(): Promise<void> {
  const faces = [
    '500 20px "Space Grotesk"',
    '600 20px "Space Grotesk"',
    '700 20px "Space Grotesk"',
    '500 14px "JetBrains Mono"',
    '600 14px "JetBrains Mono"',
    '700 14px "JetBrains Mono"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
}

declare global {
  interface Window {
    __pem?: {
      total: number;
      fps: number;
      render: (frame: number, hud?: boolean) => void;
      hero: () => void;
    };
  }
}

function initRenderMode(): void {
  document.body.classList.add('render');
  window.__pem = {
    total: TOTAL_FRAMES,
    fps: FPS,
    render: (frame, hud = true) => renderFrame(ctx, frame, { hud }),
    hero: () => renderHero(ctx),
  };
  const frame = Number(params.get('frame') ?? 0);
  if (params.get('hero') !== null) renderHero(ctx);
  else renderFrame(ctx, frame, { hud: params.get('hud') !== '0' });
  document.body.dataset.ready = 'true';
}

function initPlayer(): void {
  const playBtn = $<HTMLButtonElement>('play');
  const bigPlay = $<HTMLButtonElement>('bigplay');
  const scrub = $<HTMLInputElement>('scrub');
  const tc = $<HTMLOutputElement>('tc');
  const speedSel = $<HTMLSelectElement>('speed');
  const loopBtn = $<HTMLButtonElement>('loop');
  const hudBtn = $<HTMLButtonElement>('hud');
  const nowChapter = $('nowChapter');
  const nowCaption = $('nowCaption');
  const nowBadges = $('nowBadges');
  const list = $<HTMLOListElement>('chapterList');
  const ticks = $('ticks');

  let frame = Math.min(LAST_FRAME, Math.max(0, Number(params.get('frame') ?? 0) || 0));
  let playing = false;
  let loop = true;
  let hud = true;
  let speed = 1;
  let startTime = 0;
  let startFrame = 0;
  let drawn = -1;
  let lastCaption = '';

  const bars: HTMLElement[] = [];
  const buttons: HTMLButtonElement[] = [];
  for (const c of CHAPTERS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="num">${String(c.n).padStart(2, '0')} · ${(c.start / FPS).toFixed(0)}–${((c.end + 1) / FPS).toFixed(0)} s · F ${c.start}–${c.end}</span><span class="t"></span><span class="s"></span><span class="bar"><i></i></span>`;
    (b.querySelector('.t') as HTMLElement).textContent = c.title;
    (b.querySelector('.s') as HTMLElement).textContent = c.summary;
    b.addEventListener('click', () => seek(c.start, true));
    li.appendChild(b);
    list.appendChild(li);
    bars.push(b.querySelector('.bar i') as HTMLElement);
    buttons.push(b);
    if (c.start > 0) {
      const t = document.createElement('span');
      t.style.left = `${(c.start / LAST_FRAME) * 100}%`;
      ticks.appendChild(t);
    }
  }

  function updateUi(): void {
    scrub.value = String(frame);
    tc.value = `${timecode(frame)} · F ${String(frame).padStart(4, '0')}`;
    const ch = chapterAt(frame);
    buttons.forEach((b, i) => {
      const c = CHAPTERS[i];
      if (c.n === ch.n) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      const p = frame < c.start ? 0 : frame > c.end ? 1 : (frame - c.start + 1) / (c.end - c.start + 1);
      bars[i].style.width = `${(p * 100).toFixed(1)}%`;
    });
    const cap = activeText(CAPTIONS, frame)[0] ?? '';
    if (cap !== lastCaption) {
      lastCaption = cap;
      nowChapter.textContent = `${String(ch.n).padStart(2, '0')} · ${ch.title}`;
      nowCaption.textContent = cap;
      nowBadges.replaceChildren(
        ...activeText(BADGES, frame).map((t) => {
          const s = document.createElement('span');
          s.textContent = t;
          return s;
        }),
      );
    }
  }

  function draw(): void {
    if (drawn === frame) return;
    renderFrame(ctx, frame, { hud });
    drawn = frame;
    updateUi();
  }

  function setPlaying(p: boolean): void {
    playing = p;
    playBtn.dataset.playing = String(p);
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
    bigPlay.hidden = p || frame !== 0;
    if (p) {
      if (frame >= LAST_FRAME) frame = 0;
      startTime = performance.now();
      startFrame = frame;
      requestAnimationFrame(tick);
    }
  }

  function seek(f: number, keepPlaying = false): void {
    frame = Math.min(LAST_FRAME, Math.max(0, Math.round(f)));
    startTime = performance.now();
    startFrame = frame;
    if (!keepPlaying && playing) setPlaying(false);
    bigPlay.hidden = true;
    draw();
  }

  function tick(now: number): void {
    if (!playing) return;
    let f = startFrame + Math.floor(((now - startTime) / 1000) * FPS * speed);
    if (f > LAST_FRAME) {
      if (loop) {
        startTime = now;
        startFrame = 0;
        f = 0;
      } else {
        f = LAST_FRAME;
        frame = f;
        draw();
        setPlaying(false);
        return;
      }
    }
    frame = f;
    draw();
    requestAnimationFrame(tick);
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  bigPlay.addEventListener('click', () => setPlaying(true));
  $('prev').addEventListener('click', () => seek(frame - 1));
  $('next').addEventListener('click', () => seek(frame + 1));
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  speedSel.addEventListener('change', () => {
    speed = Number(speedSel.value);
    startTime = performance.now();
    startFrame = frame;
  });
  loopBtn.addEventListener('click', () => {
    loop = !loop;
    loopBtn.setAttribute('aria-pressed', String(loop));
  });
  hudBtn.addEventListener('click', () => {
    hud = !hud;
    hudBtn.setAttribute('aria-pressed', String(hud));
    drawn = -1;
    draw();
  });
  $('png').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `pem-electrolyzer-frame-${String(frame).padStart(4, '0')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  $('fs').addEventListener('click', () => {
    const stage = $('stage');
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.();
  });

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t !== scrub)) return;
    const step = e.shiftKey ? FPS : 1;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        setPlaying(!playing);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seek(frame - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seek(frame + step);
        break;
      case 'Home':
        seek(0);
        break;
      case 'End':
        seek(LAST_FRAME);
        break;
      case 'h':
        hudBtn.click();
        break;
      case 'f':
        $('fs').click();
        break;
      default:
        if (/^[1-5]$/.test(e.key)) seek(CHAPTERS[Number(e.key) - 1].start, playing);
    }
  });

  draw();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!params.has('frame') && !reduced) setPlaying(true);
  else bigPlay.hidden = frame !== 0;
}

loadFonts()
  .then(() => {
    $('loading').hidden = true;
    if (renderMode) initRenderMode();
    else initPlayer();
  })
  .catch((err: unknown) => {
    const el = $('loading');
    el.classList.add('error');
    el.textContent = 'The explainer could not start. Reload the page to try again.';
    console.error(err);
  });
