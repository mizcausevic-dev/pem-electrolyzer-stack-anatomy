import type { Projector } from '../camera.ts';
import {
  ANODE_HDR_END,
  CELLS,
  H2_HDR_START,
  H2_Y,
  INLET_Y,
  L,
  OUTLET_Y,
  TAB_LEFT_X,
  TAB_RIGHT_X,
  X,
  Y,
  anodeChanX,
  cathodeChanX,
  cellOrigin,
  plateOrigin,
} from '../geometry.ts';
import { C, rgba } from '../palette.ts';
import { clamp, easeInOutSine, lerp, ramp } from '../math.ts';
import { hash2 } from '../random.ts';

/** Timeline beats shared by flows, labels and the plant view. */
export const BEAT = {
  waterStart: 166,
  headerFilled: 206,
  outletFill: [252, 290] as const,
  powerOn: 318,
  gasStart: 330,
  heatStart: 522,
  heatFull: 590,
};

const HEADER_LEN = ANODE_HDR_END - X.leftEnd[0];

/** Cell-scale overlays hand over to the catalyst-layer schematic as the camera pushes in. */
const cellScale = (proj: Projector): number => 1 - clamp((proj.zoom - 9) / 8);

export function channelFillStart(k: number): number {
  const d = (anodeChanX(k) - X.leftEnd[0]) / HEADER_LEN;
  return BEAT.waterStart + d * (BEAT.headerFilled - BEAT.waterStart);
}

export function waterLevel(f: number, k: number): number {
  const s = channelFillStart(k);
  return lerp(INLET_Y, Y.active + 2, ramp(f, s, s + 46, easeInOutSine));
}

function dashLine(
  ctx: CanvasRenderingContext2D,
  pts: readonly (readonly [number, number])[],
  px: number,
  color: string,
  width: number,
  dash: [number, number],
  offset: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width * px;
  ctx.setLineDash([dash[0] * px, dash[1] * px]);
  ctx.lineDashOffset = offset * px;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - dir * s * 0.5, y + s * 0.6);
  ctx.lineTo(x + dir * s * 0.5, y);
  ctx.lineTo(x - dir * s * 0.5, y - s * 0.6);
  ctx.stroke();
}

/** Water inventory and circulation inside the stack (caller set the plane transform). */
export function drawWater(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  if (f < BEAT.waterStart) return;
  const px = 1 / proj.zoom;
  const water = rgba(C.cyan, 0.2);

  const hx = lerp(X.leftEnd[0], ANODE_HDR_END, ramp(f, BEAT.waterStart, BEAT.headerFilled, easeInOutSine));
  ctx.fillStyle = water;
  ctx.fillRect(X.leftEnd[0], Y.inletHdr[0], hx - X.leftEnd[0], Y.inletHdr[1] - Y.inletHdr[0]);

  for (let k = 0; k < CELLS; k++) {
    const o = cellOrigin(k);
    const level = waterLevel(f, k);
    if (level > Y.inletHdr[1]) {
      ctx.fillStyle = water;
      ctx.fillRect(o + L.chanAnode[0], Y.inletHdr[1], L.chanAnode[1] - L.chanAnode[0], Math.min(level, Y.outletHdr[0]) - Y.inletHdr[1]);
      // Porous transport layer wets from the channel side.
      const s = channelFillStart(k);
      const wet = ramp(f, s + 14, s + 64, easeInOutSine);
      if (wet > 0) {
        ctx.fillStyle = rgba(C.cyan, 0.13 * wet);
        const top = Math.min(level, Y.active);
        ctx.fillRect(o + L.ptl[0], -Y.active, L.ptl[1] - L.ptl[0], top + Y.active);
        ctx.fillStyle = rgba(C.cyan, 0.08 * wet);
        ctx.fillRect(o + L.acl[0], -Y.active, L.acl[1] - L.acl[0], top + Y.active);
      }
    }
  }

  const outlet = ramp(f, BEAT.outletFill[0], BEAT.outletFill[1], easeInOutSine);
  if (outlet > 0) {
    const ox = lerp(ANODE_HDR_END, X.leftEnd[0], outlet);
    ctx.fillStyle = water;
    ctx.fillRect(ox, Y.outletHdr[0], ANODE_HDR_END - ox, Y.outletHdr[1] - Y.outletHdr[0]);
  }

  // Circulation streamlines (direction only; speed is illustrative).
  const flowA = ramp(f, BEAT.headerFilled - 10, BEAT.headerFilled + 30) * cellScale(proj);
  if (flowA > 0) {
    ctx.save();
    ctx.globalAlpha = flowA;
    const off = -f * 2.2;
    dashLine(ctx, [[X.leftEnd[0] - 4, INLET_Y], [ANODE_HDR_END, INLET_Y]], px, rgba(C.cyan, 0.9), 2, [12, 12], off);
    for (let k = 0; k < CELLS; k++) {
      const cx = anodeChanX(k);
      const level = waterLevel(f, k);
      if (level < -Y.active) continue;
      dashLine(ctx, [[cx, INLET_Y], [cx, Math.min(level, OUTLET_Y)]], px, rgba(C.cyan, 0.85), 1.6, [9, 11], off);
    }
    if (outlet > 0.3) {
      dashLine(ctx, [[ANODE_HDR_END, OUTLET_Y], [X.leftEnd[0] - 4, OUTLET_Y]], px, rgba(C.cyan, 0.85 * outlet), 2, [12, 12], off);
    }
    ctx.restore();
  }

  // Permeation through the porous transport layer of every cell, direction only.
  const perm = ramp(f, 222, 250) * (1 - ramp(f, 560, 600) * 0.6) * cellScale(proj);
  if (perm > 0 && proj.zoom > 1.6) {
    ctx.save();
    ctx.strokeStyle = rgba(C.cyan, 0.85 * perm);
    ctx.lineWidth = 1.6 * px;
    for (let k = 0; k < CELLS; k++) {
      const o = cellOrigin(k);
      for (let j = 0; j < 7; j++) {
        const y = -90 + j * 30;
        if (y > waterLevel(f, k)) continue;
        const phase = ((f * 0.35 + j * 3 + k * 5) % 10) / 10;
        const x = o + L.ptl[0] + 1.5 + phase * (L.acl[0] - L.ptl[0] - 2.5);
        ctx.globalAlpha = Math.sin(phase * Math.PI);
        chevron(ctx, x, y, 1, 2.6);
      }
    }
    ctx.restore();
  }
}

