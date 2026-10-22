/**
 * Minimal rich-text renderer for chemistry labels. Markup:
 *   H_2O      subscript (single char)      _{..} for longer runs
 *   H^+  e^-  superscript                  ^{..} for longer runs
 *   ->        vector arrow (the latin font subsets ship no U+2192 glyph)
 * Rendering subscripts with a smaller font keeps output identical across
 * machines instead of depending on fallback fonts for U+2082 and friends.
 */
export type Family = 'sans' | 'mono';

const FAMILY: Record<Family, string> = {
  sans: '"Space Grotesk", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export function font(size: number, weight = 500, family: Family = 'sans'): string {
  return `${weight} ${size}px ${FAMILY[family]}`;
}

type SegKind = 'n' | 'sub' | 'sup' | 'arrow';
interface Seg {
  kind: SegKind;
  text: string;
}

const cache = new Map<string, Seg[]>();

function parse(src: string): Seg[] {
  const hit = cache.get(src);
  if (hit) return hit;
  const out: Seg[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ kind: 'n', text: buf });
    buf = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if ((ch === '_' || ch === '^') && i + 1 < src.length) {
      flush();
      const kind: SegKind = ch === '_' ? 'sub' : 'sup';
      if (src[i + 1] === '{') {
        const end = src.indexOf('}', i + 2);
        out.push({ kind, text: src.slice(i + 2, end < 0 ? src.length : end) });
        i = end < 0 ? src.length : end;
      } else {
        let t = src[i + 1];
        if (t === '-') t = '\u2212';
        out.push({ kind, text: t });
        i += 1;
      }
    } else if (ch === '-' && src[i + 1] === '>') {
      flush();
      out.push({ kind: 'arrow', text: '' });
      i += 1;
    } else {
      buf += ch;
    }
  }
  flush();
  cache.set(src, out);
  return out;
}

const SMALL = 0.68;

function segWidth(ctx: CanvasRenderingContext2D, s: Seg, size: number, weight: number, family: Family): number {
  if (s.kind === 'arrow') return size * 1.25;
  ctx.font = font(s.kind === 'n' ? size : size * SMALL, weight, family);
  return ctx.measureText(s.text).width;
}

export function measureRich(
  ctx: CanvasRenderingContext2D,
  src: string,
  size: number,
  weight = 500,
  family: Family = 'sans',
): number {
  let w = 0;
  for (const s of parse(src)) w += segWidth(ctx, s, size, weight, family);
  return w;
}

export interface RichOpts {
  size: number;
  weight?: number;
  family?: Family;
  color: string;
  align?: 'left' | 'center' | 'right';
}

/** Draws on the alphabetic baseline at (x, y) in the current (screen) transform. */
export function drawRich(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, o: RichOpts): number {
  const weight = o.weight ?? 500;
  const family = o.family ?? 'sans';
  const width = measureRich(ctx, src, o.size, weight, family);
  let cx = o.align === 'center' ? x - width / 2 : o.align === 'right' ? x - width : x;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.color;
  for (const s of parse(src)) {
    const w = segWidth(ctx, s, o.size, weight, family);
    if (s.kind === 'arrow') {
      const ay = y - o.size * 0.32;
      const x0 = cx + o.size * 0.18;
      const x1 = cx + w - o.size * 0.18;
      ctx.lineWidth = Math.max(1.2, o.size * 0.075);
      ctx.beginPath();
      ctx.moveTo(x0, ay);
      ctx.lineTo(x1 - o.size * 0.08, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, ay);
      ctx.lineTo(x1 - o.size * 0.26, ay - o.size * 0.17);
      ctx.lineTo(x1 - o.size * 0.26, ay + o.size * 0.17);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.font = font(s.kind === 'n' ? o.size : o.size * SMALL, weight, family);
      const dy = s.kind === 'sub' ? o.size * 0.24 : s.kind === 'sup' ? -o.size * 0.4 : 0;
      ctx.fillText(s.text, cx, y + dy);
    }
    cx += w;
  }
  return width;
}
