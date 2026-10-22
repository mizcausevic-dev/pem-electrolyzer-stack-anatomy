import type { Projector } from '../camera.ts';
import {
  ANODE_HDR_END,
  CELLS,
  FOCUS_O,
  PITCH,
  H2_HDR_START,
  L,
  X,
  Y,
  Z,
  cellOrigin,
  plateOrigin,
} from '../geometry.ts';
import { hatch } from '../draw.ts';
import { win } from '../math.ts';
import { C, rgba } from '../palette.ts';
import { mulberry32 } from '../random.ts';

interface Grain {
  x: number;
  y: number;
  r: number;
}
interface Fiber {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const H_ACTIVE = Y.active;

function grains(seed: number, w: number, spacing: number, rMin: number, rMax: number): Grain[] {
  const rnd = mulberry32(seed);
  const out: Grain[] = [];
  for (let y = -H_ACTIVE + spacing / 2; y < H_ACTIVE; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      const jx = (rnd() - 0.5) * spacing * 0.8;
      const jy = (rnd() - 0.5) * spacing * 0.8;
      const r = rMin + rnd() * (rMax - rMin);
      const gx = Math.min(w - r * 0.6, Math.max(r * 0.6, x + jx));
      out.push({ x: gx, y: y + jy, r });
    }
  }
  return out;
}

function fibers(seed: number, w: number, count: number): Fiber[] {
  const rnd = mulberry32(seed);
  const out: Fiber[] = [];
  for (let i = 0; i < count; i++) {
    const len = 3 + rnd() * 5;
    const ang = Math.PI / 2 + (rnd() - 0.5) * 0.9;
    out.push({ x: 0.6 + rnd() * (w - 1.2), y: -H_ACTIVE + rnd() * H_ACTIVE * 2, dx: Math.cos(ang) * len, dy: Math.sin(ang) * len });
  }
  return out;
}

const PTL_W = L.ptl[1] - L.ptl[0];
const ACL_W = L.acl[1] - L.acl[0];
const CCL_W = L.ccl[1] - L.ccl[0];
const GDL_W = L.gdl[1] - L.gdl[0];

const TEX = {
  ptl: grains(11, PTL_W, 2.7, 0.85, 1.25),
  acl: grains(23, ACL_W, 0.78, 0.2, 0.36),
  ccl: grains(37, CCL_W, 1.15, 0.42, 0.6),
  cclPt: grains(41, CCL_W, 0.7, 0.09, 0.14),
  gdl: fibers(53, GDL_W, 150),
};

