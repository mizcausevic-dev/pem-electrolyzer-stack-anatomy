import type { Projector } from '../camera.ts';
import { H2_Y, INLET_Y, OUTLET_Y, X } from '../geometry.ts';
import { C, rgba } from '../palette.ts';
import { clamp, ramp, win } from '../math.ts';
import { arrowHead, glassPanel, label } from '../draw.ts';
import { drawRich, font } from '../text.ts';

type Pt = readonly [number, number];
type Flow = 'water' | 'o2' | 'h2' | 'power' | 'coolant' | 'drain';

interface Pipe {
  pts: readonly Pt[];
  flow: Flow;
  reveal: number;
  hot?: boolean;
}

/** Component positions in world units on the same plane as the stack section. */
export const P = {
  sepO2: { x: -600, y: 170, w: 120, h: 250 },
  pump: { x: -600, y: INLET_Y, r: 30 },
  hx: { x: -420, y: INLET_Y, r: 36 },
  cooling: { x: -420, y: -252, w: 230, h: 56 },
  coolValve: { x: -458, y: -205 },
  di: { x: -940, y: 170, w: 210, h: 96 },
  sepH2: { x: 560, y: 170, w: 120, h: 250 },
  purifier: { x: 840, y: 420, w: 220, h: 84 },
  bpValve: { x: 655, y: 420 },
  power: { x: 0, y: 476, w: 380, h: 112 },
  control: { x: 800, y: 604, w: 400, h: 88 },
  ttOut: { x: -330, y: OUTLET_Y },
  ttIn: { x: -320, y: INLET_Y },
  ct: { x: -760, y: 170 },
  at: { x: -720, y: 420 },
  pt: { x: 560, y: 360 },
  cvm: { x: 0, y: 236 },
} as const;

/** Stage 05 reveal order follows the causal chain: power, water, separation, product, control. */
export const REVEAL = {
  loop: 560,
  power: 772,
  water: 792,
  sepO2: 812,
  h2: 832,
  product: 852,
  control: 872,
};

const sepTopO2 = P.sepO2.y + P.sepO2.h / 2;
const sepBotO2 = P.sepO2.y - P.sepO2.h / 2;
const sepTopH2 = P.sepH2.y + P.sepH2.h / 2;
const sepBotH2 = P.sepH2.y - P.sepH2.h / 2;

const PIPES: readonly Pipe[] = [
  { pts: [[X.leftEnd[0], OUTLET_Y], [P.sepO2.x + P.sepO2.w / 2, OUTLET_Y]], flow: 'water', reveal: REVEAL.loop, hot: true },
  { pts: [[P.sepO2.x, sepBotO2], [P.sepO2.x, P.pump.y + P.pump.r]], flow: 'water', reveal: REVEAL.loop, hot: true },
  { pts: [[P.pump.x + P.pump.r, P.pump.y], [P.hx.x - P.hx.r, P.hx.y]], flow: 'water', reveal: REVEAL.loop, hot: true },
  { pts: [[P.hx.x + P.hx.r, P.hx.y], [X.leftEnd[0], INLET_Y]], flow: 'water', reveal: REVEAL.loop },
  { pts: [[P.hx.x - 12, P.hx.y - P.hx.r + 2], [P.hx.x - 12, P.cooling.y + P.cooling.h / 2]], flow: 'coolant', reveal: REVEAL.loop },
  { pts: [[P.hx.x + 12, P.cooling.y + P.cooling.h / 2], [P.hx.x + 12, P.hx.y - P.hx.r + 2]], flow: 'coolant', reveal: REVEAL.loop },
  { pts: [[P.sepO2.x, sepTopO2], [P.sepO2.x, 420], [-830, 420]], flow: 'o2', reveal: REVEAL.sepO2 },
  { pts: [[-1150, P.di.y], [P.di.x - P.di.w / 2, P.di.y]], flow: 'water', reveal: REVEAL.water },
  { pts: [[P.di.x + P.di.w / 2, P.di.y], [P.sepO2.x - P.sepO2.w / 2, P.di.y]], flow: 'water', reveal: REVEAL.water },
  { pts: [[X.rightEnd[1], H2_Y], [P.sepH2.x - P.sepH2.w / 2, H2_Y]], flow: 'h2', reveal: REVEAL.h2 },
  { pts: [[P.sepH2.x, sepTopH2], [P.sepH2.x, 420], [P.purifier.x - P.purifier.w / 2, 420]], flow: 'h2', reveal: REVEAL.h2 },
  { pts: [[P.purifier.x + P.purifier.w / 2, 420], [1120, 420]], flow: 'h2', reveal: REVEAL.product },
  { pts: [[P.sepH2.x, sepBotH2], [P.sepH2.x, -110]], flow: 'drain', reveal: REVEAL.h2 },
  { pts: [[0, 640], [0, P.power.y + P.power.h / 2]], flow: 'power', reveal: REVEAL.power },
];

