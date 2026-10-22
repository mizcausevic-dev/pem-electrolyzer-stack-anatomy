import { C, rgba } from './palette.ts';
import { drawRich, font, measureRich } from './text.ts';

export interface P2 {
  x: number;
  y: number;
}

/** 45-degree section hatching inside a rectangle, in the current transform. */
export function hatch(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spacing: number,
  color: string,
  lineWidth: number,
  cross = false,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  const h = y1 - y0;
  const start = Math.floor((x0 - h) / spacing) * spacing;
  for (let c = start; c <= x1; c += spacing) {
    ctx.moveTo(c, y0);
    ctx.lineTo(c + h, y1);
    if (cross) {
      ctx.moveTo(c + h, y0);
      ctx.lineTo(c, y1);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

export function arrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  lineWidth: number,
  head: number,
): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(ang) * head * 0.6, y1 - Math.sin(ang) * head * 0.6);
  ctx.stroke();
  arrowHead(ctx, x1, y1, ang, head);
}

export function glassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 10,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = C.panel;
  ctx.strokeStyle = C.panelBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export interface LabelOpts {
  dx: number;
  dy: number;
  accent?: string;
  alpha?: number;
  sub?: string;
  size?: number;
  tag?: string;
  /** Draw the anchor dot. Default true. */
  dot?: boolean;
}

/** Screen-space callout: anchor dot, elbow leader and a legible text plate. */
export function label(ctx: CanvasRenderingContext2D, a: P2, text: string, o: LabelOpts): void {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.002) return;
  const accent = o.accent ?? C.inkDim;
  const size = o.size ?? 19;
  const subSize = Math.round(size * 0.74);
  const right = o.dx >= 0;
  const ex = a.x + o.dx;
  const ey = a.y + o.dy;
  const pad = 9;

  ctx.save();
  ctx.globalAlpha *= alpha;

  const tw = measureRich(ctx, text, size, 600);
  const sw = o.sub ? measureRich(ctx, o.sub, subSize, 500) : 0;
  let tagW = 0;
  if (o.tag) {
    ctx.font = font(11, 600, 'mono');
    tagW = ctx.measureText(o.tag).width + 14;
  }
  const boxW = Math.max(tw + tagW, sw) + pad * 2;
  const boxH = size + pad * 2 + (o.sub ? subSize + 6 : 0);
  const bx = right ? ex + 6 : ex - 6 - boxW;
  const by = ey - boxH / 2;

  ctx.strokeStyle = rgba(accent === C.inkDim ? '#A3B0C2' : accent, 0.85);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(right ? bx : bx + boxW, ey);
  ctx.stroke();

  if (o.dot !== false) {
    ctx.fillStyle = C.stage;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(9, 14, 22, 0.86)';
  ctx.strokeStyle = rgba(accent === C.inkDim ? '#A3B0C2' : accent, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.fillRect(right ? bx : bx + boxW - 3, by + 6, 3, boxH - 12);

  const textY = by + pad + size * 0.82;
  drawRich(ctx, text, bx + pad + 2, textY, { size, weight: 600, color: C.ink });
  if (o.tag) {
    ctx.font = font(11, 600, 'mono');
    ctx.fillStyle = accent;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(o.tag, bx + pad + 2 + tw + 12, textY - 2);
  }
  if (o.sub) {
    drawRich(ctx, o.sub, bx + pad + 2, textY + subSize + 7, { size: subSize, weight: 500, color: C.inkDim });
  }
  ctx.restore();
}

/** Small uppercase status pill. Returns its width. */
export function badge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accent: string,
  alpha: number,
  alignRight = true,
): number {
  ctx.save();
  ctx.font = font(13, 600, 'mono');
  const w = ctx.measureText(text).width + 34;
  const h = 28;
  const bx = alignRight ? x - w : x;
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(9, 14, 22, 0.86)';
  ctx.strokeStyle = rgba(accent, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(bx + 14, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 25, y + h / 2 + 1);
  ctx.restore();
  return w;
}

/** Bracket spanning two screen x positions with a caption above. */
export function bracket(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  text: string,
  color: string,
  alpha: number,
  sub?: string,
): void {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y + 10);
  ctx.lineTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.lineTo(x1, y + 10);
  ctx.moveTo((x0 + x1) / 2, y);
  ctx.lineTo((x0 + x1) / 2, y - 8);
  ctx.stroke();
  const size = 18;
  const tw = measureRich(ctx, text, size, 600);
  const sw = sub ? measureRich(ctx, sub, 13, 500) : 0;
  const bw = Math.max(tw, sw) + 18;
  const bh = sub ? 50 : 32;
  const bx = (x0 + x1) / 2 - bw / 2;
  const by = y - 8 - bh;
  ctx.fillStyle = 'rgba(9, 14, 22, 0.86)';
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.stroke();
  drawRich(ctx, text, bx + bw / 2, by + 22, { size, weight: 600, color: C.ink, align: 'center' });
  if (sub) drawRich(ctx, sub, bx + bw / 2, by + 40, { size: 13, weight: 500, color: C.inkDim, align: 'center' });
  ctx.restore();
}