export interface View {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function drawGrains(ctx: CanvasRenderingContext2D, list: Grain[], ox: number, v: View, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const g of list) {
    if (g.y < v.y0 - 2 || g.y > v.y1 + 2) continue;
    ctx.moveTo(ox + g.x + g.r, g.y);
    ctx.arc(ox + g.x, g.y, g.r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function rect(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

function outline(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

/** Section content on the cut plane. Caller has set the plane transform. */
export function drawSection(ctx: CanvasRenderingContext2D, proj: Projector, zCut: number): void {
  if (zCut >= Z.endPlate) return;
  const px = 1 / proj.zoom;
  const v = proj.viewRect();
  const hatchGap = 8 * px;
  const hatchInk = 'rgba(232, 237, 245, 0.10)';
  const edgeInk = 'rgba(3, 6, 10, 0.6)';

  // End plates (cut solid, steel).
  for (const [x0, x1] of [X.leftEnd, X.rightEnd]) {
    rect(ctx, x0, -Y.endPlate, x1, Y.endPlate, C.steel);
    hatch(ctx, x0, -Y.endPlate, x1, Y.endPlate, hatchGap, hatchInk, px);
  }
  if (zCut < Z.plate) {
    // Current collectors and their DC tabs.
    for (const [x0, x1] of [X.leftCol, X.rightCol]) {
      rect(ctx, x0, -Y.plate, x1, Y.tabTop, C.copper);
      hatch(ctx, x0, -Y.plate, x1, Y.tabTop, hatchGap, 'rgba(255, 230, 200, 0.12)', px);
    }

    for (let k = 0; k < CELLS; k++) {
      const o = cellOrigin(k);
      if (o + PITCH < v.x0 - 60 || o > v.x1 + 60) continue;
      // Frame and gasket region outside the active area.
      rect(ctx, o + L.ptl[0], -Y.plate, o + L.gdl[1], -H_ACTIVE, C.gasket);
      rect(ctx, o + L.ptl[0], H_ACTIVE, o + L.gdl[1], Y.plate, C.gasket);
      hatch(ctx, o + L.ptl[0], -Y.plate, o + L.gdl[1], -H_ACTIVE, hatchGap * 0.8, 'rgba(232,237,245,0.06)', px, true);
      hatch(ctx, o + L.ptl[0], H_ACTIVE, o + L.gdl[1], Y.plate, hatchGap * 0.8, 'rgba(232,237,245,0.06)', px, true);

      rect(ctx, o + L.ptl[0], -H_ACTIVE, o + L.ptl[1], H_ACTIVE, C.ptlBase);
      rect(ctx, o + L.acl[0], -H_ACTIVE, o + L.acl[1], H_ACTIVE, C.aclBase);
      rect(ctx, o + L.ccl[0], -H_ACTIVE, o + L.ccl[1], H_ACTIVE, C.cclBase);
      rect(ctx, o + L.gdl[0], -H_ACTIVE, o + L.gdl[1], H_ACTIVE, C.gdlBase);
      rect(ctx, o + L.mem[0], -Y.membrane, o + L.mem[1], Y.membrane, C.membrane);

      if (proj.zoom >= 2.4) {
        drawGrains(ctx, TEX.ptl, o + L.ptl[0], v, C.ptlGrain);
        ctx.strokeStyle = C.gdlFiber;
        ctx.lineWidth = Math.max(0.35, 1.3 * px);
        ctx.beginPath();
        for (const fb of TEX.gdl) {
          if (fb.y < v.y0 - 8 || fb.y > v.y1 + 8) continue;
          const fx = o + L.gdl[0] + fb.x;
          ctx.moveTo(fx - fb.dx / 2, fb.y - fb.dy / 2);
          ctx.lineTo(fx + fb.dx / 2, fb.y + fb.dy / 2);
        }
        ctx.stroke();
      }
      if (proj.zoom >= 9) {
        drawGrains(ctx, TEX.acl, o + L.acl[0], v, C.aclGrain);
        drawGrains(ctx, TEX.ccl, o + L.ccl[0], v, C.cclCarbon);
        drawGrains(ctx, TEX.cclPt, o + L.ccl[0], v, C.cclPt);
        // Membrane: faint in-plane texture so it reads as a polymer film, not a void.
        ctx.strokeStyle = 'rgba(80, 96, 118, 0.22)';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        for (let i = 1; i < 6; i++) {
          const mx = o + L.mem[0] + i;
          ctx.moveTo(mx, Math.max(-Y.membrane, v.y0));
          ctx.lineTo(mx, Math.min(Y.membrane, v.y1));
        }
        ctx.stroke();
      } else {
        // Catalyst layers read as thin bright interfaces at cell scale.
        ctx.fillStyle = 'rgba(160, 176, 198, 0.35)';
        ctx.fillRect(o + L.acl[0], -H_ACTIVE, 0.8, H_ACTIVE * 2);
        ctx.fillRect(o + L.ccl[1] - 0.8, -H_ACTIVE, 0.8, H_ACTIVE * 2);
      }
    }

    // Bipolar plates (cut solid, titanium) with channel slots and manifold ports.
    for (let k = 0; k <= CELLS; k++) {
      const o = plateOrigin(k);
      if (o + 16 < v.x0 - 60 || o > v.x1 + 60) continue;
      rect(ctx, o, -Y.plate, o + 16, Y.plate, C.titanium);
      hatch(ctx, o, -Y.plate, o + 16, Y.plate, hatchGap, hatchInk, px);
      if (k < CELLS) {
        rect(ctx, o + L.chanAnode[0], -H_ACTIVE, o + L.chanAnode[1], H_ACTIVE, C.void);
        rect(ctx, o + L.chanAnode[0], Y.inletHdr[1], o + L.chanAnode[1], -H_ACTIVE, C.void);
        rect(ctx, o + L.chanAnode[0], H_ACTIVE, o + L.chanAnode[1], Y.outletHdr[0], C.void);
      }
      if (k > 0) rect(ctx, o + L.chanCathode[0], -H_ACTIVE, o + L.chanCathode[1], H_ACTIVE, C.void);
    }

    // Anode manifolds run through the frames and exit the left end plate.
    rect(ctx, X.leftEnd[0], Y.inletHdr[0], ANODE_HDR_END, Y.inletHdr[1], C.void);
    rect(ctx, X.leftEnd[0], Y.outletHdr[0], ANODE_HDR_END, Y.outletHdr[1], C.void);

    // Thin edges between materials keep the layer stack crisp at every zoom.
    ctx.strokeStyle = edgeInk;
    ctx.lineWidth = px;
    for (let k = 0; k < CELLS; k++) {
      const o = cellOrigin(k);
      if (o + PITCH < v.x0 - 60 || o > v.x1 + 60) continue;
      outline(ctx, o + L.ptl[0], -H_ACTIVE, o + L.ptl[1], H_ACTIVE);
      outline(ctx, o + L.mem[0], -Y.membrane, o + L.mem[1], Y.membrane);
      outline(ctx, o + L.gdl[0], -H_ACTIVE, o + L.gdl[1], H_ACTIVE);
    }

    // Cathode manifold lies behind the section plane: drafting hidden lines (dashed).
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 237, 245, 0.42)';
    ctx.lineWidth = 1.2 * px;
    ctx.setLineDash([6 * px, 5 * px]);
    ctx.beginPath();
    ctx.rect(H2_HDR_START, Y.h2Hdr[0], X.rightEnd[1] - H2_HDR_START, Y.h2Hdr[1] - Y.h2Hdr[0]);
    for (let k = 1; k <= CELLS; k++) {
      const o = plateOrigin(k);
      ctx.moveTo(o + L.chanCathode[0], H_ACTIVE);
      ctx.lineTo(o + L.chanCathode[0], Y.h2Hdr[0]);
      ctx.moveTo(o + L.chanCathode[1], H_ACTIVE);
      ctx.lineTo(o + L.chanCathode[1], Y.h2Hdr[0]);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Overall cut outline.
  ctx.strokeStyle = 'rgba(232, 237, 245, 0.22)';
  ctx.lineWidth = 1.2 * px;
  ctx.strokeRect(X.leftEnd[0], -Y.endPlate, X.rightEnd[1] - X.leftEnd[0], Y.endPlate * 2);
}

/**
 * Dims every cell except the focus cell while the story is about one cell, but
 * leaves the shared manifolds bright so the causal path from header to channel stays visible.
 */
export function drawFocusSpotlight(ctx: CanvasRenderingContext2D, f: number, zCut: number): void {
  if (zCut >= Z.plate) return;
  const a = 0.36 * Math.max(win(f, 126, 304, 16, 18), win(f, 458, 526, 14, 14));
  if (a <= 0.005) return;
  const x0 = X.leftEnd[0];
  const x1 = X.rightEnd[1];
  const fx0 = FOCUS_O;
  const fx1 = FOCUS_O + PITCH + 16;
  const bands: [number, number][] = [
    [-Y.endPlate, Y.inletHdr[0]],
    [Y.inletHdr[1], Y.outletHdr[0]],
    [Y.outletHdr[1], Y.h2Hdr[0]],
    [Y.h2Hdr[1], Y.tabTop],
  ];
  ctx.fillStyle = rgba(C.stage, a);
  for (const [b0, b1] of bands) {
    ctx.fillRect(x0, b0, fx0 - x0, b1 - b0);
    ctx.fillRect(fx1, b0, x1 - fx1, b1 - b0);
  }
}

