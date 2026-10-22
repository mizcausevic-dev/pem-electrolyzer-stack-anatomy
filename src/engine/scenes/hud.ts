import type { Projector } from '../camera.ts';
import { CHAPTERS, FPS, H, LAST_FRAME, W, chapterAt, timecode } from '../constants.ts';
import { badge, glassPanel } from '../draw.ts';
import { C, rgba } from '../palette.ts';
import { clamp, win } from '../math.ts';
import { drawRich, font } from '../text.ts';
import { P } from './plant.ts';

interface Timed {
  a: number;
  b: number;
  text: string;
}

/** End past the last frame so closing text never starts its fade-out: the final view holds still. */
const HOLD = LAST_FRAME + 1 + 30;

export const CAPTIONS: readonly Timed[] = [
  { a: 0, b: 44, text: 'A generic PEM electrolyzer stack: repeating cells clamped between two end plates.' },
  { a: 44, b: 108, text: 'A section plane cuts the stack at its mid-plane. Nothing is taken apart.' },
  { a: 108, b: 172, text: 'Each cell repeats one sandwich: bipolar plate, porous transport layer, catalyst-coated membrane, gas diffusion layer.' },
  { a: 172, b: 236, text: 'Deionized water enters the anode inlet manifold and is distributed to every cell.' },
  { a: 236, b: 304, text: 'Water rises through each anode flow channel and soaks through the porous titanium layer to the catalyst.' },
  { a: 304, b: 352, text: 'DC power is applied across the stack. Electrons leave the anode end and return at the cathode end.' },
  { a: 352, b: 412, text: 'At the anode catalyst, water is oxidized into oxygen, protons and electrons.' },
  { a: 412, b: 458, text: 'Protons cross the membrane. At the cathode they combine with electrons to form hydrogen.' },
  { a: 458, b: 514, text: 'Oxygen leaves with the circulating water. Hydrogen leaves through the cathode manifold.' },
  { a: 514, b: 600, text: 'Losses inside each cell appear as heat in the membrane electrode region.' },
  { a: 600, b: 680, text: 'Circulating anode water carries that heat out of the stack to a heat exchanger.' },
  { a: 680, b: 754, text: 'Temperature sensors at the stack inlet and outlet let the controller trim cooling.' },
  { a: 754, b: 880, text: 'Pulling back: the stack is one block in a larger system.' },
  { a: 880, b: HOLD, text: 'Complete system: power conversion, water treatment, gas separation, purification, heat rejection, controls.' },
];

export const NOTES: readonly Timed[] = [
  { a: 524, b: 754, text: 'SOURCE \u00b7 U.S. DOE: PEM electrolyzers typically operate at about 70\u201390 \u00b0C.' },
  { a: 900, b: HOLD, text: 'GENERIC CONFIGURATION \u00b7 not a specific commercial product or certified design.' },
];

export const BADGES: readonly Timed[] = [
  { a: 40, b: 352, text: 'SECTION VIEW \u00b7 NOT DISASSEMBLY' },
  { a: 470, b: 760, text: 'SECTION VIEW \u00b7 NOT DISASSEMBLY' },
  { a: 108, b: 352, text: 'SCALE \u00b7 LAYER THICKNESS EXAGGERATED' },
  { a: 470, b: 524, text: 'SCALE \u00b7 LAYER THICKNESS EXAGGERATED' },
  { a: 168, b: 300, text: 'TIME COMPRESSED \u00b7 FILL FASTER THAN REAL TIME' },
  { a: 352, b: 470, text: 'SCALE CHANGE \u00b7 CATALYST LAYER, NOT TO SCALE' },
  { a: 352, b: 470, text: 'SLOW MOTION \u00b7 SCHEMATIC EVENT TIMING' },
  { a: 520, b: 760, text: 'TIME COMPRESSED \u00b7 THERMAL RESPONSE' },
  { a: 760, b: HOLD, text: 'SCHEMATIC \u00b7 COMPONENTS NOT TO SCALE' },
];

