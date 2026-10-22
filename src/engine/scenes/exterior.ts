import type { Projector } from '../camera.ts';
import { CELLS, L, X, Y, Z, cellOrigin, plateOrigin, TAB_LEFT_X, TAB_RIGHT_X, INLET_Y, OUTLET_Y } from '../geometry.ts';
import { label } from '../draw.ts';
import { C } from '../palette.ts';
import { win } from '../math.ts';

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  color: string;
}

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): Box => ({
  x0,
  x1,
  y0,
  y1,
  z0,
  z1,
  color,
});

function shade(hex: string, k: number): string {
  const h = hex.replace('#', '');
  const ch = (i: number) => Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k));
  return `rgb(${ch(0)}, ${ch(2)}, ${ch(4)})`;
}

const ROD = 5;
const rod = (y: number, z: number): Box => box(-262, 262, y - ROD, y + ROD, z - ROD, z + ROD, C.steelLight);
const nut = (x0: number, x1: number, y: number, z: number): Box =>
  box(x0, x1, y - 10, y + 10, z - 10, z + 10, C.steelLight);

function stackBoxes(): Box[] {
  const out: Box[] = [];
  out.push(box(X.rightEnd[0], X.rightEnd[1], -Y.endPlate, Y.endPlate, -Z.endPlate, Z.endPlate, C.steel));
  out.push(box(X.rightCol[0], X.rightCol[1], Y.plate, Y.tabTop, -Z.tab, Z.tab, C.copper));
  out.push(box(X.rightCol[0], X.rightCol[1], -Y.plate, Y.plate, -Z.plate, Z.plate, C.copper));
  for (let k = CELLS; k >= 0; k--) {
    const o = plateOrigin(k);
    if (k < CELLS) {
      out.push(box(cellOrigin(k) + L.ptl[0], cellOrigin(k) + L.gdl[1], -Y.plate, Y.plate, -Z.plate, Z.plate, C.gasket));
    }
    out.push(box(o + L.bpp[0], o + L.bpp[1], -Y.plate, Y.plate, -Z.plate, Z.plate, C.titanium));
  }
  out.push(box(X.leftCol[0], X.leftCol[1], Y.plate, Y.tabTop, -Z.tab, Z.tab, C.copper));
  out.push(box(X.leftCol[0], X.leftCol[1], -Y.plate, Y.plate, -Z.plate, Z.plate, C.copper));
  out.push(box(X.leftEnd[0], X.leftEnd[1], -Y.endPlate, Y.endPlate, -Z.endPlate, Z.endPlate, C.steel));
  return out;
}

const STACK = stackBoxes();
const RY = 193;
const BACK = [rod(RY, -Z.rod), rod(-RY, -Z.rod), nut(244, 262, RY, -Z.rod), nut(244, 262, -RY, -Z.rod)];
const RIGHT_NUTS = [nut(244, 262, RY, Z.rod), nut(244, 262, -RY, Z.rod)];
const FRONT = [rod(RY, Z.rod), rod(-RY, Z.rod)];
const LEFT_NUTS = [
  nut(-262, -244, RY, -Z.rod),
  nut(-262, -244, -RY, -Z.rod),
  nut(-262, -244, RY, Z.rod),
  nut(-262, -244, -RY, Z.rod),
];

function face(ctx: CanvasRenderingContext2D, proj: Projector, pts: [number, number, number][], fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = proj.project(pts[i][0], pts[i][1], pts[i][2]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function drawBox(ctx: CanvasRenderingContext2D, proj: Projector, b: Box, zCut: number): void {
  const z1 = Math.min(b.z1, zCut);
  if (z1 <= b.z0) return;
  const cut = b.z1 > zCut;
  const { x0, x1, y0, y1, z0 } = b;
  ctx.strokeStyle = 'rgba(4, 7, 12, 0.55)';
  ctx.lineWidth = 1;
  if (proj.facing(0, 0, -1) > 0) face(ctx, proj, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], shade(b.color, 0.7));
  if (proj.facing(0, -1, 0) > 0) face(ctx, proj, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], shade(b.color, 0.6));
  if (proj.facing(1, 0, 0) > 0) face(ctx, proj, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], shade(b.color, 0.78));
  if (proj.facing(-1, 0, 0) > 0) face(ctx, proj, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], shade(b.color, 0.82));
  if (proj.facing(0, 1, 0) > 0) face(ctx, proj, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], shade(b.color, 1.28));
  if (!cut && proj.facing(0, 0, 1) > 0) face(ctx, proj, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], b.color);
}