function bubbleField(
  ctx: CanvasRenderingContext2D,
  f: number,
  k: number,
  cx: number,
  period: number,
  speed: number,
  yEnd: number,
  fill: string,
  stroke: string,
  seed: number,
  px: number,
  power: number,
): void {
  const t0 = BEAT.gasStart + hash2(k, seed) * period;
  if (f < t0) return;
  const life = (yEnd + Y.active) / speed;
  const iMax = Math.floor((f - t0) / period);
  const iMin = Math.max(0, Math.floor((f - t0 - life) / period));
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.12, 1.1 * px);
  for (let i = iMin; i <= iMax; i++) {
    const s = t0 + i * period;
    const t = f - s;
    if (t < 0 || t > life) continue;
    const h = hash2(k * 131 + seed, i);
    const y = -Y.active + 6 + t * speed;
    const x = cx + Math.sin(t * 0.11 + h * 6.28) * 0.5;
    const r = 1.0 + h * 0.4;
    const a = clamp((yEnd - y) / 8) * clamp(t / 6) * power;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Product gas in the flow channels. Bubbles share one size distribution and H2
 * spawns at twice the O2 rate, matching the 2 : 1 molar ratio of 2H2O -> 2H2 + O2.
 */
export function drawGas(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  if (f < BEAT.gasStart) return;
  const px = 1 / proj.zoom;
  const power = ramp(f, BEAT.gasStart, BEAT.gasStart + 20) * cellScale(proj);
  if (power <= 0.01) return;
  const v = proj.viewRect();
  ctx.save();
  for (let k = 0; k < CELLS; k++) {
    const o = cellOrigin(k);
    if (o + 60 < v.x0 || o - 10 > v.x1) continue;
    bubbleField(ctx, f, k, anodeChanX(k), 26, 1.25, Y.active - 2, rgba(C.o2, 0.22), C.o2, 7, px, power);
    bubbleField(ctx, f, k, cathodeChanX(k), 13, 1.3, Y.active - 2, rgba(C.cyan, 0.2), C.cyan, 19, px, power);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = power;
  const off = -f * 2.2;
  // Two-phase outlet: water dashes plus neutral O2 dashes.
  dashLine(ctx, [[ANODE_HDR_END, OUTLET_Y + 3], [X.leftEnd[0] - 4, OUTLET_Y + 3]], px, rgba(C.o2, 0.9), 3, [4, 20], off * 1.1);
  // Hydrogen header lies behind the section plane, so its flow is drawn dashed and dimmer.
  dashLine(ctx, [[H2_HDR_START, H2_Y], [X.rightEnd[1] + 4, H2_Y]], px, rgba(C.cyan, 0.65), 2, [6, 10], off);
  for (let k = 0; k < CELLS; k++) {
    const cx = cathodeChanX(k);
    dashLine(ctx, [[cx, Y.active - 4], [cx, H2_Y]], px, rgba(C.cyan, 0.45), 1.4, [4, 8], off);
  }
  ctx.restore();
}

export const DC_LEFT: readonly (readonly [number, number])[] = [
  [TAB_LEFT_X, Y.tabTop],
  [TAB_LEFT_X, 300],
  [-140, 300],
  [-140, 420],
];
export const DC_RIGHT: readonly (readonly [number, number])[] = [
  [140, 420],
  [140, 300],
  [TAB_RIGHT_X, 300],
  [TAB_RIGHT_X, Y.tabTop],
];

/** DC connection and electron path. Electrons leave the anode end and return at the cathode end. */
export function drawElectrons(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  const a = ramp(f, BEAT.powerOn - 6, BEAT.powerOn + 14);
  if (a <= 0) return;
  const px = 1 / proj.zoom;
  ctx.save();
  ctx.globalAlpha = a;
  for (const path of [DC_LEFT, DC_RIGHT]) {
    ctx.strokeStyle = rgba(C.gold, 0.35);
    ctx.lineWidth = 5 * px;
    ctx.beginPath();
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.stroke();
    dashLine(ctx, path, px, C.gold, 2.2, [8, 10], -f * 2.4);
  }
  // Inside the stack electrons cross each bipolar plate toward the previous cell (series connection).
  if (proj.zoom > 1.5 && cellScale(proj) > 0.01) {
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5 * px;
    for (let k = 0; k <= CELLS; k++) {
      const o = plateOrigin(k);
      for (const y of [-70, 0, 70]) {
        const phase = ((f * 0.5 + k * 2) % 12) / 12;
        const x = o + (L.web[0] + L.web[1]) / 2 + 1.5 - phase * 3;
        ctx.globalAlpha = a * cellScale(proj) * (0.4 + 0.6 * Math.sin(phase * Math.PI));
        chevron(ctx, x, y, -1, 2.2);
      }
    }
  }
  ctx.restore();
}

/** Qualitative temperature field: translucent fill plus dashed isotherms, no values. */
export function drawThermalField(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  const a = ramp(f, BEAT.heatStart, BEAT.heatFull) * (1 - 0.55 * ramp(f, 800, 880));
  if (a <= 0) return;
  const px = 1 / proj.zoom;
  const x0 = cellOrigin(0);
  const x1 = cellOrigin(CELLS) + 16;
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, -Y.active, 0, Y.active);
  g.addColorStop(0, rgba(C.gold, 0.04));
  g.addColorStop(1, rgba(C.gold, 0.26));
  ctx.fillStyle = g;
  ctx.fillRect(x0, -Y.active, x1 - x0, Y.active * 2);
  for (let k = 0; k < CELLS; k++) {
    const o = cellOrigin(k);
    const mg = ctx.createLinearGradient(o + L.ptl[1], 0, o + L.gdl[0], 0);
    mg.addColorStop(0, rgba(C.gold, 0));
    mg.addColorStop(0.5, rgba(C.gold, 0.32));
    mg.addColorStop(1, rgba(C.gold, 0));
    ctx.fillStyle = mg;
    ctx.fillRect(o + L.ptl[1], -Y.active, L.gdl[0] - L.ptl[1], Y.active * 2);
  }
  ctx.strokeStyle = rgba(C.gold, 0.85);
  ctx.lineWidth = 1.4 * px;
  ctx.setLineDash([7 * px, 6 * px]);
  for (const y0 of [-75, -25, 25, 75]) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 2) {
      let dip = 0;
      for (let k = 0; k < CELLS; k++) {
        const mx = cellOrigin(k) + 34;
        dip += Math.exp(-(((x - mx) / 9) ** 2));
      }
      const y = y0 - 7 * dip;
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Heat flux from the membrane electrode region into the circulating anode water.
  const flux = ramp(f, BEAT.heatStart + 30, BEAT.heatFull + 20) * (1 - ramp(f, 780, 840));
  if (flux > 0) {
    ctx.fillStyle = C.gold;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.6 * px;
    for (let k = 0; k < CELLS; k++) {
      const o = cellOrigin(k);
      for (const y of [-45, 45]) {
        const phase = ((f * 0.4 + k * 3 + (y > 0 ? 5 : 0)) % 14) / 14;
        ctx.globalAlpha = a * flux * Math.sin(phase * Math.PI);
        const xs = o + 33 - phase * 18;
        chevron(ctx, xs, y, -1, 3.2);
      }
    }
  }
  ctx.restore();
}