/** Labels active at a frame, for the player's accessible text track. */
export function activeText(list: readonly Timed[], f: number): string[] {
  return list.filter((t) => f >= t.a && f < t.b).map((t) => t.text);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const wd of words) {
    const test = line ? `${line} ${wd}` : wd;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = wd;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = C.stage;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.46, 80, W * 0.5, H * 0.5, W * 0.62);
  g.addColorStop(0, rgba(C.stageLift, 1));
  g.addColorStop(1, rgba(C.stage, 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 48) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

function legend(ctx: CanvasRenderingContext2D): void {
  const x = 56;
  const y = 878;
  glassPanel(ctx, x, y, 560, 108, 10);
  const items: [string, string, string][] = [
    [C.cyan, 'Primary pathway', 'water, H^+, H_2'],
    [C.gold, 'Energy / actuation', 'DC, heat, pump, valves'],
    [C.violet, 'Sensing / state change', 'sensors, reactions'],
  ];
  items.forEach(([col, t, s], i) => {
    const ix = x + 18 + i * 180;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(ix, y + 18, 12, 12, 3);
    ctx.fill();
    drawRich(ctx, t, ix + 20, y + 29, { size: 14, weight: 600, color: C.ink });
    drawRich(ctx, s, ix + 20, y + 47, { size: 12, weight: 500, color: C.inkDim });
  });
  const gy = y + 66;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 18, gy, 14, 14);
  ctx.fillStyle = C.titanium;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(232,237,245,0.35)';
  ctx.beginPath();
  for (let i = -14; i < 14; i += 4) {
    ctx.moveTo(x + 18 + i, gy);
    ctx.lineTo(x + 32 + i, gy + 14);
  }
  ctx.stroke();
  ctx.restore();
  ctx.font = font(11.5, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('HARDWARE \u00b7 hatched cut', x + 38, gy + 11);

  const fx = x + 210;
  const fg = ctx.createLinearGradient(fx, gy + 14, fx, gy);
  fg.addColorStop(0, rgba(C.gold, 0.05));
  fg.addColorStop(1, rgba(C.gold, 0.45));
  ctx.fillStyle = fg;
  ctx.fillRect(fx, gy, 14, 14);
  ctx.strokeStyle = C.gold;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(fx, gy + 7);
  ctx.lineTo(fx + 14, gy + 7);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.inkDim;
  ctx.fillText('FIELD \u00b7 dashed contours', fx + 20, gy + 11);

  const dx = x + 398;
  ctx.strokeStyle = 'rgba(232,237,245,0.5)';
  ctx.strokeRect(dx + 0.5, gy + 0.5, 13, 13);
  ctx.strokeStyle = 'rgba(232,237,245,0.2)';
  ctx.beginPath();
  ctx.moveTo(dx + 7, gy);
  ctx.lineTo(dx + 7, gy + 14);
  ctx.moveTo(dx, gy + 7);
  ctx.lineTo(dx + 14, gy + 7);
  ctx.stroke();
  ctx.fillStyle = C.inkDim;
  ctx.fillText('DIAGRAM \u00b7 boxed grid', dx + 20, gy + 11);

  ctx.font = font(11.5, 500, 'mono');
  ctx.fillStyle = C.inkFaint;
  ctx.fillText('Accent colors are explanatory overlays, not literal emission.', x + 18, y + 100);
}

const LOC = { x: 1584, y: 870, w: 280, h: 116 };
const WORLD = { x0: -1180, x1: 1140, y0: -340, y1: 660 };

function locator(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  glassPanel(ctx, LOC.x, LOC.y, LOC.w, LOC.h, 10);
  ctx.font = font(11, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LOCATOR', LOC.x + 14, LOC.y + 20);
  const s = Math.min((LOC.w - 28) / (WORLD.x1 - WORLD.x0), (LOC.h - 36) / (WORLD.y1 - WORLD.y0));
  const ox = LOC.x + LOC.w / 2 - ((WORLD.x0 + WORLD.x1) / 2) * s;
  const oy = LOC.y + 26 + (LOC.h - 32) / 2 + ((WORLD.y0 + WORLD.y1) / 2) * s;
  const m = (x: number, y: number): [number, number] => [ox + x * s, oy - y * s];

  ctx.save();
  ctx.beginPath();
  ctx.rect(LOC.x + 1, LOC.y + 26, LOC.w - 2, LOC.h - 28);
  ctx.clip();
  ctx.strokeStyle = 'rgba(163, 176, 194, 0.45)';
  ctx.lineWidth = 1;
  const line = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = m(p[0], p[1]);
      if (i === 0) ctx.moveTo(q[0], q[1]);
      else ctx.lineTo(q[0], q[1]);
    });
    ctx.stroke();
  };
  line([[-244, 146], [-540, 146]]);
  line([[-600, 45], [-600, -152], [-244, -152]]);
  line([[-600, 295], [-600, 420], [-830, 420]]);
  line([[-1150, 170], [-660, 170]]);
  line([[244, 171], [500, 171]]);
  line([[560, 295], [560, 420], [1120, 420]]);
  line([[-140, 420], [-140, 300], [-211, 300], [-211, 236]]);
  line([[140, 420], [140, 300], [211, 300], [211, 236]]);
  const rectW = (cx: number, cy: number, w: number, h: number, fill: string) => {
    const a = m(cx - w / 2, cy + h / 2);
    ctx.fillStyle = fill;
    ctx.fillRect(a[0], a[1], w * s, h * s);
  };
  rectW(0, 0, 488, 400, C.titanium);
  rectW(P.sepO2.x, P.sepO2.y, P.sepO2.w, P.sepO2.h, C.structLight);
  rectW(P.sepH2.x, P.sepH2.y, P.sepH2.w, P.sepH2.h, C.structLight);
  rectW(P.di.x, P.di.y, P.di.w, P.di.h, C.structLight);
  rectW(P.purifier.x, P.purifier.y, P.purifier.w, P.purifier.h, C.structLight);
  rectW(P.power.x, P.power.y, P.power.w, P.power.h, C.structLight);
  rectW(P.control.x, P.control.y, P.control.w, P.control.h, C.structLight);
  rectW(P.cooling.x, P.cooling.y, P.cooling.w, P.cooling.h, C.structLight);

  const v = proj.viewRect();
  const a = m(Math.max(v.x0, WORLD.x0 - 40), Math.min(v.y1, WORLD.y1 + 40));
  const b = m(Math.min(v.x1, WORLD.x1 + 40), Math.max(v.y0, WORLD.y0 - 40));
  const vw = Math.max(4, b[0] - a[0]);
  const vh = Math.max(4, b[1] - a[1]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(a[0] + (b[0] - a[0] - vw) / 2, a[1] + (b[1] - a[1] - vh) / 2, vw, vh);
  if (!proj.flat) {
    ctx.fillStyle = 'rgba(232,237,245,0.10)';
    ctx.fillRect(a[0], a[1], vw, vh);
  }
  ctx.restore();
  ctx.font = font(10.5, 500, 'mono');
  ctx.fillStyle = C.inkFaint;
  ctx.textAlign = 'right';
  ctx.fillText(f < 112 ? '3/4 view' : 'section plane A\u2013A', LOC.x + LOC.w - 14, LOC.y + 20);
  ctx.textAlign = 'left';
}