function port(ctx: CanvasRenderingContext2D, proj: Projector, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const p = proj.project(X.leftEnd[0], y + Math.sin(t) * r, Math.cos(t) * r);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = C.void;
  ctx.fill();
  ctx.strokeStyle = C.steelLight;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function edges(ctx: CanvasRenderingContext2D, proj: Projector, b: Box): void {
  const c: [number, number, number][] = [
    [b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0],
    [b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1],
  ];
  const pairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  ctx.beginPath();
  for (const [i, j] of pairs) {
    const a = proj.project(c[i][0], c[i][1], c[i][2]);
    const d = proj.project(c[j][0], c[j][1], c[j][2]);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(d.x, d.y);
  }
  ctx.stroke();
}

export function drawExterior(ctx: CanvasRenderingContext2D, proj: Projector, f: number, zCut: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const b of BACK) drawBox(ctx, proj, b, zCut);
  for (const b of RIGHT_NUTS) drawBox(ctx, proj, b, zCut);
  for (const b of STACK) drawBox(ctx, proj, b, zCut);
  if (proj.facing(-1, 0, 0) > 0.02 && zCut > 16) {
    port(ctx, proj, INLET_Y, 11);
    port(ctx, proj, OUTLET_Y, 11);
  }
  for (const b of FRONT) drawBox(ctx, proj, b, zCut);
  for (const b of LEFT_NUTS) drawBox(ctx, proj, b, zCut);

  // Removed half: ghost outline only, so the section reads as a cut, not a disassembly.
  const ghost = win(f, 36, 118, 10, 22);
  if (ghost > 0 && zCut < Z.endPlate) {
    ctx.globalAlpha = ghost;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(232, 237, 245, 0.32)';
    ctx.lineWidth = 1.2;
    edges(ctx, proj, box(X.leftEnd[0], X.rightEnd[1], -Y.endPlate, Y.endPlate, zCut, Z.endPlate, C.steel));
    ctx.setLineDash([]);
    // Section plane, drawn as a drafting element (neutral ink, not an accent).
    const pa = proj.project(-300, -250, zCut);
    const pb = proj.project(300, -250, zCut);
    const pc = proj.project(300, 285, zCut);
    const pd = proj.project(-300, 285, zCut);
    const planeA = win(f, 34, 92, 8, 16);
    ctx.globalAlpha = planeA;
    ctx.fillStyle = 'rgba(232, 237, 245, 0.045)';
    ctx.strokeStyle = 'rgba(232, 237, 245, 0.55)';
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.lineTo(pc.x, pc.y);
    ctx.lineTo(pd.x, pd.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawExteriorLabels(ctx: CanvasRenderingContext2D, proj: Projector, f: number, zCut: number): void {
  const a = (s: number, e: number) => win(f, s, e, 10, 12);
  if (f > 125) return;
  label(ctx, proj.project(-229, -40, Z.endPlate), 'End plate', { dx: -150, dy: 110, alpha: a(8, 60), sub: 'clamps the cells together' });
  label(ctx, proj.project(-40, 193, Z.rod), 'Tie rod', { dx: -170, dy: -70, alpha: a(12, 60) });
  label(ctx, proj.project(TAB_LEFT_X, Y.tabTop, 0), 'Current collector (+)', { dx: -200, dy: -40, alpha: a(16, 62), accent: C.gold, sub: 'DC connection, anode end' });
  label(ctx, proj.project(TAB_RIGHT_X, Y.tabTop, 0), 'Current collector (\u2212)', { dx: 120, dy: -40, alpha: a(20, 62), accent: C.gold, sub: 'DC connection, cathode end' });
  label(ctx, proj.project(60, -90, Z.plate), 'Repeating cells', { dx: 220, dy: -60, alpha: a(24, 54), sub: '8 shown for clarity; real stacks vary' });
  label(ctx, proj.project(X.leftEnd[0], INLET_Y, 0), 'Anode water ports', { dx: -150, dy: 60, alpha: a(28, 62), accent: C.cyan, sub: 'inlet (low) and outlet (high)' });
  const pl = proj.project(300, 0, zCut);
  label(ctx, pl, 'Section plane A\u2013A', { dx: 56, dy: -10, alpha: win(f, 40, 94, 10, 12), sub: 'cut through the stack mid-plane' });
  const gh = proj.project(X.rightEnd[1], -Y.endPlate, Z.endPlate);
  label(ctx, gh, 'Removed half shown as ghost outline', { dx: 56, dy: -76, alpha: win(f, 54, 96, 10, 12), sub: 'sectional view, no disassembly' });
}