function strokePath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.stroke();
}

function flowColor(flow: Flow): string {
  switch (flow) {
    case 'water':
    case 'h2':
    case 'drain':
      return C.cyan;
    case 'o2':
      return C.o2;
    case 'power':
      return C.gold;
    case 'coolant':
      return '#8EA0B8';
  }
}

/** Stage-dependent visibility: ghosted before its reveal in chapter 05, hidden before chapter 04. */
function presence(f: number, reveal: number): { a: number; ghost: number } {
  if (reveal <= REVEAL.loop) return { a: ramp(f, REVEAL.loop, REVEAL.loop + 40), ghost: 0 };
  const shown = ramp(f, reveal, reveal + 24);
  const ghostA = ramp(f, REVEAL.loop + 20, REVEAL.loop + 60) * 0.32;
  return { a: Math.max(shown, ghostA), ghost: 1 - shown };
}

function vessel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, px: number): void {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, w / 2);
  ctx.fillStyle = C.struct;
  ctx.fill();
  ctx.strokeStyle = C.structLight;
  ctx.lineWidth = 2 * px;
  ctx.stroke();
}

function boxShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, px: number): void {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
  ctx.fillStyle = C.structDark;
  ctx.fill();
  ctx.strokeStyle = C.structLight;
  ctx.lineWidth = 2 * px;
  ctx.stroke();
}

function valve(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, vertical: boolean, px: number): void {
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(x - s, y + s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x - s, y - s);
    ctx.lineTo(x + s, y - s);
  } else {
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x + s, y + s);
  }
  ctx.closePath();
  ctx.fillStyle = C.structDark;
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.2 * px;
  ctx.stroke();
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * 1.6, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + s * 1.6);
  }
  ctx.stroke();
}

