export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
export const linear = (t: number): number => t;

export type Ease = (t: number) => number;

/** 0 before a, 1 after b, eased in between. */
export function ramp(f: number, a: number, b: number, ease: Ease = easeInOutCubic): number {
  if (b <= a) return f >= b ? 1 : 0;
  return ease(clamp((f - a) / (b - a)));
}

/** Visibility window: fades in over [a, a + fin], out over [b - fout, b]. */
export function win(f: number, a: number, b: number, fin = 12, fout = 12): number {
  const i = ramp(f, a, a + fin, easeOutCubic);
  const o = 1 - ramp(f, b - fout, b, easeInOutCubic);
  return Math.min(i, o);
}

/** Position along a polyline at fraction t in [0, 1]. */
export function along(points: readonly (readonly [number, number])[], t: number): [number, number] {
  let total = 0;
  const seg: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let target = clamp(t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const u = seg[i] === 0 ? 0 : clamp(target / seg[i]);
      return [lerp(points[i][0], points[i + 1][0], u), lerp(points[i][1], points[i + 1][1], u)];
    }
    target -= seg[i];
  }
  return [points[points.length - 1][0], points[points.length - 1][1]];
}

export function polylineLength(points: readonly (readonly [number, number])[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}