function rail(ctx: CanvasRenderingContext2D, f: number): void {
  const x0 = 56;
  const x1 = W - 56;
  const y = 1000;
  const gap = 8;
  const total = LAST_FRAME + 1;
  const usable = x1 - x0 - gap * (CHAPTERS.length - 1);
  let x = x0;
  const cur = chapterAt(f);
  for (const c of CHAPTERS) {
    const w = (usable * (c.end - c.start + 1)) / total;
    const p = clamp((f - c.start + 1) / (c.end - c.start + 1));
    ctx.fillStyle = 'rgba(232,237,245,0.10)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = c.n < cur.n ? 'rgba(232,237,245,0.45)' : C.ink;
    if (c.n <= cur.n) ctx.fillRect(x, y, w * (c.n < cur.n ? 1 : p), 4);
    const isCur = c.n === cur.n;
    const isPrev = c.n === cur.n - 1;
    ctx.font = font(12.5, isCur ? 700 : 500, 'mono');
    ctx.fillStyle = isCur ? C.ink : isPrev ? C.inkDim : C.inkFaint;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${String(c.n).padStart(2, '0')} ${c.title.toUpperCase()}`, x, y + 24);
    if (isPrev) {
      ctx.fillStyle = C.inkDim;
      ctx.font = font(11, 500, 'mono');
      ctx.fillText('feeds \u25b8', x + w - 62, y + 24);
    }
    x += w + gap;
  }
}

/** Top and bottom scrims over the stage so HUD text stays legible against any frame. */
export function drawHudFades(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const topFade = ctx.createLinearGradient(0, 0, 0, 200);
  topFade.addColorStop(0, 'rgba(11,16,25,0.92)');
  topFade.addColorStop(1, 'rgba(11,16,25,0)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, W, 200);
  const botFade = ctx.createLinearGradient(0, H - 230, 0, H);
  botFade.addColorStop(0, 'rgba(11,16,25,0)');
  botFade.addColorStop(0.45, 'rgba(11,16,25,0.88)');
  botFade.addColorStop(1, 'rgba(11,16,25,0.96)');
  ctx.fillStyle = botFade;
  ctx.fillRect(0, H - 230, W, 230);
  ctx.restore();
}

export function drawHud(ctx: CanvasRenderingContext2D, f: number, proj: Projector): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const chapter = chapterAt(f);

  ctx.textBaseline = 'alphabetic';
  ctx.font = font(13, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.fillText('HYDROGEN & FUEL CELL SYSTEMS \u00b7 ANATOMY EXPLAINER', 56, 56);
  ctx.font = font(36, 600);
  ctx.fillStyle = C.ink;
  ctx.fillText('PEM Electrolyzer Stack', 56, 98);
  const tw = ctx.measureText('PEM Electrolyzer Stack').width;
  ctx.font = font(15, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.fillText(`${String(chapter.n).padStart(2, '0')} / 05  ${chapter.title.toUpperCase()}`, 56 + tw + 22, 97);

  ctx.font = font(19, 500);
  for (const c of CAPTIONS) {
    const a = win(f, c.a, c.b, 8, 8);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = C.ink;
    const lines = wrap(ctx, c.text, 860);
    lines.forEach((ln, i) => ctx.fillText(ln, 56, 134 + i * 25));
  }
  ctx.globalAlpha = 1;
  for (const n of NOTES) {
    const a = win(f, n.a, n.b, 10, 10);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.font = font(12.5, 600, 'mono');
    ctx.fillStyle = C.inkDim;
    ctx.fillText(n.text, 56, 192);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'right';
  ctx.font = font(24, 600, 'mono');
  ctx.fillStyle = C.ink;
  ctx.fillText(timecode(f), W - 56, 62);
  ctx.font = font(12.5, 500, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.fillText(`F ${String(f).padStart(4, '0')} / ${LAST_FRAME} \u00b7 ${FPS} FPS`, W - 56, 84);
  ctx.textAlign = 'left';

  let by = 100;
  for (const b of BADGES) {
    const a = win(f, b.a, b.b, 8, 8);
    if (a <= 0.01) continue;
    badge(ctx, W - 56, by, b.text, '#E8EDF5', a);
    by += 36 * Math.min(1, a * 1.5);
  }

  legend(ctx);
  locator(ctx, proj, f);
  rail(ctx, f);

  ctx.font = font(11.5, 500, 'mono');
  ctx.fillStyle = C.inkFaint;
  ctx.fillText(
    'Generic PEM electrolyzer \u00b7 illustrative schematic, not a certified engineering reference \u00b7 no efficiency or performance claims \u00b7 mechanism: U.S. DOE, Hydrogen Production: Electrolysis',
    56,
    1056,
  );
  ctx.restore();
}