/** World-space plant geometry (caller set the plane transform). */
export function drawPlant(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  if (f < REVEAL.loop) return;
  const px = 1 / proj.zoom;
  const off = -f * 2.2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const pipe of PIPES) {
    const { a, ghost } = presence(f, pipe.reveal);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.setLineDash([]);
    ctx.strokeStyle = C.structDark;
    ctx.lineWidth = Math.max(9 * px, 6);
    strokePath(ctx, pipe.pts);
    ctx.strokeStyle = C.struct;
    ctx.lineWidth = Math.max(6 * px, 4);
    strokePath(ctx, pipe.pts);
    if (ghost > 0.98) continue;
    ctx.globalAlpha = a * (1 - ghost);
    const color = flowColor(pipe.flow);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4 * px;
    ctx.setLineDash(pipe.flow === 'drain' ? [5 * px, 7 * px] : [12 * px, 12 * px]);
    ctx.lineDashOffset = off * px;
    strokePath(ctx, pipe.pts);
    if (pipe.hot) {
      const hot = ramp(f, 600, 650) * (1 - 0.5 * ramp(f, 820, 880));
      if (hot > 0) {
        ctx.globalAlpha = a * hot;
        ctx.strokeStyle = rgba(C.gold, 0.9);
        ctx.lineWidth = 2.4 * px;
        ctx.lineDashOffset = (off + 12) * px;
        strokePath(ctx, pipe.pts);
      }
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  ctx.setLineDash([]);
  const comp = (reveal: number) => presence(f, reveal).a;

  ctx.globalAlpha = comp(REVEAL.sepO2);
  vessel(ctx, P.sepO2.x, P.sepO2.y, P.sepO2.w, P.sepO2.h, px);
  ctx.globalAlpha = comp(REVEAL.h2);
  vessel(ctx, P.sepH2.x, P.sepH2.y, P.sepH2.w, P.sepH2.h, px);
  // Liquid level hints in both separators (cyan = water side of the pathway).
  for (const [s, reveal] of [[P.sepO2, REVEAL.sepO2], [P.sepH2, REVEAL.h2]] as const) {
    ctx.globalAlpha = comp(reveal) * (1 - presence(f, reveal).ghost);
    ctx.fillStyle = rgba(C.cyan, 0.18);
    ctx.beginPath();
    ctx.roundRect(s.x - s.w / 2 + 6 * px, s.y - s.h / 2 + 6 * px, s.w - 12 * px, s.h * 0.34, [0, 0, s.w / 2, s.w / 2]);
    ctx.fill();
  }

  // Pump: circle with discharge triangle (P&ID convention), gold motor accent for actuation.
  ctx.globalAlpha = comp(REVEAL.loop);
  ctx.beginPath();
  ctx.arc(P.pump.x, P.pump.y, P.pump.r, 0, Math.PI * 2);
  ctx.fillStyle = C.struct;
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.4 * px;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(P.pump.x - 14, P.pump.y + 16);
  ctx.lineTo(P.pump.x + 20, P.pump.y);
  ctx.lineTo(P.pump.x - 14, P.pump.y - 16);
  ctx.closePath();
  ctx.fillStyle = rgba(C.gold, 0.85);
  ctx.fill();

  // Heat exchanger: circle with a zigzag tube line.
  ctx.beginPath();
  ctx.arc(P.hx.x, P.hx.y, P.hx.r, 0, Math.PI * 2);
  ctx.fillStyle = C.struct;
  ctx.fill();
  ctx.strokeStyle = C.structLight;
  ctx.lineWidth = 2 * px;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(P.hx.x - P.hx.r, P.hx.y);
  for (let i = 0; i <= 6; i++) {
    ctx.lineTo(P.hx.x - P.hx.r + 8 + i * ((P.hx.r * 2 - 16) / 6), P.hx.y + (i % 2 === 0 ? -14 : 14));
  }
  ctx.lineTo(P.hx.x + P.hx.r, P.hx.y);
  ctx.strokeStyle = rgba(C.gold, 0.9);
  ctx.lineWidth = 2.2 * px;
  ctx.stroke();

  boxShape(ctx, P.cooling.x, P.cooling.y, P.cooling.w, P.cooling.h, px);
  valve(ctx, P.coolValve.x, P.coolValve.y, 10, true, px);

  // Heat leaving through the cooling circuit (gold = energy).
  const heatOut = ramp(f, 610, 650);
  if (heatOut > 0) {
    ctx.globalAlpha = heatOut * comp(REVEAL.loop);
    ctx.strokeStyle = C.gold;
    ctx.fillStyle = C.gold;
    ctx.lineWidth = 2.4 * px;
    for (let i = 0; i < 3; i++) {
      const phase = ((f * 0.6 + i * 6) % 18) / 18;
      const x = P.cooling.x - 60 + i * 60;
      const y0 = P.cooling.y - P.cooling.h / 2 - 6 - phase * 40;
      ctx.globalAlpha = heatOut * Math.sin(phase * Math.PI);
      ctx.beginPath();
      ctx.moveTo(x, y0 + 14);
      ctx.lineTo(x, y0 - 10);
      ctx.stroke();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const s = proj.project(x, y0 - 12, 0);
      arrowHead(ctx, s.x, s.y, Math.PI / 2, 8);
      ctx.restore();
    }
  }

  ctx.globalAlpha = comp(REVEAL.water);
  boxShape(ctx, P.di.x, P.di.y, P.di.w, P.di.h, px);
  ctx.globalAlpha = comp(REVEAL.product);
  boxShape(ctx, P.purifier.x, P.purifier.y, P.purifier.w, P.purifier.h, px);
  valve(ctx, P.bpValve.x, P.bpValve.y, 10, false, px);
  ctx.globalAlpha = comp(REVEAL.power);
  boxShape(ctx, P.power.x, P.power.y, P.power.w, P.power.h, px);
  ctx.globalAlpha = comp(REVEAL.control);
  boxShape(ctx, P.control.x, P.control.y, P.control.w, P.control.h, px);

  // Sensors: violet instrument bubbles.
  const sensors: [{ x: number; y: number }, number][] = [
    [P.ttOut, REVEAL.loop],
    [P.ttIn, REVEAL.loop],
    [P.ct, REVEAL.water],
    [P.at, REVEAL.sepO2],
    [P.pt, REVEAL.h2],
    [P.cvm, REVEAL.control],
  ];
  for (const [s, reveal] of sensors) {
    const pr = presence(f, reveal);
    ctx.globalAlpha = pr.a * (reveal === REVEAL.loop ? ramp(f, 640, 670) : 1);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = C.stage;
    ctx.fill();
    ctx.strokeStyle = C.violet;
    ctx.lineWidth = 2.6 * px;
    ctx.stroke();
  }
  ctx.restore();
}

function tag(ctx: CanvasRenderingContext2D, proj: Projector, x: number, y: number, text: string, a: number): void {
  if (a <= 0.01) return;
  const s = proj.project(x, y, 0);
  ctx.save();
  ctx.globalAlpha = a;
  const size = clamp(proj.zoom * 15, 11, 18);
  ctx.font = font(size, 700, 'mono');
  ctx.fillStyle = C.violetText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, s.x, s.y + 1);
  ctx.restore();
}

