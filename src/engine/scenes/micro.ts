import type { Projector } from '../camera.ts';
import { H, W } from '../constants.ts';
import { FOCUS_O, L } from '../geometry.ts';
import { C, rgba } from '../palette.ts';
import { clamp, easeInOutSine, lerp, win } from '../math.ts';
import { drawRich, font } from '../text.ts';
import { label } from '../draw.ts';

/**
 * Catalyst-layer schematic. Each event conserves the published half-reactions:
 * anode 2H2O -> O2 + 4H+ + 4e-, cathode 4H+ + 4e- -> 2H2 (U.S. DOE).
 * Timing is slowed for legibility and labeled as slow motion on screen.
 */
export const MICRO = { first: 350, period: 60, events: 3, life: 122 };

const o = FOCUS_O;
const XA = o + (L.acl[0] + L.acl[1]) / 2;
const XC = o + (L.ccl[0] + L.ccl[1]) / 2;
const LANES = [20.6, 17.3, 23.9];

export function microAlpha(proj: Projector, f: number): number {
  return clamp((proj.zoom - 14) / 16) * win(f, 340, 490, 10, 10);
}

type Kind = 'h2o' | 'hp' | 'e' | 'o2' | 'h2';

/** Species glyph sized for the 1080p micro view; `s` scales it down for the key. */
function glyph(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, a: number, s = 1): void {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineWidth = Math.max(1.4, 2.4 * s);
  const mark = Math.max(1.6, 3 * s);
  switch (kind) {
    case 'h2o': {
      ctx.fillStyle = rgba(C.cyan, 0.3);
      ctx.strokeStyle = C.cyan;
      for (const ang of [-0.9, 0.9]) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang - Math.PI / 2) * 18 * s, y + Math.sin(ang - Math.PI / 2) * -18 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'hp': {
      ctx.fillStyle = C.cyan;
      ctx.beginPath();
      ctx.arc(x, y, 12 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.stage;
      ctx.lineWidth = mark;
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, y);
      ctx.lineTo(x + 6 * s, y);
      ctx.moveTo(x, y - 6 * s);
      ctx.lineTo(x, y + 6 * s);
      ctx.stroke();
      break;
    }
    case 'e': {
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(x, y, 10 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.stage;
      ctx.lineWidth = mark;
      ctx.beginPath();
      ctx.moveTo(x - 5.5 * s, y);
      ctx.lineTo(x + 5.5 * s, y);
      ctx.stroke();
      break;
    }
    case 'o2': {
      ctx.fillStyle = rgba(C.o2, 0.32);
      ctx.strokeStyle = C.o2;
      for (const dx of [-10, 10]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y, 14 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'h2': {
      ctx.fillStyle = rgba(C.cyan, 0.32);
      ctx.strokeStyle = C.cyan;
      for (const dx of [-7.5, 7.5]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y, 11 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, a: number): void {
  if (t < 0 || t > 1) return;
  ctx.save();
  ctx.globalAlpha *= a * (1 - t);
  ctx.strokeStyle = C.violet;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 14 + t * 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Progress of a move that runs from t0 to t1 frames into the event. */
const seg = (t: number, t0: number, t1: number) => easeInOutSine(clamp((t - t0) / (t1 - t0)));
const vis = (t: number, t0: number, t1: number, fade = 6) =>
  clamp((t - t0) / fade) * clamp((t1 - t) / fade);

export interface Phase {
  anode: number;
  membrane: number;
  cathode: number;
}

export function microPhase(f: number): Phase {
  const out: Phase = { anode: 0, membrane: 0, cathode: 0 };
  for (let k = 0; k < MICRO.events; k++) {
    const t = f - (MICRO.first + k * MICRO.period);
    out.anode = Math.max(out.anode, vis(t, 14, 40, 6));
    out.membrane = Math.max(out.membrane, vis(t, 30, 68, 6));
    out.cathode = Math.max(out.cathode, vis(t, 62, 92, 6));
  }
  return out;
}

export function drawMicro(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  const A = microAlpha(proj, f);
  if (A <= 0.01) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = A;
  // Knock back the magnified material texture so the species read first.
  ctx.fillStyle = rgba(C.stage, 0.42);
  ctx.fillRect(0, 0, W, H);
  const P = (x: number, y: number) => proj.project(x, y, 0);

  // Fixed sulfonate sites in the membrane (material, drawn in neutral ink).
  ctx.strokeStyle = 'rgba(40, 52, 70, 0.75)';
  ctx.fillStyle = 'rgba(40, 52, 70, 0.18)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 9; j++) {
      const mx = o + L.mem[0] + 0.9 + i * 1.4 + (j % 2) * 0.7;
      const my = 12 + j * 1.9;
      const p = P(mx, my);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 2.4, p.y);
      ctx.lineTo(p.x + 2.4, p.y);
      ctx.stroke();
    }
  }

  for (let k = 0; k < MICRO.events; k++) {
    const t = f - (MICRO.first + k * MICRO.period);
    if (t < 0 || t > MICRO.life) continue;
    const y0 = LANES[k % LANES.length];

    for (const s of [-1, 1]) {
      const u = seg(t, 0, 26);
      const p = P(lerp(o + L.ptl[0] + 1.2, XA - 0.9, u), y0 + s * 1.7 + Math.sin(t * 0.2 + s) * 0.15);
      glyph(ctx, 'h2o', p.x, p.y, vis(t, 0, 28, 5));
    }
    const pa = P(XA, y0);
    ring(ctx, pa.x, pa.y, (t - 24) / 16, 1);

    {
      const u = seg(t, 28, 92);
      const p = P(lerp(XA - 0.6, o + L.ptl[0] - 1, u), y0 + 0.6 + u * 1.6);
      glyph(ctx, 'o2', p.x, p.y, vis(t, 27, 92, 6));
    }
    for (let j = 0; j < 4; j++) {
      const t0 = 28 + j * 4;
      const u = seg(t, t0, t0 + 32);
      const p = P(lerp(XA + 0.8, XC - 0.7, u), y0 + (j - 1.5) * 1.15);
      glyph(ctx, 'hp', p.x, p.y, vis(t, t0, t0 + 40, 4));
    }
    for (let j = 0; j < 4; j++) {
      const t0 = 28 + j * 3;
      const u = seg(t, t0, t0 + 34);
      const p = P(lerp(XA - 0.4, o + L.ptl[0] - 0.5, u), y0 - 2.6 + j * 0.5);
      glyph(ctx, 'e', p.x, p.y, vis(t, t0, t0 + 34, 5));
    }
    for (let j = 0; j < 4; j++) {
      const t0 = 38 + j * 3;
      const u = seg(t, t0, t0 + 30);
      const p = P(lerp(o + L.gdl[1] - 0.5, XC + 0.6, u), y0 + 2.6 - j * 0.5);
      glyph(ctx, 'e', p.x, p.y, vis(t, t0, t0 + 32, 5));
    }
    {
      const u = seg(t, 32, 70);
      const p = P(lerp(XA + 0.6, XC + 1.6, u), y0 - 2.9);
      glyph(ctx, 'h2o', p.x, p.y, vis(t, 32, 74, 6) * 0.75);
    }
    const pc = P(XC, y0);
    ring(ctx, pc.x, pc.y, (t - 66) / 16, 1);
    for (const s of [-1, 1]) {
      const u = seg(t, 70, 120);
      const p = P(lerp(XC + 0.4, o + L.gdl[1] + 3.5, u), y0 + s * 1.4 + u * 0.8);
      glyph(ctx, 'h2', p.x, p.y, vis(t, 70, 120, 6));
    }
  }
  ctx.restore();
}

/** Screen-space overlays for the micro view: layer tags, callouts and the equation diagram. */
export function drawMicroOverlay(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  const A = microAlpha(proj, f);
  if (A <= 0.01) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = A;

  const tags: [number, number, string, string][] = [
    [o + L.ptl[0], o + L.ptl[1], 'Porous transport layer', 'typ. titanium'],
    [o + L.acl[0], o + L.acl[1], 'Anode catalyst', 'typ. iridium oxide'],
    [o + L.mem[0], o + L.mem[1], 'Membrane (PEM)', 'conducts H^+ only'],
    [o + L.ccl[0], o + L.ccl[1], 'Cathode catalyst', 'typ. Pt on carbon'],
    [o + L.gdl[0], o + L.gdl[1], 'Gas diffusion layer', 'typ. carbon paper'],
  ];
  for (const [x0, x1, t, s] of tags) {
    const a = proj.project(x0, 0, 0).x;
    const b = proj.project(x1, 0, 0).x;
    const cx = (a + b) / 2;
    if (cx < 40 || cx > 1880) continue;
    ctx.fillStyle = 'rgba(9, 14, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(a + 4, 214, b - a - 8, 50, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 237, 245, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a + 4, 270);
    ctx.lineTo(b - 4, 270);
    ctx.stroke();
    drawRich(ctx, t, cx, 236, { size: 16, weight: 600, color: C.ink, align: 'center' });
    drawRich(ctx, s, cx, 255, { size: 13, weight: 500, color: C.inkDim, align: 'center' });
  }

  const ph = microPhase(f);
  const ys = LANES[0];
  label(ctx, proj.project(XA, ys + 1.6, 0), 'Water oxidation site', {
    dx: -150,
    dy: -170,
    accent: C.violet,
    sub: 'state change: liquid water to O_2 gas, H^+ and e^-',
    alpha: win(f, 372, 470, 12, 12),
  });
  label(ctx, proj.project(XC, ys + 1.6, 0), 'Hydrogen evolution site', {
    dx: 150,
    dy: -170,
    accent: C.violet,
    sub: 'state change: H^+ + e^- to H_2 gas',
    alpha: win(f, 384, 470, 12, 12),
  });
  // Shown only during the first event's crossing so the second event's lane stays clear.
  label(ctx, proj.project(o + L.mem[0] + 3, ys - 2.9, 0), 'Some water crosses with protons', {
    dx: 30,
    dy: 110,
    accent: C.cyan,
    sub: 'electro-osmotic drag; removed downstream',
    alpha: win(f, 392, 440, 10, 10),
  });

  // Equation diagram: boxed, gridded, monospace, so it never reads as hardware.
  const x = 640;
  const y = 878;
  const w = 920;
  const h = 108;
  ctx.fillStyle = 'rgba(9, 14, 22, 0.92)';
  ctx.strokeStyle = 'rgba(232, 237, 245, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.clip();
  ctx.strokeStyle = 'rgba(232, 237, 245, 0.05)';
  ctx.beginPath();
  for (let gx = x; gx < x + w; gx += 16) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (let gy = y; gy < y + h; gy += 16) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();
  ctx.restore();

  ctx.font = font(11.5, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('DIAGRAM \u00b7 HALF-REACTIONS (U.S. DOE)', x + 16, y + 22);

  const cells: [string, string, number][] = [
    ['ANODE', '2H_2O -> O_2 + 4H^+ + 4e^-', ph.anode],
    ['PEM', '4H^+ cross \u00b7 4e^- external', ph.membrane],
    ['CATHODE', '4H^+ + 4e^- -> 2H_2', ph.cathode],
  ];
  const cw = (w - 32) / 3;
  cells.forEach(([name, eq, hi], i) => {
    const cx = x + 16 + i * cw;
    const cy = y + 32;
    if (hi > 0.01) {
      ctx.fillStyle = rgba(C.violet, 0.24 * hi);
      ctx.fillRect(cx, cy, cw - 8, 40);
      ctx.fillStyle = rgba(C.violet, hi);
      ctx.fillRect(cx, cy, 3, 40);
    }
    ctx.font = font(10.5, 600, 'mono');
    ctx.fillStyle = C.inkFaint;
    ctx.fillText(name, cx + 10, cy + 13);
    drawRich(ctx, eq, cx + 10, cy + 33, { size: 17, weight: 500, family: 'mono', color: C.ink });
  });

  const ky = y + h - 14;
  drawRich(ctx, 'OVERALL  2H_2O -> 2H_2 + O_2', x + 26, ky, { size: 14, weight: 500, family: 'mono', color: C.inkDim });
  const keys: [Kind, string][] = [
    ['h2o', 'H_2O'],
    ['hp', 'H^+'],
    ['e', 'e^-'],
    ['o2', 'O_2'],
    ['h2', 'H_2'],
  ];
  keys.forEach(([k, t], i) => {
    const kx = x + 420 + i * 98;
    glyph(ctx, k, kx, ky - 5, 0.95, 0.55);
    drawRich(ctx, t, kx + 20, ky, { size: 14, weight: 500, family: 'mono', color: C.inkDim });
  });
  ctx.restore();
}
