import { H, W } from './constants.ts';
import { FOCUS_MEM_X, FOCUS_O } from './geometry.ts';
import { clamp, easeInOutCubic, lerp, ramp } from './math.ts';

export interface Camera {
  tx: number;
  ty: number;
  zoom: number;
  yaw: number;
  pitch: number;
}

interface Key extends Camera {
  f: number;
}

const DEG = Math.PI / 180;
const key = (f: number, tx: number, ty: number, zoom: number, yawDeg = 0, pitchDeg = 0): Key => ({
  f,
  tx,
  ty,
  zoom,
  yaw: yawDeg * DEG,
  pitch: pitchDeg * DEG,
});

/** Plant-scale framing used for the final complete-system view. */
export const PLANT_VIEW = { tx: -20, ty: 117, zoom: 0.62 } as const;

/**
 * Camera keyframes. Each segment eases in and out, zoom interpolates in log
 * space, and the destination point travels a straight screen-space path so
 * push-ins never swing sideways.
 */
export const CAMERA_KEYS: readonly Key[] = [
  // 01 MEA & plates: exterior, section sweep, rotate to the cut face, push to cell scale
  key(0, 0, 0, 1.22, 36, 22),
  key(34, -10, 0, 1.34, 33, 21),
  key(80, -20, 4, 1.48, 27, 17),
  key(112, FOCUS_O + 25, 0, 2.7, 0, 0),
  key(142, FOCUS_O + 30, 12, 6.6, 0, 0),
  key(160, FOCUS_O + 30, 14, 6.8, 0, 0),
  // 02 Water feed: drop to the inlet manifold, then track the water upward
  key(196, FOCUS_O + 14, -100, 3.9, 0, 0),
  key(262, FOCUS_O + 16, 18, 4.2, 0, 0),
  key(299, FOCUS_O + 20, 28, 4.4, 0, 0),
  // 03 Gas evolution: show the DC connection, push to catalyst scale, pull back to the manifolds
  key(330, 0, 150, 2.25, 0, 0),
  key(348, 0, 150, 2.3, 0, 0),
  key(392, FOCUS_MEM_X, 21, 44, 0, 0),
  key(452, FOCUS_MEM_X, 21.5, 45, 0, 0),
  key(495, FOCUS_O + 28, 60, 3.7, 0, 0),
  key(509, FOCUS_O + 28, 62, 3.75, 0, 0),
  // 04 Cooling: whole stack plus the anode water loop and heat exchanger
  key(575, -320, -60, 1.5, 0, 0),
  key(700, -350, -66, 1.56, 0, 0),
  key(749, -340, -62, 1.54, 0, 0),
  // 05 Balance of plant: pull back, then hold a stable complete-system view
  key(905, PLANT_VIEW.tx, PLANT_VIEW.ty, PLANT_VIEW.zoom * 0.992, 0, 0),
  key(960, PLANT_VIEW.tx, PLANT_VIEW.ty, PLANT_VIEW.zoom, 0, 0),
  key(1019, PLANT_VIEW.tx, PLANT_VIEW.ty, PLANT_VIEW.zoom, 0, 0),
];

export function cameraAt(f: number): Camera {
  const keys = CAMERA_KEYS;
  if (f <= keys[0].f) return { ...keys[0] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f > b.f) continue;
    const t = easeInOutCubic(clamp((f - a.f) / (b.f - a.f)));
    const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t));
    // Screen offset of the destination under the start camera shrinks linearly to zero.
    const sx = (b.tx - a.tx) * a.zoom * (1 - t);
    const sy = (b.ty - a.ty) * a.zoom * (1 - t);
    return {
      tx: b.tx - sx / zoom,
      ty: b.ty - sy / zoom,
      zoom,
      yaw: lerp(a.yaw, b.yaw, t),
      pitch: lerp(a.pitch, b.pitch, t),
    };
  }
  return { ...keys[keys.length - 1] };
}

/** Depth of the section plane. 175 is in front of the stack (no cut); 0 is the mid-plane. */
export function sectionCutAt(f: number): number {
  return lerp(175, 0, ramp(f, 34, 80));
}

export interface Pt {
  x: number;
  y: number;
  d: number;
}

/** Orthographic projection with yaw and pitch. Pure function of the camera. */
export class Projector {
  readonly cam: Camera;
  readonly flat: boolean;
  private readonly cy: number;
  private readonly sy: number;
  private readonly cp: number;
  private readonly sp: number;

  constructor(cam: Camera) {
    this.cam = cam;
    this.cy = Math.cos(cam.yaw);
    this.sy = Math.sin(cam.yaw);
    this.cp = Math.cos(cam.pitch);
    this.sp = Math.sin(cam.pitch);
    this.flat = Math.abs(cam.yaw) < 1e-4 && Math.abs(cam.pitch) < 1e-4;
  }

  get zoom(): number {
    return this.cam.zoom;
  }

  project(x: number, y: number, z = 0): Pt {
    const px = x - this.cam.tx;
    const py = y - this.cam.ty;
    const x1 = px * this.cy + z * this.sy;
    const z1 = -px * this.sy + z * this.cy;
    const y2 = py * this.cp - z1 * this.sp;
    const z2 = py * this.sp + z1 * this.cp;
    return { x: W / 2 + x1 * this.cam.zoom, y: H / 2 - y2 * this.cam.zoom, d: z2 };
  }

  /** Projected depth of a direction vector; positive means it faces the viewer. */
  facing(nx: number, ny: number, nz: number): number {
    const z1 = -nx * this.sy + nz * this.cy;
    return ny * this.sp + z1 * this.cp;
  }

  /** Affine canvas matrix mapping world (x, y) on the plane z = const to screen. */
  plane(z: number): [number, number, number, number, number, number] {
    const o = this.project(0, 0, z);
    const ex = this.project(1, 0, z);
    const ey = this.project(0, 1, z);
    return [ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y];
  }

  setPlane(ctx: CanvasRenderingContext2D, z: number): void {
    const m = this.plane(z);
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  /** Visible world rectangle on z = 0 (exact when flat, approximate otherwise). */
  viewRect(): { x0: number; x1: number; y0: number; y1: number } {
    const hw = W / 2 / this.cam.zoom;
    const hh = H / 2 / this.cam.zoom;
    return { x0: this.cam.tx - hw, x1: this.cam.tx + hw, y0: this.cam.ty - hh, y1: this.cam.ty + hh };
  }
}