function boxText(ctx: CanvasRenderingContext2D, proj: Projector, x: number, y: number, text: string, sub: string, a: number): void {
  if (a <= 0.01) return;
  const s = proj.project(x, y, 0);
  ctx.save();
  ctx.globalAlpha = a;
  drawRich(ctx, text, s.x, s.y - 2, { size: 16, weight: 600, color: C.ink, align: 'center' });
  drawRich(ctx, sub, s.x, s.y + 17, { size: 12.5, weight: 500, color: C.inkDim, align: 'center' });
  ctx.restore();
}

/** Screen-space text for the plant view. */
export function drawPlantLabels(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  if (f < REVEAL.loop) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const shown = (reveal: number) => ramp(f, reveal + 6, reveal + 28);
  const sensorA = (reveal: number) => (reveal === REVEAL.loop ? ramp(f, 646, 676) : shown(reveal));

  tag(ctx, proj, P.ttOut.x, P.ttOut.y, 'TT', sensorA(REVEAL.loop));
  tag(ctx, proj, P.ttIn.x, P.ttIn.y, 'TT', sensorA(REVEAL.loop));
  tag(ctx, proj, P.ct.x, P.ct.y, 'CT', sensorA(REVEAL.water));
  tag(ctx, proj, P.at.x, P.at.y, 'AT', sensorA(REVEAL.sepO2));
  tag(ctx, proj, P.pt.x, P.pt.y, 'PT', sensorA(REVEAL.h2));
  tag(ctx, proj, P.cvm.x, P.cvm.y, 'CVM', sensorA(REVEAL.control));

  // Chapter 04 callouts (cooling).
  const c4 = (s: number, e = 790) => win(f, s, e, 14, 16);
  const g = proj.project.bind(proj);
  label(ctx, g(P.hx.x, P.hx.y + P.hx.r), 'Heat exchanger', { dx: 40, dy: -120, accent: C.gold, sub: 'moves heat from process water to a cooling circuit', alpha: c4(600) });
  label(ctx, g(-470, OUTLET_Y), 'Warmer water + O_2 leave the stack', { dx: 40, dy: 70, accent: C.cyan, alpha: c4(590) });
  label(ctx, g(-290, INLET_Y), 'Cooler water returns', { dx: 40, dy: 70, accent: C.cyan, alpha: c4(616) });
  label(ctx, g(P.ttOut.x + 18, P.ttOut.y + 18), 'TT \u00b7 temperature sensors', { dx: 90, dy: -64, accent: C.violet, sub: 'stack inlet and outlet', alpha: c4(650) });
  label(ctx, g(P.coolValve.x - 14, P.coolValve.y), 'Controller trims cooling', { dx: -110, dy: 40, accent: C.violet, sub: 'closed loop on temperature (schematic)', alpha: c4(672) });
  label(ctx, g(P.cooling.x + P.cooling.w / 2, P.cooling.y), 'Heat rejection', { dx: 70, dy: 10, accent: C.gold, sub: 'cooling circuit (generic)', alpha: c4(630) });

  // Chapter 05 component text inside boxes, then callouts for vessels and lines.
  boxText(ctx, proj, P.power.x, P.power.y, 'Power supply', 'transformer + rectifier, AC to DC', shown(REVEAL.power));
  boxText(ctx, proj, P.di.x, P.di.y, 'Water treatment', 'deionization', shown(REVEAL.water));
  boxText(ctx, proj, P.purifier.x, P.purifier.y, 'H_2 purification', 'typ. deoxo + dryer', shown(REVEAL.product));
  boxText(ctx, proj, P.control.x, P.control.y, 'Control system', 'reads sensors \u00b7 drives actuators', shown(REVEAL.control));
  boxText(ctx, proj, P.cooling.x, P.cooling.y, 'Heat rejection', 'cooling circuit', shown(REVEAL.power) * ramp(f, 790, 820));

  const c5 = (reveal: number) => ramp(f, reveal + 10, reveal + 32);
  label(ctx, g(P.sepO2.x - P.sepO2.w / 2, P.sepO2.y - 40), 'O_2 / water separator', { dx: -70, dy: -150, accent: C.cyan, alpha: c5(REVEAL.sepO2), size: 17 });
  label(ctx, g(-830, 420), 'O_2 out', { dx: -40, dy: -50, accent: C.o2, sub: 'vent or recovery', alpha: c5(REVEAL.sepO2), size: 17 });
  label(ctx, g(P.pump.x, P.pump.y - P.pump.r), 'Circulation pump', { dx: -60, dy: 70, accent: C.gold, alpha: c5(REVEAL.water), size: 17 });
  label(ctx, g(P.hx.x + P.hx.r * 0.7, P.hx.y - P.hx.r * 0.7), 'Heat exchanger', { dx: 110, dy: 76, accent: C.gold, alpha: c5(REVEAL.water) * ramp(f, 800, 830), size: 17 });
  label(ctx, g(-1150, P.di.y), 'Feed water in', { dx: 20, dy: -70, accent: C.cyan, alpha: c5(REVEAL.water), size: 17 });
  label(ctx, g(P.sepH2.x + P.sepH2.w / 2, P.sepH2.y - 40), 'H_2 / water separator', { dx: 70, dy: -10, accent: C.cyan, alpha: c5(REVEAL.h2), size: 17 });
  label(ctx, g(P.sepH2.x, -110), 'Water return to anode loop', { dx: 60, dy: 30, accent: C.cyan, sub: 'schematic', alpha: c5(REVEAL.h2), size: 17 });
  label(ctx, g(1120, 420), 'H_2 product', { dx: -30, dy: 66, accent: C.cyan, sub: 'to compression / storage', alpha: c5(REVEAL.product), size: 17 });
  label(ctx, g(P.bpValve.x, P.bpValve.y + 10), 'Pressure control valve', { dx: -20, dy: 80, accent: C.gold, alpha: c5(REVEAL.product), size: 17 });
  label(ctx, g(0, 640), 'AC supply', { dx: 40, dy: -20, accent: C.gold, sub: 'grid or renewable', alpha: c5(REVEAL.power), size: 17 });

  // Sensor key for the complete-system view.
  const key = ramp(f, REVEAL.control + 16, REVEAL.control + 40);
  if (key > 0.01) {
    const items: [string, string][] = [
      ['TT', 'temperature'],
      ['PT', 'pressure'],
      ['CT', 'water conductivity'],
      ['AT', 'H_2-in-O_2 analyzer'],
      ['CVM', 'cell voltage monitoring'],
    ];
    const kx = 640;
    const ky = 912;
    glassPanel(ctx, kx, ky, 920, 40, 20, key);
    ctx.globalAlpha = key;
    ctx.font = font(12, 600, 'mono');
    ctx.fillStyle = C.violetText;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SENSORS', kx + 18, ky + 25);
    let cx = kx + 100;
    for (const [t, d] of items) {
      ctx.font = font(13, 700, 'mono');
      ctx.fillStyle = C.violetText;
      ctx.fillText(t, cx, ky + 25);
      const tw = ctx.measureText(t).width;
      const dw = drawRich(ctx, d, cx + tw + 7, ky + 25, { size: 14, weight: 500, color: C.inkDim });
      cx += tw + dw + 26;
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}